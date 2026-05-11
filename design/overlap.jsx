// iita — overlap, with a little flair.
// Two pink circles with radial gradients (depth, not flat). One white
// "i" in the lens where they meet. Splash loops: circles drift in from
// opposite sides, meet, the i fades up in the middle.

const PINK = '#F6237D';
const PINK_HOT = '#FF6FAE';
const PINK_DEEP = '#B81A5E';
const BG = '#000000';
const TAGLINE = 'where your week meets mine';

// ── The mark ──────────────────────────────────────────────────────────
function MarkOverlap({ size = 1024, bg = BG, showI = true, idSuffix = '' }) {
  const id = (n) => `${n}${idSuffix}`;
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={id('leftG')} cx="35%" cy="32%" r="75%">
          <stop offset="0%" stopColor={PINK_HOT} />
          <stop offset="55%" stopColor={PINK} />
          <stop offset="100%" stopColor={PINK_DEEP} />
        </radialGradient>
        <radialGradient id={id('rightG')} cx="65%" cy="32%" r="75%">
          <stop offset="0%" stopColor={PINK_HOT} />
          <stop offset="55%" stopColor={PINK} />
          <stop offset="100%" stopColor={PINK_DEEP} />
        </radialGradient>
      </defs>

      <rect width="1024" height="1024" fill={bg} />

      <g style={{ mixBlendMode: 'screen' }}>
        <circle cx="416" cy="512" r="208" fill={`url(#${id('leftG')})`} fillOpacity="0.85" />
        <circle cx="608" cy="512" r="208" fill={`url(#${id('rightG')})`} fillOpacity="0.85" />
      </g>

      {showI && (
        <g fill="#FFFFFF" fillOpacity="0.78">
          <circle cx="512" cy="454" r="20" />
          <rect x="492" y="490" width="40" height="108" rx="20" />
        </g>
      )}
    </svg>
  );
}

// ── Splash (looping) ──────────────────────────────────────────────────
function AnimatedSplash({ width = 390, height = 844 }) {
  const dur = '3.4s';
  const css = `
    @keyframes iita-left {
      0%   { transform: translateX(-110px); opacity: 0; }
      18%  { opacity: 1; }
      45%  { transform: translateX(0); }
      55%  { transform: translateX(4px); }
      65%  { transform: translateX(0); }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes iita-right {
      0%   { transform: translateX(110px); opacity: 0; }
      18%  { opacity: 1; }
      45%  { transform: translateX(0); }
      55%  { transform: translateX(-4px); }
      65%  { transform: translateX(0); }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes iita-i {
      0%, 42% { opacity: 0; transform: scale(0.4); }
      55%     { opacity: 1; transform: scale(1.15); }
      65%     { opacity: 1; transform: scale(1); }
      100%    { opacity: 1; transform: scale(1); }
    }
    @keyframes iita-text {
      0%, 55% { opacity: 0; transform: translateY(6px); }
      80%     { opacity: 1; transform: translateY(0); }
      100%    { opacity: 1; transform: translateY(0); }
    }
  `;
  return (
    <div style={{
      width, height, background: BG, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 28, overflow: 'hidden',
    }}>
      <style>{css}</style>

      <svg width="200" height="200" viewBox="0 0 1024 1024">
        <defs>
          <radialGradient id="splashLeft" cx="35%" cy="32%" r="75%">
            <stop offset="0%" stopColor={PINK_HOT} />
            <stop offset="55%" stopColor={PINK} />
            <stop offset="100%" stopColor={PINK_DEEP} />
          </radialGradient>
          <radialGradient id="splashRight" cx="65%" cy="32%" r="75%">
            <stop offset="0%" stopColor={PINK_HOT} />
            <stop offset="55%" stopColor={PINK} />
            <stop offset="100%" stopColor={PINK_DEEP} />
          </radialGradient>
        </defs>

        <g style={{ mixBlendMode: 'screen' }}>
          <circle cx="416" cy="512" r="208" fill="url(#splashLeft)" fillOpacity="0.85"
            style={{ animation: `iita-left ${dur} ease-in-out infinite`, transformOrigin: '416px 512px' }} />
          <circle cx="608" cy="512" r="208" fill="url(#splashRight)" fillOpacity="0.85"
            style={{ animation: `iita-right ${dur} ease-in-out infinite`, transformOrigin: '608px 512px' }} />
        </g>

        <g fill="#FFFFFF" fillOpacity="0.78" style={{
          animation: `iita-i ${dur} ease-out infinite`,
          transformOrigin: '512px 512px',
        }}>
          <circle cx="512" cy="454" r="20" />
          <rect x="492" y="490" width="40" height="108" rx="20" />
        </g>
      </svg>

      <div style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 300, fontSize: 14, letterSpacing: 1.6,
        color: '#C8C8D0', textTransform: 'lowercase',
        animation: `iita-text ${dur} ease-out infinite`,
      }}>{TAGLINE}</div>
    </div>
  );
}

