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
import { analyzeHandWithLlm, generateDrillWithLlm, recommendDrillWithLlm } from '../coach/llm';

type DrillPackId = 'open' | '3bet' | 'defend' | 'cbet';

export type DrillRecommendation = {
  packId: DrillPackId;
  title: string;
  reason: string;
  difficulty: 'foundation' | 'standard' | 'advanced';
  source: 'ai' | 'rules';
};

type GeneratedDrillChoice = { id: string; label: string; quality: 'best' | 'ok' | 'leak' };
type GeneratedDrill = {
  id: string;
  tag: 'open' | '3bet' | 'defend' | 'cbet' | 'squeeze';
  stakesLabel: string;
  stackBb: number;
  heroPosition: string;
  holeCards: [string, string];
  board?: string[];
  potBb?: number;
  actors: Array<{ position: string; state: string; amountBb?: number }>;
  actionLine: string;
  prompt: string;
  choices: GeneratedDrillChoice[];
  explainBest: string;
  explainOk?: string;
  explainLeak?: string;
};

export type GeneratedDrillPlan = {
  title: string;
  subtitle: string;
  drills: GeneratedDrill[];
  source: 'ai';
};

const DRILL_PACK_IDS = new Set<DrillPackId>(['open', '3bet', 'defend', 'cbet']);

function fallbackDrillRecommendation(session: PokerSessionDto): DrillRecommendation {
  const hands = session.keyHands ?? [];
  const tags = hands.flatMap((hand) => hand.tags ?? []).map((tag) => tag.toLowerCase());
  const hasThreeBet = tags.some((tag) => tag.includes('3bet') || tag.includes('squeeze')) || hands.some((hand) => hand.potType === '3bet' || hand.potType === '4bet');
  const hasLateStreet = hands.some((hand) => (hand.board?.length ?? 0) >= 3 || hand.actions?.some((action) => action.street === 'flop'));
  const hasDefend = hands.some((hand) => hand.heroPosition === 'BB' || hand.heroPosition === 'SB');
  const packId: DrillPackId = hasThreeBet ? '3bet' : hasLateStreet ? 'cbet' : hasDefend ? 'defend' : 'open';
  const title = packId === '3bet' ? '3-Bet decision refresh' : packId === 'cbet' ? 'Flop c-bet refresh' : packId === 'defend' ? 'Blind defense refresh' : 'Preflop open refresh';
  return {
    packId,
    title,
    reason: hands.length ? `Based on ${hands.length} logged hand${hands.length === 1 ? '' : 's'} from this session.` : 'A focused warm-up for your next session.',
    difficulty: session.postSession?.gameQuality === 'A' ? 'advanced' : session.postSession?.gameQuality === 'C' ? 'foundation' : 'standard',
    source: 'rules',
  };
}

const CARD_PATTERN = /^[2-9TJQKA][shdc]$/;
const GENERATED_TAGS = new Set(['open', '3bet', 'defend', 'cbet', 'squeeze']);
const ACTOR_STATES = new Set(['fold', 'wait', 'open', 'call', 'raise', '3bet', 'complete', 'check', 'toAct']);

function asText(value: unknown, max = 240): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
}

function normalizedTag(value: unknown): GeneratedDrill['tag'] | null {
  if (typeof value !== 'string') return null;
  const tag = value.toLowerCase().replace(/[\s_-]/g, '');
  if (tag === '3bet') return '3bet';
  if (tag === 'cbet') return 'cbet';
  if (tag === 'squeeze') return 'squeeze';
  if (tag === 'defend') return 'defend';
  if (tag === 'open') return 'open';
  return null;
}

function normalizedCard(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const compact = value
    .trim()
    .replace(/♠/g, 's')
    .replace(/♥/g, 'h')
    .replace(/♦/g, 'd')
    .replace(/♣/g, 'c');
  const card = `${compact[0]?.toUpperCase() ?? ''}${compact[1]?.toLowerCase() ?? ''}`;
  return CARD_PATTERN.test(card) ? card : null;
}

