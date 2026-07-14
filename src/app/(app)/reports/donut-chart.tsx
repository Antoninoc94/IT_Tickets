type Slice = { label: string; value: number; color: string };

export function DonutChart({ data, size = 140 }: { data: Slice[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-gray-400">Nessun dato</p>;

  const r = size / 2 - 18;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.filter((d) => d.value > 0).map((d) => {
    const pct = d.value / total;
    const dashOffset = -offset * circ;
    offset += pct;
    return { ...d, pct, dashOffset };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={18}
            strokeDasharray={`${s.pct * circ} ${circ}`}
            strokeDashoffset={s.dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">totali</text>
      </svg>
      <ul className="w-full space-y-1">
        {data.filter((d) => d.value > 0).map((d) => (
          <li key={d.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.label}</span>
            </span>
            <span className="font-medium text-gray-900">{d.value} <span className="font-normal text-gray-400">({Math.round(d.value / total * 100)}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
