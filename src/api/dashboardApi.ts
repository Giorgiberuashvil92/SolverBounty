import { apiRequest } from './http';
import type {
  DashboardSnapshot,
  KeyHand,
  PokerSession,
  PreSessionChecklist,
} from '../types/session';

export type ReviewsPayload = {
  sessions: Array<{
    id: string;
    stakesLabel: string;
    status: string;
    startedAt?: string;
    endedAt?: string;
    profitLossCents?: number;
    durationSeconds: number;
    keyHandsCount: number;
    toReviewCount: number;
  }>;
  keyHands: Array<
    KeyHand & { stakesLabel?: string; sessionStartedAt?: string }
  >;
  toReview: Array<
    KeyHand & { stakesLabel?: string; sessionStartedAt?: string }
  >;
};

export const dashboardApi = {
  getSnapshot: () => apiRequest<DashboardSnapshot>('/dashboard'),

  getReviews: () => apiRequest<ReviewsPayload>('/reviews'),

  setupBankroll: (amountCents: number, currency = 'USD') =>
    apiRequest<DashboardSnapshot>('/bankroll/setup', {
      method: 'POST',
      body: JSON.stringify({ amountCents, currency }),
    }),

  deposit: (amountCents: number, note?: string) =>
    apiRequest<DashboardSnapshot>('/bankroll/deposit', {
      method: 'POST',
      body: JSON.stringify({ amountCents, note }),
    }),

  withdraw: (amountCents: number, note?: string) =>
    apiRequest<DashboardSnapshot>('/bankroll/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amountCents, note }),
    }),

  startSession: (input: {
    stakesLabel: string;
    buyInCents: number;
    preSession?: PreSessionChecklist;
  }) =>
    apiRequest<PokerSession>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  endSession: (sessionId: string, cashOutCents: number) =>
    apiRequest<PokerSession>(`/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({ cashOutCents }),
    }),

  updateChecklist: (sessionId: string, checklist: PreSessionChecklist) =>
    apiRequest<PokerSession>(`/sessions/${sessionId}/checklist`, {
      method: 'PATCH',
      body: JSON.stringify({
        hydration: checklist.hydration,
        warmup: checklist.warmup,
        focusLevel: checklist.focusLevel,
      }),
    }),

  updateMental: (
    sessionId: string,
    mental: { tiltScore: number; energyLevel: number; notes?: string },
  ) =>
    apiRequest<PokerSession>(`/sessions/${sessionId}/mental`, {
      method: 'PATCH',
      body: JSON.stringify(mental),
    }),

  addKeyHand: (
    sessionId: string,
    hand: {
      source: KeyHand['source'];
      tags: string[];
      heroPosition?: string;
      villainPositions?: string[];
      holeCards?: string[];
      board?: string[];
      resultBb?: number;
      aiSummary?: string;
      rawInput?: string;
      stakes?: string;
      potType?: KeyHand['potType'];
      tableSize?: number;
      actions?: KeyHand['actions'];
    },
  ) =>
    apiRequest<KeyHand>(`/sessions/${sessionId}/key-hands`, {
      method: 'POST',
      body: JSON.stringify(hand),
    }),

  analyzeKeyHand: (sessionId: string, handId: string) =>
    apiRequest<KeyHand>(
      `/sessions/${sessionId}/key-hands/${handId}/analyze`,
      { method: 'POST' },
    ),

  markHandReviewed: (sessionId: string, handId: string) =>
    apiRequest<KeyHand>(
      `/sessions/${sessionId}/key-hands/${handId}/reviewed`,
      { method: 'POST' },
    ),
};