function fallbackActors(heroPosition: string) {
  const positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  return positions.map((position) => ({ position, state: position === heroPosition ? 'toAct' : 'fold' }));
}

function fallbackGeneratedDrill(tag: GeneratedDrill['tag'], index: number, stakesLabel: string): GeneratedDrill {
  const id = `ai-fallback-${Date.now()}-${index}`;
  if (tag === 'cbet') {
    return {
      id, tag, stakesLabel, stackBb: 100, heroPosition: 'BTN', holeCards: ['As', 'Kc'], board: ['9h', '5d', '2c'], potBb: 6,
      actors: [{ position: 'UTG', state: 'fold' }, { position: 'HJ', state: 'fold' }, { position: 'CO', state: 'fold' }, { position: 'BTN', state: 'toAct' }, { position: 'SB', state: 'fold' }, { position: 'BB', state: 'check' }],
      actionLine: 'You open BTN, BB calls. On a dry flop, BB checks.', prompt: 'What is your default plan?',
      choices: [{ id: `${id}-a`, label: 'Bet 33% pot', quality: 'best' }, { id: `${id}-b`, label: 'Check back', quality: 'ok' }, { id: `${id}-c`, label: 'Bet 125% pot', quality: 'leak' }],
      explainBest: 'A small c-bet is a practical default on this dry board because it pressures missed hands without risking too much.',
      explainOk: 'Checking can be reasonable sometimes, especially against opponents who over-defend.',
      explainLeak: 'An oversized bet uses too much risk for a spot that rarely needs it.',
    };
  }
  if (tag === 'defend') {
    return {
      id, tag, stakesLabel, stackBb: 100, heroPosition: 'BB', holeCards: ['Kc', '9d'],
      actors: [{ position: 'UTG', state: 'fold' }, { position: 'HJ', state: 'fold' }, { position: 'CO', state: 'fold' }, { position: 'BTN', state: 'open', amountBb: 2.5 }, { position: 'SB', state: 'fold' }, { position: 'BB', state: 'toAct' }],
      actionLine: 'BTN opens to 2.5bb and SB folds.', prompt: 'What is your default defense?',
      choices: [{ id: `${id}-a`, label: 'Call', quality: 'best' }, { id: `${id}-b`, label: '3-bet to 11bb', quality: 'ok' }, { id: `${id}-c`, label: 'Fold', quality: 'leak' }],
      explainBest: 'With a playable king in the BB, calling is a sensible default against a wide button opening range.',
      explainOk: 'A 3-bet can be mixed in when you have a clear plan for the response.',
      explainLeak: 'Folding too many playable hands in the BB gives up favorable pot odds.',
    };
  }
  if (tag === '3bet' || tag === 'squeeze') {
    return {
      id, tag, stakesLabel, stackBb: 100, heroPosition: 'BTN', holeCards: ['Ah', 'Qs'],
      actors: [{ position: 'UTG', state: 'fold' }, { position: 'HJ', state: 'fold' }, { position: 'CO', state: 'open', amountBb: 2.5 }, { position: 'BTN', state: 'toAct' }, { position: 'SB', state: 'wait' }, { position: 'BB', state: 'wait' }],
      actionLine: 'CO opens to 2.5bb. You are on BTN.', prompt: 'What is your default action?',
      choices: [{ id: `${id}-a`, label: '3-bet to 8bb', quality: 'best' }, { id: `${id}-b`, label: 'Call', quality: 'ok' }, { id: `${id}-c`, label: 'Fold', quality: 'leak' }],
      explainBest: 'A value 3-bet takes initiative and denies equity against a wide late-position open.',
      explainOk: 'Calling in position can be workable, but leaves more difficult postflop decisions.',
      explainLeak: 'Folding a strong ace-queen here is typically too conservative.',
    };
  }
  return {
    id, tag: 'open', stakesLabel, stackBb: 100, heroPosition: 'CO', holeCards: ['Jh', 'Th'],
    actors: [{ position: 'UTG', state: 'fold' }, { position: 'HJ', state: 'fold' }, { position: 'CO', state: 'toAct' }, { position: 'BTN', state: 'wait' }, { position: 'SB', state: 'wait' }, { position: 'BB', state: 'wait' }],
    actionLine: 'UTG and HJ fold. Action is on you in CO.', prompt: 'What is your default action?',
    choices: [{ id: `${id}-a`, label: 'Raise 2.5bb', quality: 'best' }, { id: `${id}-b`, label: 'Limp', quality: 'ok' }, { id: `${id}-c`, label: 'Fold', quality: 'leak' }],
    explainBest: 'Opening gives you initiative with a hand that has strong positional playability.',
    explainOk: 'Limping can exist in unusual game conditions, but is less clear and harder to balance.',
    explainLeak: 'Folding a playable suited connector from CO is overly cautious.',
  };
}

