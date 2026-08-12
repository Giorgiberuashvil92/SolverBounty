import { apiRequest } from './http';

export type ShareSettings = {
  discordWebhookUrl: string;
  telegramBotToken: string;
  telegramChatId: string;
  hasDiscord: boolean;
  hasTelegram: boolean;
};

export type ShareChannel = 'discord' | 'telegram' | 'study_group';

export type ShareSendResult = {
  ok: boolean;
  delivered: boolean;
  detail: string;
  text: string;
  channel: ShareChannel;
};

export const shareApi = {
  getSettings: () => apiRequest<ShareSettings>('/share/settings'),

  updateSettings: (input: {
    discordWebhookUrl?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
  }) =>
    apiRequest<ShareSettings>('/share/settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  send: (channel: ShareChannel, text: string) =>
    apiRequest<ShareSendResult>('/share/send', {
      method: 'POST',
      body: JSON.stringify({ channel, text }),
    }),
};
