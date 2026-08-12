import { apiRequest } from './http';
import type { AuthUser, PlayerProfile } from '../auth/session';

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export const authApi = {
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    analyticsConsent?: boolean;
    marketingConsent?: boolean;
    partnerInsightsConsent?: boolean;
  }) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  social: (input: {
    provider: 'apple' | 'google' | 'guest';
    providerUserId: string;
    email?: string;
    displayName?: string;
    idToken?: string;
    partnerInsightsConsent?: boolean;
  }) =>
    apiRequest<AuthResponse>('/auth/social', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  me: () => apiRequest<AuthUser>('/auth/me'),

  completeOnboarding: (
    input: Required<
      Pick<
        PlayerProfile,
        'primaryGame' | 'venueFocus' | 'stakesBand' | 'experience' | 'goal'
      >
    > & {
      formats?: string[];
      partnerInsightsConsent?: boolean;
    },
  ) =>
    apiRequest<AuthUser>('/auth/onboarding', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
