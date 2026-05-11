// Drawer that opens from the ellipsis menu in the home brand bar.
// Just a list of navigation entries.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius } from '../theme';
import Drawer from '../components/Drawer';

const FF = fontFamily;

const ITEMS = [
  { key: 'Wishlist', icon: 'gift-outline',     label: 'Wish list', hint: 'Things you\'d like to do someday' },
  { key: 'Settings', icon: 'settings-outline', label: 'Settings',  hint: 'Account, partner, sign out' },
];

export default function MorePickerScreen({ navigation }) {
  function go(routeName) {
    navigation.replace(routeName);
  }

  return (
    <Drawer onClose={() => navigation.goBack()}>
      <Drawer.Header title="iita" onClose={() => navigation.goBack()} />
      <Drawer.Body>
        {ITEMS.map(it => (
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
