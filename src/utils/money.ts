import type { MoneyCents } from '../types/session';

export const MIN_HOURLY_DURATION_SECONDS = 15 * 60;

export function formatMoney(cents: MoneyCents, currency = 'USD'): string {
  const value = cents / 100;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: abs % 1 === 0 ? 0 : 2,
  });
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatSignedMoney(cents: MoneyCents, currency = 'USD'): string {
  const formatted = formatMoney(Math.abs(cents), currency);
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `-${formatted}`;
  return formatted;
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function hourlyRateCents(profitCents: MoneyCents, durationSeconds: number): MoneyCents {
  if (durationSeconds <= 0) return 0;
  const hours = durationSeconds / 3600;
  return Math.round(profitCents / hours);
}
