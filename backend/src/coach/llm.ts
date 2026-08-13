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

const DRILL_RECOMMENDATION_SYSTEM = `You select one poker training deck after a session.
Return STRICT JSON only (no markdown):
{
  "packId": "open" | "3bet" | "defend" | "cbet",
  "title": "short 3-6 word drill title",
  "reason": "one concise sentence grounded only in the supplied session data",
  "difficulty": "foundation" | "standard" | "advanced"
}
You do not solve poker hands, state GTO facts, or invent details. Select only one of these verified decks:
- open: preflop opening ranges
- 3bet: 3-bets and squeezes
- defend: defending versus opens and 3-bets
- cbet: flop continuation bets`;

const GENERATED_DRILL_SYSTEM = `You create five focused poker practice spots from a player's session summary.
Return STRICT JSON only (no markdown):
{
  "title": "short drill title",
  "subtitle": "one concise coaching goal",
  "drills": [{
    "tag": "open" | "3bet" | "defend" | "cbet" | "squeeze",
    "stakesLabel": "string",
    "stackBb": 20-200,
    "heroPosition": "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB",
    "holeCards": ["As", "Kd"],
    "board": ["2c", "7d", "Th"] | null,
    "potBb": number | null,
    "actors": [{"position":"UTG","state":"fold" | "wait" | "open" | "call" | "raise" | "3bet" | "complete" | "check" | "toAct","amountBb":number|null}],
    "actionLine": "concise factual action history",
    "prompt": "what do you do?",
    "choices": [{"label":"short action", "quality":"best" | "ok" | "leak"}],
    "explainBest": "concise educational explanation",
    "explainOk": "optional concise explanation",
    "explainLeak": "concise explanation"
  }]
}
Rules: create exactly 5 spots, each with exactly 3 choices and exactly one best choice. Use only standard card codes (As, Kd, Th). Do not claim solver verification or exact GTO frequencies. Keep all explanations educational and probabilistic, not absolute. Build only from the provided session themes; do not invent a played hand history.`;

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

export async function recommendDrillWithLlm(
  config: ConfigService,
  sessionPayload: string,
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
        { role: 'system', content: DRILL_RECOMMENDATION_SYSTEM },
        { role: 'user', content: sessionPayload },
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

export async function generateDrillWithLlm(
  config: ConfigService,
  sessionPayload: string,
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
        { role: 'system', content: GENERATED_DRILL_SYSTEM },
        { role: 'user', content: sessionPayload },
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

export async function transcribeAudioWithLlm(
  config: ConfigService,
  audio: { buffer: Buffer; mimetype?: string; filename?: string },
): Promise<string | null> {
  const key = config.get<string>('OPENAI_API_KEY');
  if (!key || !audio.buffer.length) return null;

  const form = new FormData();
  form.append('model', config.get<string>('OPENAI_TRANSCRIBE_MODEL') || 'gpt-4o-mini-transcribe');
  const bytes = new Uint8Array(audio.buffer.byteLength);
  bytes.set(audio.buffer);
  form.append('file', new Blob([bytes], { type: audio.mimetype || 'audio/m4a' }), audio.filename || 'hand.m4a');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { text?: string };
  return data.text?.trim() || null;
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
