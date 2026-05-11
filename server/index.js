// iita server. Three responsibilities:
//   1. POST /parse-week — Claude turns free-text / voice transcript into
//      the six-column day grid.
//   2. /state/* — pair-scoped sync for weeks + events.
//   3. /pair/* — manage the pair: see members, issue an invite code,
//      redeem an invite, leave the pair.
//
// Every row of weeks/events is scoped by pair_id (not user_id). The
// `withPair` middleware resolves the caller's pair on every request,
// lazily creating a "pair of one" the first time a user shows up. When
// a second user redeems an invite, they're added to the same pair and
// /state/get starts returning shared data automatically.
//
// All data routes go through this server (which uses the service-role
// key and bypasses RLS). The RLS policies in the SQL migration are
// defense-in-depth in case the anon key gets used against PostgREST.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ── Auth middleware ──────────────────────────────────────────────────────────
//
// We verify the bearer token by calling auth.getUser() with the service
// client — it accepts any JWT and returns the corresponding user. Without
// Supabase configured we drop into guest mode so the parse-week endpoint
// still works for local-only smoke testing.

async function auth(req, res, next) {
  const hdr = req.get('authorization') || '';
  const token = hdr.replace(/^Bearer\s+/i, '');
  if (!supabase) { req.user = { id: 'guest' }; return next(); }
  if (!token) return res.status(401).json({ error: 'missing token' });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'invalid token' });
  req.user = data.user;
  next();
}

// ── Pair resolution ──────────────────────────────────────────────────────────
//
// Returns { id, members: [{user_id, joined_at}] } for the caller's pair.
// Creates a fresh pair-of-one the first time a user shows up so every
// downstream route can assume req.pair.id exists.

async function resolvePair(userId) {
  if (!supabase) return { id: 'guest', members: [{ user_id: 'guest' }] };

  const { data: existing, error } = await supabase
    .from('iita_pair_members')
    .select('pair_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  let pairId = existing?.pair_id;
  if (!pairId) {
    const { data: created, error: cErr } = await supabase
      .from('iita_pairs')
      .insert({})
      .select('id')
      .single();
    if (cErr) throw cErr;
    pairId = created.id;

    const { error: mErr } = await supabase
      .from('iita_pair_members')
      .insert({ pair_id: pairId, user_id: userId });
    if (mErr) throw mErr;
  }

  const { data: members, error: lErr } = await supabase
    .from('iita_pair_members')
    .select('user_id, joined_at')
    .eq('pair_id', pairId);
  if (lErr) throw lErr;

  return { id: pairId, members: members || [] };
}

async function withPair(req, res, next) {
  if (!supabase || req.user.id === 'guest') {
    req.pair = { id: 'guest', members: [] };
    return next();
  }
  try {
    req.pair = await resolvePair(req.user.id);
    next();
  } catch (e) {
    console.error('[withPair]', e);
    res.status(500).json({ error: 'pair_resolve_failed', message: String(e?.message || e) });
  }
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }));

// ── Parse-week ───────────────────────────────────────────────────────────────
//
// Body: { weekStart: 'YYYY-MM-DD', text: '<free text or transcript>' }
// Returns: { days: { Mon: {...}, Tue: {...}, ... } }

