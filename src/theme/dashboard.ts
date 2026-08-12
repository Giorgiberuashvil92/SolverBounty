/**
 * Soft casino lobby — matched to product refs:
 * midnight navy stage, mint CTA, soft sky actions, purple promo.
 * No electric cyan glow / no “AI landing” neon soup.
 */
export const dash = {
  bg: '#0B1020',
  surface: '#141A2C',
  surfaceRaised: '#1A2238',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.68)',
  textMuted: 'rgba(255, 255, 255, 0.4)',

  /** Promo / personality purple (banner, circle) */
  brand: '#9B6BFF',
  brandSoft: '#C4A4FF',
  brandDim: 'rgba(155, 107, 255, 0.2)',
  lilac: '#C4A4FF',
  violet: '#7C4DFF',

  /** Soft sky blue — Play now / secondary */
  ops: '#4DA3FF',
  opsSoft: '#8FC4FF',
  opsDim: 'rgba(77, 163, 255, 0.16)',
  opsDeep: '#2B7FE0',

  accent: '#4DA3FF',
  accentSoft: '#8FC4FF',
  accentDim: 'rgba(77, 163, 255, 0.16)',

  /** Mint money CTA — Create lobby / Buy in / Raise */
  profit: '#2EE66A',
  cta: '#2EE66A',
  ctaText: '#062012',

  loss: '#FF4D5E',
  warning: '#FFB020',

  tabBar: '#0A0E1A',
  tabGlow: 'rgba(77, 163, 255, 0.35)',
  overlay: 'rgba(6, 8, 16, 0.7)',

  glowBlue: 'rgba(77, 163, 255, 0.12)',
  glowPurple: 'rgba(155, 107, 255, 0.14)',
  glowGreen: 'rgba(46, 230, 106, 0.1)',
} as const;
