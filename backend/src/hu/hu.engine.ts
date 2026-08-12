/** Pure NLHE heads-up engine — authoritative server state. */

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type HuActionType =
  'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

export type LegalAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call'; amount: number }
  | { type: 'bet'; min: number; max: number }
  | { type: 'raise'; min: number; max: number }
  | { type: 'all_in'; amount: number };

export type ClientAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number }
  | { type: 'all_in' };

export type HuPlayer = {
  userId: string;
  displayName: string;
  stack: number;
  /** Chips contributed this street */
  bet: number;
  /** Total chips in pot this hand */
  contributed: number;
  hole: [string, string] | null;
  folded: boolean;
  allIn: boolean;
};

export type HuPublicPlayer = {
  userId: string;
  displayName: string;
  stack: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  isButton: boolean;
  hole: [string, string] | null;
};

export type HuView = {
  tableId: string;
  status: 'active' | 'hand_over' | 'match_over';
  street: Street | 'showdown' | 'match_over';
  board: string[];
  pot: number;
  sb: number;
  bb: number;
  nextSb: number;
  nextBb: number;
  handsUntilLevel: number;
  handNumber: number;
  actorUserId: string | null;
  toCall: number;
  legalActions: LegalAction[];
  players: HuPublicPlayer[];
  heroUserId: string;
  winnerUserId: string | null;
  winnerName: string | null;
  showdown: boolean;
  lastAction: { userId: string; label: string } | null;
  actionDeadlineMs: number | null;
  actionMs: number;
};

export type HuMatchConfig = {
  tableId: string;
  startingStack?: number;
  sb?: number;
  bb?: number;
  handsPerLevel?: number;
  actionMs?: number;
};

const RANKS = '23456789TJQKA';
const SUITS = 'cdhs';

const BLIND_LEVELS: Array<[number, number]> = [
  [5, 10],
  [10, 20],
  [15, 30],
  [25, 50],
  [50, 100],
  [75, 150],
  [100, 200],
  [150, 300],
  [200, 400],
  [300, 600],
];

function makeDeck(): string[] {
  const deck: string[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) deck.push(`${r}${s}`);
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function rankValue(card: string): number {
  return RANKS.indexOf(card[0].toUpperCase());
}

function suitValue(card: string): string {
  return card[1].toLowerCase();
}

/** 7-card → best 5-card score (higher better). */
export function evaluateSeven(cards: string[]): number {
  if (cards.length < 5) return 0;
  let best = 0;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const score = evaluateFive([
              cards[a],
              cards[b],
              cards[c],
              cards[d],
              cards[e],
            ]);
            if (score > best) best = score;
          }
        }
      }
    }
  }
  return best;
}

function evaluateFive(cards: string[]): number {
  const ranks = cards.map(rankValue).sort((x, y) => y - x);
  const suits = cards.map(suitValue);
  const flush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = -1;
  const wheel = [12, 3, 2, 1, 0];
  if (wheel.every((r) => ranks.includes(r))) straightHigh = 3;
  for (let i = 0; i <= uniq.length - 5; i++) {
    if (uniq[i] - uniq[i + 4] === 4) {
      straightHigh = uniq[i]!;
      break;
    }
  }
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const byCount = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const cat = (c: number, kickers: number[]) =>
    c * 1e10 + kickers.reduce((acc, k, i) => acc + k * 10 ** (8 - 2 * i), 0);

  if (flush && straightHigh >= 0) return cat(8, [straightHigh]);
  if (byCount[0]?.[1] === 4) {
    return cat(7, [byCount[0][0], byCount[1]?.[0] ?? 0]);
  }
  if (byCount[0]?.[1] === 3 && byCount[1]?.[1] === 2) {
    return cat(6, [byCount[0][0], byCount[1][0]]);
  }
  if (flush) return cat(5, ranks);
  if (straightHigh >= 0) return cat(4, [straightHigh]);
  if (byCount[0]?.[1] === 3) {
    return cat(3, [byCount[0][0], byCount[1]?.[0] ?? 0, byCount[2]?.[0] ?? 0]);
  }
  if (byCount[0]?.[1] === 2 && byCount[1]?.[1] === 2) {
    const hi = Math.max(byCount[0][0], byCount[1][0]);
    const lo = Math.min(byCount[0][0], byCount[1][0]);
    return cat(2, [hi, lo, byCount[2]?.[0] ?? 0]);
  }
  if (byCount[0]?.[1] === 2) {
    return cat(1, [
      byCount[0][0],
      byCount[1]?.[0] ?? 0,
      byCount[2]?.[0] ?? 0,
      byCount[3]?.[0] ?? 0,
    ]);
  }
  return cat(0, ranks);
}