const PARSE_PROMPT = `You receive a user describing what they have happening in one week.
Turn it into a structured per-day plan.

For each day MENTIONED (Mon..Sun), produce an array of activities. Each
activity has:
  - title     (string, required) — short label, e.g. "Cycling with Ollie", "Office", "Dinner with Josh"
  - time      (string, optional) — one of: "morning", "noon", "night", "all day", a clock value ("9am", "18:30"), or a range ("09:00-11:00")
  - label     (string, optional) — one of: "exercise", "work", "social", "travel", "important", "other"
  - together  (boolean)          — true ONLY if the user makes clear they're doing this WITH THEIR PARTNER

Output schema:
{
  "days": {
    "Mon": { "activities": [ { "title": "...", "time": "...", "label": "...", "together": false } ] },
    "Tue": { "activities": [ ... ] }
  }
}

==========================================================================
DAY DETECTION — READ CAREFULLY:
==========================================================================
Each weekday name (Monday, Tuesday, ... Sunday) introduces a NEW day.
Everything after it — UNTIL THE NEXT WEEKDAY NAME — belongs to THAT day.

When you see a weekday name, RE-ANCHOR your current day. Do not continue
Monday's bucket into Tuesday. The next weekday name is a hard reset.

Phrases like "Monday night", "Tuesday morning", "Wednesday evening":
  - The WEEKDAY is the day.
  - "night" / "morning" / "evening" / "afternoon" is the TIME.
  - "Tuesday night drinks" → day=Tue, time="night", title="Drinks".
  - NEVER place "Tuesday night ..." content under Monday.

==========================================================================
DO NOT FABRICATE ACTIVITIES:
==========================================================================
- "nothing", "no plans", "free", "chill", "nothing on", "off", "tbd",
  "not sure", "etc.", "and so on" — these are NEVER activity titles.
  If a day's only content is filler like this, omit the day entirely
  (do not include an empty activities array, do not include the day).
- If a phrase has a day + time but no real activity ("Monday night...",
  "Tuesday morning"), produce NO activity for it.
- Never invent a title. If you can't find a real activity, skip it.

==========================================================================
TIME EXTRACTION:
==========================================================================
- "Monday night dinner with Josh"       → day=Mon, time="night", title="Dinner with Josh"
- "9am cycling"                         → time="9am", title="Cycling"
- "6:30pm flight"                       → time="6:30pm", title="Flight"
- "afternoon meeting with Sam"          → time="afternoon", title="Meeting with Sam"
- "Tuesday lunch with Sarah"            → day=Tue, time="lunch", title="Lunch with Sarah"
- No time stated → time="".

==========================================================================
TITLES:
==========================================================================
- Strip filler verbs: "I'm going to", "we will", "we're", "let's", "have a".
- Keep terse. Phrases, not sentences. Capitalise the first letter.

==========================================================================
TOGETHER FLAG (be conservative — default false):
==========================================================================
- TRUE: "date night", "we fly to X", "together", "with you", "our anniversary",
  "couples ...", "with my girlfriend/boyfriend/partner/husband/wife".
- FALSE: "dinner with Josh and Bep" (Josh and Bep aren't the partner),
  "office", "gym with Ollie", any solo or with-other-friends activity.
- When in doubt, false.

==========================================================================
EXAMPLES:
==========================================================================

Input: "Monday night dinner with Josh. Tuesday night drinks with Sarah."
Output:
{
  "days": {
    "Mon": { "activities": [{"title":"Dinner with Josh","time":"night","label":"social","together":false}] },
    "Tue": { "activities": [{"title":"Drinks with Sarah","time":"night","label":"social","together":false}] }
  }
}

Input: "Monday office. Tuesday nothing. Wednesday gym 7am."
Output:
{
  "days": {
    "Mon": { "activities": [{"title":"Office","time":"","label":"work","together":false}] },
    "Wed": { "activities": [{"title":"Gym","time":"7am","label":"exercise","together":false}] }
  }
}
(Tuesday omitted because "nothing" is not an activity.)

Input: "Friday date night Wimbledon Art Fair at 7. Saturday we fly to Spain 6:30pm."
Output:
{
  "days": {
    "Fri": { "activities": [{"title":"Date night — Wimbledon Art Fair","time":"7pm","label":"social","together":true}] },
    "Sat": { "activities": [{"title":"Fly to Spain","time":"6:30pm","label":"travel","together":true}] }
  }
}

Input: "Monday night, Tuesday night, something."
Output:
{ "days": {} }
(No real activities — all filler.)

==========================================================================
Output STRICT JSON only. No commentary. No markdown fence.`;

