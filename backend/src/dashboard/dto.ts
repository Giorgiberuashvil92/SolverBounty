import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class MoneyDto {
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SetupBankrollDto {
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class ChecklistDto {
  @IsBoolean()
  hydration!: boolean;

  @IsBoolean()
  warmup!: boolean;

  @IsInt()
  @Min(1)
  @Max(10)
  focusLevel!: number;
}

export class StartSessionDto {
  @IsString()
  stakesLabel!: string;

  @IsInt()
  @Min(0)
  buyInCents!: number;

  @IsOptional()
  @IsIn(['cash', 'mtt', 'spins', 'home_game'])
  gameType?: 'cash' | 'mtt' | 'spins' | 'home_game';

  @IsOptional()
  @IsIn(['online', 'live'])
  venue?: 'online' | 'live';

  @IsOptional()
  @ValidateNested()
  @Type(() => ChecklistDto)
  preSession?: ChecklistDto;
}

export class EndSessionDto {
  @IsInt()
  @Min(0)
  cashOutCents!: number;
}

export class MentalDto {
  @IsInt()
  @Min(1)
  @Max(10)
  tiltScore!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  energyLevel!: number;

  @IsOptional()
  @IsIn(['A', 'B', 'C'])
  gameQuality?: 'A' | 'B' | 'C';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateKeyHandDto {
  @IsIn(['text', 'voice', 'screenshot_ocr', 'manual'])
  source!: 'text' | 'voice' | 'screenshot_ocr' | 'manual';

  @IsOptional()
  @IsString()
  rawInput?: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsOptional()
  @IsString()
  heroPosition?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  villainPositions?: string[];

  @IsOptional()
  @IsString()
  stakes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  board?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holeCards?: string[];

  @IsOptional()
  @IsIn(['srp', '3bet', '4bet', '5bet', '6bet', 'limped', 'iso'])
  potType?: 'srp' | '3bet' | '4bet' | '5bet' | '6bet' | 'limped' | 'iso';

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  tableSize?: number;

  @IsOptional()
  @IsArray()
  actions?: Array<{
    street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    actor: string;
    action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
    sizeBb?: number;
    potBbAfter?: number;
  }>;

  @IsOptional()
  @IsNumber()
  resultBb?: number;

  @IsOptional()
  @IsString()
  aiSummary?: string;
}
