import type { DashboardSnapshot, PokerSession } from '../../types/session';

const SESSION_ID = 'ses_20260809_001';

export const MOCK_LIVE_SESSION: PokerSession = {
  id: SESSION_ID,
  userId: 'user_gio',
  status: 'live',
  gameType: 'cash',
  venue: 'online',
  stakesLabel: 'NL50',
  startedAt: new Date(Date.now() - 1000 * 60 * 87).toISOString(),
  durationSeconds: 87 * 60 + 14,
  buyInCents: 5000,
  currency: 'USD',
  preSession: {
    hydration: true,
    warmup: true,
    focusLevel: 8,
    completedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  keyHands: [
    {
      id: 'kh_001',
      sessionId: SESSION_ID,
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      source: 'voice',
      tags: ['bluff', 'study'],
      heroPosition: 'BTN',
      villainPositions: ['BB'],
      stakes: 'NL50',
      holeCards: ['As', '5s'],
      board: ['Kh', '7s', '2d', '9c', '3s'],
      potType: 'srp',
      resultBb: 18,
      aiSummary: 'River bluff vs capped BB — size & blocker OK.',
      rawInput: 'Button A5s vs BB, flop K72ss, I bet small turn nine, river three I jammed',
    },
    {
      id: 'kh_002',
      sessionId: SESSION_ID,
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      source: 'text',
      tags: ['missed_value'],
      heroPosition: 'CO',
      villainPositions: ['BTN'],
      stakes: 'NL50',
      holeCards: ['Qh', 'Qd'],
      board: ['Qc', '8d', '2h', '5s'],
      potType: '3bet',
      resultBb: 4,
      aiSummary: 'Under-bet turn with top set — missed thicker value.',
    },
  ],
  createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_DASHBOARD: DashboardSnapshot = {
  date: '2026-08-09',
  bankrollInitialized: true,
  bankroll: {
    currency: 'USD',
    currentCents: 428500,
    startingOfDayCents: 420000,
    ledger: [
      {
        id: 'led_1',
        type: 'deposit',
        amountCents: 100000,
        currency: 'USD',
        note: 'Reload',
        createdAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'led_2',
        type: 'session_result',
        amountCents: 8500,
        currency: 'USD',
        note: 'NL50 session',
        createdAt: '2026-08-09T01:00:00.000Z',
      },
    ],
  },
  activeSession: MOCK_LIVE_SESSION,
  todaysSessions: [MOCK_LIVE_SESSION],
  todaysProfitCents: 8500,
  streakDays: 12,
};
