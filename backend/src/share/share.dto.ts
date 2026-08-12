import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ShareSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  discordWebhookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  telegramBotToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegramChatId?: string;
}

export class ShareSendDto {
  @IsIn(['discord', 'telegram', 'study_group'])
  channel!: 'discord' | 'telegram' | 'study_group';

  @IsString()
  @MaxLength(4000)
  text!: string;
}
