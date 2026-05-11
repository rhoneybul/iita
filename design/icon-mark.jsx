// Each icon is rendered as SVG at a 1024 viewBox so it scales cleanly to
// any size (1024 store icon, 180 iOS, 32 favicon, 432 Android adaptive).
// Black bg #000, pink mark #F6237D. The narrative: two marks side-by-side
// = you and your partner.

const PINK = '#F6237D';
const BG = '#000000';

// ── 1. Two dots ───────────────────────────────────────────────────────
// The simplest possible read: two people, same size, side-by-side.
function MarkTwoDots({ size = 1024, bg = BG, fg = PINK }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 1024 1024" style={{ display: 'block' }}>
      <rect width="1024" height="1024" fill={bg} />
      <circle cx="384" cy="512" r="128" fill={fg} />
      <circle cx="640" cy="512" r="128" fill={fg} />
    </svg>
  );
}

// ── 2. Lowercase ii ───────────────────────────────────────────────────
// The "ii" from the wordmark itself: two heads (dots), two bodies (stems).
// Reads as two figures standing together.
function MarkII({ size = 1024, bg = BG, fg = PINK }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 1024 1024" style={{ display: 'block' }}>
      <rect width="1024" height="1024" fill={bg} />
      {/* left "i" */}
      <circle cx="384" cy="332" r="76" fill={fg} />
      <rect x="324" y="448" width="120" height="288" rx="60" fill={fg} />
      {/* right "i" */}
      <circle cx="640" cy="332" r="76" fill={fg} />
      <rect x="580" y="448" width="120" height="288" rx="60" fill={fg} />
    </svg>
  );
}

// ── 3. Overlapping circles (union) ────────────────────────────────────
// Two lives overlapping in the middle — the shared week. The overlap
// reads as the third thing they're planning together.
function MarkUnion({ size = 1024, bg = BG, fg = PINK }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 1024 1024" style={{ display: 'block' }}>
      <rect width="1024" height="1024" fill={bg} />
      <g style={{ mixBlendMode: 'screen' }}>
        <circle cx="416" cy="512" r="208" fill={fg} fillOpacity="0.62" />
        <circle cx="608" cy="512" r="208" fill={fg} fillOpacity="0.62" />
      </g>
    </svg>
  );
}

// ── 4. The ampersand ──────────────────────────────────────────────────
// Pure typographic mark: "you & me". A single character carries the
// whole concept. Drawn in Poppins-ish weight.
function MarkAmpersand({ size = 1024, bg = BG, fg = PINK }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 1024 1024" style={{ display: 'block' }}>
      <rect width="1024" height="1024" fill={bg} />
      <text
        x="512"
        y="512"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Poppins', sans-serif"
        fontWeight="500"
        fontSize="720"
        fill={fg}
      >&</text>
    </svg>
  );
}

// ── 5. The week, two rows ─────────────────────────────────────────────
// Seven days, two people: two rows of seven dots. The grid is the
// product. Subtle, specific.
function MarkWeekGrid({ size = 1024, bg = BG, fg = PINK }) {
  const s = size;
  const cols = 7;
  const startX = 240;
  const stepX = 92;
  const rowYs = [432, 592];
  const r = 28;
  return (
    <svg width={s} height={s} viewBox="0 0 1024 1024" style={{ display: 'block' }}>
      <rect width="1024" height="1024" fill={bg} />
      {rowYs.map((y, ri) => (
        <g key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <circle
              key={ci}
              cx={startX + ci * stepX}
              cy={y}
              r={r}
              fill={fg}
              fillOpacity={ri === 0 ? 1 : 0.45}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

// ── Splash screen ─────────────────────────────────────────────────────
// Full-bleed black with the mark centered, wordmark beneath. resizeMode
// "contain" + black bg in app.json = whatever's in this PNG sits on top
// of a black field. The PNG itself should be transparent w/ the mark
// centered; this mock shows what the user actually sees on launch.
function Splash({ Mark, width = 390, height = 844 }) {
  return (
    <div style={{
      width, height, background: BG, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 32,
    }}>
      <div style={{ width: 140, height: 140 }}>
        <Mark size={140} />
      </div>
      <div style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 300,
        fontSize: 13,
        letterSpacing: 2,
        color: '#5A5A62',
        textTransform: 'lowercase',
      }}>plan the week together</div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 36,
        textAlign: 'center',
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 300,
        fontSize: 11,
        letterSpacing: 1.5,
        color: '#2a2a2e',
      }}>iita</div>
    </div>
  );
}

// ── Adaptive icon foreground (Android) ────────────────────────────────
// Foreground must keep important content within the inner ~66%. We draw
// the mark at 60% so the OS round/squircle mask can't crop it.
function AdaptiveForeground({ Mark }) {
  return (
    <div style={{ position: 'relative', width: 240, height: 240 }}>
      {/* the bg circle the OS would render — for preview only */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: BG,
      }} />
      <div style={{
        position: 'absolute', inset: '20%',
      }}>
        <Mark size={240 * 0.6} bg="transparent" />
      </div>
      {/* dashed safe-area ring */}
      <div style={{
        position: 'absolute', inset: '17%',
        border: '1px dashed rgba(255,255,255,0.18)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── Size preview row ──────────────────────────────────────────────────
// Shows the mark at every size it'll actually appear at, so we can spot
// the one that breaks at favicon scale.
function SizeRow({ Mark }) {
  const sizes = [180, 120, 76, 60, 40, 32];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
      {sizes.map(s => (
        <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: s, height: s, borderRadius: s * 0.22, overflow: 'hidden' }}>
            <Mark size={s} />
          </div>
          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 300, fontSize: 10, color: '#5A5A62',
            letterSpacing: 0.5,
          }}>{s}px</div>
        </div>
      ))}
    </div>
  );
}

