import { apiRequest } from './http';

export type StudyCellOverride = {
  raise: number;
  call: number;
  fold: number;
  note?: string;
};

export type StudyRangePayload = {
  position: string;
  cells: Record<string, StudyCellOverride>;
  updatedAt: string | null;
};

export const studyApi = {
  getRange: (position: string) =>
    apiRequest<StudyRangePayload>(`/study/ranges/${position}`),

  upsertRange: (position: string, cells: Record<string, StudyCellOverride>) =>
    apiRequest<StudyRangePayload>(`/study/ranges/${position}`, {
      method: 'PUT',
      body: JSON.stringify({ cells }),
    }),
};
