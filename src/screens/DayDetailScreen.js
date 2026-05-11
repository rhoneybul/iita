// Day detail — list of activities for one day. Tap an activity to edit
// it, tap the "+ Add activity" button to create one, long-press for
// delete. Activities are time-sorted; ones without a time fall to the
// bottom in insertion order.

import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
  ActionSheetIOS, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getWeek, deleteActivity, emptyDay } from '../services/storageService';
import { dayLabel } from '../utils/dates';
import { sortActivities } from '../utils/time';
import { labelOf } from '../data/labels';
import { initialOf, colorForName } from '../utils/avatar';

const FF = fontFamily;

export default function DayDetailScreen({ route, navigation }) {
  const { weekStart, day } = route.params;
  const [activities, setActivities] = useState([]);
  const bottomPad = useBottomInset(spacing.xl);

  const load = useCallback(async () => {
    const w = await getWeek(weekStart);
    const d = w.days?.[day] || emptyDay();
    setActivities(sortActivities(d.activities || []));
  }, [weekStart, day]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openActivity(activity) {
    navigation.navigate('ActivityEdit', {
      weekStart, day, activityId: activity?.id || null,
    });
  }

  function confirmDelete(activity) {
    const exec = async () => { await deleteActivity(weekStart, day, activity.id); load(); };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: activity.title,
          options: ['Edit', 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          userInterfaceStyle: 'dark',
        },
        (i) => { if (i === 0) openActivity(activity); else if (i === 1) exec(); },
      );
    } else {
      Alert.alert(activity.title, '', [
        { text: 'Edit',   onPress: () => openActivity(activity) },
        { text: 'Delete', style: 'destructive', onPress: exec },
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
        <Text style={s.headerTitle}>{dayLabel(weekStart, day)}</Text>
        <TouchableOpacity onPress={() => openActivity(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: bottomPad + 80 }]}>
        {activities.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="add-circle-outline" size={36} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Nothing yet</Text>
            <Text style={s.emptySub}>Add the things you're doing today. Cycling, dinner, a flight — anything.</Text>
            <TouchableOpacity style={s.emptyCta} onPress={() => openActivity(null)} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color="#000" />
              <Text style={s.emptyCtaLabel}>Add activity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activities.map(a => (
              <ActivityRow
                key={a.id}
                activity={a}
                onPress={() => openActivity(a)}
                onLongPress={() => confirmDelete(a)}
              />
            ))}

            <TouchableOpacity style={s.addRow} onPress={() => openActivity(null)} activeOpacity={0.7}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={s.addRowLabel}>Add activity</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityRow({ activity, onPress, onLongPress }) {
  const lbl = labelOf(activity.label);
  const initial = initialOf(activity.addedBy);
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      activeOpacity={0.7}
    >
      <View style={s.timeCol}>
        {activity.time ? <Text style={s.time}>{activity.time}</Text> : <Text style={s.timeEmpty}>·</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{activity.title}</Text>
        <View style={s.metaRow}>
          {lbl && (
            <View style={[s.chip, { backgroundColor: lbl.bg }]}>
              <Text style={[s.chipText, { color: lbl.color }]}>{lbl.name}</Text>
            </View>
          )}
          {activity.together && (
            <View style={s.togetherChip}>
              <Ionicons name="heart" size={10} color={colors.primary} />
              <Text style={s.togetherText}>Together</Text>
            </View>
          )}
        </View>
      </View>
      {initial ? (
        <View style={[s.author, { borderColor: colorForName(activity.addedBy) }]}>
          <Text style={[s.authorText, { color: colorForName(activity.addedBy) }]}>{initial}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 15 },

  body: { padding: spacing.xl, gap: spacing.sm },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  timeCol: { width: 56, alignItems: 'flex-start' },
  time:    { color: colors.primary, fontFamily: FF.semibold, fontSize: 13, letterSpacing: 0.3 },
  timeEmpty: { color: colors.textFaint, fontFamily: FF.regular, fontSize: 14 },

  title: { color: colors.text, fontFamily: FF.medium, fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  chipText: { fontFamily: FF.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  togetherChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primaryLight },
  togetherText: { color: colors.primary, fontFamily: FF.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  author: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  authorText: { fontFamily: FF.semibold, fontSize: 11, letterSpacing: 0.3 },

  addRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, marginTop: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addRowLabel: { color: colors.primary, fontFamily: FF.semibold, fontSize: 14 },

  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 18 },
  emptySub:   { color: colors.textMuted, fontFamily: FF.light, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingHorizontal: spacing.xxl,
    paddingVertical: 12, borderRadius: radius.pill, marginTop: spacing.sm,
  },
  emptyCtaLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 14 },
});
