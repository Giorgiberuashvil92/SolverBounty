export type LeaderboardEntry = {
  id: string;
  name: string;
  lp: number;
  accuracy: number;
  answered: number;
  huWins?: number;
  huLosses?: number;
  huPlayed?: number;
  isYou?: boolean;
};

export type DrillPrize = {
  place: string;
  title: string;
  detail: string;
  tone: 'gold' | 'silver' | 'bronze' | 'mint';
};

/** Spot scoring — matches premium LP model. */
export function lpForQuality(quality: 'best' | 'ok' | 'leak'): number {
  if (quality === 'best') return 100;
  if (quality === 'ok') return 40;
  return 0;
}

export function accuracyPct(best: number, ok: number, answered: number): number {
  if (!answered) return 0;
  return Math.round(((best + 0.4 * ok) / answered) * 100);
}

export const WEEKLY_PRIZES: DrillPrize[] = [
  {
    place: '1st',
    title: 'Premium · 1 month',
    detail: 'Full ranked drills + coach unlock',
    tone: 'gold',
  },
  {
    place: '2nd',
    title: '$50 coaching credit',
    detail: 'Redeem toward 1:1 review session',
    tone: 'silver',
  },
  {
    place: '3rd',
    title: 'Premium · 2 weeks',
    detail: 'Leaderboard + hard packs',
    tone: 'bronze',
  },
  {
    place: '4–10',
    title: 'Badge · Weekly Grinder',
    detail: 'Profile flair in Community',
    tone: 'mint',
  },
];

/** Stable mock field for the weekly board (until server ranks ship). */
export const MOCK_RIVALS: Omit<LeaderboardEntry, 'isYou'>[] = [
  { id: 'r1', name: 'NovaBTN', lp: 1420, accuracy: 88, answered: 16 },
  { id: 'r2', name: 'FeltFox', lp: 1280, accuracy: 84, answered: 16 },
  { id: 'r3', name: 'RiverKin', lp: 1190, accuracy: 79, answered: 15 },
  { id: 'r4', name: 'GTO_Gabe', lp: 1050, accuracy: 76, answered: 14 },
  { id: 'r5', name: 'BlitzSB', lp: 980, accuracy: 72, answered: 16 },
  { id: 'r6', name: 'ChipNest', lp: 860, accuracy: 70, answered: 13 },
  { id: 'r7', name: 'AceRail', lp: 740, accuracy: 68, answered: 12 },
  { id: 'r8', name: 'PotOddsPat', lp: 620, accuracy: 64, answered: 11 },
  { id: 'r9', name: 'FoldEquity', lp: 510, accuracy: 61, answered: 10 },
  { id: 'r10', name: 'MicroMike', lp: 390, accuracy: 55, answered: 9 },
];

export function buildWeeklyBoard(args: {
  displayName: string;
  lp: number;
  best: number;
  ok: number;
  answered: number;
}): { rows: LeaderboardEntry[]; youRank: number; you: LeaderboardEntry } {
  const you: LeaderboardEntry = {
    id: 'you',
    name: args.displayName || 'You',
    lp: args.lp,
    accuracy: accuracyPct(args.best, args.ok, args.answered),
    answered: args.answered,
    isYou: true,
  };

  const merged: LeaderboardEntry[] = [...MOCK_RIVALS, you].sort((a, b) => {
    if (b.lp !== a.lp) return b.lp - a.lp;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.answered - a.answered;
  });

  const youRank = merged.findIndex((r) => r.isYou) + 1;
  return { rows: merged, youRank, you };
}

export function prizeForRank(rank: number): DrillPrize | null {
  if (rank === 1) return WEEKLY_PRIZES[0];
  if (rank === 2) return WEEKLY_PRIZES[1];
  if (rank === 3) return WEEKLY_PRIZES[2];
  if (rank >= 4 && rank <= 10) return WEEKLY_PRIZES[3];
  return null;
}

export function medalForRank(rank: number): string {
  if (rank === 1) return '1';
  if (rank === 2) return '2';
  if (rank === 3) return '3';
  return String(rank);
}