app.post('/parse-week', auth, async (req, res) => {
  const { text, weekStart } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' });

  if (!anthropic) {
    return res.json({ days: null, reason: 'no_anthropic_key' });
  }

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      // Deterministic parsing — temperature 0 stops the model from
      // free-associating filler like "nothing" into activity titles
      // when the input is sparse.
      temperature: 0,
      system: PARSE_PROMPT,
      messages: [{
        role: 'user',
        content: `Week starts Monday ${weekStart || 'unspecified'}.

User dictation:
"""${text}"""

Return the JSON only.`,
      }],
    });
    const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text : '';
    const parsed = safeJson(raw);
    if (!parsed || !parsed.days) return res.status(502).json({ error: 'bad_model_output', raw });
    return res.json({ days: parsed.days });
  } catch (e) {
    console.error('[parse-week]', e);
    return res.status(500).json({ error: 'parse_failed', message: String(e?.message || e) });
  }
});

function safeJson(s) {
  if (!s) return null;
  const cleaned = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

// ── State sync (pair-scoped) ─────────────────────────────────────────────────

app.get('/state', auth, withPair, async (req, res) => {
  if (!supabase) return res.json({ weeks: {}, events: [], todos: [], wishes: [] });
  const [weeks, events, lists] = await Promise.all([
    supabase.from('iita_weeks').select('*').eq('pair_id', req.pair.id),
    supabase.from('iita_events').select('*').eq('pair_id', req.pair.id),
    supabase.from('iita_list_items').select('*').eq('pair_id', req.pair.id),
  ]);
  const weekMap = {};
  (weeks.data || []).forEach(w => { weekMap[w.week_start] = w.payload; });
  const allItems = lists.data || [];
  res.json({
    weeks:  weekMap,
    events: events.data || [],
    todos:  allItems.filter(i => i.kind === 'todo'),
    wishes: allItems.filter(i => i.kind === 'wish'),
  });
});

app.put('/state/week', auth, withPair, async (req, res) => {
  if (!supabase) return res.status(204).end();
  const w = req.body;
  if (!w?.weekStart) return res.status(400).json({ error: 'weekStart required' });

  // Diff incoming activities against the previously stored payload to
  // find genuinely new ones. Edits and reorders don't notify; only new
  // activity IDs do.
  const { data: prevRow } = await supabase
    .from('iita_weeks')
    .select('payload')
    .eq('pair_id', req.pair.id)
    .eq('week_start', w.weekStart)
    .maybeSingle();
  const newlyAdded = diffNewActivities(prevRow?.payload, w);

  const { error } = await supabase.from('iita_weeks').upsert({
    pair_id:    req.pair.id,
    week_start: w.weekStart,
    payload:    w,
    updated_at: new Date().toISOString(),
    updated_by: req.user.id,
  });
  if (error) return res.status(500).json({ error: 'upsert_failed', message: error.message });

  if (newlyAdded.length > 0) {
    const who = (newlyAdded[0].addedBy || '').trim();
    const subject = who || 'Partner';
    if (newlyAdded.length === 1) {
      const a = newlyAdded[0];
      notifyPartner(req, {
        title: `${subject} added an activity`,
        body: `${a.title} — ${a.dayName}`,
        data: { type: 'activity_added', weekStart: w.weekStart, day: a.day, activityId: a.id },
      });
    } else {
      notifyPartner(req, {
        title: `${subject} updated the week`,
        body: `${newlyAdded.length} new activities`,
        data: { type: 'week_updated', weekStart: w.weekStart, count: newlyAdded.length },
      });
    }
  }

  res.status(204).end();
});

app.put('/state/event', auth, withPair, async (req, res) => {
  if (!supabase) return res.status(204).end();
  const e = req.body;
  if (!e?.id || !e?.date || !e?.title) return res.status(400).json({ error: 'id/date/title required' });

  // Was this row already in the table? Drives the push-vs-skip decision
  // below: edits are silent, only the partner adding a new event pings.
  const { data: existing } = await supabase
    .from('iita_events')
    .select('id')
    .eq('id', e.id)
    .maybeSingle();
  const isNew = !existing;

  const { error } = await supabase.from('iita_events').upsert({
    id:        e.id,
    pair_id:   req.pair.id,
    date:      e.date,
    endDate:   e.endDate || null,
    title:     e.title,
    location:  e.location || null,
    withWho:   e.withWho || null,
    done:      !!e.done,
    created_by: req.user.id,
  });
  if (error) return res.status(500).json({ error: 'upsert_failed', message: error.message });

  if (isNew) {
    const who = (e.addedBy || '').trim();
    notifyPartner(req, {
      title: who ? `${who} added an event` : 'New event added',
      body: `${e.title} — ${formatEventDate(e.date)}`,
      data: { type: 'event_added', eventId: e.id, date: e.date },
    });
  }

  res.status(204).end();
});

app.delete('/state/event/:id', auth, withPair, async (req, res) => {
  if (!supabase) return res.status(204).end();
  await supabase.from('iita_events').delete()
    .eq('pair_id', req.pair.id)
    .eq('id', req.params.id);
  res.status(204).end();
});

// ── Lists (todo + wish) ──────────────────────────────────────────────────────

const VALID_KINDS = new Set(['todo', 'wish']);

app.put('/state/list/:kind', auth, withPair, async (req, res) => {
  if (!supabase) return res.status(204).end();
  const kind = req.params.kind;
  if (!VALID_KINDS.has(kind)) return res.status(400).json({ error: 'invalid_kind' });
  const item = req.body;
  if (!item?.id || !item?.title) return res.status(400).json({ error: 'id/title required' });

  // Assignee must be one of the pair's members (or null = either of us).
  const assignedTo = item.assigned_to || null;
  if (assignedTo) {
    const memberIds = (req.pair.members || []).map(m => m.user_id);
    if (!memberIds.includes(assignedTo)) {
      return res.status(400).json({ error: 'invalid_assignee' });
    }
  }

  const { error } = await supabase.from('iita_list_items').upsert({
    id:          item.id,
    pair_id:     req.pair.id,
    kind,
    title:       item.title,
    notes:       item.notes || null,
    done:        !!item.done,
    assigned_to: assignedTo,
    created_by:  req.user.id,
    updated_at:  new Date().toISOString(),
  });
  if (error) return res.status(500).json({ error: 'upsert_failed', message: error.message });
  res.status(204).end();
});

app.delete('/state/list/:kind/:id', auth, withPair, async (req, res) => {
  if (!supabase) return res.status(204).end();
  const kind = req.params.kind;
  if (!VALID_KINDS.has(kind)) return res.status(400).json({ error: 'invalid_kind' });
  await supabase.from('iita_list_items').delete()
    .eq('pair_id', req.pair.id)
    .eq('kind', kind)
    .eq('id', req.params.id);
  res.status(204).end();
});

// ── Push notifications ───────────────────────────────────────────────────────
//
// One Expo push token per user (latest write wins). The notifyPartner
// helper looks up the OTHER member of the caller's pair and fires a push
// via Expo's HTTP endpoint. Fire-and-forget — the calling route doesn't
// await it, so a slow Expo response never delays the API reply to the
// person who triggered the write.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const WEEKDAY_LONG = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

// Returns the activities in `next` whose ids aren't in `prev`. Used to
// fire a push only for genuinely new rows after a whole-week upsert
// (edits / reorders / done-toggles stay silent).
function diffNewActivities(prev, next) {
  const seen = new Set();
  const prevDays = prev?.days || {};
  for (const day of Object.keys(prevDays)) {
    for (const a of (prevDays[day]?.activities || [])) {
      if (a?.id) seen.add(a.id);
    }
  }
  const added = [];
  const nextDays = next?.days || {};
  for (const day of Object.keys(nextDays)) {
    for (const a of (nextDays[day]?.activities || [])) {
      if (a?.id && !seen.has(a.id)) {
        added.push({
          id: a.id,
          title: a.title,
          addedBy: a.addedBy || '',
          day,
          dayName: WEEKDAY_LONG[day] || day,
        });
      }
    }
  }
  return added;
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatEventDate(iso) {
  // iso is YYYY-MM-DD; we hand-format to dodge timezone weirdness on the
  // server (Date(iso) is UTC midnight, which renders the day before in
  // negative-offset zones).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  const month = MONTHS_SHORT[parseInt(m[2], 10) - 1] || '';
  return `${parseInt(m[3], 10)} ${month}`;
}

app.post('/notifications/token', auth, async (req, res) => {
  if (!supabase) return res.status(204).end();
  const { token, platform } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token required' });
  }
  const { error } = await supabase.from('iita_push_tokens').upsert({
    user_id:    req.user.id,
    token,
    platform:   platform || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return res.status(500).json({ error: 'upsert_failed', message: error.message });
  res.status(204).end();
});

async function notifyPartner(req, { title, body, data = {} }) {
  if (!supabase) return;
  try {
    const partnerIds = (req.pair?.members || [])
      .map(m => m.user_id)
      .filter(id => id && id !== req.user.id);
    if (partnerIds.length === 0) return;

    const { data: tokens } = await supabase
      .from('iita_push_tokens')
      .select('user_id, token')
      .in('user_id', partnerIds);
    if (!tokens?.length) return;

    const messages = tokens.map(t => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data,
    }));

    const r = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const out = await r.json().catch(() => null);

    // Expo flags DeviceNotRegistered for tokens whose device wiped the
    // app — clear them so we don't keep posting to ghost endpoints.
    const tickets = out?.data || [];
    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered') {
        await supabase.from('iita_push_tokens').delete().eq('token', tokens[i].token);
      }
    }
  } catch (e) {
    console.warn('[notifyPartner]', e?.message || e);
  }
}

