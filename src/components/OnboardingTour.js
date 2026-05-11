// First-run tour. Five short steps walking new users through the
// week view, the dictation intake, the year view, and the partner
// invite. Gated on userPrefs.tourSeen so it shows once. The final
// step's primary CTA navigates to the InvitePartner drawer; skipping
// still marks the tour seen so it never re-appears.
//
// Modelled on ../../etapa/src/components/OnboardingTour.js but
// stripped to iita's much smaller scope (no coach / units / location
// / name picks — the name is collected separately in
// OnboardingNameScreen).

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius } from '../theme';
import { LABELS } from '../data/labels';

const FF = fontFamily;
const { height: SH } = Dimensions.get('window');

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to iita',
    body: 'A tiny planner for the two of you. The week, day by day — plus the year, one event at a time.',
  },
  {
    id: 'week',
    title: 'Your week, day by day',
    body: 'Each day holds the little things you\'re doing — work, exercise, who\'s around, what to remember. Tap any day to add or edit.',
    preview: 'week',
  },
  {
    id: 'intake',
    title: 'Just say what\'s going on',
    body: 'Tap "Plan the week" and dictate or type how the week looks. We turn the messy thought into the grid for you.',
    preview: 'intake',
  },
  {
    id: 'year',
    title: 'The big stuff lives in the year',
    body: 'Weddings, trips, birthdays — anything that doesn\'t belong to a single week. Open the year tab, tap a row to edit.',
    preview: 'year',
  },
  {
    id: 'invite',
    title: 'Bring your partner in',
    body: 'iita is built for two. Send them a code and your week + year sync between you both.',
    preview: 'invite',
    cta: 'Invite my partner',
  },
];

// ── Preview cards ───────────────────────────────────────────────────────

