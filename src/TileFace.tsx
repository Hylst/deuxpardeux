/* Rendu graphique des faces de tuiles en SVG, style mahjong traditionnel */

const RED = '#c0392b';
const BLUE = '#1f4e8c';
const GREEN = '#1e7a3c';

/* Positions des cercles pour chaque valeur (espace 0..1) */
const DOT_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.5, 0.27], [0.5, 0.73]],
  3: [[0.26, 0.24], [0.5, 0.5], [0.74, 0.76]],
  4: [[0.3, 0.28], [0.7, 0.28], [0.3, 0.72], [0.7, 0.72]],
  5: [[0.27, 0.25], [0.73, 0.25], [0.5, 0.5], [0.27, 0.75], [0.73, 0.75]],
  6: [[0.32, 0.22], [0.68, 0.22], [0.32, 0.5], [0.68, 0.5], [0.32, 0.78], [0.68, 0.78]],
  7: [[0.24, 0.16], [0.5, 0.22], [0.76, 0.28], [0.32, 0.55], [0.68, 0.55], [0.32, 0.82], [0.68, 0.82]],
  8: [[0.32, 0.16], [0.68, 0.16], [0.32, 0.4], [0.68, 0.4], [0.32, 0.62], [0.68, 0.62], [0.32, 0.86], [0.68, 0.86]],
  9: [[0.26, 0.2], [0.5, 0.2], [0.74, 0.2], [0.26, 0.5], [0.5, 0.5], [0.74, 0.5], [0.26, 0.8], [0.5, 0.8], [0.74, 0.8]],
};

const DOT_COLORS = [RED, BLUE, GREEN];

