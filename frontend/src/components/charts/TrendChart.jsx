import React, { useState } from 'react';

// Dependency-free responsive SVG chart: grouped Incoming/Outgoing bars with a
// Net Movement line overlay. No chart library is installed in this project,
// so this keeps the bundle untouched while still being fully interactive.
export default function TrendChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-500 py-10 text-center">No movement in this period.</p>;
  }

  const width = 900;
  const height = 320;
  const padding = { top: 16, right: 16, bottom: 32, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxBar = Math.max(1, ...data.map((d) => Math.max(d.incoming, d.outgoing)));
  const maxNet = Math.max(1, ...data.map((d) => Math.abs(d.net_movement)));
  const maxVal = Math.max(maxBar, maxNet);

  const n = data.length;
  const slotW = innerW / n;
  const groupW = Math.min(slotW * 0.6, 42);
  const barW = groupW / 2;

  const y = (v) => padding.top + innerH - (v / maxVal) * innerH;
  const x = (i) => padding.left + i * slotW + (slotW - groupW) / 2;

  const linePoints = data
    .map((d, i) => `${padding.left + i * slotW + slotW / 2},${y(d.net_movement)}`)
    .join(' ');

  const gridLines = 4;

  function formatPeriod(p) {
    // Already YYYY-MM-DD from the API; show a shorter label for day buckets.
    if (/^\d{4}-\d{2}-\d{2}$/.test(p)) {
      const d = new Date(p + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return p;
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const v = (maxVal / gridLines) * i;
          const gy = y(v);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={gy} y2={gy} stroke="#2A3542" strokeWidth="1" />
              <text x={padding.left - 8} y={gy + 4} textAnchor="end" fontSize="10" fill="#64748b">
                {Math.round(v)}
              </text>
            </g>
          );
        })}
        {/* zero line for net movement clarity */}
        <line x1={padding.left} x2={width - padding.right} y1={y(0)} y2={y(0)} stroke="#3A4656" strokeWidth="1.5" />

        {/* bars */}
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
            <rect x={x(i)} y={y(d.incoming)} width={barW} height={Math.max(0, y(0) - y(d.incoming))} fill="#5FE3A1" opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.35} rx="2" />
            <rect x={x(i) + barW} y={y(d.outgoing)} width={barW} height={Math.max(0, y(0) - y(d.outgoing))} fill="#F0665A" opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.35} rx="2" />
            <rect x={x(i)} y={padding.top} width={groupW} height={innerH} fill="transparent" />
            <text x={padding.left + i * slotW + slotW / 2} y={height - padding.bottom + 16} textAnchor="middle" fontSize="10" fill="#64748b">
              {formatPeriod(d.period)}
            </text>
          </g>
        ))}

        {/* net movement line */}
        <polyline points={linePoints} fill="none" stroke="#3FA9F5" strokeWidth="2" />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={padding.left + i * slotW + slotW / 2}
            cy={y(d.net_movement)}
            r={hoverIdx === i ? 4 : 3}
            fill="#3FA9F5"
          />
        ))}
      </svg>

      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent2 inline-block" /> Incoming</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-danger inline-block" /> Outgoing</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" /> Net Movement</span>
      </div>

      {hovered && (
        <div className="absolute top-0 right-0 card px-3 py-2 text-xs shadow-xl">
          <p className="text-slate-300 font-medium mb-1">{formatPeriod(hovered.period)}</p>
          <p className="text-accent2">Incoming: {hovered.incoming}</p>
          <p className="text-danger">Outgoing: {hovered.outgoing}</p>
          <p className="text-accent">Net: {hovered.net_movement >= 0 ? '+' : ''}{hovered.net_movement}</p>
        </div>
      )}
    </div>
  );
}
