// Add / edit one activity. Renders as a bottom drawer over DayDetail —
// the route's `cardStyleInterpolator: slideUp` + `cardStyle: transparent`
// in App.js animate the slide and keep the previous screen visible
// beneath. Tapping the backdrop dismisses.

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Switch, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, useBottomInset } from '../theme';
import { getWeek, saveActivity, deleteActivity, emptyDay } from '../services/storageService';
import { dayLabel } from '../utils/dates';
import { LABELS, LABEL_ORDER } from '../data/labels';

const FF = fontFamily;
const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

export default function ActivityEditScreen({ route, navigation }) {
  const { weekStart, day, activityId } = route.params;
  const isEdit = !!activityId;

  const [title, setTitle]       = useState('');
  const [time, setTime]         = useState('');
  const [label, setLabel]       = useState('');
  const [notes, setNotes]       = useState('');
  const [together, setTogether] = useState(false);
  const [loaded, setLoaded]     = useState(!isEdit);

  const bottomPad = useBottomInset(spacing.lg);
  const footerPad = useBottomInset(spacing.md);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const w = await getWeek(weekStart);
      const d = w.days?.[day] || emptyDay();
      const a = (d.activities || []).find(x => x.id === activityId);
      if (a) {
        setTitle(a.title);
        setTime(a.time || '');
        setLabel(a.label || '');
        setNotes(a.notes || '');
        setTogether(!!a.together);
      }
      setLoaded(true);
    })();
  }, [isEdit, weekStart, day, activityId]);

  const canSave = title.trim().length > 0;

  async function save() {
    if (!canSave) return;
    await saveActivity(weekStart, day, {
      id: activityId || undefined,
      title: title.trim(),
      time: time.trim(),
      label,
      notes: notes.trim() || null,
      together,
    });
    navigation.goBack();
  }

  async function remove() {
    if (!isEdit) return;
    await deleteActivity(weekStart, day, activityId);
    navigation.goBack();
  }

  return (
    <View style={s.root}>
      <Pressable style={s.backdrop} onPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={s.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.headerRow}>
            <Text style={s.headerTitle}>{isEdit ? 'Edit activity' : 'Add activity'}</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={HIT} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={colors.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[s.body, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.dayLine}>{dayLabel(weekStart, day)}</Text>

            <View style={s.field}>
              <Text style={s.fieldLabel}>What is it?</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Cycling with Ollie"
                placeholderTextColor={colors.textFaint}
                autoFocus={!isEdit}
                autoCorrect
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Time  <Text style={s.fieldHint}>optional</Text></Text>
              <TextInput
                style={s.input}
                value={time}
                onChangeText={setTime}
                placeholder="9am · 18:30 · evening"
                placeholderTextColor={colors.textFaint}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Label  <Text style={s.fieldHint}>optional</Text></Text>
              <View style={s.chipRow}>
                {LABEL_ORDER.map(key => {
                  const cfg = LABELS[key];
                  const active = label === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setLabel(active ? '' : key)}
                      activeOpacity={0.8}
                      style={[
                        s.chip,
                        { borderColor: cfg.color },
                        active && { backgroundColor: cfg.bg },
                      ]}
                    >
                      <Text style={[s.chipText, { color: cfg.color }]}>{cfg.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Notes  <Text style={s.fieldHint}>optional</Text></Text>
              <TextInput
                style={[s.input, s.inputMulti]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything to remember about it…"
                placeholderTextColor={colors.textFaint}
                multiline
                textAlignVertical="top"
                autoCorrect
              />
            </View>

            <View style={[s.field, s.toggleField]}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Together</Text>
                <Text style={s.toggleHint}>Are you doing this with your partner?</Text>
              </View>
              <Switch
                value={together}
                onValueChange={setTogether}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (together ? '#fff' : colors.textMuted) : undefined}
                ios_backgroundColor={colors.border}
              />
            </View>

            {isEdit && (
              <TouchableOpacity style={s.deleteBtn} onPress={remove} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color={colors.warn} />
                <Text style={s.deleteLabel}>Delete activity</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={[s.footer, { paddingBottom: footerPad }]}>
            <TouchableOpacity
              style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
              onPress={save}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              <Text style={s.saveBtnText}>{isEdit ? 'Save' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetWrap: { width: '100%' },

  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 8,
  },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },

  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  dayLine: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },

  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  fieldLabel: { color: colors.text, fontFamily: FF.semibold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  fieldHint:  { color: colors.textMuted, fontFamily: FF.light, fontSize: 11, textTransform: 'none', letterSpacing: 0 },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 16, paddingVertical: spacing.sm },
  inputMulti: { minHeight: 70, lineHeight: 22 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.pill, borderWidth: 1,
  },
  chipText: { fontFamily: FF.semibold, fontSize: 12, letterSpacing: 0.3 },

  toggleField: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleHint: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12, marginTop: 2, textTransform: 'none', letterSpacing: 0 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.warn,
  },
  deleteLabel: { color: colors.warn, fontFamily: FF.semibold, fontSize: 14 },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },
});
