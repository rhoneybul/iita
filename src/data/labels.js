// Activity labels. The user picks one (or none); the LLM is also told
// to assign one of these when it parses dictation. Free-text labels
// outside this set are allowed but render with the muted "other" colour.

import { colors } from '../theme';

export const LABELS = {
  exercise:  { name: 'Exercise',  color: colors.good,      bg: colors.goodLight },
  work:      { name: 'Work',      color: colors.secondary, bg: colors.secondaryLight },
  social:    { name: 'Social',    color: colors.primary,   bg: colors.primaryLight },
  travel:    { name: 'Travel',    color: colors.teal,      bg: colors.tealLight },
  important: { name: 'Important', color: colors.caution,   bg: colors.cautionLight },
  other:     { name: 'Other',     color: colors.textMid,   bg: colors.surfaceLight },
};

// Display order in the label picker.
export const LABEL_ORDER = ['exercise', 'work', 'social', 'travel', 'important', 'other'];

export function labelOf(key) {
  if (!key) return null;
  return LABELS[key] || { name: key, color: colors.textMid, bg: colors.surfaceLight };
}
