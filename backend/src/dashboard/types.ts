export type MoneyCents = number;

export type BankrollLedgerType =
  'deposit' | 'withdrawal' | 'session_result' | 'adjustment';

export type BankrollLedgerEntry = {
  id: string;
  type: BankrollLedgerType;
  amountCents: MoneyCents;
  currency: string;
  note?: string;
  createdAt: string;
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
  focusLevel: number;
  completedAt?: string;
};

export type PostSessionMental = {
  tiltScore: number;
  energyLevel: number;
  gameQuality?: 'A' | 'B' | 'C';
  notes?: string;
  reviewCompleted: boolean;
  completedAt?: string;
};

export type KeyHand = {
  id: string;
  sessionId: string;
  createdAt: string;
  source: 'text' | 'voice' | 'screenshot_ocr' | 'manual';
  rawInput?: string;
  tags: string[];
  heroPosition?: string;
  villainPositions?: string[];
  stakes?: string;
  board?: string[];
  holeCards?: string[];
  potType?: 'srp' | '3bet' | '4bet' | '5bet' | '6bet' | 'limped' | 'iso';
  tableSize?: number;
  actions?: Array<{
    street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    actor: string;
    action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
    sizeBb?: number;
    potBbAfter?: number;
  }>;
  resultBb?: number;
  aiSummary?: string;
  aiAnalysis?: string;
  reviewStatus?: 'to_review' | 'reviewed';
  aiAnalyzedAt?: string;
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
  date: string;
  bankrollInitialized: boolean;
  bankroll: Bankroll | null;
  activeSession: PokerSession | null;
  todaysSessions: PokerSession[];
  todaysProfitCents: MoneyCents;
  streakDays: number;
};
