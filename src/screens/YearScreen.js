// Year view — the "things happening" sheet, laid out month by month.
// Tapping an event opens a quick-delete sheet; the + button in the header
// opens the AddEvent form.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getEvents, deleteEvent } from '../services/storageService';
import { MONTHS_LONG, fromISODate } from '../utils/dates';

const FF = fontFamily;

export default function YearScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const bottomPad = useBottomInset(spacing.xl);

  const load = useCallback(async () => {
    setEvents(await getEvents());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = useMemo(() => {
    const byMonth = Array.from({ length: 12 }, () => []);
    for (const e of events) {
      const d = fromISODate(e.date);
      if (!d) continue;
      if (d.getFullYear() !== year) continue;
      byMonth[d.getMonth()].push(e);
    }
    return byMonth
      .map((data, i) => ({ title: MONTHS_LONG[i], monthIndex: i, data }))
      .filter(s => s.data.length > 0);
  }, [events, year]);

  function handleEventPress(ev) {
    Alert.alert(
      ev.title,
      formatDateRange(ev),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteEvent(ev.id); load(); } },
      ],
    );
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
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: bottomPad + 40, gap: spacing.md }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={s.month}>{section.title}</Text>
        )}
        renderSectionFooter={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => handleEventPress(item)} activeOpacity={0.7}>
            <View style={s.dateCol}>
              <Text style={s.dateDay}>{fromISODate(item.date)?.getDate()}</Text>
              {item.endDate && item.endDate !== item.date && (
                <Text style={s.dateRange}>– {fromISODate(item.endDate)?.getDate()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.title}</Text>
              {(item.location || item.withWho) && (
                <Text style={s.meta}>{[item.withWho, item.location].filter(Boolean).join(' · ')}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={(
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing in {year}</Text>
            <Text style={s.emptySub}>Tap + to add a wedding, trip, birthday, or anything else worth remembering.</Text>
          </View>
        )}
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

  month: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.sm, marginTop: spacing.md },

  row: { ...layout.card({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border }) },
  dateCol: { width: 50, alignItems: 'center' },
  dateDay: { color: colors.text, fontFamily: FF.semibold, fontSize: 22, lineHeight: 26 },
  dateRange: { color: colors.textMuted, fontFamily: FF.regular, fontSize: 11 },
  title: { color: colors.text, fontFamily: FF.medium, fontSize: 15 },
  meta:  { color: colors.textMid, fontFamily: FF.light, fontSize: 12, marginTop: 2 },

  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16, marginBottom: spacing.sm },
  emptySub:   { color: colors.textMuted, fontFamily: FF.light, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
});
