// Quick generic capture — type anything that doesn't fit the per-day
// grid. Saves as a to-do item so it shows up in the existing To-do list
// reachable from the home overflow. Renders as a drawer.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator,
} from 'react-native';

import { colors, fontFamily, spacing, radius, layout } from '../theme';
import { saveListItem } from '../services/storageService';
import Drawer from '../components/Drawer';

const FF = fontFamily;

export default function GeneralAddScreen({ navigation }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await saveListItem('todo', { title });
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer onClose={() => navigation.goBack()}>
      <Drawer.Header title="Plan something" onClose={() => navigation.goBack()} />
      <Drawer.Body>
        <Text style={s.lead}>Something to remember, without a date.</Text>
        <Text style={s.example}>
          e.g. "Book Mum's birthday dinner", "Look into that Lisbon trip", "Renew passport".
        </Text>

        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type here…"
            placeholderTextColor={colors.textFaint}
            multiline
            textAlignVertical="top"
            autoCorrect
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[s.cta, (!text.trim() || busy) && s.ctaDisabled]}
          disabled={!text.trim() || busy}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          {busy ? <ActivityIndicator color="#000" /> : <Text style={s.ctaLabel}>Save</Text>}
        </TouchableOpacity>

        <Text style={s.hint}>Lands in your To-do list.</Text>
      </Drawer.Body>
    </Drawer>
  );
}

const s = StyleSheet.create({
  lead:    { color: colors.text, fontFamily: FF.semibold, fontSize: 18, lineHeight: 24 },
  example: { color: colors.textMid, fontFamily: FF.light, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

  inputWrap: { ...layout.card({ borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 140 }) },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 15, minHeight: 120, lineHeight: 22, textAlignVertical: 'top' },

  cta: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },

  hint: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
});