// ── Pair management ──────────────────────────────────────────────────────────
//
// Code format: 6 chars from an unambiguous alphabet (no I/O/0/1). Short
// enough to read out loud, long enough that brute-forcing a valid one
// before it expires is impractical (32^6 ≈ 10^9 codes / week TTL).

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateInviteCode() {
  const bytes = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

async function enrichMembers(pairId, selfId) {
  if (!supabase) return [];
  const { data: members } = await supabase
    .from('iita_pair_members')
    .select('user_id, joined_at')
    .eq('pair_id', pairId);
  const out = [];
  for (const m of members || []) {
    let email = null, name = null;
    try {
      const { data } = await supabase.auth.admin.getUserById(m.user_id);
      email = data?.user?.email || null;
      name  = data?.user?.user_metadata?.full_name
           || data?.user?.user_metadata?.name
           || null;
    } catch {}
    out.push({
      user_id:  m.user_id,
      email,
      name,
      joined_at: m.joined_at,
      is_self:  m.user_id === selfId,
    });
  }
  return out;
}

app.get('/pair', auth, withPair, async (req, res) => {
  if (!supabase) return res.json({ id: 'guest', members: [] });
  res.json({
    id: req.pair.id,
    members: await enrichMembers(req.pair.id, req.user.id),
  });
});

app.post('/pair/invite', auth, withPair, async (req, res) => {
  if (!supabase) return res.status(400).json({ error: 'supabase_not_configured' });
  if (req.pair.members.length >= 2) {
    return res.status(400).json({ error: 'pair_full', message: 'This pair already has two members. Have your partner leave first if you want a different one.' });
  }

  // Retry on the off-chance of a collision (extremely unlikely but free).
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from('iita_invites').insert({
      code,
      pair_id:    req.pair.id,
      created_by: req.user.id,
      expires_at: expiresAt.toISOString(),
    });
    if (!error) return res.json({ code, expires_at: expiresAt.toISOString() });
    lastErr = error;
    if (error.code !== '23505') break; // not a duplicate-key conflict
  }
  res.status(500).json({ error: 'invite_create_failed', message: lastErr?.message });
});

