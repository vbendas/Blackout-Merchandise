import { sampleCurve, type CurvePoint } from '@/lib/print/calibration/curve';

export interface PlotLine {
  id: string;
  /** what it is, for the legend */
  label: string;
  fn: (x: number) => number;
  /** how it is drawn: the main curve is solid, a comparison is faint, the straight line is dotted */
  style: 'main' | 'faint' | 'dotted';
}

const SIZE = 360;
const PAD = { left: 44, right: 12, top: 12, bottom: 38 };
const INNER = { w: SIZE - PAD.left - PAD.right, h: SIZE - PAD.top - PAD.bottom };

const px = (x: number): number => PAD.left + x * INNER.w;
const py = (y: number): number => PAD.top + (1 - y) * INNER.h;

function pathOf(fn: (x: number) => number): string {
  return sampleCurve(fn, 100)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(1)} ${py(Math.min(1, Math.max(0, p.y))).toFixed(1)}`)
    .join(' ');
}

const TICKS = [0, 0.25, 0.5, 0.75, 1];

/**
 * A square plot of tone against tone, 0 to 100 % each way: curves, and the
 * readings as rings. Monochrome like the rest of admin: the main curve is a
 * solid line, a comparison is faint, the straight "no change" line is dotted.
 * A text description goes with it (title and desc), and the page repeats the
 * numbers in a table, so nothing is only in the picture.
 */
export function CurvePlot({
  title,
  description,
  xLabel,
  yLabel,
  lines,
  readings = [],
}: {
  title: string;
  description: string;
  xLabel: string;
  yLabel: string;
  lines: PlotLine[];
  readings?: CurvePoint[];
}) {
  const idBase = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return (
    <figure className="cal-plot">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-labelledby={`${idBase}-t ${idBase}-d`} className="cal-plot-svg">
        <title id={`${idBase}-t`}>{title}</title>
        <desc id={`${idBase}-d`}>{description}</desc>
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={px(t)} y1={py(0)} x2={px(t)} y2={py(1)} className="cal-grid-line" />
            <line x1={px(0)} y1={py(t)} x2={px(1)} y2={py(t)} className="cal-grid-line" />
            <text x={px(t)} y={py(0) + 16} className="cal-tick" textAnchor="middle">
              {t * 100}
            </text>
            <text x={px(0) - 8} y={py(t) + 4} className="cal-tick" textAnchor="end">
              {t * 100}
            </text>
          </g>
        ))}
        <rect x={px(0)} y={py(1)} width={INNER.w} height={INNER.h} className="cal-frame" />
        {lines.map((line) => (
          <path key={line.id} d={pathOf(line.fn)} className="cal-line" data-style={line.style} fill="none" />
        ))}
        {readings.map((p, i) => (
          <circle key={i} cx={px(p.input)} cy={py(Math.min(1, Math.max(0, p.printed)))} r={3.2} className="cal-reading" />
        ))}
        <text x={px(0.5)} y={SIZE - 6} className="cal-axis" textAnchor="middle">
          {xLabel}
        </text>
        <text x={12} y={py(0.5)} className="cal-axis" textAnchor="middle" transform={`rotate(-90 12 ${py(0.5)})`}>
          {yLabel}
        </text>
      </svg>
      <figcaption className="cal-legend">
        {lines.map((line) => (
          <span key={line.id} className="cal-key">
            <svg width="26" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="26" y2="4" className="cal-line" data-style={line.style} />
            </svg>
            {line.label}
          </span>
        ))}
        {readings.length > 0 ? (
          <span className="cal-key">
            <svg width="26" height="8" aria-hidden="true">
              <circle cx="13" cy="4" r="3" className="cal-reading" />
            </svg>
            Readings
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
