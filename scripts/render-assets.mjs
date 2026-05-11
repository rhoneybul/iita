// Generate every PNG asset iita ships from a single SVG mark.
// Output goes straight into the project's assets/ folder.
//
// The mark is the v2 "overlap" direction from design/overlap.jsx:
//   - Two pink radial-gradient circles meeting in the middle
//   - A brighter "lens" where they overlap (faked via clipPath since
//     resvg doesn't reliably render mix-blend-mode)
//   - A white "i" sitting in the lens — the head-and-stem mark from
//     the wordmark, tying the icon to the typography
//
// Usage:
//   npm install --no-save @resvg/resvg-js
//   node scripts/render-assets.mjs
//
// Keep this in step with src/components/IitaMark.js — both encode the
// same geometry; one renders to PNG, the other to react-native-svg.

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '..', 'assets');

const PINK      = '#F6237D';
const PINK_HOT  = '#FF6FAE';
const PINK_DEEP = '#B81A5E';
const LENS_HOT  = '#FFD1E5';
const BG        = '#000000';
const WHITE     = '#FFFFFF';

function buildSvg({
  viewSize = 1024,
  bg = BG,
  showI = true,
  markFraction = 1,
} = {}) {
  const f = markFraction;
  const c = viewSize / 2;
  const sx = (x) => c + (x - 512) * f;
  const sy = (y) => c + (y - 512) * f;
  const sr = (r) => r * f;

  const cxL = sx(416),  cxR = sx(608),  cyAll = sy(512);
  const rCircle = sr(208);

  const iHeadCx = sx(512), iHeadCy = sy(454), iHeadR = sr(20);
  const iStemX  = sx(512) - sr(20);
  const iStemY  = sy(490);
  const iStemW  = sr(40);
  const iStemH  = sr(108);
  const iStemR  = sr(20);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewSize}" height="${viewSize}" viewBox="0 0 ${viewSize} ${viewSize}">
  <defs>
    <radialGradient id="leftG" cx="35%" cy="32%" r="75%">
      <stop offset="0%"   stop-color="${PINK_HOT}"  />
      <stop offset="55%"  stop-color="${PINK}"      />
      <stop offset="100%" stop-color="${PINK_DEEP}" />
    </radialGradient>
    <radialGradient id="rightG" cx="65%" cy="32%" r="75%">
      <stop offset="0%"   stop-color="${PINK_HOT}"  />
      <stop offset="55%"  stop-color="${PINK}"      />
      <stop offset="100%" stop-color="${PINK_DEEP}" />
    </radialGradient>
    <radialGradient id="lensG" cx="50%" cy="42%" r="60%">
      <stop offset="0%"   stop-color="${LENS_HOT}" stop-opacity="0.85" />
      <stop offset="60%"  stop-color="${PINK_HOT}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${PINK_HOT}" stop-opacity="0"    />
    </radialGradient>
    <clipPath id="leftClip">
      <circle cx="${cxL}" cy="${cyAll}" r="${rCircle}" />
    </clipPath>
  </defs>

  ${bg === 'transparent' ? '' : `<rect width="${viewSize}" height="${viewSize}" fill="${bg}" />`}

  <circle cx="${cxL}" cy="${cyAll}" r="${rCircle}" fill="url(#leftG)" />
  <circle cx="${cxR}" cy="${cyAll}" r="${rCircle}" fill="url(#rightG)" />

  <g clip-path="url(#leftClip)">
    <circle cx="${cxR}" cy="${cyAll}" r="${rCircle}" fill="url(#lensG)" />
  </g>

  ${showI ? `
  <circle cx="${iHeadCx}" cy="${iHeadCy}" r="${iHeadR}" fill="${WHITE}" fill-opacity="0.92" />
  <rect x="${iStemX}" y="${iStemY}" width="${iStemW}" height="${iStemH}" rx="${iStemR}" fill="${WHITE}" fill-opacity="0.92" />
  ` : ''}
</svg>`;
}

function renderToPng(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(0,0,0,0)',
  });
  return resvg.render().asPng();
}

function write(outName, buf) {
  const out = path.join(ASSETS, outName);
  fs.writeFileSync(out, buf);
  console.log(`  ✓ ${outName.padEnd(22)} ${buf.length.toLocaleString().padStart(8)} bytes`);
}

console.log('Rendering iita assets (v2 overlap mark)…');

// icon.png — store icon, opaque black bg. iOS adds its own corner-radius
// mask so we can push the mark to fill most of the canvas; the black
// breathing room frames the pink without looking cramped.
write('icon.png',
  renderToPng(buildSvg({ viewSize: 1024, bg: BG, markFraction: 1.45 }), 1024)
);

// adaptive-icon.png — Android adaptive foreground, transparent bg, mark
// kept inside the ~66% safe zone so the OS round/squircle mask can't
// crop it.
write('adaptive-icon.png',
  renderToPng(buildSvg({ viewSize: 1024, bg: 'transparent', markFraction: 1.0 }), 1024)
);

// splash.png — centered mark on transparent bg. app.json renders with
// resizeMode: "contain" on a black field, so a smaller mark floats
// nicely in the centre of any screen.
write('splash.png',
  renderToPng(buildSvg({ viewSize: 1024, bg: 'transparent', markFraction: 0.55 }), 1024)
);
write('splash-android.png',
  renderToPng(buildSvg({ viewSize: 1024, bg: 'transparent', markFraction: 0.55 }), 1024)
);

// favicon.png — render at 1024 then downscale to 64 for clean AA.
// Drop the "i" at this size; it'd be sub-pixel.
write('favicon.png',
  renderToPng(buildSvg({ viewSize: 1024, bg: BG, markFraction: 1.45, showI: false }), 64)
);

// Source SVG kept in repo for future regenerations.
const sourceSvg = buildSvg({ viewSize: 1024, bg: BG, markFraction: 1.45 });
fs.writeFileSync(path.join(ASSETS, 'icon.svg'), sourceSvg);
console.log(`  ✓ ${'icon.svg'.padEnd(22)} ${sourceSvg.length.toLocaleString().padStart(8)} bytes`);

console.log('Done.');
