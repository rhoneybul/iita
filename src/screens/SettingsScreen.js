import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout, useBottomInset } from '../theme';
import { getCurrentUser, signOut, isSupabaseConfigured } from '../services/authService';
import { bulkUpsertEvents } from '../services/storageService';
import { SEED_EVENTS } from '../data/seedEvents';

const FF = fontFamily;

export default function SettingsScreen({ navigation }) {
  const [email, setEmail] = useState(null);
  const bottomPad = useBottomInset(spacing.xl);

  useEffect(() => {
    getCurrentUser().then(u => setEmail(u?.email || null)).catch(() => {});
  }, []);

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
      }},
    ]);
  }

  async function handleReseed() {
    Alert.alert('Reload sample year?', 'Adds the events from the original spreadsheet. Existing events are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reload', onPress: async () => {
        await bulkUpsertEvents(SEED_EVENTS);
        Alert.alert('Done', 'Sample events have been added.');
      }},
    ]);
  }

  async function handleWipe() {
    Alert.alert('Erase local data?', 'This clears the week plans and year events on this device. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove([
          '@iita_weeks_v1', '@iita_events_v1', '@iita_user_prefs_v1',
        ]);
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }},
    ]);
  }

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

        <TouchableOpacity style={s.row} onPress={handleReseed} activeOpacity={0.7}>
          <Ionicons name="refresh" size={18} color={colors.textMid} />
          <Text style={s.rowLabel}>Reload sample year</Text>
        </TouchableOpacity>

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
  card: { ...layout.card({ padding: spacing.lg, borderWidth: 1, borderColor: colors.border }) },
  label: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  value: { color: colors.text, fontFamily: FF.regular, fontSize: 15, marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowLabel: { color: colors.text, fontFamily: FF.medium, fontSize: 14 },

  version: { color: colors.textFaint, fontFamily: FF.light, fontSize: 11, textAlign: 'center', marginTop: spacing.xxxl },
});
