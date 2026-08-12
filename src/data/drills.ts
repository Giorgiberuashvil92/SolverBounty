export type DrillTag = 'open' | '3bet' | 'defend' | 'cbet' | 'squeeze';

export type DrillChoiceQuality = 'best' | 'ok' | 'leak';

export type DrillChoice = {
  id: string;
  label: string;
  quality: DrillChoiceQuality;
};

export type DrillActorState =
  | 'fold'
  | 'wait'
  | 'open'
  | 'call'
  | 'raise'
  | '3bet'
  | 'complete'
  | 'check'
  | 'toAct';

export type DrillActor = {
  position: string;
  state: DrillActorState;
  amountBb?: number;
};

export type Drill = {
  id: string;
  tag: DrillTag;
  stakesLabel: string;
  stackBb: number;
  heroPosition: string;
  holeCards: [string, string];
  board?: string[];
  potBb?: number;
  /** Seat states for the table simulation (excluding hero ME marker). */
  actors: DrillActor[];
  /** Short table story before the decision. */
  actionLine: string;
  prompt: string;
  choices: DrillChoice[];
  explainBest: string;
  explainOk?: string;
  explainLeak?: string;
};

const F = (position: string): DrillActor => ({ position, state: 'fold' });
const W = (position: string): DrillActor => ({ position, state: 'wait' });
const O = (position: string, amountBb = 2.5): DrillActor => ({
  position,
  state: 'open',
  amountBb,
});
const C = (position: string, amountBb?: number): DrillActor => ({
  position,
  state: 'call',
  amountBb,
});
const R3 = (position: string, amountBb: number): DrillActor => ({
  position,
  state: '3bet',
  amountBb,
});
const CMP = (position: string): DrillActor => ({ position, state: 'complete' });
const CHK = (position: string): DrillActor => ({ position, state: 'check' });
const ACT = (position: string): DrillActor => ({ position, state: 'toAct' });