// ── Static splash ─────────────────────────────────────────────────────
function StaticSplash({ width = 390, height = 844 }) {
  return (
    <div style={{
      width, height, background: BG, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 28,
    }}>
      <div style={{ width: 200, height: 200 }}>
        <MarkOverlap size={200} bg="transparent" idSuffix="static" />
      </div>
      <div style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 300, fontSize: 14, letterSpacing: 1.6,
        color: '#C8C8D0', textTransform: 'lowercase',
      }}>{TAGLINE}</div>
    </div>
  );
}

// ── Size preview row ──────────────────────────────────────────────────
function SizeRow() {
  const sizes = [180, 120, 76, 60, 40, 32];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
      {sizes.map((s, i) => (
        <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: s, height: s, borderRadius: s * 0.22, overflow: 'hidden' }}>
            <MarkOverlap size={s} showI={s >= 60} idSuffix={`sz${i}`} />
          </div>
          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 300, fontSize: 10, color: '#5A5A62', letterSpacing: 0.5,
          }}>{s}px</div>
        </div>
      ))}
    </div>
  );
}

// ── Adaptive icon (Android) ───────────────────────────────────────────
function AdaptiveForeground() {
  return (
    <div style={{ position: 'relative', width: 240, height: 240 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: BG,
      }} />
      <div style={{ position: 'absolute', inset: '20%' }}>
        <MarkOverlap size={144} bg="transparent" idSuffix="adaptive" />
      </div>
      <div style={{
        position: 'absolute', inset: '17%',
        border: '1px dashed rgba(255,255,255,0.18)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
function App() {
  return (
    <DesignCanvas
      title="iita — basic + flair"
      subtitle="Two gradient circles, one i in the middle, gentle loop."
      initialZoom={0.65}
    >
      <DCSection id="mark" title="The mark">
        <DCArtboard id="mark-icon" label="App icon · 1024" width={560} height={560}>
          <div style={{ width: 560, height: 560 }}>
            <MarkOverlap size={560} idSuffix="hero" />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="splash" title="Splash">
        <DCArtboard id="splash-anim" label="Loop · 3.4s" width={390} height={844}>
          <AnimatedSplash />
        </DCArtboard>
        <DCArtboard id="splash-static" label="Static PNG" width={390} height={844}>
          <StaticSplash />
        </DCArtboard>
      </DCSection>

      <DCSection id="sizes" title="At every size">
        <DCArtboard id="sizes-row" label="180 → 32" width={760} height={260}>
          <div style={{
            width: 760, height: 260, background: '#0a0a0c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, boxSizing: 'border-box',
          }}>
            <SizeRow />
          </div>
        </DCArtboard>
        <DCArtboard id="sizes-adaptive" label="Android adaptive" width={360} height={360}>
          <div style={{
            width: 360, height: 360, background: '#0a0a0c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AdaptiveForeground />
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
