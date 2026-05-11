import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { saveEvent } from '../services/storageService';
import { toISODate, MONTHS_SHORT } from '../utils/dates';

const FF = fontFamily;

export default function AddEventScreen({ route, navigation }) {
  const initialYear = route.params?.year || new Date().getFullYear();

  const [title, setTitle]       = useState('');
  const [date, setDate]         = useState(new Date(initialYear, new Date().getMonth(), new Date().getDate()));
  const [hasEnd, setHasEnd]     = useState(false);
  const [endDate, setEndDate]   = useState(new Date(initialYear, new Date().getMonth(), new Date().getDate()));
  const [withWho, setWithWho]   = useState('');
  const [location, setLocation] = useState('');
  const [showStart, setShowStart] = useState(Platform.OS === 'ios');
  const [showEnd,   setShowEnd]   = useState(Platform.OS === 'ios');

  const bottomPad = useBottomInset(spacing.xl);

  async function save() {
    if (!title.trim()) return;
    await saveEvent({
      title: title.trim(),
      date: toISODate(date),
      endDate: hasEnd ? toISODate(endDate) : undefined,
      withWho: withWho.trim() || undefined,
      location: location.trim() || undefined,
    });
    navigation.goBack();
  }

  function fmt(d) {
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add to the year</Text>
        <TouchableOpacity onPress={save} disabled={!title.trim()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.headerAction, !title.trim() && { color: colors.textFaint }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.body, { paddingBottom: bottomPad }]} keyboardShouldPersistTaps="handled">
          <View style={s.field}>
            <Text style={s.fieldLabel}>What is it?</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. George Wedding — Morocco"
              placeholderTextColor={colors.textFaint}
              autoFocus
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>When</Text>
            {Platform.OS === 'android' ? (
              <TouchableOpacity onPress={() => setShowStart(true)} style={s.dateBtn}>
                <Text style={s.dateBtnText}>{fmt(date)}</Text>
              </TouchableOpacity>
            ) : null}
            {showStart && (
              <DateTimePicker
                value={date}
                mode="date"
                onChange={(_, d) => {
                  if (Platform.OS === 'android') setShowStart(false);
                  if (d) setDate(d);
                }}
                themeVariant="dark"
              />
            )}
          </View>

          <View style={s.field}>
            <TouchableOpacity onPress={() => setHasEnd(v => !v)} style={s.toggleRow} activeOpacity={0.7}>
              <View style={[s.checkbox, hasEnd && s.checkboxOn]}>
                {hasEnd && <Ionicons name="checkmark" size={14} color="#000" />}
              </View>
              <Text style={s.toggleLabel}>This spans more than one day</Text>
            </TouchableOpacity>
            {hasEnd && (
              <View style={{ marginTop: spacing.md }}>
                {Platform.OS === 'android' ? (
                  <TouchableOpacity onPress={() => setShowEnd(true)} style={s.dateBtn}>
                    <Text style={s.dateBtnText}>Until {fmt(endDate)}</Text>
                  </TouchableOpacity>
                ) : null}
                {showEnd && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    onChange={(_, d) => {
                      if (Platform.OS === 'android') setShowEnd(false);
                      if (d) setEndDate(d);
                    }}
                    themeVariant="dark"
                  />
                )}
              </View>
            )}
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>With who?  <Text style={s.fieldHint}>optional</Text></Text>
            <TextInput
              style={s.input}
              value={withWho}
              onChangeText={setWithWho}
              placeholder="e.g. with George & Claire"
              placeholderTextColor={colors.textFaint}
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>Where?  <Text style={s.fieldHint}>optional</Text></Text>
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Morocco"
              placeholderTextColor={colors.textFaint}
            />
          </View>
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
  fieldLabel: { color: colors.text, fontFamily: FF.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  fieldHint: { color: colors.textMuted, fontFamily: FF.light, fontSize: 11, textTransform: 'none', letterSpacing: 0 },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 16, paddingVertical: spacing.sm },

  dateBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceLight },
  dateBtnText: { color: colors.text, fontFamily: FF.medium, fontSize: 14 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleLabel: { color: colors.text, fontFamily: FF.regular, fontSize: 14 },
});
