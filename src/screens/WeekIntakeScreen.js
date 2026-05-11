// Start-of-week intake — type a free-text week and let the server's
// /parse-week endpoint (Claude) lay it out, falling back to an
// on-device heuristic if no server is configured.
//
// Save merges per-day: any day the parse produced activities for gets
// REPLACED. Days the parse didn't mention are left alone, so the user
// can write just "Monday cycling, Friday dinner" without wiping Tuesday.
// The preview is fully editable before saving — title, time, label,
// together-flag, and delete are all in place.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout } from '../theme';
import { replaceDays, WEEKDAYS } from '../services/storageService';
import { api } from '../services/api';
import { weekRangeLabel } from '../utils/dates';
import { heuristicParseWeek } from '../utils/parseWeek';
import { sortActivities, formatTime } from '../utils/time';
import { LABEL_ORDER, labelOf } from '../data/labels';
import TimePicker from '../components/TimePicker';
import Drawer from '../components/Drawer';

const FF = fontFamily;

// Cycle order for the label tap-chip in the preview.
const LABEL_CYCLE = ['', ...LABEL_ORDER];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function WeekIntakeScreen({ route, navigation }) {
  const { weekStart } = route.params;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  // `preview` mirrors the parsed days but with stable ids and
  // user-edited fields layered on top. Shape:
  //   { days: { Mon: { activities: [{id,title,time,label,together,notes}] }, ... } }
  const [preview, setPreview] = useState(null);
  // Which row currently has the inline TimePicker expanded.
  const [openTimeFor, setOpenTimeFor] = useState(null);

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
      setPreview(withStableIds(parsed));
      setOpenTimeFor(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!preview?.days) return;
    // Drop any blank-title rows the user may have emptied.
    const cleaned = { days: {} };
    for (const d of WEEKDAYS) {
      const acts = (preview.days[d]?.activities || []).filter(a => a.title.trim());
      if (acts.length > 0) cleaned.days[d] = { activities: acts };
    }
    await replaceDays(weekStart, cleaned.days);
    navigation.goBack();
  }

  function patchItem(day, id, patch) {
    setPreview(prev => {
      if (!prev) return prev;
      const acts = (prev.days?.[day]?.activities || []).map(a =>
        a.id === id ? { ...a, ...patch } : a
      );
      return { ...prev, days: { ...prev.days, [day]: { activities: acts } } };
    });
  }

  function deleteItem(day, id) {
    setPreview(prev => {
      if (!prev) return prev;
      const acts = (prev.days?.[day]?.activities || []).filter(a => a.id !== id);
      return { ...prev, days: { ...prev.days, [day]: { activities: acts } } };
    });
    if (openTimeFor === id) setOpenTimeFor(null);
  }

  function cycleLabel(day, id, currentLabel) {
    const i = LABEL_CYCLE.indexOf(currentLabel || '');
    const next = LABEL_CYCLE[(i + 1) % LABEL_CYCLE.length];
    patchItem(day, id, { label: next });
  }

  return (
    <Drawer onClose={() => navigation.goBack()} maxHeightPct={94}>
      <Drawer.Header title={weekRangeLabel(weekStart)} onClose={() => navigation.goBack()} />
      <Drawer.Body>
        <Text style={s.lead}>What's the week looking like? Type it — anything goes.</Text>
        <Text style={s.example}>
          Mention days as you go. Times if you've got them. We'll lay it out for you.
        </Text>

        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type the week here…"
            placeholderTextColor={colors.textFaint}
            multiline
            textAlignVertical="top"
            autoCorrect
          />
        </View>

        <TouchableOpacity
          style={[s.cta, (!text.trim() || busy) && s.ctaDisabled]}
          disabled={!text.trim() || busy}
          onPress={handleParse}
          activeOpacity={0.85}
        >
          {busy ? <ActivityIndicator color="#000" /> : <Text style={s.ctaLabel}>Lay it out</Text>}
        </TouchableOpacity>

        {preview && (
          <View style={s.preview}>
            <Text style={s.previewHeading}>Here's what we heard</Text>
            <Text style={s.previewSub}>Edit anything that's wrong, then save.</Text>

            {WEEKDAYS.map(day => {
              const acts = sortActivities(preview.days?.[day]?.activities || []);
              if (acts.length === 0) return null;
              return (
                <View key={day} style={s.previewDay}>
                  <Text style={s.previewDayName}>{day}</Text>
                  {acts.map(a => (
                    <PreviewItem
                      key={a.id}
                      item={a}
                      onTitleChange={(v) => patchItem(day, a.id, { title: v })}
                      onTimeChange={(v) => patchItem(day, a.id, { time: v })}
                      onTimeToggle={() => setOpenTimeFor(prev => prev === a.id ? null : a.id)}
                      timeOpen={openTimeFor === a.id}
                      onLabelTap={() => cycleLabel(day, a.id, a.label)}
                      onTogetherToggle={() => patchItem(day, a.id, { together: !a.together })}
                      onDelete={() => deleteItem(day, a.id)}
                    />
                  ))}
                </View>
              );
            })}

            <TouchableOpacity style={s.cta} onPress={handleSave} activeOpacity={0.85}>
              <Text style={s.ctaLabel}>Save week</Text>
            </TouchableOpacity>
          </View>
        )}
      </Drawer.Body>
    </Drawer>
  );
}

