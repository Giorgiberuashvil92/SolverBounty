import { ConfigService } from '@nestjs/config';

const VOICE_TO_HAND_SYSTEM = `You are a poker hand-history parser for a daily grinder coaching app.
Convert the user's spoken or typed description into STRICT JSON only (no markdown).
Schema: { confidence, needsClarification, clarifyingQuestions, hand: { gameType, venue, stakes, tableSize, heroPosition, villainPositions, heroHoleCards, board, potType, effectiveStackBb, actions, resultBb, resultText, tags, summary, rawNormalized } }
Cards: rank+suit As Kd Th. Positions: UTG LJ HJ CO BTN SB BB.`;

const COACH_SYSTEM = `You are a sharp but calm poker coach for cash/MTT grinders.
Give concise, actionable advice (max ~180 words). Prefer ranges, sizings, and one clear next step.
No fluff. If info is missing, ask one clarifying question.
Reply in plain text only: no Markdown, no asterisks, no headings, no bullet characters, and no tables.
You receive text only. Never claim to see a screenshot, cards, board, bet size, stack depth, or action that the user did not explicitly provide in text.`;

const HAND_ANALYZE_SYSTEM = `You are a poker hand reviewer for cash grinders.
Return STRICT JSON only (no markdown) with this schema:
{
  "v": 1,
  "verdict": "one sharp sentence",
  "severity": "ok" | "soft" | "leak" | "study",
  "keyMistake": "the single most costly decision, or null if none",
  "betterLine": "concrete alternative with size/street when possible",
  "why": "1-2 sentences: range/equity/SPR reason",
  "drill": "one tiny practice task for tonight",
  "focusStreet": "preflop" | "flop" | "turn" | "river" | null
}
Do NOT restate hole cards, board, result, or tags — the UI already shows them.
Be specific to THIS spot. Prefer sizing and range language.`;

export async function chatWithLlm(
  config: ConfigService,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
): Promise<string | null> {
  const key = config.get<string>('OPENAI_API_KEY');
  if (!key) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
      reasoning_effort: 'none',
      messages: [{ role: 'system', content: COACH_SYSTEM }, ...messages],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function streamChatWithLlm(
  config: ConfigService,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  onDelta: (delta: string) => void,
): Promise<string | null> {
  const key = config.get<string>('OPENAI_API_KEY');
  if (!key) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
      reasoning_effort: 'none',
      stream: true,
      messages: [{ role: 'system', content: COACH_SYSTEM }, ...messages],
    }),
  });
  if (!res.ok || !res.body) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';

  const consume = (event: string) => {
    for (const line of event.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (!delta) continue;
        reply += delta;
        onDelta(delta);
      } catch {
        // Ignore malformed SSE frames and keep the response alive.
      }
    }
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
  return reply.trim() || null;
}

export async function analyzeHandWithLlm(
  config: ConfigService,
  handPayload: string,
): Promise<Record<string, unknown> | null> {
  const key = config.get<string>('OPENAI_API_KEY');
  if (!key) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: HAND_ANALYZE_SYSTEM },
        { role: 'user', content: handPayload },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function parseHandWithLlm(
  config: ConfigService,
  transcript: string,
  stakes?: string,
): Promise<Record<string, unknown> | null> {
  const key = config.get<string>('OPENAI_API_KEY');
  if (!key) return null;

  const userMsg = stakes
    ? `Stakes context: ${stakes}\n\nTranscript:\n${transcript}`
    : transcript;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: VOICE_TO_HAND_SYSTEM },
        { role: 'user', content: userMsg },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function heuristicCoachReply(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('fold') && (m.includes('should') || m.includes('?'))) {
    return 'Default: fold when you lack equity + fold equity. Ask: pot odds, SPR, villain range. If SPR is high and you’re OOP with a weak bluff-catcher — fold more.';
  }
  if (m.includes('3bet') || m.includes('3-bet')) {
    return '3-bet plan: polarize or linear by position. BTN vs CO: wider value + blockers. vs UTG: tighter value, fewer bluffs. Size ~3–3.5x IP, ~3.5–4.5x OOP online.';
  }
  if (m.includes('cbet') || m.includes('c-bet') || m.includes('continuation')) {
    return 'C-bet: high frequency on dry boards with range advantage; check more on wet connected boards OOP. Mix sizes: 25–33% on dry, 66–75% when you want folds or protect.';
  }
  if (m.includes('tilt') || m.includes('tilted')) {
    return 'Tilt protocol: stop adding tables, hydrate, 5-min walk, only A-game spots next orbit. Log one hand that triggered you, then end the session if score >7.';
  }
  return 'Give me position, stack depth (bb), board, and the decision (bet/call/fold size). I’ll give a concrete line + one alternative.';
}

const CARD_RE = /\b([2-9TJQKA][shdc])\b/gi;
const POS_RE = /\b(UTG\+?1?|LJ|HJ|CO|BTN|SB|BB)\b/gi;

export function heuristicParseHand(transcript: string, stakes?: string) {
  const cards = [...transcript.matchAll(CARD_RE)].map((x) =>
    x[1].replace('t', 'T').replace(/^([2-9jqka])/i, (c) => c.toUpperCase()),
  );
  const uniqCards = [...new Set(cards.map((c) => c[0].toUpperCase() + c[1].toLowerCase()))];
  const positions = [...transcript.matchAll(POS_RE)].map((x) => x[1].toUpperCase());
  const heroPosition = positions[0] ?? null;
  const hole = uniqCards.slice(0, 2);
  const board = uniqCards.slice(2, 7);
  const resultMatch = transcript.match(/([+-]?\d+(?:\.\d+)?)\s*bb/i);
  const resultBb = resultMatch ? Number(resultMatch[1]) : null;
  const tags: string[] = [];
  const low = transcript.toLowerCase();
  if (low.includes('bluff')) tags.push('bluff');
  if (low.includes('value')) tags.push('value');
  if (low.includes('tilt')) tags.push('tilt');
  if (low.includes('fold')) tags.push('study');

  const confidence = hole.length === 2 ? 0.55 : uniqCards.length ? 0.35 : 0.15;
  const needsClarification = hole.length < 2;

  return {
    confidence,
    needsClarification,
    clarifyingQuestions: needsClarification
      ? ['What were your hole cards? (e.g. Ah Kd)']
      : [],
    hand: {
      gameType: null,
      venue: null,
      stakes: stakes ?? null,
      tableSize: null,
      heroPosition,
      villainPositions: positions.slice(1),
      heroHoleCards: hole,
      board,
      potType: low.includes('3bet') || low.includes('3-bet') ? '3bet' : null,
      effectiveStackBb: null,
      actions: [],
      resultBb,
      resultText: null,
      tags,
      summary:
        hole.length >= 2
          ? `${heroPosition ?? 'Hero'} ${hole.join(' ')}${board.length ? ` on ${board.join(' ')}` : ''}`
          : 'Incomplete hand — add hole cards.',
      rawNormalized: transcript.trim(),
    },
    source: 'heuristic' as const,
  };
}
