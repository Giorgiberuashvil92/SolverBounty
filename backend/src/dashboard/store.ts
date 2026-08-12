import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { PokerSession, User } from './schemas';
import type {
  DashboardSnapshot,
  KeyHand,
  PokerSession as PokerSessionDto,
} from './types';
import { AnalyticsService } from '../analytics/analytics.service';
import { analyzeHandWithLlm } from '../coach/llm';

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function toKeyHandDto(h: PokerSession['keyHands'][number]): KeyHand {
  return {
    id: h.id,
    sessionId: h.sessionId,
    createdAt: h.createdAt,
    source: h.source,
    rawInput: h.rawInput,
    tags: h.tags ?? [],
    heroPosition: h.heroPosition,
    villainPositions: h.villainPositions,
    stakes: h.stakes,
    board: h.board,
    holeCards: h.holeCards,
    potType: h.potType as KeyHand['potType'],
    tableSize: (h as { tableSize?: number }).tableSize,
    actions: (h as { actions?: KeyHand['actions'] }).actions,
    resultBb: h.resultBb,
    aiSummary: h.aiSummary,
    aiAnalysis: h.aiAnalysis,
    reviewStatus: h.reviewStatus ?? 'to_review',
    aiAnalyzedAt: h.aiAnalyzedAt,
  };
}

