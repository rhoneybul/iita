// Centers the app in a phone-sized viewport on the web build so the
// mobile layout doesn't stretch across a desktop monitor. On native it's
// a passthrough.

import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function WebWrapper({ children }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={s.outer}>
      <View style={s.frame}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '100%',
    maxWidth: 440,
    height: '100%',
    maxHeight: 900,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: 'hidden',
  },
});
