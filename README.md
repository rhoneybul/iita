# iita

A small app for couples to plan the week together. Two views:

- **Week** — one row per day with six columns (Donde · Juntos · Oficina · Importante · Ejercicio · Que mas).
- **Year** — one-off events laid out by month (weddings, trips, birthdays).

At the start of each week, tap **Plan the week** and type what's happening. Claude slots it into the grid; you can edit each item before saving.

## Stack

- Expo (React Native) — iOS, Android, web
- Supabase — auth (Google + Apple)
- Anthropic Claude — parses free-text into the per-day grid
- AsyncStorage — local-first, works offline. Server sync is optional.

The foundation (auth gate, splash, OTA, fonts, Sentry, theme, gesture root) is lifted from `../etapa` — anything cycling-specific has been removed.

## Quickstart

```bash
npm run setup    # installs app + server, copies .env.example -> .env
npm run dev      # boots Expo + the local API server
```

Then `i` for iOS sim, `a` for Android, `w` for web.

### Without any API keys

Leave `.env` empty. The app runs in guest mode (no auth) and the text parser falls back to an on-device heuristic. Everything stays in AsyncStorage on the device.

### With Claude / Supabase

- `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` — turns on Google/Apple sign-in.
- `EXPO_PUBLIC_SERVER_URL` — points the app at the local or deployed server.
- `ANTHROPIC_API_KEY` (server) — turns on Claude-powered week parsing.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server) — enables cross-device sync.

## Deploy

Same EAS flow as etapa:

```bash
npx eas build --profile preview   # or production
npx eas update --branch preview   # OTA JS update
```

Build profiles in `eas.json`. Don't forget to set the env vars in EAS secrets so production builds know where the server lives.

The server is a plain Node/Express app — drop it on Railway / Render / Fly with `ANTHROPIC_API_KEY` set.

## Schema (Supabase)

If you want cross-device sync, create:

```sql
create table iita_weeks (
  user_id   uuid not null references auth.users(id),
  week_start date not null,
  payload   jsonb not null,
  primary key (user_id, week_start)
);

create table iita_events (
  id        text primary key,
  user_id   uuid not null references auth.users(id),
  date      date not null,
  "endDate" date,
  title     text not null,
  location  text,
  "withWho" text
);

alter table iita_weeks  enable row level security;
alter table iita_events enable row level security;
create policy "user-rw-weeks"  on iita_weeks  for all using (auth.uid() = user_id);
create policy "user-rw-events" on iita_events for all using (auth.uid() = user_id);
```

## Folder map

```
App.js                     — auth gate, splash, navigation, OTA, Sentry init
index.js                   — Expo entry
src/
  theme/                   — colors, fonts, spacing
  services/
    authService.js         — Supabase Google + Apple, guest fallback
    storageService.js      — AsyncStorage-backed weeks + events
    api.js                 — talks to server; null-safe when SERVER_URL unset
    analyticsService.js    — stub, swap in PostHog if needed
  components/
    LoadingSplash.js       — throbbing splash for the JS handoff
    WebWrapper.js          — phone-shaped viewport on web
  utils/
    dates.js               — ISO weeks, formatting
    parseWeek.js           — fallback heuristic parser (no LLM)
    time.js                — time-string parsing + sort
  data/
    seedEvents.js          — first-run year events
  screens/
    SignInScreen.js
    HomeScreen.js          — week view
    WeekIntakeScreen.js    — free-text → Claude → editable grid
    DayDetailScreen.js     — edit one day
    YearScreen.js          — months across the year
    AddEventScreen.js
    SettingsScreen.js
server/
  index.js                 — Express; /parse-week + /state/* endpoints
```

## Naming

`iita` is lower-case. Always. (If it ever needs to expand, "Is It Anything?" — what one person asks the other every Sunday evening — is a fine fit.)
# iita
