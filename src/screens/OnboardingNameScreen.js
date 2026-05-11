// One-field "what do we call you?" screen, shown once after first
// sign-in. The name is stamped onto activities as they're added so the
// partner can see who put what on the calendar.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontFamily, spacing, radius } from '../theme';
import { setUserPrefs, getEvents } from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FF = fontFamily;
const PENDING_INVITE_KEY = '@iita_pending_invite';

export default function OnboardingNameScreen({ navigation }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const canSave = name.trim().length > 0;

  async function save() {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      await setUserPrefs({ displayName: name.trim() });
      const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (code) {
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        navigation.replace('JoinPair', { code });
        return;
      }
      navigation.replace('Home');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.body}>
          <Text style={s.lead}>What should we call you?</Text>
          <Text style={s.sub}>
            We tag each thing you add with your first initial, so your partner can see who put what on the week.
          </Text>

          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            placeholderTextColor={colors.textFaint}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={save}
          />

          <TouchableOpacity
            style={[s.cta, !canSave && s.ctaDisabled]}
            disabled={!canSave || busy}
            onPress={save}
            activeOpacity={0.85}
          >
            {busy ? <ActivityIndicator color="#000" /> : <Text style={s.ctaLabel}>Continue</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  lead: { color: colors.text, fontFamily: FF.semibold, fontSize: 22, lineHeight: 28 },
  sub:  { color: colors.textMid, fontFamily: FF.light, fontSize: 14, lineHeight: 20 },
  input: {
    color: colors.text, fontFamily: FF.regular, fontSize: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.md,
  },
  cta: {
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.md,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },
});
