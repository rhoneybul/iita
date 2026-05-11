// Add / edit one activity. Opens as a slide-up modal from DayDetail.
// Fields: title (required), time (optional free-text), label (one-tap
// chip), together (toggle). Bottom-pinned save; delete sits below for
// existing activities.

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getWeek, saveActivity, deleteActivity, emptyDay } from '../services/storageService';
import { dayLabel } from '../utils/dates';
import { LABELS, LABEL_ORDER } from '../data/labels';

const FF = fontFamily;

export default function ActivityEditScreen({ route, navigation }) {
  const { weekStart, day, activityId } = route.params;
  const isEdit = !!activityId;

  const [title, setTitle]       = useState('');
  const [time, setTime]         = useState('');
  const [label, setLabel]       = useState('');
  const [together, setTogether] = useState(false);
  const [loaded, setLoaded]     = useState(!isEdit);

  const bottomPad = useBottomInset(spacing.xl);

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
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Edit activity' : 'Add activity'}</Text>
        <TouchableOpacity onPress={save} disabled={!canSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.headerAction, !canSave && { color: colors.textFaint }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.body, { paddingBottom: bottomPad }]} keyboardShouldPersistTaps="handled">
          <Text style={s.dayLine}>{dayLabel(weekStart, day)}</Text>

          {/* Title */}
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

          {/* Time */}
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

          {/* Label */}
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

          {/* Together */}
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

          {/* Delete */}
          {isEdit && (
            <TouchableOpacity style={s.deleteBtn} onPress={remove} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={colors.warn} />
              <Text style={s.deleteLabel}>Delete activity</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 15 },
  headerAction: { color: colors.primary, fontFamily: FF.semibold, fontSize: 14 },

  body: { padding: spacing.xl, gap: spacing.lg },
  dayLine: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },

  field: { ...layout.card({ padding: spacing.lg, borderWidth: 1, borderColor: colors.border }) },
  fieldLabel: { color: colors.text, fontFamily: FF.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  fieldHint:  { color: colors.textMuted, fontFamily: FF.light, fontSize: 11, textTransform: 'none', letterSpacing: 0 },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 16, paddingVertical: spacing.sm },

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
    gap: spacing.sm, paddingVertical: 14, marginTop: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.warnBorder || colors.warn,
  },
  deleteLabel: { color: colors.warn, fontFamily: FF.semibold, fontSize: 14 },
});
