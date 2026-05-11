# iita — Claude Code Context

## What this is

Tiny couple's planner. Two surfaces:

1. **Week view** — one row per day with the six columns from the source spreadsheet (`donde · juntos · oficina · importante · ejercicio · queMas`).
2. **Year view** — one-off events listed by month (weddings, trips, birthdays).

At the start of each week the user is prompted to **Plan the week** — either dictate (voice) or type free-text — which Claude on the server parses into the day grid.

## Stack

- Expo + React Native (iOS / Android / web)
- Supabase auth (Google + Apple). App still runs in guest mode if the keys aren't set.
- AsyncStorage is the source of truth on-device; the server (`/state/*`) is an optional sync layer.
- Anthropic Claude (Haiku) does the free-text → grid parsing in `server/index.js`. A local heuristic parser (`src/utils/parseWeek.js`) is the offline fallback.

## Where things live

- `App.js` — auth gate, splash, fonts, OTA, Sentry wrap. Same skeleton as `../etapa/App.js`, just stripped down.
- `src/services/` — auth, storage, api client, analytics stub.
- `src/screens/` — seven screens; nothing fancy.
- `server/index.js` — single file Express server with two real endpoints: `/parse-week` and `/state/*`.

## When you make changes

- The app should keep running with `.env` empty (guest mode + heuristic parser). Don't make a change that requires Supabase or an API key just to boot.
- The six column keys are `donde / juntos / oficina / importante / ejercicio / queMas`. If you rename one, update: storage's `emptyDay`, the columns array on `HomeScreen`, the fields array on `DayDetailScreen`, the schema string in `server/index.js`'s `PARSE_PROMPT`, and the fallback parser's `CATEGORY_HINTS`.
- AsyncStorage keys are versioned (`@iita_weeks_v1`, etc.). If you change the shape, bump the version and add a migration in `storageService.js`.

## Deploy

Same as etapa — EAS for app, Railway/Render/Fly for server. See README.md.
