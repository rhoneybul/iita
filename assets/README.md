# Assets

These PNGs are committed and ship in the build. To regenerate them from
the source SVG mark:

```sh
npm install --no-save @resvg/resvg-js
node scripts/render-assets.mjs
```

The script reads its geometry from `scripts/render-assets.mjs` and writes:

- `icon.png` — 1024×1024 store / iOS icon, opaque black bg.
- `adaptive-icon.png` — 1024×1024 Android adaptive foreground (transparent, mark inside the 66% safe area).
- `splash.png` / `splash-android.png` — 1024×1024 centred mark, transparent bg. `app.json` renders these with `resizeMode: contain` on a black field.
- `favicon.png` — 64×64 for the web build (no "i" mark — sub-pixel at this scale).
- `icon.svg` — the source SVG, kept here for tools that prefer it.

The in-app rendering of the same mark lives in `src/components/IitaMark.js`
(react-native-svg). The two should stay in sync — when you tweak the
geometry in one, update the other.

The design exploration that produced this direction is in `design/`
(JSX previewers that load in a browser via the bundled HTML files).