export function toSessionDto(doc: PokerSession): PokerSessionDto {
  return {
    id: doc._id,
    userId: doc.userId,
    status: doc.status,
    gameType: doc.gameType,
    venue: doc.venue,
    stakesLabel: doc.stakesLabel,
    startedAt: doc.startedAt,
    endedAt: doc.endedAt,
    durationSeconds: doc.durationSeconds,
    buyInCents: doc.buyInCents,
    cashOutCents: doc.cashOutCents,
    profitLossCents: doc.profitLossCents,
    hourlyRateCents: doc.hourlyRateCents,
    currency: doc.currency,
    preSession: doc.preSession
      ? {
          hydration: doc.preSession.hydration,
          warmup: doc.preSession.warmup,
          focusLevel: doc.preSession.focusLevel,
          completedAt: doc.preSession.completedAt,
        }
      : undefined,
    postSession: doc.postSession
      ? {
          tiltScore: doc.postSession.tiltScore,
          energyLevel: doc.postSession.energyLevel,
          notes: doc.postSession.notes,
          reviewCompleted: doc.postSession.reviewCompleted,
          completedAt: doc.postSession.completedAt,
        }
      : undefined,
    keyHands: (doc.keyHands ?? []).map(toKeyHandDto),
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

@Injectable()
export class DashboardStore {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(PokerSession.name)
    private readonly sessions: Model<PokerSession>,
    private readonly analytics: AnalyticsService,
    private readonly config: ConfigService,
  ) {}

  private async requireUser(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  private requireBankroll(user: {
    bankrollInitialized?: boolean;
    bankroll?: User['bankroll'];
  }) {
    if (!user.bankrollInitialized || !user.bankroll) {
      throw new Error('Set your bankroll first');
    }
    return user.bankroll;
  }

  private async requireOwnedSession(userId: string, sessionId: string) {
    const session = await this.sessions.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Session not found');
    }
    return session;
  }

  async getSnapshot(userId: string): Promise<DashboardSnapshot> {
    const user = await this.requireUser(userId);
    const date = todayKey();
    const all = await this.sessions
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const todaysSessions = all
      .filter((s) => (s.startedAt ?? s.createdAt).slice(0, 10) === date)
      .map((s) => toSessionDto(s as PokerSession));

    let activeSession =
      todaysSessions.find((s) => s.status === 'live') ??
      all
        .filter((s) => s.status === 'live')
        .map((s) => toSessionDto(s as PokerSession))[0] ??
      null;

    if (activeSession?.startedAt) {
      activeSession = {
        ...activeSession,
        durationSeconds: Math.max(
          0,
          Math.floor((Date.now() - Date.parse(activeSession.startedAt)) / 1000),
        ),
      };
    }

    const todaysProfitCents = todaysSessions.reduce(
      (sum, s) => sum + (s.profitLossCents ?? 0),
      0,
    );

    const initialized = Boolean(user.bankrollInitialized && user.bankroll);

    return {
      date,
      bankrollInitialized: initialized,
      bankroll:
        initialized && user.bankroll
          ? {
              currency: user.bankroll.currency,
              currentCents: user.bankroll.currentCents,
              startingOfDayCents: user.bankroll.startingOfDayCents,
              ledger: [...user.ledger]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 50)
                .map((e) => ({
                  id: e.id,
                  type: e.type,
                  amountCents: e.amountCents,
                  currency: e.currency,
                  note: e.note,
                  createdAt: e.createdAt,
                })),
            }
          : null,
      activeSession,
      todaysSessions,
      todaysProfitCents,
      streakDays: user.streakDays,
    };
  }

  async setupBankroll(userId: string, amountCents: number, currency = 'USD') {
    if (amountCents <= 0) throw new Error('Amount must be positive');
    const user = await this.requireUser(userId);
    if (user.bankrollInitialized && user.bankroll) {
      throw new Error('Bankroll already set');
    }
    const now = new Date().toISOString();
    user.bankrollInitialized = true;
    user.bankroll = {
      currency,
      currentCents: amountCents,
      startingOfDayCents: amountCents,
    };
    user.ledger = [
      {
        id: uuid(),
        type: 'deposit',
        amountCents,
        currency,
        note: 'Initial bankroll',
        createdAt: now,
      },
    ];
    user.updatedAt = now;
    await user.save();
    await this.analytics.track(userId, 'bankroll_setup', {
      amountCents,
      currency,
    });
    return this.getSnapshot(userId);
  }

  async deposit(userId: string, amountCents: number, note?: string) {
    if (amountCents <= 0) throw new Error('Amount must be positive');
    const user = await this.requireUser(userId);
    const bankroll = this.requireBankroll(user);
    bankroll.currentCents += amountCents;
    user.markModified('bankroll');
    user.ledger.unshift({
      id: uuid(),
      type: 'deposit',
      amountCents,
      currency: bankroll.currency,
      note,
      createdAt: new Date().toISOString(),
    });
    user.updatedAt = new Date().toISOString();
    await user.save();
    await this.analytics.track(userId, 'bankroll_deposit', { amountCents });
    return this.getSnapshot(userId);
  }

  async withdraw(userId: string, amountCents: number, note?: string) {
    if (amountCents <= 0) throw new Error('Amount must be positive');
    const user = await this.requireUser(userId);
    const bankroll = this.requireBankroll(user);
    if (amountCents > bankroll.currentCents) {
      throw new Error('Insufficient bankroll');
    }
    bankroll.currentCents -= amountCents;
    user.markModified('bankroll');
    user.ledger.unshift({
      id: uuid(),
      type: 'withdrawal',
      amountCents: -amountCents,
      currency: bankroll.currency,
      note,
      createdAt: new Date().toISOString(),
    });
    user.updatedAt = new Date().toISOString();
    await user.save();
    await this.analytics.track(userId, 'bankroll_withdraw', { amountCents });
    return this.getSnapshot(userId);
  }

  async startSession(
    userId: string,
    input: {
      stakesLabel: string;
      buyInCents: number;
      gameType?: PokerSessionDto['gameType'];
      venue?: PokerSessionDto['venue'];
      preSession?: PokerSessionDto['preSession'];
    },
  ) {
    const live = await this.sessions.exists({ userId, status: 'live' });
    if (live) throw new Error('A live session already exists');

    const user = await this.requireUser(userId);
    const bankroll = this.requireBankroll(user);
    const now = new Date().toISOString();
    const id = uuid();
    const created = await this.sessions.create({
      _id: id,
      userId,
      status: 'live',
      gameType: input.gameType ?? 'cash',
      venue: input.venue ?? 'online',
      stakesLabel: input.stakesLabel,
      startedAt: now,
      durationSeconds: 0,
      buyInCents: input.buyInCents,
      currency: bankroll.currency,
      preSession: input.preSession
        ? { ...input.preSession, completedAt: now }
        : undefined,
      keyHands: [],
      createdAt: now,
      updatedAt: now,
    });

    await this.analytics.track(userId, 'session_start', {
      stakesLabel: input.stakesLabel,
      buyInCents: input.buyInCents,
      venue: input.venue ?? 'online',
    });

    return toSessionDto(created.toObject());
  }

  async endSession(userId: string, sessionId: string, cashOutCents: number) {
    const session = await this.requireOwnedSession(userId, sessionId);
    if (session.status !== 'live') throw new Error('Session is not live');

    const now = new Date().toISOString();
    const startedMs = session.startedAt
      ? Date.parse(session.startedAt)
      : Date.now();
    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - startedMs) / 1000),
    );
    const profitLossCents = cashOutCents - session.buyInCents;
    const hourlyRateCents =
      durationSeconds > 0
        ? Math.round(profitLossCents / (durationSeconds / 3600))
        : 0;

    session.status = 'ended';
    session.endedAt = now;
    session.durationSeconds = durationSeconds;
    session.cashOutCents = cashOutCents;
    session.profitLossCents = profitLossCents;
    session.hourlyRateCents = hourlyRateCents;
    session.updatedAt = now;
    await session.save();

    const user = await this.requireUser(userId);
    const bankroll = this.requireBankroll(user);
    bankroll.currentCents += profitLossCents;
    user.markModified('bankroll');
    user.ledger.unshift({
      id: uuid(),
      type: 'session_result',
      amountCents: profitLossCents,
      currency: bankroll.currency,
      note: `${session.stakesLabel} session`,
      createdAt: now,
    });
    user.updatedAt = now;
    await user.save();

    await this.analytics.track(userId, 'session_end', {
      stakesLabel: session.stakesLabel,
      profitLossCents,
      durationSeconds,
      keyHandsCount: session.keyHands?.length ?? 0,
    });

    return toSessionDto(session.toObject());
  }

  async updateChecklist(
    userId: string,
    sessionId: string,
    checklist: NonNullable<PokerSessionDto['preSession']>,
  ) {
    const session = await this.requireOwnedSession(userId, sessionId);
    session.preSession = {
      ...checklist,
      completedAt: new Date().toISOString(),
    };
    session.updatedAt = new Date().toISOString();
    await session.save();
    return toSessionDto(session.toObject());
  }

  async updateMental(
    userId: string,
    sessionId: string,
    mental: { tiltScore: number; energyLevel: number; notes?: string },
  ) {
    const session = await this.requireOwnedSession(userId, sessionId);
    session.postSession = {
      tiltScore: mental.tiltScore,
      energyLevel: mental.energyLevel,
      notes: mental.notes,
      reviewCompleted: true,
      completedAt: new Date().toISOString(),
    };
    session.updatedAt = new Date().toISOString();
    await session.save();
    await this.analytics.track(userId, 'mental_review', {
      tiltScore: mental.tiltScore,
      energyLevel: mental.energyLevel,
    });
    return toSessionDto(session.toObject());
  }

  async addKeyHand(
    userId: string,
    sessionId: string,
    input: Omit<
      KeyHand,
      'id' | 'sessionId' | 'createdAt' | 'reviewStatus' | 'aiAnalyzedAt'
    >,
  ) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const hand: KeyHand = {
      ...input,
      id: uuid(),
      sessionId,
      createdAt: new Date().toISOString(),
      tags: input.tags ?? [],
      reviewStatus: 'to_review',
    };

    session.keyHands.unshift({
      id: hand.id,
      sessionId: hand.sessionId,
      createdAt: hand.createdAt,
      source: hand.source,
      rawInput: hand.rawInput,
      tags: hand.tags,
      heroPosition: hand.heroPosition,
      villainPositions: hand.villainPositions,
      stakes: hand.stakes,
      board: hand.board,
      holeCards: hand.holeCards,
      potType: hand.potType,
      tableSize: hand.tableSize,
      actions: hand.actions,
      resultBb: hand.resultBb,
      aiSummary: hand.aiSummary,
      reviewStatus: 'to_review',
    });
    session.updatedAt = new Date().toISOString();
    await session.save();

    await this.analytics.track(userId, 'key_hand_logged', {
      stakesLabel: session.stakesLabel,
      tags: hand.tags,
      heroPosition: hand.heroPosition,
      resultBb: hand.resultBb,
    });

    return hand;
  }

  async listReviews(userId: string) {
    const sessions = await this.sessions
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const sessionRows = sessions.map((s) => {
      const dto = toSessionDto(s as PokerSession);
      return {
        id: dto.id,
        stakesLabel: dto.stakesLabel,
        status: dto.status,
        startedAt: dto.startedAt,
        endedAt: dto.endedAt,
        profitLossCents: dto.profitLossCents,
        durationSeconds: dto.durationSeconds,
        keyHandsCount: dto.keyHands.length,
        toReviewCount: dto.keyHands.filter((h) => h.reviewStatus !== 'reviewed')
          .length,
      };
    });

    const keyHands = sessions
      .flatMap((s) =>
        (s.keyHands ?? []).map((h) => ({
          ...toKeyHandDto(h),
          stakesLabel: s.stakesLabel,
          sessionStartedAt: s.startedAt,
        })),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      sessions: sessionRows,
      keyHands,
      toReview: keyHands.filter((h) => h.reviewStatus !== 'reviewed'),
    };
  }

  async analyzeKeyHand(userId: string, sessionId: string, handId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const hand = session.keyHands.find((h) => h.id === handId);
    if (!hand) throw new Error('Hand not found');

    const brief = await this.buildHandBrief(hand, session.stakesLabel);
    hand.aiAnalysis = JSON.stringify(brief);
    hand.aiSummary = hand.aiSummary || brief.verdict;
    hand.aiAnalyzedAt = new Date().toISOString();
    hand.reviewStatus = 'to_review';
    session.markModified('keyHands');
    session.updatedAt = new Date().toISOString();
    await session.save();

    await this.analytics.track(userId, 'key_hand_analyzed', {
      stakesLabel: session.stakesLabel,
      tags: hand.tags,
      heroPosition: hand.heroPosition,
      resultBb: hand.resultBb,
      severity: brief.severity,
      usedLlm: brief.source === 'llm',
    });

    return toKeyHandDto(hand);
  }

  private async buildHandBrief(
    hand: PokerSession['keyHands'][number],
    stakesLabel?: string,
  ): Promise<HandAiBrief> {
    const payload = [
      `Stakes: ${stakesLabel ?? hand.stakes ?? 'n/a'}`,
      `Hero: ${hand.heroPosition ?? '?'} ${hand.holeCards?.join(' ') ?? ''}`,
      `Villains: ${hand.villainPositions?.join(', ') || 'n/a'}`,
      `Pot type: ${hand.potType ?? 'n/a'} · table ${hand.tableSize ?? '?'}`,
      `Board: ${hand.board?.join(' ') || 'none'}`,
      `Actions: ${(hand.actions ?? [])
        .map((a) => `${a.street} ${a.actor} ${a.action}${a.sizeBb != null ? ` ${a.sizeBb}bb` : ''}`)
        .join(' | ') || 'none'}`,
      `Result: ${hand.resultBb == null ? 'n/a' : `${hand.resultBb}bb`}`,
      `Tags: ${(hand.tags ?? []).join(', ') || 'none'}`,
      hand.aiSummary ? `Player note: ${hand.aiSummary}` : null,
      hand.rawInput ? `Raw: ${hand.rawInput}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const llm = await analyzeHandWithLlm(this.config, payload);
    if (llm && typeof llm.verdict === 'string') {
      return normalizeBrief(llm, 'llm');
    }
    return buildHeuristicBrief(hand);
  }

  async markHandReviewed(userId: string, sessionId: string, handId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const hand = session.keyHands.find((h) => h.id === handId);
    if (!hand) throw new Error('Hand not found');
    hand.reviewStatus = 'reviewed';
    session.markModified('keyHands');
    session.updatedAt = new Date().toISOString();
    await session.save();
    await this.analytics.track(userId, 'key_hand_reviewed', {
      stakesLabel: session.stakesLabel,
      tags: hand.tags,
    });
    return toKeyHandDto(hand);
  }
}

type HandAiBrief = {
  v: 1;
  verdict: string;
  severity: 'ok' | 'soft' | 'leak' | 'study';
  keyMistake: string | null;
  betterLine: string;
  why: string;
  drill: string;
  focusStreet: 'preflop' | 'flop' | 'turn' | 'river' | null;
  source: 'llm' | 'heuristic';
};

function normalizeBrief(
  raw: Record<string, unknown>,
  source: HandAiBrief['source'],
): HandAiBrief {
  const severityRaw = String(raw.severity ?? 'study');
  const severity = (['ok', 'soft', 'leak', 'study'] as const).includes(
    severityRaw as HandAiBrief['severity'],
  )
    ? (severityRaw as HandAiBrief['severity'])
    : 'study';
  const streetRaw = raw.focusStreet == null ? null : String(raw.focusStreet);
  const focusStreet = (['preflop', 'flop', 'turn', 'river'] as const).includes(
    streetRaw as NonNullable<HandAiBrief['focusStreet']>,
  )
    ? (streetRaw as HandAiBrief['focusStreet'])
    : null;

  return {
    v: 1,
    verdict: String(raw.verdict || 'Review this spot street-by-street.'),
    severity,
    keyMistake:
      raw.keyMistake == null || raw.keyMistake === ''
        ? null
        : String(raw.keyMistake),
    betterLine: String(
      raw.betterLine || 'Write one alternate line with a size before marking reviewed.',
    ),
    why: String(raw.why || 'Missing info — rebuild villain range and SPR first.'),
    drill: String(raw.drill || 'Replay once and write one rule you will run next session.'),
    focusStreet,
    source,
  };
}

function boardTexture(board?: string[]) {
  if (!board?.length) return { wet: false, monotone: false, paired: false, street: null as HandAiBrief['focusStreet'] };
  const suits = board.map((c) => c.slice(-1).toLowerCase());
  const ranks = board.map((c) => c.slice(0, -1).toUpperCase());
  const suitCounts = suits.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const monotone = Object.values(suitCounts).some((n) => n >= 3);
  const rankCounts = ranks.reduce<Record<string, number>>((acc, r) => {
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});
  const paired = Object.values(rankCounts).some((n) => n >= 2);
  const connectedHints = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const idxs = ranks
    .map((r) => connectedHints.indexOf(r === 'T' ? 'T' : r))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  let wet = monotone;
  for (let i = 1; i < idxs.length; i++) {
    if (Math.abs(idxs[i] - idxs[i - 1]) <= 2) wet = true;
  }
  const street: HandAiBrief['focusStreet'] =
    board.length >= 5 ? 'river' : board.length === 4 ? 'turn' : board.length >= 3 ? 'flop' : 'preflop';
  return { wet, monotone, paired, street };
}

/** Strategy tags beat tilt/study when the log is noisy (many tags tapped). */
function primaryTag(tags: string[]): string | null {
  const set = new Set(tags);
  const order = [
    'missed_value',
    'bad_fold',
    'bluff',
    'value',
    'cooler',
    'tilt',
    'study',
  ] as const;
  for (const t of order) {
    if (!set.has(t)) continue;
    if (t === 'tilt') {
      const hasStrategy = order
        .slice(0, 5)
        .some((s) => set.has(s));
      if (hasStrategy) continue;
    }
    return t;
  }
  return null;
}

function buildHeuristicBrief(hand: {
  heroPosition?: string;
  holeCards?: string[];
  board?: string[];
  tags?: string[];
  resultBb?: number;
  potType?: string;
  actions?: Array<{ actor: string; action: string; street?: string }>;
  villainPositions?: string[];
}): HandAiBrief {
  const tags = hand.tags ?? [];
  const tag = primaryTag(tags);
  const tx = boardTexture(hand.board);
  const lost = (hand.resultBb ?? 0) < 0;
  const wonSmall = (hand.resultBb ?? 0) > 0 && (hand.resultBb ?? 0) <= 5;
  const pos = hand.heroPosition ?? 'your seat';
  const pot = hand.potType ?? 'this pot';
  const moneyActions = (hand.actions ?? []).filter((a) =>
    ['call', 'raise', 'bet', 'allin', 'check'].includes(a.action),
  );
  const thinLog =
    moneyActions.length === 0 && (hand.villainPositions?.length ?? 0) === 0;

  if (thinLog) {
    return {
      v: 1,
      verdict: 'Hand story is incomplete — only folds are logged.',
      severity: 'study',
      keyMistake: null,
      betterLine:
        'Mark who put money in (call/raise sizes) on the decision street, then refresh.',
      why: 'Without a contested line, any takeaway is guesswork.',
      drill: 'Re-open the logger and add the key street action before marking done.',
      focusStreet: tx.street ?? 'preflop',
      source: 'heuristic',
    };
  }

  if (tag === 'tilt') {
    return {
      v: 1,
      verdict: 'Mental leak first — strategy review only after you cool down.',
      severity: 'leak',
      keyMistake: 'Playing through tilt instead of protecting the bankroll.',
      betterLine: 'Stop adding tables; take a 5-minute reset; only A-game opens next orbit.',
      why: 'Tilt hands compound: you chase, widen, and mis-size under emotional pressure.',
      drill: 'Write the trigger (bad beat / cooler / chat) and a hard stop rule for next session.',
      focusStreet: tx.street ?? 'preflop',
      source: 'heuristic',
    };
  }

  if (tag === 'missed_value' || tag === 'value') {
    const nutFlushFeel =
      tx.monotone &&
      (hand.holeCards ?? []).some((c) => /Ah|Kh|Ad|Kd|As|Ks|Ac|Kc/i.test(c));
    return {
      v: 1,
      verdict: nutFlushFeel
        ? `Strong made hand from ${pos} — sizing left money behind.`
        : `Value left on the table from ${pos} in a ${pot}.`,
      severity: lost ? 'leak' : 'soft',
      keyMistake: wonSmall
        ? 'Got to showdown too cheap — thicker value was available.'
        : 'Failed to extract when villain range was capped or sticky.',
      betterLine: tx.monotone
        ? 'On flush boards: charge draws earlier; on river vs capped ranges, polarize bigger.'
        : tx.wet
          ? 'Size up on wet runouts (66–80%) to deny equity.'
          : 'Use a larger value size IP; don’t auto-check strong hands on dry boards.',
      why: tx.monotone
        ? 'Flush-heavy boards punish small bets — worse hands get correct odds too often.'
        : 'When you have the nuts advantage, small bets leak EV versus sticky pools.',
      drill: `Write one sizing rule for ${pos} ${pot} on the ${tx.street ?? 'river'}.`,
      focusStreet: tx.street ?? 'river',
      source: 'heuristic',
    };
  }

  if (tag === 'bluff') {
    return {
      v: 1,
      verdict: 'Bluff quality hinges on blockers + polarized river range.',
      severity: 'study',
      keyMistake: 'Bluffing a board/texture where villain’s continue range is too strong.',
      betterLine:
        'Prefer blocker bluffs and overbet only when your missed draws + air are balanced.',
      why: tx.paired
        ? 'Paired boards shrink nut advantage — pure air gets looked up more.'
        : 'Without fold equity or blockers, river bluffs are just spew against sticky pools.',
      drill: 'List 3 bluffs you jam and 3 you give up on this runout — check blockers.',
      focusStreet: tx.street ?? 'river',
      source: 'heuristic',
    };
  }

  if (tag === 'cooler') {
    return {
      v: 1,
      verdict: 'Likely a variance spot — protect process, not ego.',
      severity: 'ok',
      keyMistake: null,
      betterLine: 'Confirm you were never folding earlier; if the line was standard, move on.',
      why: 'Coolers are EV-neutral process with bad realization — don’t steal review time from real leaks.',
      drill: 'Mark one optional decision (size/street) — ignore the showdown if it was mandatory.',
      focusStreet: tx.street,
      source: 'heuristic',
    };
  }

  if (tag === 'bad_fold') {
    return {
      v: 1,
      verdict: `Potentially over-folded from ${pos} — re-check pot odds and range.`,
      severity: 'soft',
      keyMistake: 'Folding a hand that still beats enough of villain’s value/bluff mix.',
      betterLine: 'Call more vs polar sizes when you block value; fold more vs linear small bets.',
      why: 'Bad folds often come from fear of coolers instead of MDF + blocker math.',
      drill: 'Recreate the river decision with pot odds on paper before marking done.',
      focusStreet: tx.street ?? 'river',
      source: 'heuristic',
    };
  }

  return {
    v: 1,
    verdict: `Find the one fork from ${pos} that cost EV.`,
    severity: lost ? 'soft' : 'study',
    keyMistake: lost
      ? 'Unclear which street leaked — isolate the first non-standard action.'
      : null,
    betterLine: tx.wet
      ? 'On wet boards: fewer small stabs OOP; prefer check-raise or larger deny-equity sizes.'
      : 'Map range advantage street-by-street, then pick one size you will repeat.',
    why: `${pot} pots punish autopilot — write whether villain is capped or polar.`,
    drill: 'One sentence rule you’ll run next time in this seat/pot type.',
    focusStreet: tx.street ?? 'flop',
    source: 'heuristic',
  };
}
