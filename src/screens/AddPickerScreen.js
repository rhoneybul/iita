// Drawer that opens when "+" is tapped in BottomNav. Routes to the
// right add-flow based on the user's pick.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius } from '../theme';
import { isoWeekStart } from '../utils/dates';
import { WEEKDAYS } from '../services/storageService';
import Drawer from '../components/Drawer';

const FF = fontFamily;

function todayDayKey() {
  const d = new Date();
  return WEEKDAYS[(d.getDay() + 6) % 7];
}

export default function AddPickerScreen({ route, navigation }) {
  const weekStart = route.params?.weekStart;

  function go(action) {
    // replace, so the drawer is dismissed in the same gesture as the
    // next screen appears (and back-button doesn't return here).
    if (action === 'today') {
      navigation.replace('ActivityEdit', {
        weekStart: isoWeekStart(new Date()),
        day: todayDayKey(),
        activityId: null,
      });
    } else if (action === 'event')   navigation.replace('AddEvent');
    else if (action === 'todo')      navigation.replace('GeneralAdd');
    else if (action === 'week')      navigation.replace('WeekIntake', weekStart ? { weekStart } : undefined);
  }

  const items = [
    { key: 'today', icon: 'today-outline',      label: 'Add to today',   hint: 'New activity on today\'s row' },
    { key: 'event', icon: 'star-outline',       label: 'Add an event',   hint: 'Wedding, trip, birthday…' },
    { key: 'todo',  icon: 'checkbox-outline',   label: 'Add a to-do',    hint: 'Something undated to remember' },
    { key: 'week',  icon: 'sparkles-outline',   label: 'Plan the week',  hint: 'Type and we lay it out by day' },
  ];

  return (
    <Drawer onClose={() => navigation.goBack()}>
      <Drawer.Header title="What are you adding?" onClose={() => navigation.goBack()} />
      <Drawer.Body>
        {items.map(it => (
          <TouchableOpacity
            key={it.key}
            style={s.row}
            onPress={() => go(it.key)}
            activeOpacity={0.7}
          >
            <View style={s.iconWrap}>
              <Ionicons name={it.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{it.label}</Text>
              <Text style={s.hint}>{it.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </Drawer.Body>
    </Drawer>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { color: colors.text, fontFamily: FF.semibold, fontSize: 15 },
  hint:  { color: colors.textMuted, fontFamily: FF.light, fontSize: 12, marginTop: 2 },
});
