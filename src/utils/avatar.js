// Tiny helper for the "added by" chip — first initial + a deterministic
// colour. Two-person app, so colours just need to be different enough
// that user and partner are visually distinct.

import { colors } from '../theme';

const PALETTE = [
  colors.primary,
  colors.teal,
  colors.good,
  colors.caution,
  '#A78BFA',
  '#F472B6',
];

export function initialOf(name) {
  const t = String(name || '').trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase();
}

export function colorForName(name) {
  const t = String(name || '').trim();
  if (!t) return colors.textMuted;
  let h = 0;
  for (let i = 0; i < t.length; i += 1) h = (h * 31 + t.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