app.post('/pair/redeem', auth, async (req, res) => {
  if (!supabase) return res.status(400).json({ error: 'supabase_not_configured' });
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code_required' });

  const { data: invite } = await supabase
    .from('iita_invites')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (!invite)                                  return res.status(404).json({ error: 'invite_not_found' });
  if (invite.accepted_by)                       return res.status(400).json({ error: 'invite_already_used' });
  if (new Date(invite.expires_at) < new Date()) return res.status(400).json({ error: 'invite_expired' });
  if (invite.created_by === req.user.id)        return res.status(400).json({ error: 'cannot_redeem_own_invite' });

  // Bail early if the inviter's pair is already full (race condition
  // where two people redeemed at once).
  const { data: targetMembers } = await supabase
    .from('iita_pair_members')
    .select('user_id')
    .eq('pair_id', invite.pair_id);
  if ((targetMembers || []).length >= 2) {
    return res.status(400).json({ error: 'pair_full' });
  }

  // Leave the user's current pair (if any) and clean up an orphan.
  const { data: currentMembership } = await supabase
    .from('iita_pair_members')
    .select('pair_id')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (currentMembership) {
    if (currentMembership.pair_id === invite.pair_id) {
      // Already a member — nothing to do, just mark the invite used.
      await supabase.from('iita_invites')
        .update({ accepted_by: req.user.id, accepted_at: new Date().toISOString() })
        .eq('code', code);
      return res.json({ pair_id: invite.pair_id, already_member: true });
    }

    const { data: oldMembers } = await supabase
      .from('iita_pair_members')
      .select('user_id')
      .eq('pair_id', currentMembership.pair_id);

    await supabase.from('iita_pair_members')
      .delete()
      .eq('pair_id', currentMembership.pair_id)
      .eq('user_id', req.user.id);

    // If they were the only member of the old pair, delete the pair so
    // we don't leak orphan rows. Cascading FKs wipe its weeks/events.
    if ((oldMembers || []).length === 1) {
      await supabase.from('iita_pairs').delete().eq('id', currentMembership.pair_id);
    }
  }

  // Join the new pair.
  const { error: joinErr } = await supabase.from('iita_pair_members').insert({
    pair_id: invite.pair_id,
    user_id: req.user.id,
  });
  if (joinErr) return res.status(500).json({ error: 'join_failed', message: joinErr.message });

  await supabase.from('iita_invites')
    .update({ accepted_by: req.user.id, accepted_at: new Date().toISOString() })
    .eq('code', code);

  res.json({ pair_id: invite.pair_id });
});

