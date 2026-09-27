import { motion } from 'motion/react';
import { scoring, typologyById } from '../lib/data';
import type { TractResult } from '../lib/derived';
import { useApp } from '../lib/store';

/** Housing-type ranks under scenario A (left) → scenario B (right). Rows that move are drawn bold. */
export default function Slopegraph({ a, b, labelA, labelB, colorA, colorB }: { a: TractResult; b: TractResult; labelA: string; labelB: string; colorA: string; colorB: string }) {
  const lite = useApp((s) => s.lite);
  const n = scoring.typologies.length;
  const W = 540, rowH = 32, top = 30, H = top + rowH * n + 4;
  const x0 = 178, x1 = W - 178;
  const y = (rank: number) => top + rank * rowH + rowH / 2;
  const tr = lite ? { duration: 0 } : { type: 'spring' as const, stiffness: 180, damping: 26 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Rank slopegraph">
      <text x={x0} y={16} textAnchor="middle" fontSize={12} fontWeight={700} style={{ fill: colorA }}>
        A · {labelA}
      </text>
      <text x={x1} y={16} textAnchor="middle" fontSize={12} fontWeight={700} style={{ fill: colorB }}>
        B · {labelB}
      </text>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <line x1={x0} x2={x1} y1={y(i)} y2={y(i)} stroke="#e7e5e4" strokeDasharray="2 4" />
          <circle cx={W / 2} cy={y(i)} r={8} fill="#f5f5f4" stroke="#d6d3d1" />
          <text x={W / 2} y={y(i) + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#475569">
            #{i + 1}
          </text>
        </g>
      ))}
      {scoring.typologies.map((t) => {
        const ra = a.ranking.indexOf(t.id), rb = b.ranking.indexOf(t.id);
        if (ra < 0 || rb < 0) return null;
        const sa = a.scores.find((s) => s.typology === t.id)?.score, sb = b.scores.find((s) => s.typology === t.id)?.score;
        const moved = ra !== rb;
        const color = typologyById.get(t.id)!.color;
        return (
          <g key={t.id}>
            <motion.line x1={x0} x2={x1} initial={false} animate={{ y1: y(ra), y2: y(rb) }} transition={tr} stroke={color} strokeWidth={moved ? 4 : 2} strokeOpacity={moved ? 1 : 0.5} strokeLinecap="round" />
            <motion.circle cx={x0} r={5} initial={false} animate={{ cy: y(ra) }} transition={tr} fill="white" stroke={color} strokeWidth={3} />
            <motion.circle cx={x1} r={5} initial={false} animate={{ cy: y(rb) }} transition={tr} fill={color} stroke="white" strokeWidth={1} />
            <motion.text x={x0 - 12} textAnchor="end" initial={false} animate={{ y: y(ra) + 5 }} transition={tr} fontSize={12}>
              <tspan fill="#0f172a" fontWeight={moved ? 700 : 500}>
                {t.label}
              </tspan>
              <tspan fill="#475569" dx={6}>
                {sa == null ? '—' : (sa * 100).toFixed(0)}
              </tspan>
            </motion.text>
            <motion.text x={x1 + 12} initial={false} animate={{ y: y(rb) + 5 }} transition={tr} fontSize={12}>
              <tspan fill="#475569">{sb == null ? '—' : (sb * 100).toFixed(0)}</tspan>
              <tspan fill="#0f172a" fontWeight={moved ? 700 : 500} dx={6}>
                {t.label}
              </tspan>
              {moved && (
                <tspan dx={6} fontSize={12} fontWeight={700} style={{ fill: rb < ra ? '#047857' : '#be123c' }}>
                  {rb < ra ? `▲${ra - rb}` : `▼${rb - ra}`}
                </tspan>
              )}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}
