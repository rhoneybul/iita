// TimePicker — pick None / Morning / Noon / Night, or a custom start–end
// range. Stores the value as a single string on the activity / event:
//   ''  · 'morning' · 'noon' · 'night' · 'HH:MM-HH:MM'
//
// Used by ActivityEditScreen, AddEventScreen, and the WeekIntake preview.

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, fontFamily, spacing, radius } from '../theme';
import { TIME_BUCKETS, timeKind, hhmm, dateFromHHMM, formatTime } from '../utils/time';

const FF = fontFamily;

const BUCKET_OPTS = [
  { key: '',        label: 'None' },
  { key: 'all day', label: 'All day' },
  { key: 'morning', label: 'Morning' },
  { key: 'noon',    label: 'Noon' },
  { key: 'night',   label: 'Night' },
  { key: 'range',   label: 'Range' },
];

export default function TimePicker({ value, onChange }) {
  const kind = timeKind(value); // 'empty' | 'bucket' | 'range' | 'free'
  const isRangeMode = kind === 'range' || kind === 'free';
  const activeKey = isRangeMode ? 'range' : (kind === 'bucket' ? value.toLowerCase() : '');

  const [showStart, setShowStart] = useState(false);
  const [showEnd,   setShowEnd]   = useState(false);

  const { startStr, endStr } = useMemo(() => {
    if (!isRangeMode) return { startStr: '09:00', endStr: '10:00' };
    const parts = String(value || '').split(/\s*[-–—]\s*/);
    return {
      startStr: normaliseToHHMM(parts[0]) || '09:00',
      endStr:   normaliseToHHMM(parts[1]) || '10:00',
    };
  }, [value, isRangeMode]);

  function pickBucket(key) {
    if (key === 'range') {
      onChange(`${startStr}-${endStr}`);
    } else {
      onChange(key);
    }
  }

  function commitStart(d) {
    if (Platform.OS === 'android') setShowStart(false);
    if (!d) return;
    onChange(`${hhmm(d)}-${endStr}`);
  }
  function commitEnd(d) {
    if (Platform.OS === 'android') setShowEnd(false);
    if (!d) return;
    onChange(`${startStr}-${hhmm(d)}`);
  }

  return (
    <View>
      <View style={s.bucketRow}>
        {BUCKET_OPTS.map(opt => {
          const active = activeKey === opt.key;
          return (
            <TouchableOpacity
              key={opt.key || 'none'}
              onPress={() => pickBucket(opt.key)}
              activeOpacity={0.8}
              style={[s.bucket, active && s.bucketActive]}
            >
              <Text style={[s.bucketText, active && s.bucketTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isRangeMode && (
        <View style={s.rangeRow}>
          <RangeField
            label="Start"
            valueStr={startStr}
            onPress={() => setShowStart(true)}
          />
          <Text style={s.rangeDash}>–</Text>
          <RangeField
            label="End"
            valueStr={endStr}
            onPress={() => setShowEnd(true)}
          />
        </View>
      )}

      {showStart && (
        <DateTimePicker
          value={dateFromHHMM(startStr)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => commitStart(d)}
          themeVariant="dark"
        />
      )}
      {showEnd && (
        <DateTimePicker
          value={dateFromHHMM(endStr)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => commitEnd(d)}
          themeVariant="dark"
        />
      )}

      {Platform.OS === 'ios' && (showStart || showEnd) && (
        <TouchableOpacity
          onPress={() => { setShowStart(false); setShowEnd(false); }}
          style={s.doneBtn}
          activeOpacity={0.7}
        >
          <Text style={s.doneLabel}>Done</Text>
        </TouchableOpacity>
      )}

      {kind === 'free' && (
        <Text style={s.freeNote}>Currently: {formatTime(value)}</Text>
      )}
    </View>
  );
}

function RangeField({ label, valueStr, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.rangeField} activeOpacity={0.7}>
      <Text style={s.rangeLabel}>{label}</Text>
      <Text style={s.rangeValue}>{valueStr}</Text>
    </TouchableOpacity>
  );
}

function normaliseToHHMM(s) {
  if (!s) return '';
  const m = String(s).trim().match(/^(\d{1,2}):?(\d{2})?$/);
  if (m) {
    const h = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0');
    const mm = m[2] ? String(Math.min(59, Math.max(0, parseInt(m[2], 10)))).padStart(2, '0') : '00';
    return `${h}:${mm}`;
  }
  // 12-hour like "9am" / "6:30pm"
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

const s = StyleSheet.create({
  bucketRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bucket: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  bucketActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bucketText: { color: colors.textMid, fontFamily: FF.medium, fontSize: 12, letterSpacing: 0.3 },
  bucketTextActive: { color: colors.primary, fontFamily: FF.semibold },

  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  rangeField: {
    flex: 1, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  rangeLabel: { color: colors.textMuted, fontFamily: FF.light, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  rangeValue: { color: colors.text, fontFamily: FF.semibold, fontSize: 15 },
  rangeDash:  { color: colors.textMuted, fontFamily: FF.regular, fontSize: 16 },

  doneBtn: { alignSelf: 'flex-end', marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  doneLabel: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13 },

  freeNote: { color: colors.textMuted, fontFamily: FF.light, fontSize: 11, marginTop: spacing.sm, fontStyle: 'italic' },
});
