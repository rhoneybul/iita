import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getCurrentUser, signOut, isSupabaseConfigured } from '../services/authService';
import { wipeLocalCalendar, hydrateFromServer } from '../services/storageService';
import { api } from '../services/api';

const FF = fontFamily;

export default function SettingsScreen({ navigation }) {
  const [email, setEmail]       = useState(null);
  const [pair, setPair]         = useState(null);   // { id, members: [...] }
  const [pairLoading, setPL]    = useState(true);
  const bottomPad               = useBottomInset(spacing.xl);

  useEffect(() => {
    getCurrentUser().then(u => setEmail(u?.email || null)).catch(() => {});
  }, []);

  const refreshPair = useCallback(async () => {
    if (!api.enabled) { setPair(null); setPL(false); return; }
    setPL(true);
    try { setPair(await api.pair.get()); }
    catch { setPair(null); }
    finally { setPL(false); }
  }, []);

  useFocusEffect(useCallback(() => { refreshPair(); }, [refreshPair]));

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
      }},
    ]);
  }

  async function handleLeavePair() {
    Alert.alert(
      'Leave the pair?',
      "Your calendar will become yours-only again. Your partner keeps theirs unchanged.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await api.pair.leave();
            await wipeLocalCalendar();
            await hydrateFromServer({ force: true });
            await refreshPair();
          } catch (e) {
            Alert.alert("Couldn't leave", String(e?.message || e));
          }
        }},
      ],
    );
  }

  async function handleWipe() {
    Alert.alert('Erase local data?', 'This clears the week plans and year events stored on this device. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: async () => {
        await wipeLocalCalendar();
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }},
    ]);
  }

  const partner = (pair?.members || []).find(m => !m.is_self);
  const isPaired = !!partner;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={colors.textMid} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: bottomPad }]}>
        <View style={s.card}>
          <Text style={s.label}>Account</Text>
          <Text style={s.value}>{email || (isSupabaseConfigured ? 'Not signed in' : 'Guest mode')}</Text>
        </View>

        {/* ── Partner ────────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.label}>Partner</Text>
          {pairLoading ? (
            <View style={s.partnerLoading}>
              <ActivityIndicator color={colors.textMuted} size="small" />
            </View>
          ) : !api.enabled ? (
            <Text style={s.value}>Cloud sync is off. Set EXPO_PUBLIC_SERVER_URL to enable partner sharing.</Text>
          ) : isPaired ? (
            <>
              <Text style={s.value}>
                {partner.name || partner.email || 'Your partner'}
              </Text>
              <Text style={s.subtle}>You both see and edit the same calendar.</Text>
              <TouchableOpacity style={[s.smallBtn, s.smallBtnDestructive]} onPress={handleLeavePair} activeOpacity={0.7}>
                <Text style={[s.smallBtnLabel, { color: colors.warn }]}>Leave pair</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.value}>Just you.</Text>
              <Text style={s.subtle}>Invite your partner so you can plan the week together.</Text>
              <View style={s.btnRow}>
                <TouchableOpacity style={s.smallBtn} onPress={() => navigation.navigate('InvitePartner')} activeOpacity={0.7}>
                  <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                  <Text style={s.smallBtnLabel}>Invite</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.smallBtn} onPress={() => navigation.navigate('JoinPair')} activeOpacity={0.7}>
                  <Ionicons name="enter-outline" size={14} color={colors.primary} />
                  <Text style={s.smallBtnLabel}>Enter a code</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ── Data ───────────────────────────────────────────────── */}
        <TouchableOpacity style={s.row} onPress={handleWipe} activeOpacity={0.7}>
          <Ionicons name="trash" size={18} color={colors.warn} />
          <Text style={[s.rowLabel, { color: colors.warn }]}>Erase local data</Text>
        </TouchableOpacity>

        {email && (
          <TouchableOpacity style={[s.row, { marginTop: spacing.xl }]} onPress={handleSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={colors.textMid} />
            <Text style={s.rowLabel}>Sign out</Text>
          </TouchableOpacity>
        )}

        <Text style={s.version}>iita · v0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },

  body: { padding: spacing.xl, gap: spacing.md },
  card: { ...layout.card({ padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.xs }) },
  label: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  value: { color: colors.text, fontFamily: FF.regular, fontSize: 15, marginTop: 4 },
  subtle: { color: colors.textMuted, fontFamily: FF.light, fontSize: 12, marginTop: 2 },

  partnerLoading: { paddingVertical: spacing.sm, alignItems: 'flex-start' },

  btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary },
  smallBtnDestructive: { borderColor: colors.warn, marginTop: spacing.md, alignSelf: 'flex-start' },
  smallBtnLabel: { color: colors.primary, fontFamily: FF.semibold, fontSize: 13 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowLabel: { color: colors.text, fontFamily: FF.medium, fontSize: 14 },

  version: { color: colors.textFaint, fontFamily: FF.light, fontSize: 11, textAlign: 'center', marginTop: spacing.xxxl },
});
