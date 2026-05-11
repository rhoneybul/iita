// Enter a partner's invite code. On success, wipes the user's existing
// iita calendar (they're adopting their partner's) and re-hydrates from
// the server.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { api } from '../services/api';
import { wipeLocalCalendar, hydrateFromServer } from '../services/storageService';
import { getSession } from '../services/authService';

const FF = fontFamily;
const CODE_LEN = 6;

export default function JoinPairScreen({ route, navigation }) {
  const presetCode = (route.params?.code || '').toUpperCase();

  const [code, setCode] = useState(presetCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [signedIn, setSignedIn] = useState(true);
  const inputRef = useRef(null);

  const bottomPad = useBottomInset(spacing.xl);

  useEffect(() => {
    getSession().then(s => setSignedIn(!!s));
  }, []);

  // Auto-submit when the screen opens from a deep link with a full code.
  useEffect(() => {
    if (presetCode.length === CODE_LEN && signedIn) {
      submit(presetCode);
    }
  }, [presetCode, signedIn]);

  async function submit(value) {
    const c = (value || code).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== CODE_LEN) { setError(`Code is ${CODE_LEN} characters.`); return; }
    setBusy(true); setError(null);
    try {
      await api.pair.redeem(c);
      // Local state belongs to the old pair — wipe it, then pull the
      // partner's data from the server.
      await wipeLocalCalendar();
      await hydrateFromServer({ force: true });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Join your partner</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.body, { paddingBottom: bottomPad }]}>
          {!signedIn ? (
            <View style={s.center}>
              <Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />
              <Text style={s.signinTitle}>Sign in first</Text>
              <Text style={s.signinBody}>
                Joining a pair links your account to your partner's. Sign in with the account you want linked, then come back here.
              </Text>
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] })}
                activeOpacity={0.85}
              >
                <Text style={s.primaryLabel}>Go to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.lead}>Enter the 6-character code your partner sent you.</Text>

              <View style={s.codeCard}>
                <TextInput
                  ref={inputRef}
                  style={s.codeInput}
                  value={code}
                  onChangeText={v => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN))}
                  placeholder="ABCD23"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus={!presetCode}
                  maxLength={CODE_LEN}
                  onSubmitEditing={() => submit()}
                />
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, (busy || code.length !== CODE_LEN) && s.primaryBtnDisabled]}
                onPress={() => submit()}
                disabled={busy || code.length !== CODE_LEN}
                activeOpacity={0.85}
              >
                {busy ? <ActivityIndicator color="#000" /> : <Text style={s.primaryLabel}>Join</Text>}
              </TouchableOpacity>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <Text style={s.fine}>
                Heads up — joining will replace your current iita calendar with your partner's. If you want to keep yours, ask them to join you instead.
              </Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function parseApiError(e) {
  const msg = String(e?.message || '');
  if (msg.includes('invite_not_found'))      return "That code doesn't match an invite. Double-check it with your partner.";
  if (msg.includes('invite_already_used'))   return 'That invite has already been used. Ask your partner to generate a new one.';
  if (msg.includes('invite_expired'))        return 'That invite expired. Ask your partner to generate a new one.';
  if (msg.includes('cannot_redeem_own'))     return "That's your own invite code. Ask your partner for theirs.";
  if (msg.includes('pair_full'))             return 'That pair is already full.';
  if (msg.includes('supabase_not_configured')) return "Cloud sync isn't set up — can't pair without it.";
  if (msg.includes('401'))                   return 'Sign in first, then try again.';
  return msg || 'Something went wrong. Try again.';
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },

  body: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },

  lead: { color: colors.text, fontFamily: FF.regular, fontSize: 16, lineHeight: 22, textAlign: 'center' },

  codeCard: { ...layout.card({ padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border }) },
  codeInput: {
    color: colors.primary, fontFamily: FF.semibold, fontSize: 38,
    letterSpacing: 8, textAlign: 'center', paddingVertical: 0, minWidth: 220,
  },

  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },

  error: { color: colors.warn, fontFamily: FF.regular, fontSize: 13, textAlign: 'center' },
  fine: { color: colors.textFaint, fontFamily: FF.light, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 'auto' },

  signinTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 20 },
  signinBody:  { color: colors.textMid, fontFamily: FF.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320 },
});
