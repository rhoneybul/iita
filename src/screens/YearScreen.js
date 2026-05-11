// Year view — months down, events listed beneath each. On open we
// auto-scroll to the current month so users land on "now" instead of
// January. Tapping an event opens an action sheet: toggle done, or
// delete. Done events render with a check + strikethrough.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet, Alert,
  Platform, ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getEvents, deleteEvent, saveEvent } from '../services/storageService';
import { MONTHS_LONG, fromISODate } from '../utils/dates';

const FF = fontFamily;

export default function YearScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [hasLoaded, setHasLoaded] = useState(false);
  const bottomPad = useBottomInset(spacing.xl);

  const listRef = useRef(null);
  // We only auto-scroll once per (mount, year change to current). After
  // the user has scrolled, leave them where they are.
  const didAutoScroll = useRef(false);

  const load = useCallback(async () => {
    setEvents(await getEvents());
    setHasLoaded(true);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  // ── Auto-scroll to "now" on first load ──
  useEffect(() => {
    if (!hasLoaded) return;
    if (didAutoScroll.current) return;
    if (currentSectionIdx < 0) return;
    if (sections.length === 0) return;
    // setTimeout because SectionList needs a render pass before
    // scrollToLocation can compute layout. Animated:false because we
    // want to land there, not animate from the top.
    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToLocation({
          sectionIndex: currentSectionIdx,
          itemIndex: 0,
          animated: false,
          viewPosition: 0,
        });
        didAutoScroll.current = true;
      } catch {
        /* swallowed — onScrollToIndexFailed handles retry */
      }
    }, 80);
    return () => clearTimeout(t);
  }, [hasLoaded, currentSectionIdx, sections.length]);

  // Reset auto-scroll guard when the user changes year (so jumping
  // forward then back re-snaps to today).
  useEffect(() => { didAutoScroll.current = false; }, [year]);

  // ── Event actions ──
  async function toggleDone(ev) {
    await saveEvent({ ...ev, done: !ev.done });
    load();
  }
  async function remove(ev) {
    await deleteEvent(ev.id);
    load();
  }

  function handleEventPress(ev) {
    const doneOption = ev.done ? 'Mark not done' : 'Mark done';
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: ev.title,
          message: formatDateRange(ev),
          options: [doneOption, 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          userInterfaceStyle: 'dark',
        },
        (i) => {
          if (i === 0) toggleDone(ev);
          else if (i === 1) remove(ev);
        },
      );
    } else {
      Alert.alert(ev.title, formatDateRange(ev), [
        { text: doneOption, onPress: () => toggleDone(ev) },
        { text: 'Delete', style: 'destructive', onPress: () => remove(ev) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <View style={s.yearSwitch}>
          <TouchableOpacity onPress={() => setYear(y => y - 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}>
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{year}</Text>
          <TouchableOpacity onPress={() => setYear(y => y + 1)} hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AddEvent', { year })} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: bottomPad + 40, gap: spacing.md }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={s.monthHead}>
            <Text style={s.month}>{section.title}</Text>
            {section.monthIndex === new Date().getMonth() && year === new Date().getFullYear() && (
              <Text style={s.nowChip}>now</Text>
            )}
          </View>
        )}
        renderSectionFooter={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.row, item.done && s.rowDone]}
            onPress={() => handleEventPress(item)}
            activeOpacity={0.7}
          >
            <View style={s.dateCol}>
              <Text style={[s.dateDay, item.done && s.textDone]}>{fromISODate(item.date)?.getDate()}</Text>
              {item.endDate && item.endDate !== item.date && (
                <Text style={[s.dateRange, item.done && s.textDone]}>– {fromISODate(item.endDate)?.getDate()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, item.done && s.titleDone]} numberOfLines={2}>{item.title}</Text>
              {(item.location || item.withWho) && (
                <Text style={[s.meta, item.done && s.textDone]} numberOfLines={1}>
                  {[item.withWho, item.location].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
            {item.done && (
              <Ionicons name="checkmark-circle" size={20} color={colors.good} />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={(
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing in {year}</Text>
            <Text style={s.emptySub}>Tap + to add a wedding, trip, birthday, or anything else worth remembering.</Text>
          </View>
        )}
        // When the auto-scroll target hasn't been measured yet, RN
        // throws and calls this. Estimate the offset and retry once,
        // then leave the user alone.
        onScrollToIndexFailed={(info) => {
          if (didAutoScroll.current) return;
          const offset = info.averageItemLength * info.index;
          listRef.current?.scrollToOffset({ offset, animated: false });
          setTimeout(() => {
            try {
              listRef.current?.scrollToLocation({
                sectionIndex: currentSectionIdx,
                itemIndex: 0,
                animated: false,
              });
            } catch {}
            didAutoScroll.current = true;
          }, 100);
        }}
      />
    </SafeAreaView>
  );
}

function formatDateRange(ev) {
  const start = fromISODate(ev.date);
  const end = ev.endDate ? fromISODate(ev.endDate) : null;
  if (!start) return '';
  const fmt = (d) => `${d.getDate()} ${MONTHS_LONG[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  return end && end.getTime() !== start.getTime() ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  yearSwitch: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 17, minWidth: 64, textAlign: 'center' },

  monthHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, marginTop: spacing.md },
  month: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2 },
  nowChip: { color: '#000', backgroundColor: colors.primary, fontFamily: FF.semibold, fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', letterSpacing: 0.6, textTransform: 'uppercase' },

  row: { ...layout.card({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border }) },
  rowDone: { opacity: 0.55 },

  dateCol: { width: 50, alignItems: 'center' },
  dateDay: { color: colors.text, fontFamily: FF.semibold, fontSize: 22, lineHeight: 26 },
  dateRange: { color: colors.textMuted, fontFamily: FF.regular, fontSize: 11 },
  title: { color: colors.text, fontFamily: FF.medium, fontSize: 15 },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMid },
  meta:  { color: colors.textMid, fontFamily: FF.light, fontSize: 12, marginTop: 2 },
  textDone: { color: colors.textMuted },

  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16, marginBottom: spacing.sm },
  emptySub:   { color: colors.textMuted, fontFamily: FF.light, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
});
