// Home — the week, day by day. Each day shows its activities as a
// list: time on the left, title in the middle, label chip + heart on
// the right. Empty days collapse to a single thin tappable row.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout } from '../theme';
import { getWeek, WEEKDAYS, emptyDay, getEvents, getList, getUserPrefs, setUserPrefs } from '../services/storageService';
import OnboardingTour from '../components/OnboardingTour';
import {
  isoWeekStart, shiftWeek, weekRangeLabel, fromISODate, addDays,
  toISODate, WEEKDAYS_LONG,
} from '../utils/dates';
import { sortActivities, formatTime } from '../utils/time';
import { labelOf } from '../data/labels';
import { initialOf, colorForName } from '../utils/avatar';
import BottomNav from '../components/BottomNav';

const FF = fontFamily;

export default function HomeScreen({ navigation }) {
  const [weekStart, setWeekStart] = useState(isoWeekStart(new Date()));
  const [week, setWeek] = useState(null);
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    (async () => {
      const prefs = await getUserPrefs();
      if (!prefs?.tourSeen) setShowTour(true);
    })();
  }, []);

  const finishTour = useCallback(async (openInvite) => {
    setShowTour(false);
    try { await setUserPrefs({ tourSeen: true }); } catch {}
    if (openInvite) navigation.navigate('InvitePartner');
  }, [navigation]);

  const load = useCallback(async () => {
    const [w, e, t] = await Promise.all([getWeek(weekStart), getEvents(), getList('todo')]);
    setWeek(w);
    setEvents(e);
    setTodos(t);
  }, [weekStart]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isEmpty = useMemo(() => {
    if (!week) return true;
    return WEEKDAYS.every(d => {
      const day = week.days?.[d] || emptyDay();
      return !(day.activities && day.activities.length);
    });
  }, [week]);

  const eventsByDate = useMemo(() => {
    const m = {};
    for (const e of events) {
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

  const todayISO = toISODate(new Date());
  const onCurrentWeek = weekStart === isoWeekStart(new Date());

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.brandBar}>
        <View style={s.brandLeft}>
          <Text style={s.wordmark}>iita</Text>
          <Text style={s.tagline}>Plan the week together</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMid} />
        </TouchableOpacity>
      </View>

      <View style={s.header}>
        <TouchableOpacity onPress={() => setWeekStart(w => shiftWeek(w, -1))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={colors.textMid} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setWeekStart(isoWeekStart(new Date()))} activeOpacity={0.7}>
          <Text style={s.headerTitle}>{weekRangeLabel(weekStart)}</Text>
          {!onCurrentWeek && <Text style={s.headerJump}>Tap for this week</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setWeekStart(w => shiftWeek(w, 1))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-forward" size={22} color={colors.textMid} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: spacing.xl }]}>
        {isEmpty && (
          <>
            <TouchableOpacity
              style={s.ctaPrimary}
              onPress={() => navigation.navigate('WeekIntake', { weekStart })}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={18} color="#000" />
              <Text style={s.ctaPrimaryLabel}>Plan the week</Text>
            </TouchableOpacity>
            <Text style={s.ctaHint}>Type what's coming up — Claude lays it out by day.</Text>
          </>
        )}

        {(() => {
          const openTodos = todos.filter(t => !t.done);
          return (
            <TouchableOpacity
              style={s.todoBtn}
              onPress={() => navigation.navigate('Todo')}
              activeOpacity={0.7}
            >
              <Ionicons name="checkbox-outline" size={16} color={colors.primary} />
              <Text style={s.todoBtnLabel}>To-do</Text>
              {openTodos.length > 0 && (
                <View style={s.todoBtnBadge}>
                  <Text style={s.todoBtnBadgeText}>{openTodos.length}</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })()}

        {WEEKDAYS.map((dayKey, idx) => {
          const day = week?.days?.[dayKey] || emptyDay();
          const dayDate = addDays(fromISODate(weekStart), idx);
          const dateISO = toISODate(dayDate);
          const isToday = dateISO === todayISO;
          const isPast = dateISO < todayISO && onCurrentWeek;
          const dayEvents = eventsByDate[dateISO] || [];
          const acts = sortActivities(day.activities || []);
          const isDayEmpty = acts.length === 0 && dayEvents.length === 0;

          const openDay = () => navigation.navigate('DayDetail', { weekStart, day: dayKey });

          return (
            <View
              key={dayKey}
              style={[
                isDayEmpty ? s.dayRowEmpty : s.dayRow,
                isToday && (isDayEmpty ? s.dayRowEmptyToday : s.dayRowToday),
                isPast && !isToday && s.dayRowPast,
              ]}
            >
              <TouchableOpacity onPress={openDay} activeOpacity={0.7} style={s.dayHead}>
                <Text style={[
                  s.dayName,
                  isToday && { color: colors.primary },
                  isDayEmpty && { fontSize: 12 },
                ]}>
                  {WEEKDAYS_LONG[dayDate.getDay()]} {dayDate.getDate()}
                </Text>
                {isToday && <Text style={s.todayBadge}>TODAY</Text>}
                {isDayEmpty && !isToday && <Text style={s.addHint}>tap to add</Text>}
              </TouchableOpacity>

              {dayEvents.length > 0 && (
                <View style={s.evRow}>
                  {dayEvents.map(e => {
                    const t = formatTime(e.time);
                    return (
                      <TouchableOpacity
                        key={e.id}
                        style={s.evPill}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AddEvent', { eventId: e.id })}
                      >
                        <Ionicons
                          name={e.done ? 'checkmark-circle' : 'star'}
                          size={10}
                          color={e.done ? colors.good : colors.primary}
                        />
                        <Text style={[s.evPillText, e.done && s.evPillTextDone]}>{e.title}</Text>
                        {t ? <Text style={s.evPillTime}>· {t}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {acts.map(a => {
                const lbl = labelOf(a.label);
                const initial = initialOf(a.addedBy);
                return (
                  <TouchableOpacity key={a.id} style={s.actLine} onPress={openDay} activeOpacity={0.7}>
                    <View style={s.actTimeCol}>
                      {a.time ? (
                        <Text style={s.actTime} numberOfLines={1}>{formatTime(a.time)}</Text>
                      ) : (
                        <Text style={s.actTimeDot}>·</Text>
                      )}
                    </View>
                    <Text style={s.actTitle} numberOfLines={1}>{a.title}</Text>
                    <View style={s.actMeta}>
                      {a.together && <Ionicons name="heart" size={11} color={colors.primary} />}
                      {lbl && (
                        <View style={[s.actChip, { backgroundColor: lbl.bg }]}>
                          <Text style={[s.actChipText, { color: lbl.color }]}>{lbl.name}</Text>
                        </View>
                      )}
                      {initial ? (
                        <View style={[s.actAuthor, { borderColor: colorForName(a.addedBy) }]}>
                          <Text style={[s.actAuthorText, { color: colorForName(a.addedBy) }]}>{initial}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <BottomNav navigation={navigation} current="week" weekStart={weekStart} />

      <OnboardingTour
        visible={showTour}
        onComplete={() => finishTour(false)}
        onInvite={() => finishTour(true)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  brandBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  brandLeft: { flexDirection: 'column' },
  wordmark: {
    fontSize: 28, color: colors.primary, fontFamily: FF.semibold,
    letterSpacing: 1.5, lineHeight: 32,
  },
  tagline: { color: colors.textMuted, fontFamily: FF.light, fontSize: 15, marginTop: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16, textAlign: 'center' },
  headerJump:  { color: colors.textMuted, fontFamily: FF.light, fontSize: 10, textAlign: 'center', marginTop: 2 },

  body: { padding: spacing.xl, gap: spacing.sm },

  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 16, paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary, borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  ctaPrimaryLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },
  ctaSubtle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 10, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    alignSelf: 'center', marginBottom: spacing.md,
  },
  ctaSubtleLabel: { color: colors.textMid, fontFamily: FF.medium, fontSize: 13 },
  ctaHint: { color: colors.textMuted, fontFamily: FF.light, fontSize: 13, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 18 },

  // ── To-do button ──
  todoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  todoBtnLabel:     { color: colors.text, fontFamily: FF.semibold, fontSize: 13, letterSpacing: 0.3 },
  todoBtnBadge:     { backgroundColor: colors.primaryLight, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999 },
  todoBtnBadgeText: { color: colors.primary, fontFamily: FF.semibold, fontSize: 10 },

  dayRow: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  dayRowToday: { borderColor: colors.primary },
  dayRowPast:  { opacity: 0.55 },

  dayRowEmpty: {
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight,
    backgroundColor: 'transparent',
  },
  dayRowEmptyToday: { borderColor: colors.primary, backgroundColor: colors.primaryLight },

  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { color: colors.text, fontFamily: FF.semibold, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.6 },
  todayBadge: {
    color: '#000', backgroundColor: colors.primary, fontFamily: FF.semibold,
    fontSize: 9, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    overflow: 'hidden', letterSpacing: 0.7,
  },
  addHint: { color: colors.textFaint, fontFamily: FF.light, fontSize: 11 },

  evRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2, marginBottom: 2 },
  evPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primaryLight },
  evPillText: { color: colors.text, fontFamily: FF.medium, fontSize: 11 },
  evPillTextDone: { textDecorationLine: 'line-through', color: colors.textMid },
  evPillTime: { color: colors.textMid, fontFamily: FF.light, fontSize: 10 },

  // ── Activity line ──
  actLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  actTimeCol: { width: 76, alignItems: 'flex-start' },
  actTime:    { color: colors.primary, fontFamily: FF.semibold, fontSize: 12, letterSpacing: 0.2 },
  actTimeDot: { color: colors.textFaint, fontFamily: FF.regular, fontSize: 13 },
  actTitle:   { flex: 1, color: colors.text, fontFamily: FF.regular, fontSize: 14, lineHeight: 18 },
  actMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  actChipText: { fontFamily: FF.medium, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },
  actAuthor: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.25, alignItems: 'center', justifyContent: 'center',
  },
  actAuthorText: { fontFamily: FF.semibold, fontSize: 10, letterSpacing: 0.2 },
});
