import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsOptional()
  @IsBoolean()
  analyticsConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  partnerInsightsConsent?: boolean;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class SocialLoginDto {
  @IsIn(['apple', 'google', 'guest'])
  provider!: 'apple' | 'google' | 'guest';

  @IsString()
  @MinLength(3)
  providerUserId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsBoolean()
  partnerInsightsConsent?: boolean;
}

export class OnboardingDto {
  @IsIn(['cash', 'mtt', 'mixed'])
  primaryGame!: 'cash' | 'mtt' | 'mixed';

  @IsIn(['online', 'live', 'both'])
  venueFocus!: 'online' | 'live' | 'both';

  @IsIn(['micro', 'low', 'mid', 'high'])
  stakesBand!: 'micro' | 'low' | 'mid' | 'high';

  @IsIn(['recreational', 'serious', 'pro'])
  experience!: 'recreational' | 'serious' | 'pro';

  @IsIn(['track', 'improve', 'coach', 'move_up'])
  goal!: 'track' | 'improve' | 'coach' | 'move_up';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formats?: string[];

  @IsOptional()
  @IsBoolean()
  partnerInsightsConsent?: boolean;
}
