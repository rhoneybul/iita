// Add or edit a year event. Same screen serves both flows — when
// `eventId` is passed in route.params, fields prefill from storage and
// Save updates that event (saveEvent is upsert-by-id). Delete button
// appears in edit mode.

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { saveEvent, deleteEvent, getEvents } from '../services/storageService';
import { toISODate, fromISODate, MONTHS_SHORT } from '../utils/dates';
import { LABELS, LABEL_ORDER } from '../data/labels';

const FF = fontFamily;

export default function AddEventScreen({ route, navigation }) {
  const eventId    = route.params?.eventId || null;
  const initialYear = route.params?.year || new Date().getFullYear();
  const isEdit = !!eventId;

  const [title, setTitle]       = useState('');
  const [date, setDate]         = useState(new Date(initialYear, new Date().getMonth(), new Date().getDate()));
  const [hasEnd, setHasEnd]     = useState(false);
  const [endDate, setEndDate]   = useState(new Date(initialYear, new Date().getMonth(), new Date().getDate()));
  const [withWho, setWithWho]   = useState('');
  const [location, setLocation] = useState('');
  const [label, setLabel]       = useState('');
  const [notes, setNotes]       = useState('');
  const [done, setDone]         = useState(false);
  const [showStart, setShowStart] = useState(Platform.OS === 'ios');
  const [showEnd,   setShowEnd]   = useState(Platform.OS === 'ios');

  const bottomPad = useBottomInset(spacing.xl);

  // Prefill in edit mode.
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const all = await getEvents();
      const e = all.find(x => x.id === eventId);
      if (!e) return;
      setTitle(e.title || '');
      const start = fromISODate(e.date);
      if (start) setDate(start);
      if (e.endDate) {
        const end = fromISODate(e.endDate);
        if (end) { setEndDate(end); setHasEnd(true); }
      }
      setWithWho(e.withWho || '');
      setLocation(e.location || '');
      setLabel(e.label || '');
      setNotes(e.notes || '');
      setDone(!!e.done);
    })();
  }, [isEdit, eventId]);

  async function save() {
    if (!title.trim()) return;
    await saveEvent({
      id: eventId || undefined,
      title: title.trim(),
      date: toISODate(date),
      endDate: hasEnd ? toISODate(endDate) : undefined,
      withWho: withWho.trim() || undefined,
      location: location.trim() || undefined,
      label: label || undefined,
      notes: notes.trim() || undefined,
      done,
    });
    navigation.goBack();
  }

  async function remove() {
    if (!isEdit) return;
    await deleteEvent(eventId);
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
        <Text style={s.headerTitle}>{isEdit ? 'Edit event' : 'Add to the year'}</Text>
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
              autoFocus={!isEdit}
              autoCorrect
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
                    style={[s.chip, { borderColor: cfg.color }, active && { backgroundColor: cfg.bg }]}
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

          {isEdit && (
            <>
              <TouchableOpacity
                style={[s.field, s.toggleField]}
                onPress={() => setDone(v => !v)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Mark done</Text>
                  <Text style={s.toggleHint}>{done ? "We've done it — it'll show with a check." : "Not done yet."}</Text>
                </View>
                <View style={[s.checkbox, done && s.checkboxOn]}>
                  {done && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={s.deleteBtn} onPress={remove} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color={colors.warn} />
                <Text style={s.deleteLabel}>Delete event</Text>
              </TouchableOpacity>
            </>
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
  field: { ...layout.card({ padding: spacing.lg, borderWidth: 1, borderColor: colors.border }) },
  fieldLabel: { color: colors.text, fontFamily: FF.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  fieldHint: { color: colors.textMuted, fontFamily: FF.light, fontSize: 11, textTransform: 'none', letterSpacing: 0 },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 16, paddingVertical: spacing.sm },
  inputMulti: { minHeight: 80, lineHeight: 22 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1 },
  chipText: { fontFamily: FF.semibold, fontSize: 12, letterSpacing: 0.3 },

  dateBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceLight },
  dateBtnText: { color: colors.text, fontFamily: FF.medium, fontSize: 14 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleField: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleHint: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12, marginTop: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleLabel: { color: colors.text, fontFamily: FF.regular, fontSize: 14 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14, marginTop: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.warnBorder || colors.warn,
  },
  deleteLabel: { color: colors.warn, fontFamily: FF.semibold, fontSize: 14 },
});
