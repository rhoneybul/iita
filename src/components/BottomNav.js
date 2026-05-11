// Bottom tab bar — Week | + | Year. The central + is the universal
// add affordance: every "thing" in iita is one of three kinds —
//   1. a to-do (no time)
//   2. an event (happens at some time → Year)
//   3. something for the week (a day activity)
// Tapping + opens an action sheet with those three options.

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, ActionSheetIOS, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, useBottomInset } from '../theme';
import { isoWeekStart } from '../utils/dates';
import { WEEKDAYS } from '../services/storageService';

const FF = fontFamily;

// JS Date.getDay(): 0=Sun..6=Sat. WEEKDAYS starts Mon, so shift.
function todayDayKey() {
  const d = new Date();
  return WEEKDAYS[(d.getDay() + 6) % 7];
}

export default function BottomNav({ navigation, current, weekStart }) {
  const bottomInset = useBottomInset(0);

  function openAdd() {
    const labels = ['Add to today', 'Add an event', 'Add a to-do', 'Plan the week'];
    const onPick = (i) => {
      if (i === 0) {
        navigation.navigate('ActivityEdit', {
          weekStart: isoWeekStart(new Date()),
          day: todayDayKey(),
          activityId: null,
        });
      }
      else if (i === 1) navigation.navigate('AddEvent');
      else if (i === 2) navigation.navigate('GeneralAdd');
      else if (i === 3) navigation.navigate('WeekIntake', weekStart ? { weekStart } : undefined);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'What are you adding?',
          options: [...labels, 'Cancel'],
          cancelButtonIndex: labels.length,
          userInterfaceStyle: 'dark',
        },
        onPick,
      );
    } else {
      Alert.alert('What are you adding?', null, [
        ...labels.map((label, i) => ({ text: label, onPress: () => onPick(i) })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  function goWeek() {
    if (current === 'week') return;
    navigation.navigate('Home');
  }
  function goYear() {
    if (current === 'year') return;
    navigation.navigate('Year');
  }

  const weekActive = current === 'week';
  const yearActive = current === 'year';

  return (
    <View style={[s.bar, { paddingBottom: bottomInset + 6 }]}>
      <TouchableOpacity style={s.tab} activeOpacity={0.7} onPress={goWeek}>
        <Ionicons name="calendar-outline" size={22} color={weekActive ? colors.primary : colors.textMuted} />
        <Text style={[s.label, weekActive && s.labelActive]}>Week</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.addSlot} activeOpacity={0.85} onPress={openAdd}>
        <View style={s.addBtn}>
          <Ionicons name="add" size={26} color="#000" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.tab} activeOpacity={0.7} onPress={goYear}>
        <Ionicons name="star-outline" size={22} color={yearActive ? colors.primary : colors.textMuted} />
        <Text style={[s.label, yearActive && s.labelActive]}>Year</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  label: {
    color: colors.textMuted,
    fontFamily: FF.medium,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  labelActive: {
    color: colors.primary,
  },
  addSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});
