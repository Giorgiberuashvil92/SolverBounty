import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { User } from '../dashboard/schemas';
import { AnalyticsService } from '../analytics/analytics.service';
import type {
  LoginDto,
  OnboardingDto,
  RegisterDto,
  SocialLoginDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
    private readonly analytics: AnalyticsService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.users.findOne({ email }).lean();
    if (exists) throw new ConflictException('Email already registered');

    const now = new Date().toISOString();
    const user = await this.users.create({
      _id: uuid(),
      email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      displayName: dto.displayName.trim(),
      providers: [{ provider: 'email', providerUserId: email }],
      consents: {
        analytics: dto.analyticsConsent !== false,
        marketing: Boolean(dto.marketingConsent),
        partnerInsights: Boolean(dto.partnerInsightsConsent),
      },
      profile: null,
      onboardingCompleted: false,
      bankrollInitialized: false,
      bankroll: null,
      ledger: [],
      streakDays: 0,
      createdAt: now,
      updatedAt: now,
    });

    await this.analytics.track(user._id, 'auth_register', {
      method: 'email',
      partnerInsights: user.consents.partnerInsights,
    });

    return this.tokenResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.users.findOne({ email });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.analytics.track(user._id, 'auth_login', { method: 'email' });
    return this.tokenResponse(user);
  }

  async socialLogin(dto: SocialLoginDto) {
    const providerUserId = dto.providerUserId.trim();
    let user = await this.users.findOne({
      providers: { $elemMatch: { provider: dto.provider, providerUserId } },
    });

    if (!user && dto.email) {
      user = await this.users.findOne({
        email: dto.email.toLowerCase().trim(),
      });
      if (user) {
        const has = user.providers?.some(
          (p) =>
            p.provider === dto.provider && p.providerUserId === providerUserId,
        );
        if (!has) {
          user.providers = [
            ...(user.providers ?? []),
            { provider: dto.provider, providerUserId },
          ];
          user.updatedAt = new Date().toISOString();
          await user.save();
        }
      }
    }

    if (!user) {
      const now = new Date().toISOString();
      const email =
        dto.email?.toLowerCase().trim() ||
        `${dto.provider}_${providerUserId.replace(/[^a-zA-Z0-9]/g, '')}@pac.local`;
      const displayName =
        dto.displayName?.trim() ||
        (dto.provider === 'guest' ? 'Guest grinder' : 'Player');

      user = await this.users.create({
        _id: uuid(),
        email,
        displayName,
        providers: [{ provider: dto.provider, providerUserId }],
        consents: {
          analytics: true,
          marketing: false,
          partnerInsights: Boolean(dto.partnerInsightsConsent),
        },
        profile: null,
        onboardingCompleted: false,
        bankrollInitialized: false,
        bankroll: null,
        ledger: [],
        streakDays: 0,
        createdAt: now,
        updatedAt: now,
      });

      await this.analytics.track(user._id, 'auth_register', {
        method: dto.provider,
        partnerInsights: user.consents.partnerInsights,
      });
    } else {
      await this.analytics.track(user._id, 'auth_login', {
        method: dto.provider,
      });
    }

    return this.tokenResponse(user);
  }

  async completeOnboarding(userId: string, dto: OnboardingDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();

    user.profile = {
      primaryGame: dto.primaryGame,
      venueFocus: dto.venueFocus,
      stakesBand: dto.stakesBand,
      experience: dto.experience,
      goal: dto.goal,
      formats: dto.formats ?? [],
    };
    user.onboardingCompleted = true;
    if (typeof dto.partnerInsightsConsent === 'boolean') {
      user.consents.partnerInsights = dto.partnerInsightsConsent;
      user.markModified('consents');
    }
    user.updatedAt = new Date().toISOString();
    await user.save();

    await this.analytics.track(userId, 'onboarding_completed', {
      primaryGame: dto.primaryGame,
      venueFocus: dto.venueFocus,
      stakesBand: dto.stakesBand,
      experience: dto.experience,
      goal: dto.goal,
    });

    return this.publicUser(user);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId).lean();
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user as User);
  }

  private publicUser(user: User) {
    return {
      id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      consents: user.consents,
      profile: user.profile ?? null,
      onboardingCompleted: Boolean(user.onboardingCompleted),
      bankrollInitialized: user.bankrollInitialized,
      streakDays: user.streakDays,
      providers: (user.providers ?? []).map((p) => p.provider),
      createdAt: user.createdAt,
    };
  }

  private tokenResponse(user: User) {
    const accessToken = this.jwt.sign({
      sub: user._id,
      email: user.email,
    });
    return {
      accessToken,
      user: this.publicUser(user),
    };
  }
}
