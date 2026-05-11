// Drawer — bottom-sheet wrapper used by every "add / edit" route. Pair
// with the screen-options block below in App.js (transparent card +
// slideUp interpolator + overlay) so the previous screen stays visible
// behind the sheet.
//
// Usage:
//   <Drawer onClose={() => navigation.goBack()}>
//     <Drawer.Header title="Edit event" onClose={...} right={<SaveBtn/>}/>
//     <Drawer.Body>...form fields...</Drawer.Body>
//     <Drawer.Footer>...primary action...</Drawer.Footer>
//   </Drawer>

import React from 'react';
import {
  View, Text, Pressable, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, useBottomInset } from '../theme';

const FF = fontFamily;
const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

export default function Drawer({ onClose, children, maxHeightPct = 92 }) {
  return (
    <View style={s.root}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={s.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={[s.sheet, { maxHeight: `${maxHeightPct}%` }]}>
          <View style={s.handle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

Drawer.Header = function DrawerHeader({ title, onClose, right }) {
  return (
    <View style={s.headerRow}>
      <TouchableOpacity onPress={onClose} hitSlop={HIT} accessibilityLabel="Close" style={s.headerSide}>
        <Ionicons name="close" size={22} color={colors.textMid} />
      </TouchableOpacity>
      <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={s.headerSide}>{right}</View>
    </View>
  );
};

Drawer.Body = function DrawerBody({ children, contentStyle, scroll = true, ...rest }) {
  const bottomPad = useBottomInset(spacing.lg);
  if (!scroll) {
    return (
      <View style={[{ flexShrink: 1 }, contentStyle]} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flexShrink: 1 }}
      contentContainerStyle={[s.body, { paddingBottom: bottomPad }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );
};

Drawer.Footer = function DrawerFooter({ children }) {
  const footerPad = useBottomInset(spacing.md);
  return (
    <View style={[s.footer, { paddingBottom: footerPad }]}>
      {children}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetWrap: { width: '100%' },

  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerSide: { minWidth: 44, alignItems: 'flex-start' },
  headerTitle: { flex: 1, color: colors.text, fontFamily: FF.semibold, fontSize: 16, textAlign: 'center' },

  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, gap: spacing.lg },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