app.delete('/pair/me', auth, withPair, async (req, res) => {
  if (!supabase) return res.status(204).end();

  const { data: members } = await supabase
    .from('iita_pair_members')
    .select('user_id')
    .eq('pair_id', req.pair.id);

  await supabase.from('iita_pair_members')
    .delete()
    .eq('pair_id', req.pair.id)
    .eq('user_id', req.user.id);

  // Orphan pair? Delete it so its weeks/events get cascaded away.
  if ((members || []).length === 1) {
    await supabase.from('iita_pairs').delete().eq('id', req.pair.id);
  }
  res.status(204).end();
});

// ── Account deletion ─────────────────────────────────────────────────────────
//
// Removes the caller from their pair (cascading data away if they were the
// only member, matching /pair/me) and then deletes the Supabase auth user.
// A partner, if any, keeps the shared weeks/events.

app.delete('/account/me', auth, withPair, async (req, res) => {
  if (!supabase) return res.status(204).end();

  try {
    const { data: members } = await supabase
      .from('iita_pair_members')
      .select('user_id')
      .eq('pair_id', req.pair.id);

    await supabase.from('iita_pair_members')
      .delete()
      .eq('pair_id', req.pair.id)
      .eq('user_id', req.user.id);

    if ((members || []).length === 1) {
      await supabase.from('iita_pairs').delete().eq('id', req.pair.id);
    }

    const { error: delErr } = await supabase.auth.admin.deleteUser(req.user.id);
    if (delErr) return res.status(500).json({ error: 'delete_user_failed', message: delErr.message });

    res.status(204).end();
  } catch (e) {
    console.error('[account/me delete]', e);
    res.status(500).json({ error: 'account_delete_failed', message: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`iita server on :${PORT} — anthropic=${!!anthropic}, supabase=${!!supabase}`);
});
