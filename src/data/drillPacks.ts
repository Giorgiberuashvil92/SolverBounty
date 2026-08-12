import { DRILLS, drillsForDay, type Drill, type DrillTag } from './drills';

export type DrillPackId = 'open' | '3bet' | 'defend' | 'cbet';

export type DrillPack = {
  id: DrillPackId;
  title: string;
  blurb: string;
  tags: DrillTag[];
  /** Visual accent */
  tone: 'mint' | 'sky' | 'lilac' | 'gold';
};

export const DRILL_PACKS: DrillPack[] = [
  {
    id: 'open',
    title: 'Preflop Open',
    blurb: 'UTG → BTN opens. Fold or raise?',
    tags: ['open'],
    tone: 'mint',
  },
  {
    id: '3bet',
    title: '3-Bet & Squeeze',
    blurb: 'Value 3-bets, flats, and isolations.',
    tags: ['3bet', 'squeeze'],
    tone: 'sky',
  },
  {
    id: 'defend',
    title: 'Defend',
    blurb: 'BB/BTN continues vs opens & 3-bets.',
    tags: ['defend'],
    tone: 'lilac',
  },
  {
    id: 'cbet',
    title: 'Flop C-Bet',
    blurb: 'Size and frequency on dry vs wet boards.',
    tags: ['cbet'],
    tone: 'gold',
  },
];

export function packById(id: DrillPackId): DrillPack {
  return DRILL_PACKS.find((p) => p.id === id) ?? DRILL_PACKS[0];
}

export function drillsForPack(packId: DrillPackId): Drill[] {
  const pack = packById(packId);
  return DRILLS.filter((d) => pack.tags.includes(d.tag));
}

/** Ranked daily run — mixed tags, capped for a focused session. */
export function rankedDeckForDay(dayKey: string, limit = 10): Drill[] {
  return drillsForDay(dayKey, DRILLS).slice(0, Math.min(limit, DRILLS.length));
}

export function packToneColors(tone: DrillPack['tone']) {
  if (tone === 'mint') {
    return {
      bg: 'rgba(46,230,106,0.1)',
      border: 'rgba(46,230,106,0.32)',
      text: '#2EE66A',
    };
  }
  if (tone === 'sky') {
    return {
      bg: 'rgba(77,163,255,0.12)',
      border: 'rgba(77,163,255,0.35)',
      text: '#8FC4FF',
    };
  }
  if (tone === 'lilac') {
    return {
      bg: 'rgba(155,107,255,0.14)',
      border: 'rgba(155,107,255,0.35)',
      text: '#C4A4FF',
    };
  }
  return {
    bg: 'rgba(255,176,32,0.12)',
    border: 'rgba(255,176,32,0.4)',
    text: '#FFB020',
  };
}
