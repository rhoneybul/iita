// TimePicker — pick Morning / Noon / Night, or a Custom start–end range.
// Stores a single string on the activity / event:
//   ''  · 'morning' · 'noon' · 'night' · 'HH:MM-HH:MM'
//
// Tap an active bucket to clear it. In Custom mode, tap a pill to edit
// its time — the spinner opens in a Modal at the bottom of the screen
// so it never gets obscured by surrounding content.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Modal, Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, fontFamily, spacing, radius, useBottomInset } from '../theme';
import { timeKind, hhmm, dateFromHHMM } from '../utils/time';

const FF = fontFamily;

const BUCKETS = [
  { key: 'all day', label: 'All day' },
  { key: 'morning', label: 'Morning' },
  { key: 'noon',    label: 'Noon' },
  { key: 'night',   label: 'Night' },
];

export default function TimePicker({ value, onChange }) {
  const kind = timeKind(value); // 'empty' | 'bucket' | 'range' | 'free'
  const isCustom = kind === 'range' || kind === 'free';
  const activeBucket = kind === 'bucket' ? String(value).toLowerCase() : null;

  // Which field's spinner is open: null | 'start' | 'end'
  const [editing, setEditing] = useState(null);

  const { startStr, endStr } = useMemo(() => {
    if (!isCustom) return { startStr: '09:00', endStr: '10:00' };
    const parts = String(value || '').split(/\s*[-–—]\s*/);
    return {
      startStr: normaliseToHHMM(parts[0]) || '09:00',
      endStr:   normaliseToHHMM(parts[1]) || '10:00',
    };
  }, [value, isCustom]);

  function pickBucket(key) {
    if (activeBucket === key) onChange(''); // tap active → clear
    else onChange(key);
  }

  function enterCustom() {
    if (!isCustom) onChange(`${startStr}-${endStr}`);
    setEditing('start');
  }

  function setStart(d) {
    if (!d) return;
    onChange(`${hhmm(d)}-${endStr}`);
  }
  function setEnd(d) {
    if (!d) return;
    onChange(`${startStr}-${hhmm(d)}`);
  }

  return (
    <View>
      <View style={s.bucketRow}>
        {BUCKETS.map(b => {
          const active = activeBucket === b.key;
          return (
            <TouchableOpacity
              key={b.key}
              onPress={() => pickBucket(b.key)}
              activeOpacity={0.8}
              style={[s.bucket, active && s.bucketActive]}
            >
              <Text style={[s.bucketText, active && s.bucketTextActive]}>{b.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={enterCustom}
          activeOpacity={0.8}
          style={[s.bucket, isCustom && s.bucketActive]}
        >
          <Text style={[s.bucketText, isCustom && s.bucketTextActive]}>Custom</Text>
        </TouchableOpacity>
      </View>

      {isCustom && (
        <View style={s.rangeRow}>
          <TimePill
            label="Start"
            valueStr={startStr}
            onPress={() => setEditing('start')}
            active={editing === 'start'}
          />
          <Text style={s.rangeDash}>–</Text>
          <TimePill
            label="End"
            valueStr={endStr}
            onPress={() => setEditing('end')}
            active={editing === 'end'}
          />
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.clearLink}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <PickerModal
        visible={editing !== null}
        title={editing === 'end' ? 'End time' : 'Start time'}
        initial={editing === 'end' ? endStr : startStr}
        onChange={(d) => { if (editing === 'end') setEnd(d); else setStart(d); }}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

function TimePill({ label, valueStr, onPress, active }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[s.pill, active && s.pillActive]}
    >
      <Text style={s.pillLabel}>{label}</Text>
      <Text style={s.pillValue}>{valueStr}</Text>
    </TouchableOpacity>
  );
}

// Bottom-sheet modal that hosts a single time spinner. Lives above
// every other surface, so it can never be obscured by the form.
function PickerModal({ visible, title, initial, onChange, onClose }) {
  const bottomPad = useBottomInset(spacing.md);
  const [draft, setDraft] = useState(() => dateFromHHMM(initial));

  // Reset the draft when the modal re-opens for a different field.
  useEffect(() => {
    if (visible) setDraft(dateFromHHMM(initial));
  }, [visible, initial]);

  function commit() {
    onChange(draft);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <View style={[s.modalSheet, { paddingBottom: bottomPad }]} pointerEvents="box-none">
        <View style={s.modalHandle} />
        <Text style={s.modalTitle}>{title}</Text>
        <View style={s.spinnerWrap}>
          <DateTimePicker
            value={draft}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              if (!d) return;
              setDraft(d);
              // Android picker dismisses itself after one pick — commit immediately.
              if (Platform.OS === 'android') { onChange(d); onClose(); }
            }}
            themeVariant="dark"
            textColor={colors.text}
          />
        </View>
        {Platform.OS === 'ios' && (
          <TouchableOpacity style={s.doneBtn} onPress={commit} activeOpacity={0.85}>
            <Text style={s.doneLabel}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

function normaliseToHHMM(s) {
  if (!s) return '';
  const m = String(s).trim().match(/^(\d{1,2}):?(\d{2})?$/);
  if (m) {
    const h = String(clamp(parseInt(m[1], 10), 0, 23)).padStart(2, '0');
    const mm = m[2] ? String(clamp(parseInt(m[2], 10), 0, 59)).padStart(2, '0') : '00';
    return `${h}:${mm}`;
  }
  const m2 = String(s).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m2) {
    let h = parseInt(m2[1], 10);
    const mm = m2[2] ? parseInt(m2[2], 10) : 0;
    if (m2[3] === 'pm' && h < 12) h += 12;
    if (m2[3] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return '';
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

const s = StyleSheet.create({
  bucketRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bucket: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  bucketActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bucketText: { color: colors.textMid, fontFamily: FF.medium, fontSize: 13, letterSpacing: 0.3 },
  bucketTextActive: { color: colors.primary, fontFamily: FF.semibold },

  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  pill: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceLight, alignItems: 'center',
    minWidth: 88,
  },
  pillActive: { borderColor: colors.primary },
  pillLabel: { color: colors.textMuted, fontFamily: FF.light, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  pillValue: { color: colors.text, fontFamily: FF.semibold, fontSize: 16, marginTop: 1 },
  rangeDash: { color: colors.textMuted, fontFamily: FF.regular, fontSize: 16 },
  clearLink: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 12, marginLeft: 'auto', textDecorationLine: 'underline' },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
    paddingTop: 8,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 6,
  },
  modalTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 14, textAlign: 'center', paddingVertical: spacing.sm },
  spinnerWrap: { paddingHorizontal: spacing.md },
  doneBtn: {
    marginHorizontal: spacing.xl, marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 13, borderRadius: radius.pill, alignItems: 'center',
  },
  doneLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },
});
