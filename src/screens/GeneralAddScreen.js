// Quick generic capture — dictate or type anything that doesn't fit
// the per-day grid. Saves as a to-do item so it shows up in the
// existing To-do list reachable from the home overflow.

import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Platform,
  KeyboardAvoidingView, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import useVoiceTranscription from '../hooks/useVoiceTranscription';
import { saveListItem } from '../services/storageService';

const FF = fontFamily;

export default function GeneralAddScreen({ navigation }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomPad = useBottomInset(spacing.xl);

  const voice = useVoiceTranscription({
    onFinal: (t) => { setText(prev => (prev ? prev + ' ' + t : t).trim()); },
  });

  const onMic = useCallback(() => {
    if (!voice.supported) {
      Alert.alert('Voice not available', "On-device speech recognition isn't supported on this device. Type instead.");
      return;
    }
    if (voice.isListening) voice.stop();
    else voice.start();
  }, [voice]);

  async function handleSave() {
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      if (voice.isListening) voice.stop();
      await saveListItem('todo', { title });
      navigation.goBack();
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
        <Text style={s.headerTitle}>Plan something</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.body, { paddingBottom: bottomPad + 100 }]} keyboardShouldPersistTaps="handled">
          <Text style={s.lead}>Something to remember, without a date.</Text>
          <Text style={s.example}>
            e.g. "Book Mum's birthday dinner", "Look into that Lisbon trip", "Renew passport".
          </Text>

          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              value={voice.isListening && voice.partial ? `${text} ${voice.partial}`.trim() : text}
              onChangeText={setText}
              placeholder="Type here, or tap the mic to dictate."
              placeholderTextColor={colors.textFaint}
              multiline
              textAlignVertical="top"
              autoCorrect
              autoFocus
              editable={!voice.isListening}
            />
          </View>

          <View style={s.actions}>
            <TouchableOpacity
              style={[s.micBtn, voice.isListening && s.micBtnActive]}
              onPress={onMic}
              activeOpacity={0.85}
              disabled={busy}
            >
              <Ionicons name={voice.isListening ? 'stop' : 'mic'} size={20} color={voice.isListening ? '#000' : colors.primary} />
              <Text style={[s.micLabel, voice.isListening && { color: '#000' }]}>
                {voice.isListening ? 'Tap to stop' : (voice.supported ? 'Hold to dictate' : 'Voice unavailable')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.cta, (!text.trim() || busy) && s.ctaDisabled]}
              disabled={!text.trim() || busy}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator color="#000" /> : <Text style={s.ctaLabel}>Save</Text>}
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>Lands in your To-do list — open it from the menu on the home screen.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },

  body: { padding: spacing.xl, gap: spacing.lg },
  lead:    { color: colors.text, fontFamily: FF.semibold, fontSize: 18, lineHeight: 24 },
  example: { color: colors.textMid, fontFamily: FF.light, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

  inputWrap: { ...layout.card({ borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 140 }) },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 15, minHeight: 120, lineHeight: 22, textAlignVertical: 'top' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  micBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary },
  micBtnActive: { backgroundColor: colors.primary },
  micLabel: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13 },

  cta: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },

  hint: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
});