export function handLabel(cards: string[]): string {
  const score = evaluateSeven(cards);
  const cat = Math.floor(score / 1e10);
  const labels = [
    'High Card',
    'One Pair',
    'Two Pair',
    'Trips',
    'Straight',
    'Flush',
    'Full House',
    'Quads',
    'Straight Flush',
  ];
  return labels[cat] ?? 'Hand';
}

export class HuEngine {
  readonly tableId: string;
  players: [HuPlayer, HuPlayer];
  button = 0 as 0 | 1;
  street: Street | 'showdown' | 'match_over' = 'preflop';
  board: string[] = [];
  pot = 0;
  deck: string[] = [];
  actor: 0 | 1 | null = null;
  sb: number;
  bb: number;
  levelIndex = 0;
  handsPerLevel: number;
  handsUntilLevel: number;
  handNumber = 0;
  /** Players who have acted since the last aggression (or street start). */
  acted: Set<0 | 1> = new Set();
  lastFullRaiseSize: number;
  winnerUserId: string | null = null;
  lastAction: { userId: string; label: string } | null = null;
  actionMs: number;
  actionDeadlineMs: number | null = null;
  status: 'active' | 'hand_over' | 'match_over' = 'active';
  showdown = false;
  private startingStack: number;

  constructor(
    p0: { userId: string; displayName: string },
    p1: { userId: string; displayName: string },
    config: HuMatchConfig,
  ) {
    this.tableId = config.tableId;
    this.startingStack = config.startingStack ?? 500;
    this.sb = config.sb ?? 5;
    this.bb = config.bb ?? 10;
    this.handsPerLevel = config.handsPerLevel ?? 4;
    this.handsUntilLevel = this.handsPerLevel;
    this.actionMs = config.actionMs ?? 20_000;
    this.lastFullRaiseSize = this.bb;
    this.players = [
      {
        userId: p0.userId,
        displayName: p0.displayName,
        stack: this.startingStack,
        bet: 0,
        contributed: 0,
        hole: null,
        folded: false,
        allIn: false,
      },
      {
        userId: p1.userId,
        displayName: p1.displayName,
        stack: this.startingStack,
        bet: 0,
        contributed: 0,
        hole: null,
        folded: false,
        allIn: false,
      },
    ];
    this.startHand();
  }

  private other(i: 0 | 1): 0 | 1 {
    return i === 0 ? 1 : 0;
  }

  private idxOf(userId: string): 0 | 1 | -1 {
    if (this.players[0].userId === userId) return 0;
    if (this.players[1].userId === userId) return 1;
    return -1;
  }

  private nextBlinds(): [number, number] {
    const next =
      BLIND_LEVELS[Math.min(this.levelIndex + 1, BLIND_LEVELS.length - 1)];
    return next;
  }

  startHand() {
    if (this.players[0].stack <= 0 || this.players[1].stack <= 0) {
      this.finishMatch();
      return;
    }

    if (this.handNumber > 0) {
      this.handsUntilLevel -= 1;
      if (this.handsUntilLevel <= 0) {
        this.levelIndex = Math.min(
          this.levelIndex + 1,
          BLIND_LEVELS.length - 1,
        );
        const [nsb, nbb] = BLIND_LEVELS[this.levelIndex];
        this.sb = nsb;
        this.bb = nbb;
        this.handsUntilLevel = this.handsPerLevel;
      } else {
        // button moves each hand
      }
      this.button = this.other(this.button);
    }

    this.handNumber += 1;
    this.status = 'active';
    this.showdown = false;
    this.street = 'preflop';
    this.board = [];
    this.pot = 0;
    this.deck = makeDeck();
    this.lastFullRaiseSize = this.bb;
    this.lastAction = null;
    this.winnerUserId = null;

    for (const p of this.players) {
      p.bet = 0;
      p.contributed = 0;
      p.folded = false;
      p.allIn = false;
      p.hole = [this.deck.pop()!, this.deck.pop()!];
    }

    // HU: button = SB, other = BB
    const sbI = this.button;
    const bbI = this.other(this.button);
    this.postBlind(sbI, this.sb);
    this.postBlind(bbI, this.bb);

    // Preflop: SB/button acts first
    this.actor = sbI;
    this.acted = new Set();
    this.armTimer();
  }