function Dots({ n }: { n: number }) {
  const pts = DOT_LAYOUTS[n];
  const r = n === 1 ? 16 : n <= 4 ? 9.5 : n <= 6 ? 8 : 6.5;
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full p-[7px]">
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x * 60} cy={y * 60} r={r} fill={DOT_COLORS[i % 3]} />
          <circle cx={x * 60} cy={y * 60} r={r * 0.6} fill="white" opacity="0.9" />
          <circle cx={x * 60} cy={y * 60} r={r * 0.3} fill={DOT_COLORS[i % 3]} />
          {n === 1 && (
            <>
              <circle cx={x * 60} cy={y * 60} r={r + 5} fill="none" stroke={GREEN} strokeWidth="2.5" strokeDasharray="4 3" />
              <circle cx={x * 60} cy={y * 60} r={r + 10} fill="none" stroke={RED} strokeWidth="1.6" opacity="0.55" />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

const BAM_LAYOUTS: Record<number, [number, number][]> = {
  2: [[0.5, 0.27], [0.5, 0.73]],
  3: [[0.5, 0.24], [0.3, 0.74], [0.7, 0.74]],
  4: [[0.3, 0.27], [0.7, 0.27], [0.3, 0.73], [0.7, 0.73]],
  5: [[0.28, 0.25], [0.72, 0.25], [0.5, 0.5], [0.28, 0.75], [0.72, 0.75]],
  6: [[0.28, 0.27], [0.5, 0.27], [0.72, 0.27], [0.28, 0.73], [0.5, 0.73], [0.72, 0.73]],
  7: [[0.5, 0.18], [0.28, 0.5], [0.5, 0.5], [0.72, 0.5], [0.28, 0.82], [0.5, 0.82], [0.72, 0.82]],
  8: [[0.28, 0.2], [0.5, 0.2], [0.72, 0.2], [0.36, 0.5], [0.64, 0.5], [0.28, 0.8], [0.5, 0.8], [0.72, 0.8]],
  9: [[0.28, 0.2], [0.5, 0.2], [0.72, 0.2], [0.28, 0.5], [0.5, 0.5], [0.72, 0.5], [0.28, 0.8], [0.5, 0.8], [0.72, 0.8]],
};

function Stick({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g>
      <rect x={cx - 3.2} y={cy - 12} width={6.4} height={24} rx={3} fill={color} />
      <rect x={cx - 4.4} y={cy - 2} width={8.8} height={4} rx={2} fill={color} />
      <rect x={cx - 4.4} y={cy - 12} width={8.8} height={3.4} rx={1.7} fill={color} />
      <rect x={cx - 4.4} y={cy + 8.6} width={8.8} height={3.4} rx={1.7} fill={color} />
      <line x1={cx} y1={cy - 9} x2={cx} y2={cy + 9} stroke="white" strokeWidth="1.4" opacity="0.7" />
    </g>
  );
}

function Bamboo({ n }: { n: number }) {
  if (n === 1) {
    // L'oiseau traditionnel du 1 de bambou
    return (
      <svg viewBox="0 0 60 60" className="w-full h-full p-[6px]">
        <ellipse cx="30" cy="34" rx="13" ry="16" fill={GREEN} />
        <circle cx="30" cy="16" r="8.5" fill={GREEN} />
        <circle cx="33" cy="14" r="1.8" fill="white" />
        <circle cx="33.5" cy="14" r="0.9" fill="#111" />
        <path d="M37 17 L46 15 L38 20 Z" fill={RED} />
        <path d="M19 30 Q8 36 12 48 Q20 44 22 38 Z" fill={RED} opacity="0.85" />
        <path d="M41 30 Q52 36 48 48 Q40 44 38 38 Z" fill={RED} opacity="0.85" />
        <path d="M26 49 L24 56 M30 50 L30 57 M34 49 L36 56" stroke="#8a5a2a" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="26" cy="32" rx="4" ry="7" fill="white" opacity="0.25" />
      </svg>
    );
  }
  const pts = BAM_LAYOUTS[n];
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full p-[5px]">
      {pts.map(([x, y], i) => (
        <Stick key={i} cx={x * 60} cy={y * 60} color={i % 3 === 1 ? RED : i % 3 === 2 ? BLUE : GREEN} />
      ))}
    </svg>
  );
}

const CHAR_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function TileFace({ type }: { type: string }) {
  const suit = type[0];
  const val = parseInt(type[1], 10);

  if (suit === 'd' && !isNaN(val)) return <Dots n={val} />;
  if (suit === 'b' && !isNaN(val)) return <Bamboo n={val} />;

  if (suit === 'c' && !isNaN(val)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center leading-none select-none">
        <span className="font-serif font-bold" style={{ color: BLUE, fontSize: '22px' }}>{CHAR_NUM[val - 1]}</span>
        <span className="font-serif font-bold" style={{ color: RED, fontSize: '21px', marginTop: '1px' }}>萬</span>
      </div>
    );
  }

  if (suit === 'w') {
    const winds: Record<string, [string, string]> = {
      we: ['東', 'E'], ws: ['南', 'S'], ww: ['西', 'O'], wn: ['北', 'N'],
    };
    const [char, letter] = winds[type];
    return (
      <div className="w-full h-full relative flex items-center justify-center select-none">
        <span className="absolute top-[2px] left-[5px] text-[10px] font-bold" style={{ color: BLUE }}>{letter}</span>
        <span className="font-serif font-bold" style={{ color: '#1a1a1a', fontSize: '30px' }}>{char}</span>
      </div>
    );
  }

  if (type === 'dr') {
    return (
      <div className="w-full h-full flex items-center justify-center select-none">
        <span className="font-serif font-bold" style={{ color: RED, fontSize: '32px' }}>中</span>
      </div>
    );
  }
  if (type === 'dg') {
    return (
      <div className="w-full h-full flex items-center justify-center select-none">
        <span className="font-serif font-bold" style={{ color: GREEN, fontSize: '32px' }}>發</span>
      </div>
    );
  }
  if (type === 'dw') {
    return (
      <div className="w-full h-full flex items-center justify-center p-[8px]">
        <div className="w-full h-full rounded-[4px]" style={{ border: `3px solid ${BLUE}`, boxShadow: `inset 0 0 0 2px white, inset 0 0 0 4px ${BLUE}33` }} />
      </div>
    );
  }

  if (suit === 'f') {
    const flowers: Record<string, string> = { f1: '🌸', f2: '🌺', f3: '🌼', f4: '🌷' };
    return (
      <div className="w-full h-full relative flex items-center justify-center select-none">
        <span className="absolute top-[1px] left-[4px] text-[9px] font-bold" style={{ color: RED }}>{type[1]}</span>
        <span style={{ fontSize: '26px' }}>{flowers[type]}</span>
      </div>
    );
  }

  if (suit === 's') {
    const seasons: Record<string, string> = { s1: '🌱', s2: '☀️', s3: '🍂', s4: '❄️' };
    return (
      <div className="w-full h-full relative flex items-center justify-center select-none">
        <span className="absolute top-[1px] left-[4px] text-[9px] font-bold" style={{ color: BLUE }}>{type[1]}</span>
        <span style={{ fontSize: '25px' }}>{seasons[type]}</span>
      </div>
    );
  }

  return <div className="w-full h-full flex items-center justify-center text-2xl">🀄</div>;
}