export const DRILLS: Drill[] = [
  {
    id: 'btn-open-ak',
    tag: 'open',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'BTN',
    holeCards: ['As', 'Kd'],
    actors: [F('UTG'), F('HJ'), F('CO'), W('SB'), W('BB'), ACT('BTN')],
    actionLine: 'Folded to you on the button.',
    prompt: 'What do you do?',
    choices: [
      { id: 'raise', label: 'Raise 2.5bb', quality: 'best' },
      { id: 'limp', label: 'Limp', quality: 'leak' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'AKo is a clear BTN open. Raise ~2.2–2.5bb and play for initiative — limping burns equity and invites multiway pots.',
    explainLeak: 'Folding or limping AKo on the button is a major leak. This hand prints when you open.',
  },
  {
    id: 'utg-open-72o',
    tag: 'open',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'UTG',
    holeCards: ['7h', '2c'],
    actors: [ACT('UTG'), W('HJ'), W('CO'), W('BTN'), W('SB'), W('BB')],
    actionLine: 'You are UTG. Everyone behind has 100bb.',
    prompt: 'What do you do?',
    choices: [
      { id: 'fold', label: 'Fold', quality: 'best' },
      { id: 'raise', label: 'Raise 2.5bb', quality: 'leak' },
      { id: 'limp', label: 'Limp', quality: 'leak' },
    ],
    explainBest:
      '72o is trash from UTG. Fold and wait — opening here only builds pots out of position with zero equity.',
    explainLeak: 'Opening or limping 72o UTG is pure spew. Save the aggression for hands that can continue.',
  },
  {
    id: 'co-open-jts',
    tag: 'open',
    stakesLabel: 'NL50',
    stackBb: 100,
    heroPosition: 'CO',
    holeCards: ['Jh', 'Th'],
    actors: [F('UTG'), F('HJ'), ACT('CO'), W('BTN'), W('SB'), W('BB')],
    actionLine: 'UTG and HJ fold. Action on you in CO.',
    prompt: 'What do you do?',
    choices: [
      { id: 'raise', label: 'Raise 2.5bb', quality: 'best' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
      { id: 'limp', label: 'Limp', quality: 'ok' },
    ],
    explainBest:
      'JTs is a standard CO open — playability + blockers. Raise and keep the initiative.',
    explainOk: 'Limping is playable in some home games, but at NL50+ a raise is cleaner.',
    explainLeak: 'Folding JTs CO is too tight for modern 100bb cash.',
  },
  {
    id: 'bb-defend-k9o',
    tag: 'defend',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'BB',
    holeCards: ['Kc', '9d'],
    actors: [F('UTG'), F('HJ'), F('CO'), O('BTN', 2.5), F('SB'), ACT('BB')],
    actionLine: 'BTN opens to 2.5bb. SB folds. You are in the BB.',
    prompt: 'Facing a BTN open — what do you do?',
    choices: [
      { id: 'call', label: 'Call', quality: 'best' },
      { id: '3bet', label: '3-bet to 11bb', quality: 'ok' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'K9o is a common BB defend vs BTN. Pot odds are great; flat and play flop OOP with position disadvantage but price.',
    explainOk:
      'Occasional 3-bet for balance is fine, but default is defend — BTN opens wide and K9o realizes okay.',
    explainLeak: 'Folding K9o to a BTN open leaks money at these stack depths.',
  },
  {
    id: 'bb-fold-72o',
    tag: 'defend',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'BB',
    holeCards: ['7s', '2d'],
    actors: [F('UTG'), F('HJ'), O('CO', 2.5), F('BTN'), F('SB'), ACT('BB')],
    actionLine: 'CO opens to 2.5bb. BTN and SB fold.',
    prompt: 'Defend or give up?',
    choices: [
      { id: 'fold', label: 'Fold', quality: 'best' },
      { id: 'call', label: 'Call', quality: 'leak' },
      { id: '3bet', label: '3-bet bluff', quality: 'leak' },
    ],
    explainBest:
      '72o vs CO is a clear fold. You are dominated and realize poorly multiway or OOP.',
    explainLeak: 'Defending 72o here is a classic leak — even with pot odds the hand is dead money.',
  },
  {
    id: 'btn-3bet-aq',
    tag: '3bet',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'BTN',
    holeCards: ['Ah', 'Qs'],
    actors: [F('UTG'), F('HJ'), O('CO', 2.5), ACT('BTN'), W('SB'), W('BB')],
    actionLine: 'CO opens to 2.5bb. Folded to you on BTN.',
    prompt: 'What do you do?',
    choices: [
      { id: '3bet', label: '3-bet to 8bb', quality: 'best' },
      { id: 'call', label: 'Call', quality: 'ok' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'AQo is a premium 3-bet vs CO — value + deny equity. Size ~3x (~7.5–9bb) and keep CO uncomfortable.',
    explainOk: 'Flatting is sometimes used IP, but 3-betting prints more EV against a typical CO open.',
    explainLeak: 'Folding AQo to a CO open is way too tight.',
  },
  {
    id: 'btn-flat-76s',
    tag: '3bet',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'BTN',
    holeCards: ['7h', '6h'],
    actors: [F('UTG'), O('HJ', 2.5), F('CO'), ACT('BTN'), W('SB'), W('BB')],
    actionLine: 'HJ opens to 2.5bb. CO folds. You are on BTN.',
    prompt: '3-bet or flat?',
    choices: [
      { id: 'call', label: 'Call', quality: 'best' },
      { id: '3bet', label: '3-bet bluff', quality: 'ok' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      '76s is a classic flat IP — implied odds and playability. Prefer call over light 3-bet unless you mix.',
    explainOk: 'A small frequency of 3-bet bluffs with suited connectors is fine if your value range is capped correctly.',
    explainLeak: 'Folding 76s BTN vs HJ is too tight for 100bb.',
  },
  {
    id: 'sb-3bet-jj',
    tag: '3bet',
    stakesLabel: 'NL200',
    stackBb: 100,
    heroPosition: 'SB',
    holeCards: ['Jd', 'Jc'],
    actors: [F('UTG'), F('HJ'), F('CO'), O('BTN', 2.5), ACT('SB'), W('BB')],
    actionLine: 'BTN opens to 2.5bb. You are in the SB.',
    prompt: 'What do you do?',
    choices: [
      { id: '3bet', label: '3-bet to 11bb', quality: 'best' },
      { id: 'call', label: 'Call', quality: 'leak' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'JJ is a clear 3-bet from SB vs BTN. Don’t flat OOP and let BTN realize equity for free.',
    explainLeak: 'Flatting JJ OOP vs BTN is a common soft leak — take the initiative.',
  },
  {
    id: 'bb-vs-sb-complete-a2s',
    tag: 'defend',
    stakesLabel: 'NL50',
    stackBb: 100,
    heroPosition: 'BB',
    holeCards: ['Ad', '2d'],
    actors: [F('UTG'), F('HJ'), F('CO'), F('BTN'), CMP('SB'), ACT('BB')],
    actionLine: 'Folded to SB who completes. You are BB.',
    prompt: 'Check or iso-raise?',
    choices: [
      { id: 'raise', label: 'Iso-raise to 4bb', quality: 'best' },
      { id: 'check', label: 'Check', quality: 'ok' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'A2s has huge playability vs a SB complete. Iso often — you dominate weak completes and keep initiative.',
    explainOk: 'Checking is fine as a mix, especially if SB is sticky and you want to keep pots small.',
    explainLeak: 'Folding A2s BB vs a complete never makes sense.',
  },
  {
    id: 'hj-open-q9s',
    tag: 'open',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'HJ',
    holeCards: ['Qh', '9h'],
    actors: [F('UTG'), ACT('HJ'), W('CO'), W('BTN'), W('SB'), W('BB')],
    actionLine: 'UTG folds. You are in HJ.',
    prompt: 'Open or fold?',
    choices: [
      { id: 'raise', label: 'Raise 2.5bb', quality: 'best' },
      { id: 'fold', label: 'Fold', quality: 'ok' },
      { id: 'limp', label: 'Limp', quality: 'leak' },
    ],
    explainBest:
      'Q9s is a standard HJ open in many 100bb charts — suited broadway-ish playability. Prefer raise over limp.',
    explainOk: 'Some tighter charts fold Q9s HJ — acceptable if your table is aggressive 3-bettors.',
    explainLeak: 'Limping HJ is almost never the plan.',
  },
  {
    id: 'squeeze-co-kk',
    tag: 'squeeze',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'CO',
    holeCards: ['Kh', 'Kd'],
    actors: [O('UTG', 2.5), C('HJ', 2.5), ACT('CO'), W('BTN'), W('SB'), W('BB')],
    actionLine: 'UTG opens 2.5bb. HJ calls. Action on you in CO.',
    prompt: 'What do you do?',
    choices: [
      { id: 'raise', label: 'Squeeze to 12bb', quality: 'best' },
      { id: 'call', label: 'Call', quality: 'leak' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'KK is a slam-dunk squeeze for value. Isolate the opener and punish the flat — don’t invite a multiway flop.',
    explainLeak: 'Flatting KK multiway is a soft leak — build the pot now.',
  },
  {
    id: 'cbet-ak-high',
    tag: 'cbet',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'BTN',
    holeCards: ['As', 'Kc'],
    board: ['9h', '5d', '2c'],
    potBb: 6.5,
    actors: [F('UTG'), F('HJ'), F('CO'), ACT('BTN'), F('SB'), CHK('BB')],
    actionLine: 'You open BTN, BB calls. Flop 9♥5♦2♣. BB checks.',
    prompt: 'Continuation bet?',
    choices: [
      { id: 'bet33', label: 'Bet 33% pot', quality: 'best' },
      { id: 'bet75', label: 'Bet 75% pot', quality: 'ok' },
      { id: 'check', label: 'Check', quality: 'ok' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'Dry low board — small c-bet prints. AK has overs + backdoors; 25–40% pot denies equity cheaply.',
    explainOk:
      'Larger bets or occasional checks are fine as mixes, but small c-bet is the workhorse here.',
    explainLeak: 'Folding on a checked-to flop with AK never makes sense.',
  },
  {
    id: 'cbet-miss-multi',
    tag: 'cbet',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'CO',
    holeCards: ['Ah', 'Td'],
    board: ['Kd', 'Jc', '7c'],
    potBb: 18,
    actors: [F('UTG'), F('HJ'), ACT('CO'), C('BTN'), F('SB'), CHK('BB')],
    actionLine: 'You open CO, BTN + BB call. Flop K♦J♣7♣. Checked to you.',
    prompt: 'Multiway — what now?',
    choices: [
      { id: 'check', label: 'Check', quality: 'best' },
      { id: 'bet33', label: 'Bet 33%', quality: 'ok' },
      { id: 'bet75', label: 'Bet 75%', quality: 'leak' },
    ],
    explainBest:
      'Multiway on a connected high board — ATo is fragile. Prefer check more often; big c-bets get called/raised by better.',
    explainOk: 'A tiny stab can work vs passive tables, but default to checking range more multiway.',
    explainLeak: 'Bombing 75% multiway with A-high is a common spew.',
  },
  {
    id: 'bb-3bet-vs-sb-aq',
    tag: '3bet',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'BB',
    holeCards: ['Ac', 'Qh'],
    actors: [F('UTG'), F('HJ'), F('CO'), F('BTN'), O('SB', 3), ACT('BB')],
    actionLine: 'Folded to SB who opens to 3bb. You are BB.',
    prompt: 'What do you do?',
    choices: [
      { id: '3bet', label: '3-bet to 10bb', quality: 'best' },
      { id: 'call', label: 'Call', quality: 'ok' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'AQo is strong vs SB open — 3-bet for value. SB opens wide and you dominate a lot of their range.',
    explainOk: 'Flatting is a mix some solvers use, but value 3-betting is the cleaner default live/online grind.',
    explainLeak: 'Folding AQo vs SB is far too tight.',
  },
  {
    id: 'utg-open-22',
    tag: 'open',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'UTG',
    holeCards: ['2h', '2d'],
    actors: [ACT('UTG'), W('HJ'), W('CO'), W('BTN'), W('SB'), W('BB')],
    actionLine: 'You are UTG with a mini pair.',
    prompt: 'Open 22?',
    choices: [
      { id: 'raise', label: 'Raise 2.2bb', quality: 'best' },
      { id: 'fold', label: 'Fold', quality: 'ok' },
      { id: 'limp', label: 'Limp', quality: 'leak' },
    ],
    explainBest:
      'Many 100bb charts open 22+ UTG for setmining + reverse implied. Small open is fine.',
    explainOk: 'Folding 22 UTG is acceptable in tough games with heavy 3-bet pressure.',
    explainLeak: 'Open-limping pairs UTG is outdated — raise or fold.',
  },
  {
    id: 'btn-vs-sb-3bet-a5s',
    tag: 'defend',
    stakesLabel: 'NL100',
    stackBb: 100,
    heroPosition: 'BTN',
    holeCards: ['As', '5s'],
    actors: [F('UTG'), F('HJ'), F('CO'), ACT('BTN'), R3('SB', 9), F('BB')],
    actionLine: 'You open BTN to 2.5bb. SB 3-bets to 9bb. BB folds.',
    prompt: 'Facing a SB 3-bet — what do you do?',
    choices: [
      { id: 'call', label: 'Call', quality: 'best' },
      { id: '4bet', label: '4-bet bluff', quality: 'ok' },
      { id: 'fold', label: 'Fold', quality: 'leak' },
    ],
    explainBest:
      'A5s is a classic continue vs SB 3-bet — blockers + playability. Prefer call IP; mix some 4-bet bluffs.',
    explainOk: 'A5s is also a common 4-bet bluff candidate because of the ace blocker.',
    explainLeak: 'Auto-folding A5s BTN vs SB bleeds your defending range.',
  },
];

export function explanationFor(drill: Drill, quality: DrillChoiceQuality): string {
  if (quality === 'best') return drill.explainBest;
  if (quality === 'ok') return drill.explainOk ?? drill.explainBest;
  return drill.explainLeak ?? 'That line leaks EV in this spot.';
}

export function qualityLabel(quality: DrillChoiceQuality): string {
  if (quality === 'best') return 'Best';
  if (quality === 'ok') return 'Playable';
  return 'Leak';
}

/** Stable shuffle seeded by day string (YYYY-MM-DD). */
export function drillsForDay(dayKey: string, list: Drill[] = DRILLS): Drill[] {
  const arr = [...list];
  let seed = 0;
  for (let i = 0; i < dayKey.length; i++) seed = (seed * 31 + dayKey.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
