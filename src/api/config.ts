import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Railway-ს ბექენდის URL
const PRODUCTION_API_URL = 'https://solverbounty-production.up.railway.app';

/**
 * Resolve API host for simulator / emulator / physical device.
 * Prefer EXPO_PUBLIC_API_URL, then Expo LAN host, then platform defaults.
 */
function lanHostFromExpo(): string | undefined {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    // Legacy Expo Go / older manifests
    (Constants as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost;

  if (!hostUri) return undefined;
  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === '127.0.0.1') return undefined;
  return host;
}

function defaultHost(): string {
  // 1. თუ EXPO_PUBLIC_API_URL გაწერილია .env-ში, გამოიყენოს ის
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. თუ აპლიკაცია პროდაქშენშია (Build გაკეთებულია), გამოიყენოს Railway
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  // 3. დეველოპმენტში (ლოკალურად) მუშაობისას:
  const lan = lanHostFromExpo();
  if (lan && lan !== 'localhost') {
    return `http://${lan}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

export const API_HOST = defaultHost();
export const API_BASE = `${API_HOST}/api`;