import { memo } from 'react';
import { part, tierInfo, score, generateName, type AvatarParts } from '../data/parts';

type Props = { parts: AvatarParts; uid: string; animated?: boolean };

const GOLD = '#f5c542';
const INK = '#2a1a12';

function Background({ parts, uid }: Props) {
  const a = part('aura', parts);
  const sparkle = parts.aura >= 3;
  return (
    <g>
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a.color} /><stop offset="1" stopColor={a.c2} />
        </linearGradient>
      </defs>
      <rect width="200" height="220" fill={`url(#bg-${uid})`} />
      {sparkle && [[20, 30, 2], [170, 24, 1.6], [34, 120, 1.4], [168, 100, 2.2], [150, 180, 1.5], [14, 190, 1.8], [60, 14, 1.3]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity=".8" />
      ))}
    </g>
  );
}

function HairBack({ parts }: Props) {
  const c = part('hairColor', parts).color;
  if (parts.hairStyle === 1) return <path d="M62 80 Q60 54 100 48 Q140 54 138 80 L142 128 Q100 138 58 128 Z" fill={c} />;
  if (parts.hairStyle === 2) return <path d="M60 80 Q58 52 100 46 Q142 52 140 80 L148 176 Q100 186 52 176 Z" fill={c} />;
  return null;
}

function Body({ parts, uid }: Props) {
  const o = part('outfit', parts);
  const shape = 'M30 220 Q32 160 80 150 L120 150 Q168 160 170 220 Z';
  return (
    <g>
      <path d={shape} fill={o.color} />
      {parts.outfit === 0 && <>
        <path d="M78 150 Q100 176 122 150 Q122 164 100 168 Q78 164 78 150Z" fill="#000" opacity=".25" />
        <path d="M70 206 L130 206 L124 186 L76 186 Z" fill="#000" opacity=".12" />
      </>}
      {parts.outfit === 1 && <>
        <path d="M80 150 L100 200 L120 150 L108 150 L100 170 L92 150Z" fill="#fff" opacity=".85" />
        <path d="M100 172 V220" stroke="#fff" strokeWidth="2" opacity=".7" />
      </>}
      {parts.outfit === 2 && <>
        <path d="M80 150 L100 190 L120 150" fill="none" stroke={GOLD} strokeWidth="4" />
        <rect x="60" y="196" width="80" height="8" fill={GOLD} opacity=".9" />
      </>}
      {parts.outfit === 3 && <>
        <circle cx="52" cy="170" r="20" fill={o.color} stroke={GOLD} strokeWidth="3" />
        <circle cx="148" cy="170" r="20" fill={o.color} stroke={GOLD} strokeWidth="3" />
        <path d="M76 154 Q100 170 124 154" fill="none" stroke={GOLD} strokeWidth="4" />
        <path d="M100 168 V220" stroke={GOLD} strokeWidth="3" />
      </>}
      <path d={shape} fill={`url(#sh-${uid})`} />
    </g>
  );
}

