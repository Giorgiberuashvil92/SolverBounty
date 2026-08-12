import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  threadId?: string;
}

export class ParseHandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  transcript!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stakes?: string;
}
