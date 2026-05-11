// Edit one list item (to-do or wishlist). Title, notes, label.
// Reached by tapping a row in ChecklistScreen.

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getList, saveListItem, deleteListItem } from '../services/storageService';
import { LABELS, LABEL_ORDER } from '../data/labels';

const FF = fontFamily;

export default function ListItemEditScreen({ route, navigation }) {
  const { kind = 'todo', itemId } = route.params || {};
  const isEdit = !!itemId;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [label, setLabel] = useState('');
  const [done, setDone]   = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);

  const bottomPad = useBottomInset(spacing.xl);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const list = await getList(kind);
      const item = list.find(i => i.id === itemId);
      if (item) {
        setTitle(item.title || '');
        setNotes(item.notes || '');
        setLabel(item.label || '');
        setDone(!!item.done);
      }
      setLoaded(true);
    })();
  }, [isEdit, kind, itemId]);

  const canSave = title.trim().length > 0;

  async function save() {
    if (!canSave) return;
    await saveListItem(kind, {
      id: itemId || undefined,
      title: title.trim(),
      notes: notes.trim() || null,
      label: label || null,
      done,
    });
    navigation.goBack();
  }

  async function remove() {
    if (!isEdit) return;
    await deleteListItem(kind, itemId);
    navigation.goBack();
  }

  const heading = kind === 'wish' ? 'wish' : 'to-do';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? `Edit ${heading}` : `New ${heading}`}</Text>
        <TouchableOpacity onPress={save} disabled={!canSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.headerAction, !canSave && { color: colors.textFaint }]}>Save</Text>
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
              placeholder={kind === 'wish' ? 'e.g. Weekend in Lisbon' : "e.g. Book Mum's birthday dinner"}
              placeholderTextColor={colors.textFaint}
              autoFocus={!isEdit}
              autoCorrect
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>Notes <Text style={s.fieldHint}>optional</Text></Text>
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

          <View style={s.field}>
            <Text style={s.fieldLabel}>Label <Text style={s.fieldHint}>optional</Text></Text>
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

          {isEdit && (
            <TouchableOpacity style={s.deleteBtn} onPress={remove} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={colors.warn} />
              <Text style={s.deleteLabel}>Delete</Text>
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
  field: { ...layout.card({ padding: spacing.lg, borderWidth: 1, borderColor: colors.border }) },
  fieldLabel: { color: colors.text, fontFamily: FF.semibold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  fieldHint:  { color: colors.textMuted, fontFamily: FF.light, fontSize: 11, textTransform: 'none', letterSpacing: 0 },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 16, paddingVertical: spacing.sm },
  inputMulti: { minHeight: 80, lineHeight: 22 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1 },
  chipText: { fontFamily: FF.semibold, fontSize: 12, letterSpacing: 0.3 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14, marginTop: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.warn,
  },
  deleteLabel: { color: colors.warn, fontFamily: FF.semibold, fontSize: 14 },
});