// ── A whole exploration block ─────────────────────────────────────────
function Direction({ id, name, blurb, Mark }) {
  return (
    <DCSection id={id} title={name}>
      <DCArtboard id={`${id}-icon`} label="App icon · 1024" width={560} height={560}>
        <div style={{ width: 560, height: 560 }}>
          <Mark size={560} />
        </div>
      </DCArtboard>

      <DCArtboard id={`${id}-splash`} label="Splash · iPhone" width={390} height={844}>
        <Splash Mark={Mark} />
      </DCArtboard>

      <DCArtboard id={`${id}-sizes`} label="At every size" width={720} height={260}>
        <div style={{
          width: 720, height: 260, background: '#0a0a0c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, boxSizing: 'border-box',
        }}>
          <SizeRow Mark={Mark} />
        </div>
      </DCArtboard>

      <DCArtboard id={`${id}-adaptive`} label="Android adaptive" width={360} height={360}>
        <div style={{
          width: 360, height: 360, background: '#0a0a0c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AdaptiveForeground Mark={Mark} />
        </div>
      </DCArtboard>

      <DCArtboard id={`${id}-blurb`} label="The idea" width={420} height={260}>
        <div style={{
          width: 420, height: 260, background: '#0a0a0c',
          padding: 32, boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
          fontFamily: "'Poppins', sans-serif", color: '#C8C8D0',
        }}>
          <div style={{
            fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
            color: '#F6237D', fontWeight: 500,
          }}>{name}</div>
          <div style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.55 }}>{blurb}</div>
        </div>
      </DCArtboard>
    </DCSection>
  );
}

const DIRECTIONS = [
  {
    id: 'two-dots',
    name: 'Two dots',
    blurb: 'The most literal reading: two people, same size, side-by-side. Nothing to misread at favicon size. The whole brand sits inside two circles.',
    Mark: MarkTwoDots,
  },
  {
    id: 'ii',
    name: 'The two i\u2019s',
    blurb: 'Lifted straight from the wordmark — the "ii" of iita reads as two little figures with heads and bodies. The product\'s name and its icon are the same gesture.',
    Mark: MarkII,
  },
  {
    id: 'union',
    name: 'Overlap',
    blurb: 'Two circles, overlapping in the middle. The intersection is the shared week — what the app is actually for. Slightly more conceptual; only mark that does anything when it touches itself.',
    Mark: MarkUnion,
  },
  {
    id: 'ampersand',
    name: 'Ampersand',
    blurb: 'Pure typography. One character that has meant "you and me" for two thousand years. Inherits the Poppins family so it feels like an extension of the wordmark, not a separate logo.',
    Mark: MarkAmpersand,
  },
  {
    id: 'week',
    name: 'The week, two rows',
    blurb: 'Seven days, two people — fourteen dots in a 7×2 grid. The icon literally is the app\'s screen. Most specific; least universal.',
    Mark: MarkWeekGrid,
  },
];

function App() {
  return (
    <DesignCanvas
      title="iita — icon & splash"
      subtitle="Five takes on the same idea: two marks for two people. Dark theme, pink #F6237D, Poppins."
      initialZoom={0.55}
    >
      {DIRECTIONS.map(d => (
        <Direction key={d.id} {...d} />
      ))}
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
