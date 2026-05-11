// Edit one day. Six text fields, one per column. Saves on blur and on
// the explicit Save button.

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getWeek, saveDay, emptyDay } from '../services/storageService';
import { dayLabel } from '../utils/dates';

const FF = fontFamily;

const FIELDS = [
  { key: 'donde',      label: 'Donde',      hint: 'Where are you?',                  icon: 'location-outline' },
  { key: 'juntos',     label: 'Juntos',     hint: 'Things together',                 icon: 'heart-outline' },
  { key: 'oficina',    label: 'Oficina',    hint: 'Yes / No, or which office',       icon: 'briefcase-outline' },
  { key: 'importante', label: 'Importante', hint: 'Anything that matters most',      icon: 'star-outline' },
  { key: 'ejercicio',  label: 'Ejercicio',  hint: 'Workouts, training, sport',       icon: 'fitness-outline' },
  { key: 'queMas',     label: 'Que mas',    hint: 'Everything else',                 icon: 'sparkles-outline' },
];

export default function DayDetailScreen({ route, navigation }) {
  const { weekStart, day } = route.params;
  const [data, setData] = useState(emptyDay());
  const [saved, setSaved] = useState(true);
  const bottomPad = useBottomInset(spacing.xl);

  useEffect(() => {
    getWeek(weekStart).then(w => setData({ ...emptyDay(), ...(w.days?.[day] || {}) }));
  }, [weekStart, day]);

  function patch(k, v) {
    setData(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  async function save() {
    await saveDay(weekStart, day, data);
    setSaved(true);
  }

  async function saveAndClose() {
    await save();
    navigation.goBack();
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{dayLabel(weekStart, day)}</Text>
        <TouchableOpacity onPress={saveAndClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.headerAction, saved && { color: colors.textFaint }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.body, { paddingBottom: bottomPad }]} keyboardShouldPersistTaps="handled">
          {FIELDS.map(f => (
            <View key={f.key} style={s.field}>
              <View style={s.fieldHead}>
                <Ionicons name={f.icon} size={14} color={colors.primary} />
                <Text style={s.fieldLabel}>{f.label}</Text>
                <Text style={s.fieldHint}>· {f.hint}</Text>
              </View>
              <TextInput
                style={s.fieldInput}
                value={data[f.key] || ''}
                onChangeText={v => patch(f.key, v)}
                onBlur={save}
                placeholder=""
                placeholderTextColor={colors.textFaint}
                multiline
                autoCorrect
              />
            </View>
          ))}
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
  field: { ...layout.card({ padding: spacing.lg, borderWidth: 1, borderColor: colors.border }) },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  fieldLabel: { color: colors.text, fontFamily: FF.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldHint: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12 },
  fieldInput: {
    color: colors.text, fontFamily: FF.regular, fontSize: 15, lineHeight: 22,
    minHeight: 44, textAlignVertical: 'top',
  },
});
