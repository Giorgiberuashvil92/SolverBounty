/**
 * Domain model for Daily Poker Dashboard.
 * Mirrors the JSON persistence schema used by local store / backend.
 */

export type MoneyCents = number;

export type BankrollLedgerType = 'deposit' | 'withdrawal' | 'session_result' | 'adjustment';

export type BankrollLedgerEntry = {
  id: string;
  type: BankrollLedgerType;
  amountCents: MoneyCents;
  currency: string;
  note?: string;
  createdAt: string; // ISO-8601
};

export type Bankroll = {
  currency: string;
  currentCents: MoneyCents;
  startingOfDayCents: MoneyCents;
  ledger: BankrollLedgerEntry[];
};

export type SessionStatus = 'idle' | 'precheck' | 'live' | 'ended';

export type PreSessionChecklist = {
  hydration: boolean;
  warmup: boolean;
  focusLevel: number; // 1–10
  completedAt?: string;
};

export type PostSessionMental = {
  tiltScore: number; // 1–10 (10 = severe tilt)
  energyLevel: number; // 1–10
  gameQuality?: 'A' | 'B' | 'C';
  notes?: string;
  reviewCompleted: boolean;
  completedAt?: string;
};

export type KeyHandSource = 'text' | 'voice' | 'screenshot_ocr' | 'manual';

export type KeyHandTag =
  | 'bluff'
  | 'value'
  | 'missed_value'
  | 'bad_fold'
  | 'cooler'
  | 'tilt'
  | 'icm'
  | 'multiway'
  | 'study'
  | string;

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type PokerActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export type StructuredAction = {
  street: Street;
  actor: string; // position or hero/villain label
  action: PokerActionType;
  sizeBb?: number;
  potBbAfter?: number;
};

export type KeyHand = {
  id: string;
  sessionId: string;
  createdAt: string;
  source: KeyHandSource;
  rawInput?: string;
  tags: KeyHandTag[];
  heroPosition?: string;
  villainPositions?: string[];
  stakes?: string;
  board?: string[];
  holeCards?: string[];
  potType?: 'srp' | '3bet' | '4bet' | '5bet' | '6bet' | 'limped' | 'iso';
  tableSize?: number;
  actions?: StructuredAction[];
  resultBb?: number;
  aiSummary?: string;
  aiAnalysis?: string;
  reviewStatus?: 'to_review' | 'reviewed';
  aiAnalyzedAt?: string;
  shareTargets?: Array<'study_group' | 'discord' | 'telegram'>;
  voiceNoteUri?: string;
  screenshotUri?: string;
};

export type PokerSession = {
  id: string;
  userId: string;
  status: SessionStatus;
  gameType: 'cash' | 'mtt' | 'spins' | 'home_game';
  venue: 'online' | 'live';
  stakesLabel: string;
  startedAt?: string;
  endedAt?: string;
  /** Wall-clock seconds while session is live (excludes pauses). */
  durationSeconds: number;
  buyInCents: MoneyCents;
  cashOutCents?: MoneyCents;
  profitLossCents?: MoneyCents;
  hourlyRateCents?: MoneyCents;
  currency: string;
  preSession?: PreSessionChecklist;
  postSession?: PostSessionMental;
  keyHands: KeyHand[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSnapshot = {
  date: string; // YYYY-MM-DD local
  bankrollInitialized: boolean;
  bankroll: Bankroll | null;
  activeSession: PokerSession | null;
  todaysSessions: PokerSession[];
  todaysProfitCents: MoneyCents;
  streakDays: number;
};
