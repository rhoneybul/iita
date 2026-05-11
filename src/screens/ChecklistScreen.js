// Standard shared checklist — used for both the to-do list and the
// wish list. Same UX in both cases; the only thing that differs is the
// title, the input placeholder, and the section heading for done items
// ("Done" vs. "We did it"). Reached from the home-screen overflow menu.

import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActionSheetIOS, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, useBottomInset } from '../theme';
import { getList, saveListItem, deleteListItem } from '../services/storageService';
import { labelOf } from '../data/labels';

const FF = fontFamily;

// One screen, two configurations. The "wish" copy is gentler/celebratory;
// "todo" is utilitarian.
const CONFIG = {
  todo: {
    title: 'To-do',
    placeholder: "Add a to-do…",
    doneSectionLabel: 'Done',
    emptyTitle: 'Nothing to do',
    emptySub: "Add something you'd like to remember to do.",
  },
  wish: {
    title: 'Wish list',
    placeholder: "Something we'd love to do together…",
    doneSectionLabel: 'We did it',
    emptyTitle: 'Nothing yet',
    emptySub: "Add the things you'd both love to do together — a place to visit, a meal to cook, a trip to plan.",
  },
};

export default function ChecklistScreen({ navigation, route }) {
  const kind = route.params?.kind || 'todo';
  const cfg = CONFIG[kind] || CONFIG.todo;

  const [items, setItems] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy]   = useState(false);
  const inputRef = useRef(null);
  const bottomPad = useBottomInset(spacing.lg);

  const load = useCallback(async () => {
    setItems(await getList(kind));
  }, [kind]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAdd() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput('');
    try {
      await saveListItem(kind, { title: text });
      await load();
      // Keep focus so the user can rattle off several items in a row —
      // mirrors how iOS Reminders behaves.
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item) {
    await saveListItem(kind, { ...item, done: !item.done });
    load();
  }

  function confirmDelete(item) {
    const exec = async () => { await deleteListItem(kind, item.id); load(); };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: item.title,
          options: ['Delete', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          userInterfaceStyle: 'dark',
        },
        (i) => { if (i === 0) exec(); },
      );
    } else {
      Alert.alert(item.title, '', [
        { text: 'Delete', style: 'destructive', onPress: exec },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  // Active items first in insertion order; done items below grouped.
  const active = items.filter(i => !i.done);
  const done   = items.filter(i =>  i.done);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{cfg.title}</Text>
        {/* Count badge (active items only). Helps glance-readability. */}
        <View style={s.headerRight}>
          {active.length > 0 ? (
            <Text style={s.count}>{active.length}</Text>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Add row pinned to the top — always reachable, doesn't
            require scrolling to the bottom of a long list. */}
        <View style={s.inputRow}>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={cfg.placeholder}
            placeholderTextColor={colors.textFaint}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            blurOnSubmit={false}
            autoCorrect
          />
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!input.trim() || busy}
            style={[s.addBtn, !input.trim() && s.addBtnDisabled]}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color={input.trim() ? '#000' : colors.textFaint} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: bottomPad + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>{cfg.emptyTitle}</Text>
              <Text style={s.emptySub}>{cfg.emptySub}</Text>
            </View>
          )}

          {active.map(item => (
            <Row
              key={item.id}
              item={item}
              onToggle={() => toggle(item)}
              onOpen={() => navigation.navigate('ListItemEdit', { kind, itemId: item.id })}
              onLongPress={() => confirmDelete(item)}
            />
          ))}

          {done.length > 0 && (
            <>
              <Text style={s.sectionLabel}>
                {cfg.doneSectionLabel} · {done.length}
              </Text>
              {done.map(item => (
                <Row
                  key={item.id}
                  item={item}
                  onToggle={() => toggle(item)}
                  onOpen={() => navigation.navigate('ListItemEdit', { kind, itemId: item.id })}
                  onLongPress={() => confirmDelete(item)}
                />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ item, onToggle, onOpen, onLongPress }) {
  const lbl = labelOf(item.label);
  return (
    <View style={[s.row, item.done && s.rowDone]}>
      <TouchableOpacity
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={item.done ? colors.good : colors.textMuted}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.rowBody}
        onPress={onOpen}
        onLongPress={onLongPress}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        <Text style={[s.rowText, item.done && s.rowTextDone]} numberOfLines={2}>{item.title}</Text>
        {item.notes ? (
          <Text style={[s.rowNotes, item.done && s.rowTextDone]} numberOfLines={1}>{item.notes}</Text>
        ) : null}
      </TouchableOpacity>
      {lbl && (
        <View style={[s.chip, { backgroundColor: lbl.bg }]}>
          <Text style={[s.chipText, { color: lbl.color }]}>{lbl.name}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },
  headerRight: { minWidth: 22, alignItems: 'flex-end' },
  count: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 13 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  input: {
    flex: 1, color: colors.text, fontFamily: FF.regular, fontSize: 15,
    backgroundColor: colors.surfaceLight, paddingHorizontal: spacing.lg,
    paddingVertical: 12, borderRadius: radius.md,
  },
  addBtn: { width: 40, height: 40, backgroundColor: colors.primary, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: colors.surfaceLight },

  body: { padding: spacing.xl, gap: spacing.xs },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  rowDone: { opacity: 0.55 },
  rowBody: { flex: 1, gap: 2 },
  rowText: { color: colors.text, fontFamily: FF.regular, fontSize: 15, lineHeight: 20 },
  rowNotes: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12, lineHeight: 16 },
  rowTextDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontFamily: FF.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },

  sectionLabel: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.lg, marginBottom: spacing.sm },

  empty: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },
  emptySub: { color: colors.textMuted, fontFamily: FF.light, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 18 },
});