// Inject stable ids so React keys + per-row edits work, even though the
// parser may not include ids itself.
function withStableIds(parsed) {
  if (!parsed?.days) return parsed;
  const days = {};
  for (const d of Object.keys(parsed.days)) {
    const acts = (parsed.days[d]?.activities || []).map(a => ({
      id:       a.id || uid(),
      title:    a.title || '',
      time:     a.time || '',
      label:    a.label || '',
      together: !!a.together,
      notes:    a.notes || null,
    }));
    days[d] = { activities: acts };
  }
  return { ...parsed, days };
}

function PreviewItem({
  item, timeOpen,
  onTitleChange, onTimeChange, onTimeToggle,
  onLabelTap, onTogetherToggle, onDelete,
}) {
  const lbl = labelOf(item.label);
  const hasTime = !!item.time;
  return (
    <View style={s.itemCard}>
      <View style={s.itemTopRow}>
        <TextInput
          style={s.itemTitle}
          value={item.title}
          onChangeText={onTitleChange}
          placeholder="Activity"
          placeholderTextColor={colors.textFaint}
          autoCorrect
        />
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={colors.textFaint} />
        </TouchableOpacity>
      </View>

      <View style={s.itemMetaRow}>
        <TouchableOpacity
          onPress={onTimeToggle}
          style={[s.timeChip, hasTime && s.timeChipActive]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="time-outline"
            size={11}
            color={hasTime ? colors.primary : colors.textMuted}
          />
          <Text style={[s.timeChipText, hasTime && s.timeChipTextActive]}>
            {hasTime ? formatTime(item.time) : 'Time'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onLabelTap} activeOpacity={0.7}>
          {lbl ? (
            <View style={[s.metaChip, { backgroundColor: lbl.bg, borderColor: lbl.color }]}>
              <Text style={[s.metaChipText, { color: lbl.color }]}>{lbl.name}</Text>
            </View>
          ) : (
            <View style={[s.metaChip, s.metaChipEmpty]}>
              <Text style={s.metaChipPlaceholder}>Label</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onTogetherToggle}
          style={[s.heartBtn, item.together && s.heartBtnActive]}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name={item.together ? 'heart' : 'heart-outline'}
            size={13}
            color={item.together ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {timeOpen && (
        <View style={s.timePickerWrap}>
          <TimePicker value={item.time} onChange={onTimeChange} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  lead:    { color: colors.text, fontFamily: FF.semibold, fontSize: 18, lineHeight: 24 },
  example: { color: colors.textMid, fontFamily: FF.light, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

  inputWrap: { ...layout.card({ borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 180 }) },
  input: { color: colors.text, fontFamily: FF.regular, fontSize: 15, minHeight: 160, lineHeight: 22, textAlignVertical: 'top' },

  cta: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },

  preview: { ...layout.card({ padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border }) },
  previewHeading: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },
  previewSub: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12 },
  previewDay: { gap: 6, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  previewDayName: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13, letterSpacing: 0.5, marginBottom: 4 },

  itemCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: {
    flex: 1, color: colors.text, fontFamily: FF.medium, fontSize: 14,
    paddingVertical: 4,
  },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },

  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  timeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  timeChipText: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 11 },
  timeChipTextActive: { color: colors.primary, fontFamily: FF.semibold },

  metaChip: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1,
  },
  metaChipEmpty: { borderColor: colors.border, backgroundColor: 'transparent' },
  metaChipPlaceholder: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 11 },
  metaChipText: { fontFamily: FF.semibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },

  heartBtn: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  heartBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },

  timePickerWrap: {
    paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
    marginTop: 2,
  },
});
