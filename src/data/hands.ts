export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;

export type Rank = (typeof RANKS)[number];
export type HandKind = 'pair' | 'suited' | 'offsuit';

export type Strategy = {
  raise: number;
  call: number;
  fold: number;
};

export type HandCell = {
  label: string;
  kind: HandKind;
  combos: number;
  strategy: Strategy;
};

/** Classic 13×13 grid: diagonal = pairs, upper = suited, lower = offsuit */
export function buildHandGrid(): HandCell[][] {
  return RANKS.map((rowRank, row) =>
    RANKS.map((colRank, col) => {
      let label: string;
      let kind: HandKind;
      let combos: number;

      if (row === col) {
        label = `${rowRank}${rowRank}`;
        kind = 'pair';
        combos = 6;
      } else if (col > row) {
        label = `${rowRank}${colRank}s`;
        kind = 'suited';
        combos = 4;
      } else {
        label = `${colRank}${rowRank}o`;
        kind = 'offsuit';
        combos = 12;
      }

      return {
        label,
        kind,
        combos,
        strategy: getMockStrategy(label, kind),
      };
    })
  );
}

/**
 * Mock BTN open strategy frequencies (raise / call / fold).
 * Values are weights 0–1 that sum to ~1.
 */
export function getMockStrategy(label: string, kind: HandKind): Strategy {
  const premiumPairs = new Set(['AA', 'KK', 'QQ', 'JJ', 'TT']);
  const midPairs = new Set(['99', '88', '77', '66']);
  const smallPairs = new Set(['55', '44', '33', '22']);
  const strongSuited = new Set([
    'AKs',
    'AQs',
    'AJs',
    'ATs',
    'A9s',
    'KQs',
    'KJs',
    'KTs',
    'QJs',
    'QTs',
    'JTs',
  ]);
  const broadwayOff = new Set(['AKo', 'AQo', 'AJo', 'KQo']);
  const speculative = new Set([
    'A8s',
    'A7s',
    'A5s',
    'A4s',
    'A3s',
    'A2s',
    'K9s',
    'Q9s',
    'J9s',
    'T9s',
    '98s',
    '87s',
    '76s',
    '65s',
  ]);

  if (premiumPairs.has(label)) return { raise: 1, call: 0, fold: 0 };
  if (midPairs.has(label)) return { raise: 0.85, call: 0, fold: 0.15 };
  if (smallPairs.has(label)) return { raise: 0.55, call: 0, fold: 0.45 };
  if (strongSuited.has(label)) return { raise: 0.92, call: 0, fold: 0.08 };
  if (broadwayOff.has(label)) return { raise: 0.78, call: 0, fold: 0.22 };
  if (speculative.has(label)) return { raise: 0.45, call: 0, fold: 0.55 };
  if (kind === 'suited' && (label.startsWith('A') || label.startsWith('K'))) {
    return { raise: 0.25, call: 0, fold: 0.75 };
  }
  if (kind === 'offsuit' && label.startsWith('A')) {
    return { raise: 0.2, call: 0, fold: 0.8 };
  }
  return { raise: 0, call: 0, fold: 1 };
}

export const HAND_GRID: HandCell[][] = buildHandGrid();
