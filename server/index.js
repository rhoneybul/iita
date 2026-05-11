// iita server. Two responsibilities:
//   1. POST /parse-week — Claude turns free-text / voice transcript into
//      the six-column day grid the app stores.
//   2. /state/* — thin pass-through to Supabase so multiple devices stay
//      in sync. Kept dead-simple; if you don't want sync, leave the
//      Supabase env unset and the endpoints return 200 no-ops.
//
// Auth: every request is expected to carry a Bearer token issued by
// Supabase. We verify by hitting auth.getUser() with the same anon key
// — same pattern as etapa's server.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
async function auth(req, res, next) {
  const hdr = req.get('authorization') || '';
  const token = hdr.replace(/^Bearer\s+/i, '');
  if (!token) {
    if (!supabase) { req.user = { id: 'guest' }; return next(); }
    return res.status(401).json({ error: 'missing token' });
  }
  if (!supabase) { req.user = { id: 'guest' }; return next(); }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'invalid token' });
  req.user = data.user;
  next();
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }));

// ── Parse-week ───────────────────────────────────────────────────────────────
//
// Body: { weekStart: 'YYYY-MM-DD', text: '<free text or transcript>' }
// Returns: { days: { Mon: {...}, Tue: {...}, ... } } where each day has
// donde / juntos / oficina / importante / ejercicio / queMas.

const PARSE_PROMPT = `You receive a user describing what they have happening in one week.
Turn it into a structured per-day plan.

Schema for each day (Mon..Sun), all strings (empty string if not mentioned):
- donde       — where the person is that day (city/area)
- juntos      — things being done together with their partner
- oficina     — whether they're in the office, or which office
- importante  — the single most important thing of the day (travel, events, deadlines)
- ejercicio   — workouts / sport
- queMas      — anything else that doesn't fit above

Rules:
- Never invent days the user didn't mention.
- Keep wording terse — phrases, not sentences. E.g. "Cycling AM with Ollie", not "I am going cycling in the morning with Ollie".
- If the user says "this week" without picking a day, leave it as queMas on Mon.
- Output STRICT JSON only — no commentary, no markdown fence.`;

app.post('/parse-week', auth, async (req, res) => {
  const { text, weekStart } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' });

  if (!anthropic) {
    // No Claude key — return null so the client falls back to its
    // on-device heuristic parser.
    return res.json({ days: null, reason: 'no_anthropic_key' });
  }

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: PARSE_PROMPT,
      messages: [{
        role: 'user',
        content: `weekStart=${weekStart || 'unspecified'}\n\nUser said:\n"""${text}"""\n\nReturn the JSON.`,
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
  // Strip any accidental ```json fences.
  const cleaned = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

// ── State sync (best-effort, no-op when Supabase isn't configured) ───────────
app.get('/state', auth, async (req, res) => {
  if (!supabase) return res.json({ weeks: {}, events: [] });
  const [weeks, events] = await Promise.all([
    supabase.from('iita_weeks').select('*').eq('user_id', req.user.id),
    supabase.from('iita_events').select('*').eq('user_id', req.user.id),
  ]);
  const weekMap = {};
  (weeks.data || []).forEach(w => { weekMap[w.week_start] = w.payload; });
  res.json({ weeks: weekMap, events: events.data || [] });
});

app.put('/state/week', auth, async (req, res) => {
  if (!supabase) return res.status(204).end();
  const w = req.body;
  if (!w?.weekStart) return res.status(400).json({ error: 'weekStart required' });
  await supabase.from('iita_weeks').upsert({
    user_id: req.user.id,
    week_start: w.weekStart,
    payload: w,
  });
  res.status(204).end();
});

app.put('/state/event', auth, async (req, res) => {
  if (!supabase) return res.status(204).end();
  const e = req.body;
  if (!e?.id || !e?.date || !e?.title) return res.status(400).json({ error: 'id/date/title required' });
  await supabase.from('iita_events').upsert({ ...e, user_id: req.user.id });
  res.status(204).end();
});

app.delete('/state/event/:id', auth, async (req, res) => {
  if (!supabase) return res.status(204).end();
  await supabase.from('iita_events').delete().eq('user_id', req.user.id).eq('id', req.params.id);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`iita server on :${PORT} — anthropic=${!!anthropic}, supabase=${!!supabase}`);
});
