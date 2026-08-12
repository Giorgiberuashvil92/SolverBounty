import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class SubmitRankedDto {
  /** Client local day YYYY-MM-DD */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  day!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  answered!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  best!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  ok!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  leak!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  lpGained!: number;
}
