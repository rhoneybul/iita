import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontFamily, spacing, radius } from '../theme';
import {
  signInWithGoogle, signInWithApple, onAuthStateChange, getSession, isSupabaseConfigured,
} from '../services/authService';
import { ensureUserData, hydrateFromServer } from '../services/storageService';

const PENDING_INVITE_KEY = '@iita_pending_invite';

// If the user opened the app via `iita://invite/<code>` before signing
// in, that code is sitting in AsyncStorage. Pick it up here and route
// to JoinPair instead of Home so they don't have to retype it.
async function nextRouteAfterAuth() {
  const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
  if (code) {
    await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    return { name: 'JoinPair', params: { code } };
  }
  return { name: 'Home' };
}

const FF = fontFamily;

const GoogleLogo = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16" fill="none">
    <Path d="M15.5 8.2c0-.6-.1-1.1-.2-1.6H8v3h4.2c-.2 1-.8 1.8-1.6 2.3v2h2.6c1.5-1.4 2.3-3.4 2.3-5.7z" fill="#4285F4" />
    <Path d="M8 16c2.1 0 3.9-.7 5.2-1.9l-2.6-2c-.7.5-1.6.8-2.6.8-2 0-3.7-1.3-4.3-3.2H1v2c1.3 2.6 4 4.3 7 4.3z" fill="#34A853" />
    <Path d="M3.7 9.7c-.3-.8-.5-1.6-.5-2.5 0-.9.2-1.7.5-2.5V2.7H1C.4 3.9 0 5.4 0 7.2c0 1.8.4 3.3 1 4.5l2.7-2z" fill="#FBBC05" />
    <Path d="M8 3.2c1.1 0 2.1.4 2.9 1.1l2.2-2.2C11.9 1 10.1.2 8 .2 5 .2 2.3 1.9 1 4.5l2.7 2C4.3 4.6 6 3.2 8 3.2z" fill="#EA4335" />
  </Svg>
);

const AppleLogo = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="#000">
    <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.51-3.23 0-1.44.64-2.2.45-3.06-.4C3.79 16.17 4.36 9.05 8.93 8.8c1.28.07 2.17.72 2.92.77.99-.2 1.94-.78 3-.84 1.28-.1 2.25.38 2.88 1.16-2.64 1.58-2.01 5.07.32 6.04-.5 1.32-.74 1.97-1.57 3.14-.76 1.08-1.83 2.13-3.43 2.21zM12.03 8.7c-.15-2.34 1.84-4.38 4.04-4.55.3 2.63-2.34 4.6-4.04 4.55z" />
  </Svg>
);

export default function SignInScreen({ navigation }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

  const [loadingProvider, setLoadingProvider] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});

    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    getSession().then(async s => {
      if (s) {
        const next = await nextRouteAfterAuth();
        navigation.replace(next.name, next.params);
      }
    });

    const unsub = onAuthStateChange(async user => {
      if (user) {
        const cleared = await ensureUserData(user.id);
        await hydrateFromServer({ force: cleared });
        const next = await nextRouteAfterAuth();
        navigation.replace(next.name, next.params);
      }
    });
    return unsub;
  }, []);

  async function handleGuest() {
    await ensureUserData('guest');
    const next = await nextRouteAfterAuth();
    navigation.replace(next.name, next.params);
  }

  async function handleGoogle() {
    if (!isSupabaseConfigured) return handleGuest();
    setAuthError(null); setLoadingProvider('google');
    try { await signInWithGoogle(); }
    catch (e) { setAuthError(e.message); }
    finally { if (Platform.OS !== 'web') setLoadingProvider(null); }
  }

  async function handleApple() {
    if (!isSupabaseConfigured) return handleGuest();
    setAuthError(null); setLoadingProvider('apple');
    try { await signInWithApple(); }
    catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') setAuthError(e.message);
    } finally { setLoadingProvider(null); }
  }

  return (
    <SafeAreaView style={s.root}>
      <Animated.View style={[s.body, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <Text style={s.wordmark}>iita</Text>
        <Text style={s.tagline}>Plan the week together</Text>

        <View style={s.buttons}>
          {appleAvailable && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[s.btn, s.btnLight]}
              onPress={handleApple}
              disabled={!!loadingProvider}
              activeOpacity={0.85}
            >
              {loadingProvider === 'apple'
                ? <ActivityIndicator color="#000" />
                : <><AppleLogo /><Text style={s.btnLightText}>Continue with Apple</Text></>}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.btn, s.btnLight]}
            onPress={handleGoogle}
            disabled={!!loadingProvider}
            activeOpacity={0.85}
          >
            {loadingProvider === 'google'
              ? <ActivityIndicator color="#000" />
              : <><GoogleLogo /><Text style={s.btnLightText}>Continue with Google</Text></>}
          </TouchableOpacity>

          {!isSupabaseConfigured && (
            <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={handleGuest} activeOpacity={0.7}>
              <Text style={s.btnGhostText}>Continue without an account</Text>
            </TouchableOpacity>
          )}

          {authError ? <Text style={s.err}>{authError}</Text> : null}
        </View>

        <Text style={s.fine}>By continuing you agree to share your week with anyone you grant access to.</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: spacing.xxl, justifyContent: 'center' },
  wordmark: { fontSize: 64, color: colors.primary, fontFamily: FF.semibold, letterSpacing: 2, marginBottom: spacing.sm },
  tagline:  { fontSize: 16, color: colors.textMid, fontFamily: FF.regular, marginBottom: spacing.xxxl },
  buttons: { gap: spacing.md, marginTop: spacing.xl },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, paddingVertical: 14, borderRadius: radius.pill,
  },
  btnLight: { backgroundColor: '#FFFFFF' },
  btnLightText: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.textMid, fontFamily: FF.medium, fontSize: 14 },
  err: { color: colors.warn, fontFamily: FF.regular, fontSize: 13, textAlign: 'center', marginTop: spacing.md },
  fine: { color: colors.textFaint, fontFamily: FF.light, fontSize: 11, textAlign: 'center', marginTop: spacing.xxxl },
});
