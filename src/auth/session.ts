import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'pac_access_token';
const USER_KEY = 'pac_user';

export type PlayerProfile = {
  primaryGame?: 'cash' | 'mtt' | 'mixed';
  venueFocus?: 'online' | 'live' | 'both';
  stakesBand?: 'micro' | 'low' | 'mid' | 'high';
  experience?: 'recreational' | 'serious' | 'pro';
  goal?: 'track' | 'improve' | 'coach' | 'move_up';
  formats?: string[];
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  consents?: {
    analytics?: boolean;
    marketing?: boolean;
    partnerInsights?: boolean;
  };
  profile?: PlayerProfile | null;
  onboardingCompleted?: boolean;
  bankrollInitialized?: boolean;
  providers?: string[];
};

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function saveSession(token: string, user: AuthUser) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
