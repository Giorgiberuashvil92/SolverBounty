import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsService } from '../analytics/analytics.service';
import { User } from '../dashboard/schemas';
import type { ShareSendDto, ShareSettingsDto } from './share.dto';

@Injectable()
export class ShareService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly analytics: AnalyticsService,
  ) {}

  async getSettings(userId: string) {
    const user = await this.users.findById(userId).lean();
    if (!user) throw new UnauthorizedException();
    const s = user.shareSettings ?? {};
    return {
      discordWebhookUrl: s.discordWebhookUrl
        ? maskSecret(s.discordWebhookUrl)
        : '',
      telegramBotToken: s.telegramBotToken
        ? maskSecret(s.telegramBotToken)
        : '',
      telegramChatId: s.telegramChatId ?? '',
      hasDiscord: Boolean(s.discordWebhookUrl),
      hasTelegram: Boolean(s.telegramBotToken && s.telegramChatId),
    };
  }

  async updateSettings(userId: string, dto: ShareSettingsDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();

    const next = { ...(user.shareSettings ?? {}) };
    if (dto.discordWebhookUrl !== undefined) {
      if (dto.discordWebhookUrl.includes('•')) {
        // keep existing masked value
      } else {
        next.discordWebhookUrl = dto.discordWebhookUrl.trim() || undefined;
      }
    }
    if (dto.telegramBotToken !== undefined) {
      if (!dto.telegramBotToken.includes('•')) {
        next.telegramBotToken = dto.telegramBotToken.trim() || undefined;
      }
    }
    if (dto.telegramChatId !== undefined) {
      next.telegramChatId = dto.telegramChatId.trim() || undefined;
    }

    user.shareSettings = next;
    user.markModified('shareSettings');
    user.updatedAt = new Date().toISOString();
    await user.save();
    return this.getSettings(userId);
  }

  async send(userId: string, dto: ShareSendDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const settings = user.shareSettings ?? {};
    const text = dto.text.trim();
    let delivered = false;
    let detail = 'native_share';

    if (dto.channel === 'discord' && settings.discordWebhookUrl) {
      try {
        const res = await fetch(settings.discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text.slice(0, 1900) }),
        });
        delivered = res.ok;
        detail = delivered ? 'discord_webhook' : `discord_http_${res.status}`;
      } catch {
        detail = 'discord_error';
      }
    }

    if (
      dto.channel === 'telegram' &&
      settings.telegramBotToken &&
      settings.telegramChatId
    ) {
      try {
        const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: settings.telegramChatId,
            text: text.slice(0, 3900),
          }),
        });
        delivered = res.ok;
        detail = delivered ? 'telegram_api' : `telegram_http_${res.status}`;
      } catch {
        detail = 'telegram_error';
      }
    }

    if (dto.channel === 'study_group') {
      detail = 'study_group_native';
    }

    await this.analytics.track(userId, 'share_sent', {
      channel: dto.channel,
      delivered,
      detail,
    });

    return {
      ok: true,
      delivered,
      detail,
      text,
      channel: dto.channel,
    };
  }
}

function maskSecret(value: string) {
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