  private postBlind(i: 0 | 1, amount: number) {
    const p = this.players[i];
    const pay = Math.min(amount, p.stack);
    p.stack -= pay;
    p.bet += pay;
    p.contributed += pay;
    this.pot += pay;
    if (p.stack === 0) p.allIn = true;
  }

  private armTimer() {
    this.actionDeadlineMs = Date.now() + this.actionMs;
  }

  private clearTimer() {
    this.actionDeadlineMs = null;
  }

  maxBet(): number {
    return Math.max(this.players[0].bet, this.players[1].bet);
  }

  toCallFor(i: 0 | 1): number {
    return Math.max(0, this.maxBet() - this.players[i].bet);
  }

  legalActions(userId: string): LegalAction[] {
    if (this.status !== 'active' || this.actor == null) return [];
    const i = this.idxOf(userId);
    if (i < 0 || i !== this.actor) return [];
    const p = this.players[i];
    if (p.folded || p.allIn) return [];

    const toCall = this.toCallFor(i);
    const actions: LegalAction[] = [{ type: 'fold' }];

    if (toCall === 0) {
      actions.push({ type: 'check' });
      const max = p.stack;
      const min = Math.min(this.bb, max);
      if (max > 0) {
        if (max <= min) {
          actions.push({ type: 'all_in', amount: max });
        } else {
          actions.push({ type: 'bet', min, max });
          actions.push({ type: 'all_in', amount: max });
        }
      }
    } else {
      const callAmt = Math.min(toCall, p.stack);
      actions.push({ type: 'call', amount: callAmt });
      const max = p.stack;
      // min raise: toCall + lastFullRaiseSize, total chips to put in
      const minRaiseTotal = toCall + this.lastFullRaiseSize;
      if (max > toCall) {
        if (max <= minRaiseTotal) {
          actions.push({ type: 'all_in', amount: max });
        } else {
          actions.push({ type: 'raise', min: minRaiseTotal, max });
          actions.push({ type: 'all_in', amount: max });
        }
      }
    }
    return actions;
  }

  applyAction(userId: string, action: ClientAction): void {
    if (this.status !== 'active' || this.actor == null) {
      throw new Error('Not your turn');
    }
    const i = this.idxOf(userId);
    if (i < 0 || i !== this.actor) throw new Error('Not your turn');

    const p = this.players[i];
    const toCall = this.toCallFor(i);
    const legal = this.legalActions(userId);

    const put = (amount: number) => {
      const pay = Math.min(amount, p.stack);
      p.stack -= pay;
      p.bet += pay;
      p.contributed += pay;
      this.pot += pay;
      if (p.stack === 0) p.allIn = true;
      return pay;
    };

    if (action.type === 'fold') {
      if (!legal.some((a) => a.type === 'fold')) throw new Error('Illegal');
      p.folded = true;
      this.lastAction = { userId, label: 'Fold' };
      this.awardFold(this.other(i));
      return;
    }

    if (action.type === 'check') {
      if (!legal.some((a) => a.type === 'check')) throw new Error('Illegal');
      this.lastAction = { userId, label: 'Check' };
      this.acted.add(i);
      this.advanceAfterPassive(i);
      return;
    }

    if (action.type === 'call') {
      const callLegal = legal.find((a) => a.type === 'call');
      if (!callLegal || callLegal.type !== 'call') throw new Error('Illegal');
      put(callLegal.amount);
      this.lastAction = { userId, label: `Call ${callLegal.amount}` };
      this.acted.add(i);
      this.advanceAfterPassive(i);
      return;
    }

    if (action.type === 'bet' || action.type === 'raise') {
      const kind = action.type;
      const spec = legal.find((a) => a.type === kind);
      if (!spec || (spec.type !== 'bet' && spec.type !== 'raise')) {
        throw new Error('Illegal');
      }
      const amount = action.amount;
      if (amount < spec.min || amount > spec.max) throw new Error('Bad size');
      const prevMax = this.maxBet();
      put(amount);
      const raiseSize = this.players[i].bet - prevMax;
      if (raiseSize >= this.lastFullRaiseSize) {
        this.lastFullRaiseSize = raiseSize;
      }
      this.lastAction = {
        userId,
        label:
          kind === 'bet' ? `Bet ${amount}` : `Raise to ${this.players[i].bet}`,
      };
      this.acted = new Set([i]);
      this.passTurnTo(this.other(i));
      return;
    }

    if (action.type === 'all_in') {
      const max = p.stack;
      if (max <= 0) throw new Error('Illegal');
      const prevMax = this.maxBet();
      put(max);
      const wasRaise = this.players[i].bet > prevMax;
      const raiseSize = this.players[i].bet - prevMax;
      this.lastAction = { userId, label: 'All-in' };
      if (wasRaise && raiseSize >= this.lastFullRaiseSize) {
        this.lastFullRaiseSize = Math.max(raiseSize, this.lastFullRaiseSize);
      }
      if (wasRaise) {
        this.acted = new Set([i]);
        const opp = this.other(i);
        if (this.players[opp].allIn || this.players[opp].folded) {
          this.runoutToShowdown();
        } else {
          this.passTurnTo(opp);
        }
      } else {
        this.acted.add(i);
        this.advanceAfterPassive(i);
      }
      return;
    }

    throw new Error('Unknown action');
  }

