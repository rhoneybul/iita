// Loading splash — shown between the native splash (assets/splash.png)
// and the first navigation render, while we resolve the auth session.
//
// Re-implements the looping splash from design/overlap.jsx: the two
// pink circles drift in from opposite sides, the brighter "lens" fades
// up in the overlap, the white "i" appears inside it, then the tagline
// fades in below. The native splash already shows the final state, so
// the handoff is: static mark (OS) → React mounts → mark briefly
// "breathes" through the drift-in then settles into the same composition.

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs, RadialGradient, Stop, ClipPath, Circle, Rect, G,
} from 'react-native-svg';
import { fontFamily, colors } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG      = Animated.createAnimatedComponent(G);

const PINK      = '#F6237D';
const PINK_HOT  = '#FF6FAE';
const PINK_DEEP = '#B81A5E';
const LENS_HOT  = '#FFD1E5';

const DUR = 2200;

export default function LoadingSplash({ label = null }) {
  // One linear time variable, [0, 1], that drives every interpolation.
  // Easier to reason about than a separate Animated.Value per property.
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: DUR,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      // SVG geometry props (cx, opacity on G) require the JS driver.
      useNativeDriver: false,
    }).start();
  }, [t]);

  // Circles drift in from ±110 px (in 1024 viewBox units) outside their
  // final positions. They reach centre by t = 0.7, then hold.
  const leftCx  = t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [306, 416, 416] });
  const rightCx = t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [718, 608, 608] });

  const circleOpacity = t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });

  // Lens + "i" fade in once the circles have arrived. Starting the lens
  // before the circles settle would leave a misaligned blob because the
  // ClipPath is anchored to the left circle's final position.
  const lensOpacity = t.interpolate({
    inputRange: [0, 0.72, 0.9, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp',
  });
  const iOpacity = t.interpolate({
    inputRange: [0, 0.78, 0.95, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp',
  });

  // Tagline arrives last, drifting up a few pixels as it fades.
  const taglineOpacity = t.interpolate({
    inputRange: [0, 0.85, 1], outputRange: [0, 0, 1], extrapolate: 'clamp',
  });
  const taglineY = t.interpolate({
    inputRange: [0, 0.85, 1], outputRange: [8, 8, 0], extrapolate: 'clamp',
  });

  return (
    <View style={s.root}>
      <View style={s.center}>
        <Svg width={160} height={160} viewBox="0 0 1024 1024">
          <Defs>
            <RadialGradient id="ldLeft" cx="35%" cy="32%" r="75%">
              <Stop offset="0%"   stopColor={PINK_HOT} />
              <Stop offset="55%"  stopColor={PINK} />
              <Stop offset="100%" stopColor={PINK_DEEP} />
            </RadialGradient>
            <RadialGradient id="ldRight" cx="65%" cy="32%" r="75%">
              <Stop offset="0%"   stopColor={PINK_HOT} />
              <Stop offset="55%"  stopColor={PINK} />
              <Stop offset="100%" stopColor={PINK_DEEP} />
            </RadialGradient>
            <RadialGradient id="ldLens" cx="50%" cy="42%" r="60%">
              <Stop offset="0%"   stopColor={LENS_HOT} stopOpacity="0.85" />
              <Stop offset="60%"  stopColor={PINK_HOT} stopOpacity="0.55" />
              <Stop offset="100%" stopColor={PINK_HOT} stopOpacity="0" />
            </RadialGradient>
            <ClipPath id="ldLeftClip">
              {/* Anchored to the LEFT circle's final position. Safe because
                  the lens only fades up after the drift settles. */}
              <Circle cx="416" cy="512" r="208" />
            </ClipPath>
          </Defs>

          <AnimatedCircle cx={leftCx}  cy="512" r="208" fill="url(#ldLeft)"  opacity={circleOpacity} />
          <AnimatedCircle cx={rightCx} cy="512" r="208" fill="url(#ldRight)" opacity={circleOpacity} />

          <G clipPath="url(#ldLeftClip)">
            <AnimatedCircle cx="608" cy="512" r="208" fill="url(#ldLens)" opacity={lensOpacity} />
          </G>

          <AnimatedG opacity={iOpacity}>
            <Circle cx="512" cy="454" r="20" fill="#FFFFFF" fillOpacity="0.92" />
            <Rect x="492" y="490" width="40" height="108" rx="20" fill="#FFFFFF" fillOpacity="0.92" />
          </AnimatedG>
        </Svg>

        <Animated.Text
          style={[
            s.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineY }] },
          ]}
        >
          plan the week together
        </Animated.Text>
      </View>

      {label ? (
        <SafeAreaView style={s.overlay} pointerEvents="none">
          <Text style={s.label}>{label}</Text>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000000' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  tagline: {
    color: '#C8C8D0', fontFamily: fontFamily.light, fontSize: 13,
    letterSpacing: 1.8, textTransform: 'lowercase',
  },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 60 },
  label:   { fontSize: 14, fontFamily: fontFamily.semibold, color: '#fff', letterSpacing: 0.3 },
});
