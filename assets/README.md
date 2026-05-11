# Assets

This folder needs four images before you build for the stores:

- `icon.png` — 1024×1024, square, opaque. App store icon.
- `adaptive-icon.png` — 1024×1024, Android adaptive icon foreground (keep important content within the inner 66% so the OS mask doesn't crop it).
- `splash.png` — centered logo on a transparent or black background; the app renders this with `resizeMode: contain`.
- `favicon.png` — 32×32, for the web build.

Until these exist, `LoadingSplash.js` falls back to a wordmark on a black screen and the app boots fine — but the splash plugin in `app.json` will warn during `eas build`. Drop the four PNGs in here when you're ready.
