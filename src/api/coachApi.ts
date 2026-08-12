import { fetch as expoFetch } from 'expo/fetch';
import { apiRequest } from './http';
import { API_BASE } from './config';
import { getAccessToken } from '../auth/session';

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

type StreamHandlers = {
  onDelta: (delta: string) => void;
};

async function streamChat(
  message: string,
  threadId: string | null | undefined,
  { onDelta }: StreamHandlers,
): Promise<CoachThread> {
  const token = await getAccessToken();
  const res = await expoFetch(`${API_BASE}/coach/chat/stream`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, ...(threadId ? { threadId } : {}) }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Coach unavailable (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let thread: CoachThread | null = null;

  const consume = (event: string) => {
    const line = event
      .split('\n')
      .find((candidate) => candidate.startsWith('data: '));
    if (!line) return;
    const payload = JSON.parse(line.slice(6)) as {
      type?: string;
      delta?: string;
      thread?: CoachThread;
      message?: string;
    };
    if (payload.type === 'delta' && payload.delta) onDelta(payload.delta);
    if (payload.type === 'done' && payload.thread) thread = payload.thread;
    if (payload.type === 'error') throw new Error(payload.message || 'Coach unavailable');
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      consume(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  }
  if (buffer.trim()) consume(buffer);
  if (!thread) throw new Error('Coach stream ended unexpectedly');
  return thread;
}

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

  chatStream: (message: string, threadId: string | null | undefined, handlers: StreamHandlers) =>
    streamChat(message, threadId, handlers),

  parseHand: (transcript: string, stakes?: string) =>
    apiRequest<ParsedHandResult>('/coach/parse-hand', {
      method: 'POST',
      body: JSON.stringify({ transcript, stakes }),
    }),
};
