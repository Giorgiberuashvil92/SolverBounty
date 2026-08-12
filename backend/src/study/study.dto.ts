import { IsObject } from 'class-validator';

export class UpsertRangeDto {
  @IsObject()
  cells!: Record<
    string,
    { raise: number; call: number; fold: number; note?: string }
  >;
}
