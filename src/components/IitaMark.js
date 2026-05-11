// The iita mark, rendered as react-native-svg so it scales cleanly at
// any size and stays consistent with the PNG assets in assets/. Two
// pink gradient circles meet in the middle; a brighter "lens" sits in
// the overlap with a small white "i" floated inside it.
//
// Geometry is authored at 1024 and scaled by the `size` prop. Coords
// match scripts/render-assets.mjs so future tweaks to either should be
// kept in step.

import React from 'react';
import Svg, {
  Defs, RadialGradient, Stop, ClipPath, Circle, Rect, G,
} from 'react-native-svg';

const PINK      = '#F6237D';
const PINK_HOT  = '#FF6FAE';
const PINK_DEEP = '#B81A5E';
const LENS_HOT  = '#FFD1E5';

export default function IitaMark({ size = 64, showI = true, idSuffix = '' }) {
  // react-native-svg shares gradient ids across instances on iOS, so any
  // component mounted more than once needs unique ids. Callers can pass
  // their own suffix; default is a tiny inline counter.
  const sfx = idSuffix || '';
  const id = (n) => `iita-${n}${sfx}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <RadialGradient id={id('leftG')} cx="35%" cy="32%" r="75%">
          <Stop offset="0%"   stopColor={PINK_HOT}  />
          <Stop offset="55%"  stopColor={PINK}      />
          <Stop offset="100%" stopColor={PINK_DEEP} />
        </RadialGradient>
        <RadialGradient id={id('rightG')} cx="65%" cy="32%" r="75%">
          <Stop offset="0%"   stopColor={PINK_HOT}  />
          <Stop offset="55%"  stopColor={PINK}      />
          <Stop offset="100%" stopColor={PINK_DEEP} />
        </RadialGradient>
        <RadialGradient id={id('lensG')} cx="50%" cy="42%" r="60%">
          <Stop offset="0%"   stopColor={LENS_HOT} stopOpacity="0.85" />
          <Stop offset="60%"  stopColor={PINK_HOT} stopOpacity="0.55" />
          <Stop offset="100%" stopColor={PINK_HOT} stopOpacity="0"    />
        </RadialGradient>
        <ClipPath id={id('leftClip')}>
          <Circle cx="416" cy="512" r="208" />
        </ClipPath>
      </Defs>

      <Circle cx="416" cy="512" r="208" fill={`url(#${id('leftG')})`} />
      <Circle cx="608" cy="512" r="208" fill={`url(#${id('rightG')})`} />

      <G clipPath={`url(#${id('leftClip')})`}>
        <Circle cx="608" cy="512" r="208" fill={`url(#${id('lensG')})`} />
      </G>

      {showI && (
        <>
          <Circle cx="512" cy="454" r="20" fill="#FFFFFF" fillOpacity="0.92" />
          <Rect x="492" y="490" width="40" height="108" rx="20" fill="#FFFFFF" fillOpacity="0.92" />
        </>
      )}
    </Svg>
  );
}
