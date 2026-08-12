import { apiRequest } from './http';

export type ArenaPrize = {
  place: string;
  title: string;
  detail: string;
  cents: number;
};

export type ArenaRow = {
  id: string;
  name: string;
  lp: number;
  accuracy: number;
  answered: number;
  best?: number;
  ok?: number;
  huWins?: number;
  huLosses?: number;
  huPlayed?: number;
  isYou?: boolean;
};

export type ArenaSeason = {
  weekKey: string;
  endsAt: string;
  day: string;
  housePotCents: number;
  entryCents: number;
  entrants: number;
  prizePoolCents: number;
  prizes: ArenaPrize[];
  you: {
    rank: number | null;
    lp: number;
    answered: number;
    best: number;
    ok: number;
    leak: number;
    huWins: number;
    huLosses: number;
    huPlayed: number;
    accuracy: number;
    rankedDoneDay: string | null;
  };
  rows: ArenaRow[];
};

export type SubmitRankedInput = {
  day: string;
  answered: number;
  best: number;
  ok: number;
  leak: number;
  lpGained: number;
};

export const arenaApi = {
  getSeason: (day?: string) =>
    apiRequest<ArenaSeason>(
      day ? `/arena/season?day=${encodeURIComponent(day)}` : '/arena/season',
    ),

  submitRanked: (input: SubmitRankedInput) =>
    apiRequest<ArenaSeason>('/arena/ranked/submit', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
