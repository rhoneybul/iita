// Generate an invite code and share it. Polls /pair every 4s while the
// screen is open so we can show the success state as soon as the
// partner redeems. Renders as a drawer.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamily, spacing, radius, layout } from '../theme';
import { api } from '../services/api';
import Drawer from '../components/Drawer';

const FF = fontFamily;
const POLL_MS = 4000;

export default function InvitePartnerScreen({ navigation }) {
  const [busy, setBusy]       = useState(false);
  const [code, setCode]       = useState(null);
  const [expiresAt, setExp]   = useState(null);
  const [error, setError]     = useState(null);
  const [partner, setPartner] = useState(null);
  const pollRef = useRef(null);

  const generate = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.pair.invite();
      if (!r?.code) throw new Error('No code returned.');
      setCode(r.code);
      setExp(r.expires_at);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { generate(); }, [generate]);

  useEffect(() => {
    if (!code || partner) return;
    pollRef.current = setInterval(async () => {
      try {
        const p = await api.pair.get();
        const other = (p?.members || []).find(m => !m.is_self);
        if (other) {
          setPartner(other);
          clearInterval(pollRef.current);
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [code, partner]);

  async function handleShare() {
    if (!code) return;
    const link = `iita://invite/${code}`;
    const message = `Join my iita calendar — code: ${code}\n\nOr tap: ${link}`;
    try { await Share.share({ message }); } catch {}
  }

  return (
    <Drawer onClose={() => navigation.goBack()}>
      <Drawer.Header title="Invite your partner" onClose={() => navigation.goBack()} />
      <Drawer.Body>
        {busy && !code ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.subtle}>Creating your invite…</Text>
          </View>
        ) : error ? (
          <View style={s.center}>
            <Ionicons name="alert-circle" size={36} color={colors.warn} />
            <Text style={s.errorTitle}>Couldn't make an invite</Text>
            <Text style={s.errorBody}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={generate} activeOpacity={0.85}>
              <Text style={s.retryLabel}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : partner ? (
          <View style={s.center}>
            <Ionicons name="checkmark-circle" size={48} color={colors.good} />
            <Text style={s.joinedTitle}>You're paired</Text>
            <Text style={s.joinedBody}>
              {partner.name || partner.email || 'Your partner'} joined. Anything either of you adds will show up for both of you.
            </Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={s.retryLabel}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.lead}>Send this code to your partner. They enter it on their phone after signing in.</Text>

            <View style={s.codeCard}>
              <Text style={s.codeLabel}>Invite code</Text>
              <Text style={s.code} selectable>{code}</Text>
              {expiresAt && <Text style={s.expires}>Expires {fmtExpires(expiresAt)}</Text>}
            </View>

            <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={18} color="#000" />
              <Text style={s.shareLabel}>Share invite</Text>
            </TouchableOpacity>

            <View style={s.statusRow}>
              <ActivityIndicator color={colors.textMuted} size="small" />
              <Text style={s.statusText}>Waiting for your partner to join…</Text>
            </View>

            <Text style={s.fine}>
              When they enter the code, their existing iita data is replaced with yours. You won't lose anything.
            </Text>
          </>
        )}
      </Drawer.Body>
    </Drawer>
  );
}

function parseApiError(e) {
  const msg = String(e?.message || '');
  if (msg.includes('pair_full'))            return "You're already paired with someone. Leave the pair in Settings before inviting a new partner.";
  if (msg.includes('supabase_not_configured')) return 'Cloud sync isn\'t configured on this server.';
  if (msg.includes('401'))                  return 'Sign in to invite a partner.';
  return msg || 'Something went wrong. Try again.';
}

function fmtExpires(iso) {
  try {
    const d = new Date(iso);
    const diffDays = Math.max(0, Math.round((d - Date.now()) / (24 * 60 * 60 * 1000)));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'in 1 day';
    return `in ${diffDays} days`;
  } catch { return ''; }
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  subtle: { color: colors.textMuted, fontFamily: FF.light, fontSize: 13 },

  lead: { color: colors.text, fontFamily: FF.regular, fontSize: 16, lineHeight: 22, textAlign: 'center' },

  codeCard: { ...layout.card({ padding: spacing.xxl, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary }) },
  codeLabel: { color: colors.textMuted, fontFamily: FF.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  code: { color: colors.primary, fontFamily: FF.semibold, fontSize: 44, letterSpacing: 6, lineHeight: 52 },
  expires: { color: colors.textFaint, fontFamily: FF.light, fontSize: 12 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: 14,
    borderRadius: radius.pill,
  },
  shareLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 15 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md },
  statusText: { color: colors.textMuted, fontFamily: FF.light, fontSize: 13 },

  fine: { color: colors.textFaint, fontFamily: FF.light, fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.xl },

  errorTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 16 },
  errorBody:  { color: colors.textMid, fontFamily: FF.regular, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn:   { backgroundColor: colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: 12, borderRadius: radius.pill, marginTop: spacing.md },
  retryLabel: { color: '#000', fontFamily: FF.semibold, fontSize: 14 },

  joinedTitle: { color: colors.text, fontFamily: FF.semibold, fontSize: 22 },
  joinedBody:  { color: colors.textMid, fontFamily: FF.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320 },
});
