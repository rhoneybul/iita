// Home — the week view. Days down the left, six columns of context per
// day. Tap any day to edit; tap the prominent "Plan the week" pill at
// the top to dictate / type the whole week at once. ← / → arrows page
// through weeks; the calendar icon jumps to the year overview.
//
// If the current week is completely empty we surface a big start-of-week
// prompt so the first thing users see on Monday is "plan it" rather than
// a wall of blanks.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getWeek, WEEKDAYS, emptyDay, getEvents } from '../services/storageService';
import {
  isoWeekStart, shiftWeek, weekRangeLabel, fromISODate, addDays,
  toISODate, WEEKDAYS_LONG,
} from '../utils/dates';

const FF = fontFamily;

// The six columns in the order the spreadsheet uses them.
const COLUMNS = [
  { key: 'donde',      label: 'Donde',      icon: 'location-outline' },
  { key: 'juntos',     label: 'Juntos',     icon: 'heart-outline' },
  { key: 'oficina',    label: 'Oficina',    icon: 'briefcase-outline' },
  { key: 'importante', label: 'Importante', icon: 'star-outline' },
  { key: 'ejercicio',  label: 'Ejercicio',  icon: 'fitness-outline' },
  { key: 'queMas',     label: 'Que mas',    icon: 'sparkles-outline' },
];

export default function HomeScreen({ navigation }) {
  const [weekStart, setWeekStart] = useState(isoWeekStart(new Date()));
  const [week, setWeek] = useState(null);
  const [events, setEvents] = useState([]);
  const bottomPad = useBottomInset(spacing.xxxl);

  const load = useCallback(async () => {
    const [w, e] = await Promise.all([getWeek(weekStart), getEvents()]);
    setWeek(w);
    setEvents(e);
  }, [weekStart]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const isEmpty = useMemo(() => {
    if (!week) return true;
    return WEEKDAYS.every(d => {
      const day = week.days?.[d] || {};
      return Object.values(day).every(v => !String(v || '').trim());
    });
  }, [week]);

  const eventsByDate = useMemo(() => {
    const m = {};
    for (const e of events) {
      // Expand multi-day events across their range
      const start = fromISODate(e.date);
      const end = e.endDate ? fromISODate(e.endDate) : start;
      if (!start) continue;
      let cur = new Date(start);
      while (cur <= end) {
        const k = toISODate(cur);
        (m[k] = m[k] || []).push(e);
        cur = addDays(cur, 1);
      }
    }
    return m;
  }, [events]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setWeekStart(w => shiftWeek(w, -1))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekStart(isoWeekStart(new Date()))} activeOpacity={0.7}>
          <Text style={s.headerTitle}>{weekRangeLabel(weekStart)}</Text>
          {weekStart !== isoWeekStart(new Date()) && (
            <Text style={s.headerJump}>Tap for this week</Text>
          )}
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <TouchableOpacity onPress={() => setWeekStart(w => shiftWeek(w, 1))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-forward" size={22} color={colors.textMid} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Year')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="calendar-outline" size={22} color={colors.textMid} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMid} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: bottomPad + 80 }]}>
        {isEmpty ? (
          <View style={s.heroEmpty}>
            <Text style={s.heroTitle}>How's the week looking?</Text>
            <Text style={s.heroSub}>
              Dictate or write what's happening — Claude will lay it out by day.
            </Text>
            <TouchableOpacity
              style={s.heroBtn}
              onPress={() => navigation.navigate('WeekIntake', { weekStart })}
              activeOpacity={0.85}
            >
              <Ionicons name="mic" size={18} color="#000" />
              <Text style={s.heroBtnLabel}>Plan the week</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={s.planPill}
            onPress={() => navigation.navigate('WeekIntake', { weekStart })}
            activeOpacity={0.8}
          >
            <Ionicons name="mic" size={16} color={colors.primary} />
            <Text style={s.planPillLabel}>Dictate or rewrite the week</Text>
          </TouchableOpacity>
        )}

        {WEEKDAYS.map((dayKey, idx) => {
          const day = week?.days?.[dayKey] || emptyDay();
          const dayDate = addDays(fromISODate(weekStart), idx);
          const dateISO = toISODate(dayDate);
          const isToday = dateISO === toISODate(new Date());
          const evs = eventsByDate[dateISO] || [];

          return (
            <TouchableOpacity
              key={dayKey}
              style={[s.dayCard, isToday && s.dayCardToday]}
              onPress={() => navigation.navigate('DayDetail', { weekStart, day: dayKey })}
              activeOpacity={0.85}
            >
              <View style={s.dayHead}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                  <Text style={[s.dayName, isToday && { color: colors.primary }]}>{WEEKDAYS_LONG[dayDate.getDay()]}</Text>
                  <Text style={s.dayDate}>{dayDate.getDate()}</Text>
                </View>
                {isToday && <Text style={s.todayBadge}>Today</Text>}
              </View>

              {evs.length > 0 && (
                <View style={s.evRow}>
                  {evs.map(e => (
                    <View key={e.id} style={s.evPill}>
                      <Ionicons name="star" size={10} color={colors.primary} />
                      <Text style={s.evPillText}>{e.title}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={s.cols}>
                {COLUMNS.map(c => {
                  const v = day[c.key];
                  const hasV = !!String(v || '').trim();
                  return (
                    <View key={c.key} style={s.col}>
                      <View style={s.colHead}>
                        <Ionicons name={c.icon} size={11} color={hasV ? colors.primary : colors.textFaint} />
                        <Text style={[s.colLabel, hasV && { color: colors.primary }]}>{c.label}</Text>
                      </View>
                      <Text style={[s.colValue, !hasV && s.colValueEmpty]} numberOfLines={2}>
                        {hasV ? v : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16, textAlign: 'center' },
  headerJump:  { color: colors.textMuted, fontFamily: FF.light, fontSize: 10, textAlign: 'center', marginTop: 2 },

  body: { padding: spacing.xl, gap: spacing.md },

  heroEmpty: {
    ...layout.card({ padding: spacing.xxl, borderWidth: 1, borderColor: colors.primary, gap: spacing.md, alignItems: 'center' }),
    marginBottom: spacing.md,
  },
  heroTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 22, textAlign: 'center' },
  heroSub:   { color: colors.textMid, fontFamily: FF.light, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.xxl,
    paddingVertical: 14, borderRadius: radius.pill, marginTop: spacing.md,
  },
  heroBtnLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },

  planPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    alignSelf: 'center', marginBottom: spacing.md,
  },
  planPillLabel: { color: colors.textMid, fontFamily: FF.medium, fontSize: 13 },

  dayCard: { ...layout.card({ padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm }) },
  dayCardToday: { borderColor: colors.primary },

  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { color: colors.text, fontFamily: FF.semibold, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.6 },
  dayDate: { color: colors.textMuted, fontFamily: FF.regular, fontSize: 13 },
  todayBadge: {
    color: '#000', backgroundColor: colors.primary, fontFamily: FF.semibold,
    fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    overflow: 'hidden', letterSpacing: 0.6,
  },

  evRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  evPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  evPillText: { color: colors.text, fontFamily: FF.medium, fontSize: 11 },

  cols: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  col: { width: '50%', paddingVertical: 6, paddingRight: spacing.sm },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  colLabel: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  colValue: { color: colors.text, fontFamily: FF.regular, fontSize: 13, lineHeight: 17 },
  colValueEmpty: { color: colors.textFaint, fontFamily: FF.light },
});
