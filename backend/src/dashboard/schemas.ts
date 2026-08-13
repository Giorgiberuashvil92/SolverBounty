import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDoc = HydratedDocument<User>;
export type SessionDoc = HydratedDocument<PokerSession>;

@Schema({ _id: false })
export class LedgerEntry {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  type!: 'deposit' | 'withdrawal' | 'session_result' | 'adjustment';

  @Prop({ required: true })
  amountCents!: number;

  @Prop({ required: true, default: 'USD' })
  currency!: string;

  @Prop()
  note?: string;

  @Prop({ required: true })
  createdAt!: string;
}

@Schema({ _id: false })
export class BankrollEmbed {
  @Prop({ required: true, default: 'USD' })
  currency!: string;

  @Prop({ required: true })
  currentCents!: number;

  @Prop({ required: true })
  startingOfDayCents!: number;
}

@Schema({ _id: false })
export class UserConsents {
  /** Product analytics (sessions, stakes, feature usage). */
  @Prop({ default: true })
  analytics!: boolean;

  /** Marketing emails / push. */
  @Prop({ default: false })
  marketing!: boolean;

  /**
   * Opt-in for anonymized aggregated insights shared with partners.
   * Never raw hand histories or PII without explicit legal basis.
   */
  @Prop({ default: false })
  partnerInsights!: boolean;
}

@Schema({ _id: false })
export class AuthProviderLink {
  @Prop({ required: true })
  provider!: 'email' | 'apple' | 'google' | 'guest';

  @Prop({ required: true })
  providerUserId!: string;
}

@Schema({ _id: false })
export class PlayerProfile {
  @Prop()
  primaryGame?: 'cash' | 'mtt' | 'mixed';

  @Prop()
  venueFocus?: 'online' | 'live' | 'both';

  @Prop()
  stakesBand?: 'micro' | 'low' | 'mid' | 'high';

  @Prop()
  experience?: 'recreational' | 'serious' | 'pro';

  @Prop()
  goal?: 'track' | 'improve' | 'coach' | 'move_up';

  @Prop({ type: [String], default: [] })
  formats!: string[];
}

@Schema({ _id: false })
export class ShareSettings {
  @Prop()
  discordWebhookUrl?: string;

  @Prop()
  telegramBotToken?: string;

  @Prop()
  telegramChatId?: string;
}

@Schema({ collection: 'users', timestamps: false })
export class User {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop()
  passwordHash?: string;

  @Prop({ required: true })
  displayName!: string;

  @Prop({ type: [AuthProviderLink], default: [] })
  providers!: AuthProviderLink[];

  @Prop({ type: UserConsents, default: () => ({}) })
  consents!: UserConsents;

  @Prop({ type: PlayerProfile, default: null })
  profile?: PlayerProfile | null;

  @Prop({ type: ShareSettings, default: () => ({}) })
  shareSettings!: ShareSettings;

  @Prop({ default: false })
  onboardingCompleted!: boolean;

  @Prop({ default: false })
  bankrollInitialized!: boolean;

  @Prop({ type: BankrollEmbed, required: false, default: null })
  bankroll?: BankrollEmbed | null;

  @Prop({ type: [LedgerEntry], default: [] })
  ledger!: LedgerEntry[];

  @Prop({ default: 0 })
  streakDays!: number;

  @Prop({ required: true })
  createdAt!: string;

  @Prop({ required: true })
  updatedAt!: string;
}

@Schema({ _id: false })
export class PreSessionEmbed {
  @Prop({ default: false })
  hydration!: boolean;

  @Prop({ default: false })
  warmup!: boolean;

  @Prop({ default: 5 })
  focusLevel!: number;

  @Prop()
  completedAt?: string;
}

@Schema({ _id: false })
export class PostSessionEmbed {
  @Prop({ required: true })
  tiltScore!: number;

  @Prop({ required: true })
  energyLevel!: number;

  @Prop()
  gameQuality?: 'A' | 'B' | 'C';

  @Prop()
  notes?: string;

  @Prop({ default: true })
  reviewCompleted!: boolean;

  @Prop()
  completedAt?: string;
}

@Schema({ _id: false })
export class KeyHandEmbed {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  sessionId!: string;

  @Prop({ required: true })
  createdAt!: string;

  @Prop({ required: true })
  source!: 'text' | 'voice' | 'screenshot_ocr' | 'manual';

  @Prop()
  rawInput?: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop()
  heroPosition?: string;

  @Prop({ type: [String], default: undefined })
  villainPositions?: string[];

  @Prop()
  stakes?: string;

  @Prop({ type: [String], default: undefined })
  board?: string[];

  @Prop({ type: [String], default: undefined })
  holeCards?: string[];

  @Prop()
  potType?: string;

  @Prop()
  tableSize?: number;

  @Prop({ type: [Object], default: undefined })
  actions?: Array<{
    street: string;
    actor: string;
    action: string;
    sizeBb?: number;
    potBbAfter?: number;
  }>;

  @Prop()
  resultBb?: number;

  @Prop()
  aiSummary?: string;

  @Prop()
  aiAnalysis?: string;

  @Prop({ default: 'to_review' })
  reviewStatus!: 'to_review' | 'reviewed';

  @Prop()
  aiAnalyzedAt?: string;

  @Prop({ type: Object })
  extra?: Record<string, unknown>;
}

@Schema({ collection: 'sessions', timestamps: false })
export class PokerSession {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  status!: 'idle' | 'precheck' | 'live' | 'ended';

  @Prop({ required: true, default: 'cash' })
  gameType!: 'cash' | 'mtt' | 'spins' | 'home_game';

  @Prop({ required: true, default: 'online' })
  venue!: 'online' | 'live';

  @Prop({ required: true })
  stakesLabel!: string;

  @Prop()
  startedAt?: string;

  @Prop()
  endedAt?: string;

  @Prop({ default: 0 })
  durationSeconds!: number;

  @Prop({ required: true })
  buyInCents!: number;

  @Prop()
  cashOutCents?: number;

  @Prop()
  profitLossCents?: number;

  @Prop()
  hourlyRateCents?: number;

  @Prop({ default: 'USD' })
  currency!: string;

  @Prop({ type: PreSessionEmbed })
  preSession?: PreSessionEmbed;

  @Prop({ type: PostSessionEmbed })
  postSession?: PostSessionEmbed;

  @Prop({ type: [KeyHandEmbed], default: [] })
  keyHands!: KeyHandEmbed[];

  @Prop()
  notes?: string;

  @Prop({ required: true })
  createdAt!: string;

  @Prop({ required: true })
  updatedAt!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
export const PokerSessionSchema = SchemaFactory.createForClass(PokerSession);

PokerSessionSchema.index({ userId: 1, status: 1 });
PokerSessionSchema.index({ userId: 1, startedAt: -1 });
