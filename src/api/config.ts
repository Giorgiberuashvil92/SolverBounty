// Railway-ს ბექენდის URL
const PRODUCTION_API_URL = 'https://solverbounty-production.up.railway.app';

function defaultHost(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return PRODUCTION_API_URL;
}

export const API_HOST = defaultHost();
export const API_BASE = `${API_HOST}/api`;
