import React, { useState } from 'react';

// Dependency-free responsive SVG donut chart. Same "no chart library" approach
// as TrendChart/BarList so the bundle stays untouched.
// `segments` = [{ label, value, color }]
const DEFAULT_COLORS = [
  '#3FA9F5', // accent
  '#5FE3A1', // accent2
  '#F2A93B', // warn
  '#F0665A', // danger
  '#C084FC', // violet
  '#38BDF8', // sky
  '#FB923C', // orange
  '#34D399', // emerald
  '#F472B6', // pink
  '#A3E635'  // lime
];

export default function DonutChart({ segments, size = 190, centerLabel, centerSub }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const clean = (segments || []).filter((s) => Number(s.value) > 0);
  const total = clean.reduce((sum, s) => sum + Number(s.value), 0);

  if (clean.length === 0 || total <= 0) {
    return <p className="text-sm text-slate-500 py-10 text-center">No data for this period.</p>;
  }

  const radius = 70;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulative = 0;
  const arcs = clean.map((s, i) => {
    const value = Number(s.value);
    const fraction = value / total;
    const dash = fraction * circumference;
    const offset = -cumulative;
    cumulative += dash;
    return {
      ...s,
      color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      dash,
      offset,
      fraction
    };
  });

  const hovered = hoverIdx !== null ? arcs[hoverIdx] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <g transform={`rotate(-90 ${center} ${center})`}>
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                strokeDashoffset={a.offset}
                opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.3}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-semibold text-slate-100">
            {hovered ? hovered.label : centerLabel ?? total}
          </span>
          <span className="text-xs text-slate-500">
            {hovered ? `${(hovered.fraction * 100).toFixed(1)}%` : (centerSub ?? 'Total')}
          </span>
        </div>
      </div>

      <div className="space-y-2 w-full">
        {arcs.map((a, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-sm cursor-pointer"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <span className={`flex items-center gap-2 truncate pr-2 ${hoverIdx === null || hoverIdx === i ? 'text-slate-200' : 'text-slate-500'}`}>
              <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: a.color }} />
              <span className="truncate">{a.label}</span>
            </span>
            <span className="text-slate-400 shrink-0">
              {a.value} <span className="text-slate-600">({(a.fraction * 100).toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
