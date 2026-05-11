// Bottom tab bar — Week | + | Year. The central + opens AddPicker, a
// drawer with the three add flows + Plan-the-week.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, useBottomInset } from '../theme';

const FF = fontFamily;

export default function BottomNav({ navigation, current, weekStart }) {
  const bottomInset = useBottomInset(0);

  function openAdd() {
    navigation.navigate('AddPicker', weekStart ? { weekStart } : undefined);
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
