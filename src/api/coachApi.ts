import { apiRequest } from './http';

export type CoachMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export type CoachThread = {
  id: string | null;
  messages: CoachMessage[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type CoachThreadSummary = {
  id: string;
  preview: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ParsedHandResult = {
  confidence: number;
  needsClarification: boolean;
  clarifyingQuestions: string[];
  source?: 'llm' | 'heuristic';
  hand: {
    stakes?: string | null;
    heroPosition?: string | null;
    villainPositions?: string[];
    heroHoleCards?: string[];
    board?: string[];
    potType?: string | null;
    resultBb?: number | null;
    tags?: string[];
    summary?: string;
    rawNormalized?: string;
  };
};

export const coachApi = {
  listThreads: () => apiRequest<CoachThreadSummary[]>('/coach/threads'),

  getThread: (threadId?: string) =>
    apiRequest<CoachThread>(threadId ? `/coach/thread/${threadId}` : '/coach/thread'),

  newThread: () =>
    apiRequest<CoachThread>('/coach/thread/new', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  deleteThread: (threadId: string) =>
    apiRequest<{ ok: true; id: string }>(`/coach/thread/${threadId}`, {
      method: 'DELETE',
    }),

  chat: (message: string, threadId?: string | null) =>
    apiRequest<CoachThread>('/coach/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        ...(threadId ? { threadId } : {}),
      }),
    }),

  parseHand: (transcript: string, stakes?: string) =>
    apiRequest<ParsedHandResult>('/coach/parse-hand', {
      method: 'POST',
      body: JSON.stringify({ transcript, stakes }),
    }),
};