function WeekPreview() {
  const days = [
    { d: 'Mon', acts: [{ t: 'Cycling', label: 'exercise' }] },
    { d: 'Tue', acts: [{ t: 'Office', label: 'work' }] },
    { d: 'Wed', acts: [{ t: 'Dinner with Sara', label: 'social', together: true }] },
    { d: 'Thu', acts: [] },
    { d: 'Fri', acts: [{ t: 'Pick up parcel', label: 'important' }] },
  ];
  return (
    <View style={cs.card}>
      {days.map((row) => (
        <View key={row.d} style={cs.weekRow}>
          <Text style={cs.weekDay}>{row.d}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            {row.acts.length === 0 ? (
              <Text style={cs.weekEmpty}>—</Text>
            ) : (
              row.acts.map((a, i) => {
                const cfg = LABELS[a.label];
                return (
                  <View key={i} style={cs.weekAct}>
                    <Text style={cs.weekActTitle} numberOfLines={1}>{a.t}</Text>
                    {cfg && (
                      <View style={[cs.weekChip, { borderColor: cfg.color }]}>
                        <Text style={[cs.weekChipText, { color: cfg.color }]}>{cfg.name}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function IntakePreview() {
  return (
    <View style={cs.card}>
      <Text style={cs.intakeQuote}>
        &ldquo;Monday I&apos;m in the office, Tuesday cycling with Ollie at 7, Wednesday Sara&apos;s coming for dinner…&rdquo;
      </Text>
      <View style={cs.intakeArrow}>
        <Ionicons name="arrow-down" size={18} color={colors.primary} />
      </View>
      <View style={cs.intakeGrid}>
        {[
          { d: 'Mon', t: 'Office', label: 'work' },
          { d: 'Tue', t: 'Cycling with Ollie · 7:00', label: 'exercise' },
          { d: 'Wed', t: 'Dinner with Sara', label: 'social' },
        ].map((row) => {
          const cfg = LABELS[row.label];
          return (
            <View key={row.d} style={cs.intakeRow}>
              <Text style={cs.intakeDay}>{row.d}</Text>
              <Text style={cs.intakeTitle} numberOfLines={1}>{row.t}</Text>
              <View style={[cs.weekChip, { borderColor: cfg.color }]}>
                <Text style={[cs.weekChipText, { color: cfg.color }]}>{cfg.name}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function YearPreview() {
  const events = [
    { day: 12, mo: 'JUN', title: "A friend's wedding", label: 'social' },
    { day: 4,  mo: 'AUG', title: 'Morocco trip', label: 'travel' },
    { day: 22, mo: 'SEP', title: "Mum's birthday", label: 'important' },
  ];
  return (
    <View style={cs.card}>
      {events.map((e, i) => {
        const cfg = LABELS[e.label];
        return (
          <View key={i} style={cs.yearRow}>
            <View style={cs.yearDate}>
              <Text style={cs.yearMo}>{e.mo}</Text>
              <Text style={cs.yearDay}>{e.day}</Text>
            </View>
            <Text style={cs.yearTitle} numberOfLines={1}>{e.title}</Text>
            <View style={[cs.weekChip, { borderColor: cfg.color }]}>
              <Text style={[cs.weekChipText, { color: cfg.color }]}>{cfg.name}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function InvitePreview() {
  return (
    <View style={cs.card}>
      <View style={cs.inviteIconWrap}>
        <Ionicons name="people-outline" size={28} color={colors.primary} />
      </View>
      <Text style={cs.inviteTitle}>One shared week, two phones</Text>
      <Text style={cs.inviteBody}>
        Generate a one-time code from Settings → Invite partner. When they enter it, every change syncs both ways.
      </Text>
    </View>
  );
}

function PreviewRenderer({ kind }) {
  switch (kind) {
    case 'week':   return <WeekPreview />;
    case 'intake': return <IntakePreview />;
    case 'year':   return <YearPreview />;
    case 'invite': return <InvitePreview />;
    default:       return null;
  }
}

// ── Component ───────────────────────────────────────────────────────────

export default function OnboardingTour({ visible, onComplete, onInvite }) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const animateTransition = (cb) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      cb();
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    });
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleNext = () => {
    if (isLast) {
      onInvite?.();
      return;
    }
    animateTransition(() => setStep(s => s + 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <TouchableOpacity style={s.skipBtn} onPress={onComplete} activeOpacity={0.7}>
          <Text style={s.skipText}>{isLast ? 'Maybe later' : 'Skip'}</Text>
        </TouchableOpacity>

        <Animated.View style={[
          s.contentWrap,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
          <ScrollView
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={s.title}>{current.title}</Text>
            <Text style={s.body}>{current.body}</Text>

            {current.preview && (
              <View style={s.cardWrap}>
                <PreviewRenderer kind={current.preview} />
              </View>
            )}
          </ScrollView>

          <View style={s.dotsRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive]} />
            ))}
          </View>

          <View style={s.btnRow}>
            {!isFirst && (
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => animateTransition(() => setStep(st => st - 1))}
                activeOpacity={0.7}
              >
                <Text style={s.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.nextBtn, isLast && s.ctaBtn]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={[s.nextBtnText, isLast && s.ctaBtnText]}>
                {isLast ? (current.cta || 'Get started') : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  skipBtn: {
    position: 'absolute', top: 60, right: 24, zIndex: 10,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  skipText: { fontSize: 14, fontFamily: FF.regular, color: colors.textMid },
  contentWrap: { flex: 1, justifyContent: 'center', maxHeight: SH * 0.9 },
  scrollContent: { alignItems: 'center', paddingTop: 56, paddingBottom: 16 },
  title: {
    fontSize: 24, fontFamily: FF.semibold,
    color: colors.text, textAlign: 'center', marginBottom: 10,
  },
  body: {
    fontSize: 14, fontFamily: FF.regular, color: colors.textMid,
    textAlign: 'center', lineHeight: 21, maxWidth: 340, marginBottom: 22,
  },
  cardWrap: { width: '100%', maxWidth: 360, alignSelf: 'center' },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 20, marginBottom: 20,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.textFaint, marginHorizontal: 4,
  },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  btnRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 12, paddingBottom: 40,
  },
  backBtn: {
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  backBtnText: { fontSize: 15, fontFamily: FF.medium, color: colors.textMid },
  nextBtn: {
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  nextBtnText: { fontSize: 15, fontFamily: FF.semibold, color: colors.text },
  ctaBtn: {
    backgroundColor: colors.primary, borderColor: colors.primary,
    paddingHorizontal: 36,
  },
  ctaBtnText: { color: '#000' },
});

const cs = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.sm,
  },

  // ── Week preview ──────────────────────────────────────────────────────
  weekRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.md, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  weekDay: {
    width: 36, color: colors.textMuted,
    fontFamily: FF.semibold, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingTop: 4,
  },
  weekEmpty: { color: colors.textFaint, fontFamily: FF.light, fontSize: 13, paddingTop: 3 },
  weekAct: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  weekActTitle: { flex: 1, color: colors.text, fontFamily: FF.regular, fontSize: 13 },
  weekChip: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.pill, borderWidth: 1,
  },
  weekChipText: {
    fontFamily: FF.semibold, fontSize: 9,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },

  // ── Intake preview ────────────────────────────────────────────────────
  intakeQuote: {
    color: colors.text, fontFamily: FF.regular, fontSize: 13,
    fontStyle: 'italic', lineHeight: 20,
  },
  intakeArrow: { alignItems: 'center', paddingVertical: 4 },
  intakeGrid: { gap: 6 },
  intakeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: colors.bg, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  intakeDay: {
    width: 32, color: colors.textMuted,
    fontFamily: FF.semibold, fontSize: 10,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  intakeTitle: { flex: 1, color: colors.text, fontFamily: FF.regular, fontSize: 12 },

  // ── Year preview ──────────────────────────────────────────────────────
  yearRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  yearDate: { width: 44, alignItems: 'center' },
  yearMo:   { color: colors.primary, fontFamily: FF.semibold, fontSize: 10, letterSpacing: 0.8 },
  yearDay:  { color: colors.text, fontFamily: FF.semibold, fontSize: 18, lineHeight: 22 },
  yearTitle:{ flex: 1, color: colors.text, fontFamily: FF.regular, fontSize: 13 },

  // ── Invite preview ────────────────────────────────────────────────────
  inviteIconWrap: {
    alignSelf: 'center',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(246, 35, 125, 0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  inviteTitle: {
    color: colors.text, fontFamily: FF.semibold, fontSize: 15,
    textAlign: 'center', marginBottom: 6,
  },
  inviteBody: {
    color: colors.textMid, fontFamily: FF.regular, fontSize: 12,
    textAlign: 'center', lineHeight: 18,
  },
});