  /** Auto-action on timeout */
  timeoutAction(): void {
    if (this.actor == null || this.status !== 'active') return;
    const userId = this.players[this.actor].userId;
    const toCall = this.toCallFor(this.actor);
    if (toCall === 0) {
      this.applyAction(userId, { type: 'check' });
    } else {
      this.applyAction(userId, { type: 'fold' });
    }
  }

  private activeSeat(i: 0 | 1): boolean {
    return !this.players[i].folded && !this.players[i].allIn;
  }

  private passTurnTo(i: 0 | 1) {
    if (!this.activeSeat(i)) {
      this.runoutToShowdown();
      return;
    }
    this.actor = i;
    this.armTimer();
  }

  private advanceAfterPassive(actor: 0 | 1) {
    const live = ([0, 1] as const).filter((i) => !this.players[i].folded);
    if (live.length === 1) {
      this.awardFold(live[0]);
      return;
    }

    const active = ([0, 1] as const).filter((i) => this.activeSeat(i));
    if (active.length === 0) {
      this.runoutToShowdown();
      return;
    }
    if (active.length === 1) {
      // Facing all-in: if bets matched, runout; else that player still to act
      const opp = this.other(active[0]);
      if (this.players[active[0]].bet >= this.players[opp].bet) {
        this.runoutToShowdown();
      } else {
        this.passTurnTo(active[0]);
      }
      return;
    }

    const betsMatched = this.players[0].bet === this.players[1].bet;
    const bothActed = this.acted.has(0) && this.acted.has(1);

    if (betsMatched && bothActed) {
      this.nextStreet();
      return;
    }

    const next = this.other(actor);
    if (this.activeSeat(next) && !this.acted.has(next)) {
      this.passTurnTo(next);
      return;
    }

    if (betsMatched) {
      this.nextStreet();
      return;
    }

    this.passTurnTo(next);
  }

  private resetStreetBets() {
    for (const p of this.players) p.bet = 0;
    this.lastFullRaiseSize = this.bb;
    this.acted = new Set();
  }

  private nextStreet() {
    this.resetStreetBets();
    this.clearTimer();

    if (this.street === 'preflop') {
      this.street = 'flop';
      this.board.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
    } else if (this.street === 'flop') {
      this.street = 'turn';
      this.board.push(this.deck.pop()!);
    } else if (this.street === 'turn') {
      this.street = 'river';
      this.board.push(this.deck.pop()!);
    } else if (this.street === 'river') {
      this.doShowdown();
      return;
    }

    const active = ([0, 1] as const).filter((i) => this.activeSeat(i));
    if (active.length < 2) {
      this.runoutToShowdown();
      return;
    }

    // Postflop: BB (non-button) acts first
    const first = this.other(this.button);
    this.actor = first;
    this.acted = new Set();
    this.armTimer();
  }

