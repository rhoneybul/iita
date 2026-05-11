// Year view — months down, events listed beneath each. On open we
// auto-scroll to the current month so users land on "now" instead of
// January. Tapping a row opens the event in the edit drawer; the
// inline trash button deletes (with confirm). Done events render with
// a check + strikethrough.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout } from '../theme';
import { getEvents, deleteEvent } from '../services/storageService';
import { MONTHS_LONG, fromISODate } from '../utils/dates';
import { formatTime } from '../utils/time';
import { labelOf } from '../data/labels';
import BottomNav from '../components/BottomNav';

const FF = fontFamily;

export default function YearScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [hasLoaded, setHasLoaded] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const listRef = useRef(null);
  // Bumped on every focus so the auto-scroll effect re-runs when the
  // screen is re-entered (state alone wouldn't change between visits).
  const [focusKey, setFocusKey] = useState(0);
  // List stays invisible (behind a spinner) until we've scrolled to
  // the right month, so the user never sees the list snap into place.
  const [revealed, setRevealed] = useState(false);

  const load = useCallback(async () => {
    setEvents(await getEvents());
    setHasLoaded(true);
  }, []);

  useFocusEffect(useCallback(() => {
    setRevealed(false);
    setFocusKey(k => k + 1);
    load();
  }, [load]));

  // Build sections — only months with events (so the list stays tight).
  // currentMonthIndex tells us which section to scroll to.
  const { sections, currentSectionIdx } = useMemo(() => {
    const byMonth = Array.from({ length: 12 }, () => []);
    for (const e of events) {
      const d = fromISODate(e.date);
      if (!d) continue;
      if (d.getFullYear() !== year) continue;
      byMonth[d.getMonth()].push(e);
    }
    const built = byMonth
      .map((data, i) => ({ title: MONTHS_LONG[i], monthIndex: i, data }))
      .filter(sec => sec.data.length > 0);

    const isCurrentYear = year === new Date().getFullYear();
    let idx = -1;
    if (isCurrentYear) {
      const todayMonth = new Date().getMonth();
      // Prefer the current month; if it has no events, find the
      // closest future month with events (or the most recent past one
      // if the year is entirely in the past).
      idx = built.findIndex(sec => sec.monthIndex === todayMonth);
      if (idx < 0) idx = built.findIndex(sec => sec.monthIndex > todayMonth);
      if (idx < 0) idx = built.length - 1;
    }
    return { sections: built, currentSectionIdx: idx };
  }, [events, year]);

  // ── Auto-scroll to "now" on focus ──
  // The list is rendered with opacity 0 until we've scrolled, then
  // revealed — so the user never sees a January-flash. The slide-in
  // navigation transition is still running for the first ~300ms after
  // mount, and SectionList layout isn't ready that early, so we
  // schedule a couple of attempts before flipping the reveal.
  useEffect(() => {
    if (!hasLoaded) return;
    if (currentSectionIdx < 0 || sections.length === 0) {
      // Nothing to auto-scroll to (empty year, or not the current year) —
      // just reveal the list as-is.
      const t = setTimeout(() => setRevealed(true), 60);
      return () => clearTimeout(t);
    }
    const targetIdx = currentSectionIdx;
    const scroll = () => {
      try {
        listRef.current?.scrollToLocation({
          sectionIndex: targetIdx,
          itemIndex: 0,
          animated: false,
          viewPosition: 0,
        });
      } catch {
        /* onScrollToIndexFailed handles retry */
      }
    };
    const scrolls = [60, 220, 400].map(ms => setTimeout(scroll, ms));
    const revealT = setTimeout(() => setRevealed(true), 450);
    return () => { scrolls.forEach(clearTimeout); clearTimeout(revealT); };
  }, [hasLoaded, currentSectionIdx, sections.length, focusKey, year]);

  // ── Event actions ──
  async function remove(ev) {
    await deleteEvent(ev.id);
    load();
  }

  function confirmRemove(ev) {
    Alert.alert(
      'Delete this?',
      ev.title,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(ev) },
      ],
    );
  }

  function openEdit(ev) {
    navigation.navigate('AddEvent', { eventId: ev.id });
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <View style={s.yearSwitch}>
          <TouchableOpacity onPress={() => setYear(y => y - 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{year}</Text>
          <TouchableOpacity onPress={() => setYear(y => y + 1)} hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        style={{ opacity: revealed ? 1 : 0 }}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => {
          const isCurrentMonth = section.monthIndex === todayMonth && year === todayYear;
          const isPastMonth = year < todayYear || (year === todayYear && section.monthIndex < todayMonth);
          return (
            <View style={s.monthHead}>
              <Text style={[s.month, isPastMonth && s.monthPast]}>{section.title}</Text>
              {isCurrentMonth && <Text style={s.nowChip}>now</Text>}
            </View>
          );
        }}
        renderSectionFooter={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const evEnd = fromISODate(item.endDate || item.date);
          const isPast = !!evEnd && evEnd < today && !item.done;
          const faded = item.done || isPast;
          const lbl = labelOf(item.label);
          return (
            <TouchableOpacity
              style={[s.row, faded && s.rowFaded]}
              onPress={() => openEdit(item)}
              activeOpacity={0.6}
            >
              <View style={s.dateCol}>
                <Text style={[s.dateDay, faded && s.textDone]}>{fromISODate(item.date)?.getDate()}</Text>
                {item.endDate && item.endDate !== item.date && (
                  <Text style={[s.dateRange, faded && s.textDone]}>– {fromISODate(item.endDate)?.getDate()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, item.done && s.titleDone, isPast && s.textDone]} numberOfLines={2}>{item.title}</Text>
                {(item.location || item.withWho || item.time) && (
                  <Text style={[s.meta, faded && s.textDone]} numberOfLines={1}>
                    {[formatTime(item.time), item.withWho, item.location].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              {lbl && (
                <View style={[s.chip, { backgroundColor: lbl.bg }]}>
                  <Text style={[s.chipText, { color: lbl.color }]}>{lbl.name}</Text>
                </View>
              )}
              {item.done && (
                <Ionicons name="checkmark-circle" size={20} color={colors.good} />
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={s.chevron} />
              <TouchableOpacity
                onPress={() => confirmRemove(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={s.trashBtn}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={(
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing in {year}</Text>
            <Text style={s.emptySub}>Tap + to add a wedding, trip, birthday, or anything else worth remembering.</Text>
          </View>
        )}
        // When the auto-scroll target hasn't been measured yet, RN
        // throws and calls this. Estimate the offset, scroll there to
        // force the target to mount, then retry the precise scroll.
        onScrollToIndexFailed={(info) => {
          if (currentSectionIdx < 0) return;
          const offset = info.averageItemLength * info.index;
          listRef.current?.scrollToOffset({ offset, animated: false });
          setTimeout(() => {
            try {
              listRef.current?.scrollToLocation({
                sectionIndex: currentSectionIdx,
                itemIndex: 0,
                animated: false,
                viewPosition: 0,
              });
            } catch {}
          }, 100);
        }}
        />

        {!revealed && (
          <View style={s.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      <BottomNav navigation={navigation} current="year" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  yearSwitch: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 17, minWidth: 64, textAlign: 'center' },

  monthHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, marginTop: spacing.md },
  month: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2 },
  monthPast: { color: colors.textFaint },
  nowChip: { color: '#000', backgroundColor: colors.primary, fontFamily: FF.semibold, fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', letterSpacing: 0.6, textTransform: 'uppercase' },

  row: { ...layout.card({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border }) },
  rowFaded: { opacity: 0.5 },
  chevron: { marginLeft: -spacing.xs },
  trashBtn: { padding: spacing.xs, marginLeft: -spacing.xs },

  dateCol: { width: 50, alignItems: 'center' },
  dateDay: { color: colors.text, fontFamily: FF.semibold, fontSize: 22, lineHeight: 26 },
  dateRange: { color: colors.textMuted, fontFamily: FF.regular, fontSize: 11 },
  title: { color: colors.text, fontFamily: FF.medium, fontSize: 15 },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMid },
  meta:  { color: colors.textMid, fontFamily: FF.light, fontSize: 12, marginTop: 2 },
  textDone: { color: colors.textMuted },

  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontFamily: FF.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16, marginBottom: spacing.sm },
  emptySub:   { color: colors.textMuted, fontFamily: FF.light, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
});
