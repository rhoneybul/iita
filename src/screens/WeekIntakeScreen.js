// Start-of-week intake — voice dictation OR free-text. Sends to the
// server's /parse-week endpoint (Claude) and falls back to an
// on-device heuristic parser if no server is configured.
//
// Save merges per-day: any day the parse produced activities for gets
// REPLACED. Days the parse didn't mention are left alone, so users can
// dictate just "Monday cycling, Friday dinner" without wiping Tuesday.

import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Platform,
  KeyboardAvoidingView, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import useVoiceTranscription from '../hooks/useVoiceTranscription';
import { replaceDays, WEEKDAYS } from '../services/storageService';
import { api } from '../services/api';
import { weekRangeLabel } from '../utils/dates';
import { heuristicParseWeek } from '../utils/parseWeek';
import { sortActivities } from '../utils/time';
import { labelOf } from '../data/labels';

const FF = fontFamily;

export default function WeekIntakeScreen({ route, navigation }) {
  const { weekStart } = route.params;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
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

  async function handleParse() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      let parsed = null;
      if (api.enabled) {
        try { parsed = await api.parseWeek({ weekStart, text }); } catch {}
      }
      if (!parsed || !parsed.days) {
        parsed = heuristicParseWeek(text);
      }
      setPreview(parsed);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!preview?.days) return;
    await replaceDays(weekStart, preview.days);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{weekRangeLabel(weekStart)}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.body, { paddingBottom: bottomPad + 100 }]} keyboardShouldPersistTaps="handled">
          <Text style={s.lead}>Tell us what's happening this week. Say it out loud or write it — anything goes.</Text>
          <Text style={s.example}>
            e.g. "Monday cycling with Ollie at 8am, office afternoon. Tuesday rowing AM, lawyer chat at 3. Wednesday dinner with Josh and Bep. Friday date night — Wimbledon Art Fair. Saturday we fly to Spain at 6:30pm."
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
              onPress={handleParse}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator color="#000" /> : <Text style={s.ctaLabel}>Lay it out</Text>}
            </TouchableOpacity>
          </View>

          {preview && (
            <View style={s.preview}>
              <Text style={s.previewHeading}>Here's what we heard</Text>
              <Text style={s.previewSub}>Days you didn't mention are left alone. Tap save to apply.</Text>

              {WEEKDAYS.map(day => {
                const acts = sortActivities(preview.days?.[day]?.activities || []);
                if (acts.length === 0) return null;
                return (
                  <View key={day} style={s.previewDay}>
                    <Text style={s.previewDayName}>{day}</Text>
                    {acts.map(a => {
                      const lbl = labelOf(a.label);
                      return (
                        <View key={a.id} style={s.previewLine}>
                          {a.time ? <Text style={s.previewTime}>{a.time}</Text> : <Text style={s.previewTimeDot}>·</Text>}
                          <Text style={s.previewTitle}>{a.title}</Text>
                          {a.together && <Ionicons name="heart" size={11} color={colors.primary} />}
                          {lbl && (
                            <View style={[s.previewChip, { backgroundColor: lbl.bg }]}>
                              <Text style={[s.previewChipText, { color: lbl.color }]}>{lbl.name}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              <TouchableOpacity style={s.cta} onPress={handleSave} activeOpacity={0.85}>
                <Text style={s.ctaLabel}>Save week</Text>
              </TouchableOpacity>
            </View>
          )}
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

  inputWrap: { ...layout.card({ borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 180 }) },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 15, minHeight: 160, lineHeight: 22, textAlignVertical: 'top' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  micBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary },
  micBtnActive: { backgroundColor: colors.primary },
  micLabel: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13 },

  cta: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },

  preview: { ...layout.card({ padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border }) },
  previewHeading: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },
  previewSub: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12 },
  previewDay: { gap: 4, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  previewDayName: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13, letterSpacing: 0.5, marginBottom: 4 },
  previewLine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  previewTime: { color: colors.primary, fontFamily: FF.semibold, fontSize: 12, width: 56 },
  previewTimeDot: { color: colors.textFaint, fontFamily: FF.regular, fontSize: 13, width: 56 },
  previewTitle: { flex: 1, color: colors.text, fontFamily: FF.regular, fontSize: 14 },
  previewChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  previewChipText: { fontFamily: FF.medium, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },
});
