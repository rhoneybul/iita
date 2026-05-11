# iita — setup checklist

The app boots out of the box in **guest mode** (no auth, local storage only, on-device heuristic week parser). To get Google sign-in, Claude-powered week parsing, cross-device sync, and a production build, you need to set up four external things. Order matters — Supabase → Google OAuth → Railway → EAS.

---

## 1. Supabase

You need a Supabase project for auth (Google + Apple) and the two tables that hold weeks + year events.

**One-time, in the dashboard:**

1. Create a project at https://supabase.com/dashboard → New Project. Pick the region closest to you. Save the DB password somewhere.
2. Settings → API → copy these two:
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL` (in `.env`)
   - `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY` (in `.env`)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (in `server/.env`) — keep this secret, never ship to the app
   - `Project URL` → `SUPABASE_URL` (in `server/.env`)
3. Authentication → URL Configuration:
   - Site URL: `iita://`
   - Redirect URLs: add `iita://auth/callback` and (if you're testing on web) `http://localhost:8081`.

**Apply the migration:**

```bash
cd /Users/honeybulr/code/iita
npx supabase login
npx supabase link --project-ref <your-project-ref>   # ref is in the dashboard URL
npx supabase db push
```

That runs `supabase/migrations/20260511000001_create_tables.sql` against your remote project — creates `iita_weeks`, `iita_events`, indexes, and the RLS policies that scope every row to its owner.

You can verify in the dashboard → Table Editor that both tables exist and have RLS enabled (the lock icon).

---

## 2. Google sign-in

Sign-in is wired up — but Google won't accept requests until you create OAuth credentials and tell Supabase about them.

**Google Cloud:**

1. Go to https://console.cloud.google.com → create a project (or pick one).
2. APIs & Services → OAuth consent screen → External → fill in app name, support email, etc. Add your email as a test user while you're not verified.
3. APIs & Services → Credentials → Create credentials → **OAuth client ID**:
   - Type: **Web application** (yes, even though you're shipping mobile — Supabase brokers the OAuth flow over the web)
   - Authorized redirect URI: `https://<your-supabase-ref>.supabase.co/auth/v1/callback` (Supabase shows you this exact string in step 3 below)
4. Copy the **Client ID** and **Client Secret**.

**Supabase dashboard:**

5. Authentication → Providers → Google → Enable.
6. Paste the Client ID and Client Secret from step 4. Save.
7. The dashboard shows the callback URL Google needs (`https://<ref>.supabase.co/auth/v1/callback`). If it doesn't match what you pasted in step 3, go fix Google.

**That's it for Google.** No app-side changes needed — `signInWithGoogle()` in `src/services/authService.js` already handles the rest.

> **Apple sign-in** is wired up too but only works on real iOS devices (not the simulator) and requires an Apple Developer account ($99/yr). If you don't have one, leave it — the button auto-hides on devices that don't support it. When you do: Supabase docs → Auth → Apple has the walkthrough; you'll need to create a Services ID, a Sign in with Apple key, and paste the resulting Client ID + Secret into the Supabase Apple provider page.

---

## 3. Railway (server)

The server runs `/parse-week` (Claude turns the voice/text into the per-day grid) and `/state/*` (optional sync to Supabase). It's a plain Node/Express app — Railway auto-builds on git push.

The repo has three files that tell Railway exactly what to do:
- `railway.json` — primary config (build + start commands, healthcheck)
- `nixpacks.toml` — backup for the Nixpacks builder
- `Procfile` — backup for the legacy builder
- `.railwayignore` — skip the React Native app when uploading

You **don't** need to set Root Directory in the Railway UI — `railway.json` handles it.

1. Push the repo to GitHub.
2. https://railway.app → New Project → Deploy from GitHub repo → pick the iita repo.
3. Variables → add:
   - `ANTHROPIC_API_KEY` — from https://console.anthropic.com → Settings → API Keys
   - `SUPABASE_URL` — same as your `EXPO_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` — the secret one from Supabase
   - (Don't set `PORT` — Railway injects it automatically and the server reads `process.env.PORT`.)
4. Settings → Networking → **Generate Domain**. Copy the URL — that's `EXPO_PUBLIC_SERVER_URL`.
5. Back in the app's `.env` and in EAS secrets (step 4 below): `EXPO_PUBLIC_SERVER_URL=https://<railway-domain>`.

**Verify** with `curl https://<railway-domain>/health` → `{"ok":true}`.

### If the build is failing

Check the Deploy Logs in Railway and match the symptom:

- **"Cannot find module 'expo'" / "react-native: command not found"** — Railway is trying to install the whole Expo app at the repo root. Either `railway.json` isn't being picked up (make sure it's committed and at the repo root, not inside `server/`), or you've set a Root Directory in Railway's UI that overrides it — clear that field in Settings → Service.
- **"Healthcheck failed"** — server started but `/health` didn't respond in 30s. Usually means the start command ran but the process crashed. Check logs for missing env vars (the server logs `anthropic=true/false, supabase=true/false` on boot, so you can tell what's wired).
- **"Error: Cannot find module './index.js'"** — start command is wrong. The repo's `railway.json` expects `server/index.js`. If you've cloned an older version, re-pull.
- **Crash on every request with `ANTHROPIC_API_KEY` set but no Supabase keys** — that's actually fine; `/parse-week` works without Supabase. The crash is probably auth middleware rejecting the request. If you want to test `/parse-week` without setting up Supabase auth first, leave the Supabase vars unset on Railway — the middleware then runs in guest mode and lets requests through.

---

## 4. EAS (Expo build + over-the-air updates)

1. Create an Expo account at https://expo.dev. `npx eas login`.
2. From the iita folder: `npx eas init` — this writes the `projectId` and `owner` fields into `app.json` for you. (I left those blank in the file I generated — `eas init` fills them in.)
3. App secrets — these are read at build time and need to be set in EAS, not just in `.env`:
   ```
   npx eas secret:create --name EXPO_PUBLIC_SUPABASE_URL       --value 'https://...'
   npx eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY  --value 'eyJ...'
   npx eas secret:create --name EXPO_PUBLIC_SERVER_URL         --value 'https://...'
   npx eas secret:create --name EXPO_PUBLIC_SENTRY_DSN         --value 'https://...'   # optional
   ```
4. Build:
   ```
   npx eas build --profile preview      # internal install via TestFlight / APK
   npx eas build --profile production
   ```
5. OTA updates (push JS changes without going through the store):
   ```
   npx eas update --branch preview
   ```

**iOS submission** also needs:
- Apple Developer account ($99/yr).
- An App Store Connect record for `com.iita.app` — create it at https://appstoreconnect.apple.com → My Apps → +. Bundle ID `com.iita.app` must match `app.json`.
- Fill in `eas.json` → `submit.production.ios` with `ascAppId` (the App Store Connect numeric ID) and `appleTeamId` (Developer portal → Membership). Then `npx eas submit -p ios --profile production`.

**Android submission**: needs a Google Play Console account ($25 one-time). Same flow with `npx eas submit -p android`.

---

## 5. Sentry (optional but recommended)

Crash reporting. Without it, errors in production are silent.

1. https://sentry.io → create a React Native project.
2. Copy the DSN → set `EXPO_PUBLIC_SENTRY_DSN` in `.env` and in EAS secrets.

That's it — `App.js` already conditionally initialises Sentry only when the DSN is present, so leaving it blank is fine for now.

---

## Order I'd actually do it in

If you want a single sitting:

1. **Supabase project + migration** (15 min). App now has working DB.
2. **Set Supabase env in `.env`** locally and run `npm run dev` — confirm guest mode still works.
3. **Google OAuth** (20 min). Try signing in from `npx expo start` on your phone via Expo Go.
4. **Railway** (15 min, mostly waiting for the build). Hit `/health`, then enable LLM parsing in the app by setting `EXPO_PUBLIC_SERVER_URL`.
5. **EAS preview build** (1h walking-away time for the first cloud build). Install on your phone, share TestFlight invite with your girlfriend.
6. Apple Developer / App Store Connect / Sentry whenever you decide you want to ship for real.

Total: about a half-day of fiddling, most of it waiting for builds.

---

## What you do **not** need to do

- No need to write any DB code beyond the migration — RLS does the auth scoping, and the server's `/state/*` endpoints already speak the right schema.
- No need to register the `iita://` scheme anywhere — Expo/EAS handles it via `app.json`.
- No need to vendor any Google/Apple SDKs — `@supabase/supabase-js` + `expo-apple-authentication` cover it.