  private runoutToShowdown() {
    this.actor = null;
    this.clearTimer();
    while (this.board.length < 5) {
      this.board.push(this.deck.pop()!);
    }
    this.doShowdown();
  }

  private doShowdown() {
    this.showdown = true;
    this.street = 'showdown';
    this.actor = null;
    this.clearTimer();
    this.status = 'hand_over';

    const a = this.players[0];
    const b = this.players[1];
    if (a.folded) {
      this.awardPot(1);
      return;
    }
    if (b.folded) {
      this.awardPot(0);
      return;
    }

    const scoreA = evaluateSeven([...(a.hole ?? []), ...this.board]);
    const scoreB = evaluateSeven([...(b.hole ?? []), ...this.board]);
    if (scoreA > scoreB) this.awardPot(0);
    else if (scoreB > scoreA) this.awardPot(1);
    else this.awardPotSplit();
  }

  private awardFold(winner: 0 | 1) {
    this.actor = null;
    this.clearTimer();
    this.status = 'hand_over';
    this.street = 'showdown';
    this.awardPot(winner);
  }

  private awardPot(winner: 0 | 1) {
    this.players[winner].stack += this.pot;
    this.pot = 0;
    this.winnerUserId = this.players[winner].userId;
    this.checkMatchOver();
  }

  private awardPotSplit() {
    const half = Math.floor(this.pot / 2);
    this.players[0].stack += half;
    this.players[1].stack += this.pot - half;
    this.pot = 0;
    this.winnerUserId = null;
    this.checkMatchOver();
  }

  private checkMatchOver() {
    if (this.players[0].stack <= 0 || this.players[1].stack <= 0) {
      this.finishMatch();
    }
  }

  private finishMatch() {
    this.status = 'match_over';
    this.street = 'match_over';
    this.actor = null;
    this.clearTimer();
    if (this.players[0].stack > this.players[1].stack) {
      this.winnerUserId = this.players[0].userId;
    } else if (this.players[1].stack > this.players[0].stack) {
      this.winnerUserId = this.players[1].userId;
    }
  }

  /** Force win for opponent of loserId (disconnect forfeit). */
  forfeit(loserId: string) {
    const loser = this.idxOf(loserId);
    if (loser !== 0 && loser !== 1) return;
    this.players[loser].stack = 0;
    this.winnerUserId = this.players[this.other(loser)].userId;
    this.finishMatch();
  }

  /** Start next hand if match continues */
  continueIfNeeded(): boolean {
    if (this.status === 'match_over') return false;
    if (this.status === 'hand_over') {
      this.startHand();
      return true;
    }
    return false;
  }

  viewFor(heroUserId: string): HuView {
    const [nsb, nbb] = this.nextBlinds();
    const heroIdx = this.idxOf(heroUserId);
    const legal =
      heroIdx >= 0 && this.actor === heroIdx
        ? this.legalActions(heroUserId)
        : [];

    return {
      tableId: this.tableId,
      status: this.status,
      street: this.street,
      board: [...this.board],
      pot: this.pot,
      sb: this.sb,
      bb: this.bb,
      nextSb: nsb,
      nextBb: nbb,
      handsUntilLevel: this.handsUntilLevel,
      handNumber: this.handNumber,
      actorUserId: this.actor != null ? this.players[this.actor].userId : null,
      toCall: heroIdx >= 0 ? this.toCallFor(heroIdx as 0 | 1) : 0,
      legalActions: legal,
      players: this.players.map((p, i) => ({
        userId: p.userId,
        displayName: p.displayName,
        stack: p.stack,
        bet: p.bet,
        folded: p.folded,
        allIn: p.allIn,
        isButton: this.button === i,
        hole: p.userId === heroUserId || this.showdown ? p.hole : null,
      })),
      heroUserId,
      winnerUserId: this.winnerUserId,
      winnerName: this.winnerUserId
        ? (this.players.find((p) => p.userId === this.winnerUserId)
            ?.displayName ?? null)
        : null,
      showdown: this.showdown,
      lastAction: this.lastAction,
      actionDeadlineMs: this.actionDeadlineMs,
      actionMs: this.actionMs,
    };
  }
}