function Head({ parts, uid }: Props) {
  const skin = part('skin', parts);
  const eye = skin.eye!;
  const m = parts.mood;
  const wow = m === 2;
  const lid = m === 1 ? 91 : m === 3 ? 94.5 : 0;
  const ry = wow ? 8 : 6.5;
  const brow = { stroke: INK, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const, opacity: 0.75 };
  return (
    <g>
      <rect x="90" y="118" width="20" height="38" fill={skin.color} />
      <rect x="90" y="118" width="20" height="38" fill="#000" opacity=".18" />
      <ellipse cx="66" cy="96" rx="5" ry="9" fill={skin.color} />
      <ellipse cx="134" cy="96" rx="5" ry="9" fill={skin.color} />
      <ellipse cx="100" cy="92" rx="34" ry="42" fill={skin.color} />
      <ellipse cx="100" cy="92" rx="34" ry="42" fill={`url(#sh-${uid})`} />
      {[86, 114].map(x => (
        <g key={x}>
          <g className="ey">
            <ellipse cx={x} cy="92" rx="6" ry={ry} fill="#fff" />
            <g className="pu"><circle cx={x} cy="92" r={wow ? 2.8 : 4} fill={eye} /><circle cx={x - 1} cy="90.5" r="1" fill="#fff" /></g>
          </g>
          {lid > 0 && <rect x={x - 7} y="83" width="14" height={lid - 83} fill={skin.color} />}
          {lid > 0 && <line x1={x - 6.5} x2={x + 6.5} y1={lid} y2={lid} stroke={INK} strokeWidth="1.2" opacity=".5" />}
        </g>
      ))}
      {m === 0 && <><path d="M78 80 Q86 75 94 80" {...brow} /><path d="M106 80 Q114 75 122 80" {...brow} /></>}
      {m === 1 && <><path d="M78 80 L94 82.5" {...brow} /><path d="M106 82.5 L122 80" {...brow} /></>}
      {m === 2 && <><path d="M78 76 Q86 71 94 76" {...brow} /><path d="M106 76 Q114 71 122 76" {...brow} /></>}
      {m === 3 && <><path d="M78 83 Q86 85 94 83" {...brow} /><path d="M106 83 Q114 85 122 83" {...brow} /></>}
      <path d="M100 98 Q96 106 101 107" stroke={INK} strokeWidth="1.4" fill="none" opacity=".4" strokeLinecap="round" />
      {m === 0 && <path d="M89 113 Q100 124 111 113" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {m === 1 && <path d="M92 115 Q103 117 110 110" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {m === 2 && <ellipse cx="100" cy="115" rx="4.5" ry="6" fill="#5a1f1f" />}
      {m === 3 && <path d="M95 115 H105" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />}
      <ellipse cx="78" cy="106" rx="6" ry="3.5" fill="#ff6b8a" opacity=".22" />
      <ellipse cx="122" cy="106" rx="6" ry="3.5" fill="#ff6b8a" opacity=".22" />
      <HairFront parts={parts} uid={uid} />
      <Accessory parts={parts} uid={uid} />
    </g>
  );
}

function HairFront({ parts }: Props) {
  const c = part('hairColor', parts).color!;
  const cap = 'M65 92 Q60 46 100 44 Q140 46 135 92 Q130 66 100 64 Q70 66 65 92Z';
  const hi = <path d="M76 56 Q90 48 106 49" stroke="#fff" strokeWidth="2" fill="none" opacity=".25" strokeLinecap="round" />;
  switch (parts.hairStyle) {
    case 3: return <g><path d={cap} fill={c} /><path d="M70 56 L74 34 L86 50 L96 28 L106 49 L120 32 L124 52 L132 60 Z" fill={c} />{hi}</g>;
    case 4: return <g><path d="M92 54 Q94 20 100 16 Q106 20 108 54 Z" fill={c} /><path d="M66 90 Q64 66 74 58 Q70 76 70 90Z M134 90 Q136 66 126 58 Q130 76 130 90Z" fill={c} opacity=".5" />{hi}</g>;
    case 5: return null;
    default: return <g><path d={cap} fill={c} />{hi}</g>;
  }
}

function Accessory({ parts, uid }: Props) {
  switch (parts.accessory) {
    case 1: return <g fill="none" stroke="#222" strokeWidth="2.4"><circle cx="86" cy="92" r="10" /><circle cx="114" cy="92" r="10" /><path d="M96 92 H104" /></g>;
    case 2: return <g><path d="M64 94 Q62 42 100 42 Q138 42 136 94" fill="none" stroke="#2b2f3a" strokeWidth="5" /><rect x="58" y="90" width="9" height="18" rx="4" fill="#ff4fa3" /><rect x="133" y="90" width="9" height="18" rx="4" fill="#ff4fa3" /></g>;
    case 3: return <g><ellipse cx="86" cy="92" rx="9" ry="8" fill="#111" /><path d="M66 82 L136 70 M77 92 L66 100" stroke="#111" strokeWidth="1.8" /></g>;
    case 4: return <g fill="#d8d2c4" stroke="#8a8372" strokeWidth="1"><path d="M70 58 Q54 50 56 30 Q68 42 80 50Z" /><path d="M130 58 Q146 50 144 30 Q132 42 120 50Z" /></g>;
    case 5: return <g className="fl"><ellipse cx="100" cy="36" rx="24" ry="6" fill="none" stroke={GOLD} strokeWidth="4" /></g>;
    case 6: return <g className="fl"><path d="M76 54 L78 32 L90 44 L100 28 L110 44 L122 32 L124 54Z" fill={`url(#gold-${uid})`} stroke="#b88a14" strokeWidth="1" /></g>;
    default: return null;
  }
}

export const AvatarSvg = memo(function AvatarSvg({ parts, uid, animated = false }: Props) {
  const sc = score(parts);
  const label = `${generateName(parts)}, ${tierInfo(sc).tier[0] + tierInfo(sc).tier.slice(1).toLowerCase()}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" role="img" aria-label={label} className={animated ? 'live' : undefined} style={{ display: 'block', width: '100%' }}>
      <defs>
        <radialGradient id={`sh-${uid}`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" />
        </radialGradient>
        <linearGradient id={`gold-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset="1" stopColor="#d9a21b" /></linearGradient>
      </defs>
      <Background parts={parts} uid={uid} />
      <HairBack parts={parts} uid={uid} />
      <g className="br"><Body parts={parts} uid={uid} /></g>
      <g className="hd"><Head parts={parts} uid={uid} /></g>
    </svg>
  );
});
