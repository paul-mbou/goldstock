import { useId, useState } from 'react';
import { formatCompact, formatFcfa } from '../../data/dashboard';
import type { ChartPoint } from '../../lib/demo';

function niceMax(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const step =
    [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude).find((candidate) => candidate * 4 >= value) ??
    10 * magnitude;
  return step * 4;
}

/** Smooth path that never overshoots between two points. */
function curve(points: [number, number][]) {
  return points
    .map(([x, y], index) => {
      if (index === 0) return `M${x},${y}`;
      const [px, py] = points[index - 1];
      const mid = (px + x) / 2;
      return `C${mid},${py} ${mid},${y} ${x},${y}`;
    })
    .join(' ');
}

export function SalesChart({ points, compareLabel }: { points: ChartPoint[]; compareLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();
  const max = niceMax(Math.max(...points.flatMap((point) => [point.value, point.previous])));
  const x = (index: number) => (points.length === 1 ? 50 : (index / (points.length - 1)) * 100);
  const y = (value: number) => 100 - (value / max) * 100;

  const line = curve(points.map((point, index) => [x(index), y(point.value)]));
  const previousLine = curve(points.map((point, index) => [x(index), y(point.previous)]));
  const labelEvery = points.length > 12 ? 5 : 1;
  const current = active === null ? null : points[active];

  return (
    <figure className="relative">
      <div className="relative h-64 pl-12 sm:h-72" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((tick) => (
          <div key={tick} className="absolute inset-x-0 flex items-center" style={{ bottom: `${tick * 25}%` }}>
            <span className="w-12 pr-3 text-right text-xs text-ink-mute tabular-nums">
              {formatCompact((max / 4) * tick)}
            </span>
            <span className={`h-px flex-1 ${tick === 0 ? 'bg-line' : 'border-t border-dashed border-line'}`} />
          </div>
        ))}

        <div
          className="absolute inset-y-0 right-0 left-12 touch-pan-y"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - box.left) / box.width;
            setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
          }}
          onPointerLeave={() => setActive(null)}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f4b52c" stopOpacity="0.32" />
                <stop offset="1" stopColor="#f4b52c" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${line} L100,100 L0,100 Z`} fill={`url(#${gradientId})`} />
            <path
              d={previousLine}
              fill="none"
              className="stroke-navy-300 dark:stroke-navy-500"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={line}
              fill="none"
              stroke="#e89d12"
              strokeWidth="2.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {current && active !== null && (
            <>
              <span
                className="absolute inset-y-0 w-px bg-navy-300/60 dark:bg-white/20"
                style={{ left: `${x(active)}%` }}
              />
              <span
                className="absolute size-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-panel bg-gold-500 shadow"
                style={{ left: `${x(active)}%`, bottom: `${100 - y(current.value)}%` }}
              />
              <div
                className="pointer-events-none absolute top-2 z-10 w-max min-w-44 rounded-xl bg-navy-900 px-3.5 py-2.5 text-sm text-white shadow-xl ring-1 ring-white/10"
                style={
                  x(active) > 60
                    ? { right: `${100 - x(active)}%`, marginRight: 12 }
                    : { left: `${x(active)}%`, marginLeft: 12 }
                }
              >
                <p className="text-xs text-white/60">{current.detail}</p>
                <p className="mt-1 font-bold tabular-nums">{formatFcfa(current.value)}</p>
                <p className="text-xs text-white/60 tabular-nums">
                  {formatFcfa(current.previous)} {compareLabel}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative mt-3 ml-12 h-4" aria-hidden="true">
        {points.map((point, index) =>
          index % labelEvery === 0 || index === points.length - 1 ? (
            <span
              key={point.detail}
              className={`absolute text-xs whitespace-nowrap text-ink-mute ${
                index === 0 ? '' : index === points.length - 1 ? '-translate-x-full' : '-translate-x-1/2'
              } ${index !== points.length - 1 && points.length - 1 - index < labelEvery / 2 ? 'hidden' : ''}`}
              style={{ left: `${x(index)}%` }}
            >
              {point.label}
            </span>
          ) : null,
        )}
      </div>

      <table className="sr-only">
        <caption>Chiffre d’affaires par période, comparé à {compareLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Période</th>
            <th scope="col">Chiffre d’affaires</th>
            <th scope="col">Comparaison</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.detail}>
              <th scope="row">{point.detail}</th>
              <td>{formatFcfa(point.value)}</td>
              <td>{formatFcfa(point.previous)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
