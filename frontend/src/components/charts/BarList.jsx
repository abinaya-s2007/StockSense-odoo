import React from 'react';

// Simple Tailwind-based horizontal bar list (no SVG needed) - used for
// Top Moving Products. `items` = [{ label, value, sub }]
export default function BarList({ items, color = 'bg-accent' }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-500 py-6 text-center">No movement in this period.</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between text-sm mb-1">
            <span className="text-slate-200 font-medium truncate pr-2">{item.label}</span>
            <span className="text-slate-400 shrink-0">{item.value}{item.sub ? <span className="text-slate-500"> {item.sub}</span> : null}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
