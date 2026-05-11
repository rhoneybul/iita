// Home — the week, day by day. Each day shows its activities as a
// list: time on the left, title in the middle, label chip + heart on
// the right. Empty days collapse to a single thin tappable row.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, ActionSheetIOS, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout } from '../theme';
import { getWeek, WEEKDAYS, emptyDay, getEvents, getList, saveListItem } from '../services/storageService';
import {
  isoWeekStart, shiftWeek, weekRangeLabel, fromISODate, addDays,
  toISODate, WEEKDAYS_LONG,
} from '../utils/dates';
import { sortActivities } from '../utils/time';
import { labelOf } from '../data/labels';
import BottomNav from '../components/BottomNav';
import IitaMark from '../components/IitaMark';

const FF = fontFamily;

export default function HomeScreen({ navigation }) {
  const [weekStart, setWeekStart] = useState(isoWeekStart(new Date()));
  const [week, setWeek] = useState(null);
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);

  const load = useCallback(async () => {
    const [w, e, t] = await Promise.all([getWeek(weekStart), getEvents(), getList('todo')]);
    setWeek(w);
    setEvents(e);
    setTodos(t);
  }, [weekStart]);

  async function toggleTodo(item) {
    await saveListItem('todo', { ...item, done: !item.done });
    load();
  }

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

  function openMore() {
    const labels = ['To-do', 'Wish list', 'Settings'];
    const routes = ['Todo',  'Wishlist',  'Settings'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...labels, 'Cancel'], cancelButtonIndex: labels.length, userInterfaceStyle: 'dark' },
        (i) => { if (i >= 0 && i < routes.length) navigation.navigate(routes[i]); },
      );
    } else {
      Alert.alert('iita', null, [
        ...labels.map((label, i) => ({ text: label, onPress: () => navigation.navigate(routes[i]) })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.brandBar}>
        <View style={s.brandLeft}>
          <IitaMark size={32} idSuffix="home" />
          <View>
            <Text style={s.wordmark}>iita</Text>
            <Text style={s.tagline}>Plan the week together</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openMore} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
              <Ionicons name="mic" size={18} color="#000" />
              <Text style={s.ctaPrimaryLabel}>Plan the week</Text>
            </TouchableOpacity>
            <Text style={s.ctaHint}>Dictate or type — Claude lays it out by day.</Text>
          </>
        )}

        {/* To-do peek — top 3 open items, tap circle to toggle, header
            navigates to the full list. Hides entirely when nothing is
            open so it never wastes space. */}
        {(() => {
          const openTodos = todos.filter(t => !t.done);
          if (openTodos.length === 0) return null;
          const preview = openTodos.slice(0, 3);
          const more = openTodos.length - preview.length;
          return (
            <View style={s.todoCard}>
              <TouchableOpacity
                style={s.todoHead}
                onPress={() => navigation.navigate('Todo')}
                activeOpacity={0.7}
              >
                <View style={s.todoHeadLeft}>
                  <Ionicons name="list-outline" size={14} color={colors.primary} />
                  <Text style={s.todoTitle}>To-do</Text>
                  <View style={s.todoBadge}>
                    <Text style={s.todoBadgeText}>{openTodos.length}</Text>
                  </View>
                </View>
                <View style={s.todoHeadRight}>
                  <Text style={s.todoViewAll}>View all</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
              {preview.map(item => (
                <View key={item.id} style={s.todoLine}>
                  <TouchableOpacity
                    onPress={() => toggleTodo(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  <Text style={s.todoText} numberOfLines={1}>{item.title}</Text>
                </View>
              ))}
              {more > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('Todo')} activeOpacity={0.6}>
                  <Text style={s.todoMore}>+ {more} more</Text>
                </TouchableOpacity>
              )}
            </View>
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
                  {dayEvents.map(e => (
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
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {acts.map(a => {
                const lbl = labelOf(a.label);
                return (
                  <TouchableOpacity key={a.id} style={s.actLine} onPress={openDay} activeOpacity={0.7}>
                    <View style={s.actTimeCol}>
                      {a.time ? (
                        <Text style={s.actTime}>{a.time}</Text>
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
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <BottomNav navigation={navigation} current="week" weekStart={weekStart} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  brandBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wordmark: {
    fontSize: 28, color: colors.primary, fontFamily: FF.semibold,
    letterSpacing: 1.5, lineHeight: 32,
  },
  tagline: { color: colors.textMuted, fontFamily: FF.light, fontSize: 11, marginTop: 1 },

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

  // ── To-do peek ──
  todoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    gap: 6,
  },
  todoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  todoHeadLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todoHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  todoTitle:    { color: colors.text, fontFamily: FF.semibold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  todoBadge:    { backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, marginLeft: 2 },
  todoBadgeText:{ color: colors.primary, fontFamily: FF.semibold, fontSize: 10 },
  todoViewAll:  { color: colors.textMuted, fontFamily: FF.medium, fontSize: 11 },
  todoLine:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  todoText:     { flex: 1, color: colors.text, fontFamily: FF.regular, fontSize: 14, lineHeight: 18 },
  todoMore:     { color: colors.textMuted, fontFamily: FF.light, fontSize: 12, paddingTop: 4 },

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

  // ── Activity line ──
  actLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  actTimeCol: { width: 52, alignItems: 'flex-start' },
  actTime:    { color: colors.primary, fontFamily: FF.semibold, fontSize: 12, letterSpacing: 0.2 },
  actTimeDot: { color: colors.textFaint, fontFamily: FF.regular, fontSize: 13 },
  actTitle:   { flex: 1, color: colors.text, fontFamily: FF.regular, fontSize: 14, lineHeight: 18 },
  actMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  actChipText: { fontFamily: FF.medium, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },
});
