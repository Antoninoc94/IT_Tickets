"use client";

import { useState } from "react";

type Day = { date: string; count: number };

const W = 600;
const H = 160;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 28;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;

export function TrendChart({ days }: { days: Day[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const n = days.length;
  if (n < 2) return <p className="text-sm text-gray-500">Dati insufficienti.</p>;

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  const xAt = (i: number) => PAD_L + (i / (n - 1)) * CHART_W;
  const yAt = (v: number) => PAD_T + CHART_H - (v / maxCount) * CHART_H;

  const pts = days.map((d, i) => ({ x: xAt(i), y: yAt(d.count) }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[n - 1].x.toFixed(1)} ${(PAD_T + CHART_H).toFixed(1)} L${pts[0].x.toFixed(1)} ${(PAD_T + CHART_H).toFixed(1)}Z`;

  const yTicks =
    maxCount <= 4
      ? Array.from({ length: maxCount + 1 }, (_, i) => i)
      : [0, Math.round(maxCount / 2), maxCount];

  // Show labels roughly every 10 days, always include last
  const xLabels = days
    .map((d, i) => ({ i, label: d.date }))
    .filter((_, i) => i % 10 === 0 || i === n - 1);

  const hovDay = hovered !== null ? days[hovered] : null;
  const hovPt  = hovered !== null ? pts[hovered]  : null;

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* horizontal grid */}
        {yTicks.map((v) => (
          <line
            key={v}
            x1={PAD_L} y1={yAt(v).toFixed(1)}
            x2={W - PAD_R} y2={yAt(v).toFixed(1)}
            stroke="var(--border)" strokeWidth="1"
          />
        ))}

        {/* area fill */}
        <path d={areaPath} fill="var(--brand)" fillOpacity="0.08" />

        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* hover crosshair + dot */}
        {hovPt && (
          <>
            <line
              x1={hovPt.x.toFixed(1)} y1={PAD_T}
              x2={hovPt.x.toFixed(1)} y2={PAD_T + CHART_H}
              stroke="var(--brand)" strokeWidth="1" strokeDasharray="3 2"
            />
            <circle cx={hovPt.x.toFixed(1)} cy={hovPt.y.toFixed(1)} r="4" fill="var(--brand)" />
          </>
        )}

        {/* transparent hover strips */}
        {pts.map((p, i) => {
          const left  = i === 0     ? PAD_L           : (pts[i - 1].x + p.x) / 2;
          const right = i === n - 1 ? W - PAD_R       : (p.x + pts[i + 1].x) / 2;
          return (
            <rect
              key={i}
              x={left.toFixed(1)}
              y={PAD_T}
              width={(right - left).toFixed(1)}
              height={CHART_H}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          );
        })}

        {/* Y-axis labels */}
        {yTicks.map((v) => (
          <text
            key={v}
            x={PAD_L - 4}
            y={(yAt(v) + 4).toFixed(1)}
            textAnchor="end"
            fontSize="9"
            fill="var(--muted)"
          >
            {v}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map(({ i, label }) => (
          <text
            key={i}
            x={pts[i].x.toFixed(1)}
            y={H - 4}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            fontSize="9"
            fill="var(--muted)"
          >
            {label}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hovDay && hovPt && (
        <div
          className="pointer-events-none absolute rounded bg-gray-900 px-2 py-1 text-xs text-white shadow"
          style={{
            left: `${Math.min(Math.max((hovPt.x / W) * 100, 10), 90)}%`,
            top:  `${(hovPt.y / H) * 100}%`,
            transform: "translate(-50%, -130%)",
          }}
        >
          <div className="font-medium">{hovDay.count} ticket</div>
          <div className="text-gray-400">{hovDay.date}</div>
        </div>
      )}
    </div>
  );
}
