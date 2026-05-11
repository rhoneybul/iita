// Same throbbing splash as etapa's LoadingSplash — kept here so the JS
// handoff from the native splash is seamless. If assets/splash.png is
// missing, falls back to a plain black screen with a small wordmark.

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily, colors } from '../theme';

let SPLASH_SOURCE = null;
try {
  SPLASH_SOURCE = require('../../assets/splash.png');
} catch {
  SPLASH_SOURCE = null;
}

const PULSE_MAX = 1.04;

export default function LoadingSplash({ label = null }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: PULSE_MAX, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  return (
    <View style={s.root}>
      {SPLASH_SOURCE ? (
        <Animated.Image
          source={SPLASH_SOURCE}
          style={[s.splash, { transform: [{ scale: pulseAnim }] }]}
          resizeMode="contain"
        />
      ) : (
        <View style={s.fallback}>
          <Animated.Text
            style={[s.wordmark, { transform: [{ scale: pulseAnim }] }]}
          >
            iita
          </Animated.Text>
        </View>
      )}
      {label ? (
        <SafeAreaView style={s.overlay} pointerEvents="none">
          <Text style={s.label}>{label}</Text>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  splash: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    fontSize: 56, color: colors.primary, fontFamily: fontFamily.semibold,
    letterSpacing: 2,
  },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 60 },
  label: { fontSize: 14, fontFamily: fontFamily.semibold, fontWeight: '500', color: '#fff', letterSpacing: 0.3 },
});