function sanitizeGeneratedDrill(value: unknown, index: number, stakesLabel: string): GeneratedDrill {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const tag = normalizedTag(raw.tag) ?? (index % 4 === 0 ? 'open' : index % 4 === 1 ? '3bet' : index % 4 === 2 ? 'defend' : 'cbet');
  const fallback = fallbackGeneratedDrill(tag, index, stakesLabel);
  const parsedCards = Array.isArray(raw.holeCards) && raw.holeCards.length === 2 ? raw.holeCards.map(normalizedCard) : [];
  const holeCards = parsedCards.length === 2 && parsedCards.every((card): card is string => card != null)
    ? parsedCards as [string, string]
    : fallback.holeCards;
  const choices = Array.isArray(raw.choices) ? raw.choices.map((choice, choiceIndex) => {
    const item = choice as Record<string, unknown>;
    const label = asText(item.label, 60);
    const quality = item.quality;
    return label && (quality === 'best' || quality === 'ok' || quality === 'leak')
      ? { id: `ai-${index}-${choiceIndex}`, label, quality }
      : null;
  }).filter((choice): choice is GeneratedDrillChoice => choice != null) : [];
  const actors: GeneratedDrill['actors'] = Array.isArray(raw.actors)
    ? raw.actors.reduce<GeneratedDrill['actors']>((validActors, actor) => {
        const item = actor as Record<string, unknown>;
        const position = asText(item.position, 8);
        const rawState = typeof item.state === 'string' ? item.state.toLowerCase().replace('folded', 'fold').replace('hero', 'toAct') : '';
        const state = ACTOR_STATES.has(rawState) ? rawState : null;
        if (!position || !state) return validActors;
        const amountBb = typeof item.amountBb === 'number' && Number.isFinite(item.amountBb) ? item.amountBb : undefined;
        validActors.push(amountBb == null ? { position, state } : { position, state, amountBb });
        return validActors;
      }, [])
    : [];
  const boardValues = Array.isArray(raw.board) && raw.board.length >= 3 && raw.board.length <= 5 ? raw.board.map(normalizedCard) : [];
  const board = boardValues.length >= 3 && boardValues.every((card): card is string => card != null) ? boardValues : fallback.board;
  const heroPosition = asText(raw.heroPosition, 8) ?? fallback.heroPosition;
  const normalizedChoices = choices.length === 3 && choices.filter((choice) => choice.quality === 'best').length === 1 ? choices : fallback.choices;
  return {
    id: `ai-session-${Date.now()}-${index}`,
    tag,
    stakesLabel: asText(raw.stakesLabel, 24) ?? fallback.stakesLabel,
    stackBb: typeof raw.stackBb === 'number' && raw.stackBb >= 20 && raw.stackBb <= 200 ? Math.round(raw.stackBb) : 100,
    heroPosition,
    holeCards,
    board,
    potBb: typeof raw.potBb === 'number' && raw.potBb > 0 && raw.potBb <= 500 ? raw.potBb : fallback.potBb,
    actors: actors.length >= 2 ? actors : fallbackActors(heroPosition),
    actionLine: asText(raw.actionLine) ?? fallback.actionLine,
    prompt: asText(raw.prompt, 100) ?? fallback.prompt,
    choices: normalizedChoices,
    explainBest: asText(raw.explainBest) ?? asText(raw.explanation) ?? fallback.explainBest,
    explainOk: asText(raw.explainOk) ?? fallback.explainOk,
    explainLeak: asText(raw.explainLeak) ?? fallback.explainLeak,
  };
}

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
          gameQuality: doc.postSession.gameQuality,
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
      durationSeconds >= 15 * 60
        ? Math.round(profitLossCents / (durationSeconds / 3600))
        : undefined;

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

  async recommendDrill(userId: string, sessionId: string): Promise<DrillRecommendation> {
    const session = await this.requireOwnedSession(userId, sessionId);
    const dto = toSessionDto(session.toObject());
    const fallback = fallbackDrillRecommendation(dto);
    const payload = JSON.stringify({
      stakes: dto.stakesLabel,
      gameType: dto.gameType,
      venue: dto.venue,
      gameQuality: dto.postSession?.gameQuality ?? null,
      handCount: dto.keyHands.length,
      hands: dto.keyHands.map((hand) => ({
        tags: hand.tags,
        heroPosition: hand.heroPosition,
        potType: hand.potType,
        streets: hand.actions?.map((action) => action.street) ?? [],
        boardCards: hand.board?.length ?? 0,
      })),
      allowedPacks: ['open', '3bet', 'defend', 'cbet'],
    });
    const ai = await recommendDrillWithLlm(this.config, payload);
    const packId = typeof ai?.packId === 'string' && DRILL_PACK_IDS.has(ai.packId as DrillPackId)
      ? ai.packId as DrillPackId
      : fallback.packId;
    const title = typeof ai?.title === 'string' && ai.title.length <= 60 ? ai.title.trim() : fallback.title;
    const reason = typeof ai?.reason === 'string' && ai.reason.length <= 180 ? ai.reason.trim() : fallback.reason;
    const difficulty = ai?.difficulty === 'foundation' || ai?.difficulty === 'standard' || ai?.difficulty === 'advanced'
      ? ai.difficulty
      : fallback.difficulty;
    return { packId, title, reason, difficulty, source: ai ? 'ai' : 'rules' };
  }

  async generateDrill(userId: string, sessionId: string): Promise<GeneratedDrillPlan> {
    const session = await this.requireOwnedSession(userId, sessionId);
    const dto = toSessionDto(session.toObject());
    const payload = JSON.stringify({
      stakes: dto.stakesLabel,
      gameType: dto.gameType,
      venue: dto.venue,
      gameQuality: dto.postSession?.gameQuality ?? null,
      sessionHands: dto.keyHands.map((hand) => ({
        heroPosition: hand.heroPosition,
        villainPositions: hand.villainPositions,
        potType: hand.potType,
        boardCards: hand.board?.length ?? 0,
        tags: hand.tags,
        streets: hand.actions?.map((action) => action.street) ?? [],
      })),
    });
    const ai = await generateDrillWithLlm(this.config, payload);
    const rawDrills = Array.isArray(ai?.drills) ? ai.drills.slice(0, 5) : [];
    const drills = Array.from({ length: 5 }, (_, index) =>
      sanitizeGeneratedDrill(rawDrills[index], index, dto.stakesLabel),
    );
    return {
      title: asText(ai?.title, 60) ?? 'AI session drill',
      subtitle: asText(ai?.subtitle, 160) ?? 'Five new spots generated from your session themes.',
      drills,
      source: 'ai',
    };
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
    mental: { tiltScore: number; energyLevel: number; gameQuality?: 'A' | 'B' | 'C'; notes?: string },
  ) {
    const session = await this.requireOwnedSession(userId, sessionId);
    session.postSession = {
      tiltScore: mental.tiltScore,
      energyLevel: mental.energyLevel,
      gameQuality: mental.gameQuality,
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
        buyInCents: dto.buyInCents,
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
