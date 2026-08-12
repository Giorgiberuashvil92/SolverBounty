import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'poker.feltTheme.v1';

export type FeltThemeId =
  | 'green'
  | 'teal'
  | 'navy'
  | 'blue'
  | 'burgundy'
  | 'charcoal';

export type FeltTheme = {
  id: FeltThemeId;
  label: string;
  colors: [string, string, string];
  border: string;
  swatch: string;
};

export const FELT_THEMES: FeltTheme[] = [
  {
    id: 'green',
    label: 'Classic',
    colors: ['#1A5C3A', '#14532D', '#0C2A1A'],
    border: 'rgba(46,230,106,0.28)',
    swatch: '#1B4D34',
  },
  {
    id: 'teal',
    label: 'Teal',
    colors: ['#0F766E', '#115E59', '#042F2E'],
    border: 'rgba(45,212,191,0.35)',
    swatch: '#0F766E',
  },
  {
    id: 'navy',
    label: 'Navy',
    colors: ['#1E3A5F', '#152848', '#0B1628'],
    border: 'rgba(77,163,255,0.35)',
    swatch: '#1E3A5F',
  },
  {
    id: 'blue',
    label: 'Royal',
    colors: ['#1D4ED8', '#1E40AF', '#0F172A'],
    border: 'rgba(96,165,250,0.4)',
    swatch: '#2563EB',
  },
  {
    id: 'burgundy',
    label: 'Wine',
    colors: ['#7F1D1D', '#5C1212', '#1C0A0A'],
    border: 'rgba(255,77,94,0.35)',
    swatch: '#7F1D1D',
  },
  {
    id: 'charcoal',
    label: 'Night',
    colors: ['#2A2F3A', '#1A1F2A', '#0B0E14'],
    border: 'rgba(255,255,255,0.18)',
    swatch: '#2A2F3A',
  },
];

export const DEFAULT_FELT_THEME_ID: FeltThemeId = 'green';

export function getFeltTheme(id: string | null | undefined): FeltTheme {
  return FELT_THEMES.find((t) => t.id === id) ?? FELT_THEMES[0];
}

export async function loadFeltThemeId(): Promise<FeltThemeId> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw && FELT_THEMES.some((t) => t.id === raw)) {
      return raw as FeltThemeId;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_FELT_THEME_ID;
}

export async function saveFeltThemeId(id: FeltThemeId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
