'use client';

// The pieces of a job, by garment and colour, and each size with its counter: −1, +1, +5, +10, All, and a tap on the number for
// an exact entry on a big keypad. A line is a size from one order or run (the same size from two orders is two lines); the bar and
// the numbers are what is printed of what was ordered. Every button is 56 px or more, and nothing here waits on a hover.
import type { ProgressLine } from '@/lib/services/production-progress';
import { IconFlag } from './icons';
import { allCount, QUICK_STEPS, remaining, stepChanges, type QuickStep } from './counter';
import { groupLines, percent } from './model';

export function PiecesPanel({
  lines,
  swatches,
  canCount,
  held,
  onAdjust,
  onSet,
  onOpenKeypad,
}: {
  lines: ProgressLine[];
  /** the garment colour's hex by 'blank|colour', when the job sheet has it */
  swatches: Map<string, string>;
  canCount: boolean;
  /** why counting waits (the job's screens are not ready), or null */
  held: string | null;
  onAdjust: (line: ProgressLine, delta: QuickStep) => void;
  onSet: (line: ProgressLine, value: number) => void;
  onOpenKeypad: (line: ProgressLine) => void;
}) {
  if (lines.length === 0) return <p className="st-empty">This job has no pieces to count.</p>;
  const groups = groupLines(lines);
  const flagged = lines.filter((l) => l.flag);

  return (
    <div className="st-pieces">
      {held ? <p className="st-note">Counting starts once every screen is ready: {held}</p> : null}
      {flagged.length > 0 ? (
        <p className="st-note st-note-strong" role="status">
          <IconFlag width={20} height={20} /> {flagged.length === 1 ? '1 line needs a look' : `${flagged.length} lines need a look`}: an order asks for fewer pieces than were printed.
        </p>
      ) : null}
      {groups.map((group) => {
        const hex = swatches.get(`${group.blankName}|${group.colourName}`);
        return (
          <section key={group.key} className="st-group-card" aria-label={`${group.blankName}, ${group.colourName}`}>
            <header className="st-pieces-head">
              <h3 className="st-pieces-title">
                {hex ? <span className="st-swatch st-swatch-lg" style={{ background: hex }} aria-hidden="true" /> : null}
                <span>
                  {group.blankName} · <b>{group.colourName}</b>
                </span>
              </h3>
              <p className="st-mono">
                <b>{group.printed}</b> / {group.total}
              </p>
            </header>
            <div className="st-meter st-meter-thin" aria-hidden="true">
              <span style={{ width: `${percent(group.printed, group.total)}%` }} />
            </div>
            <ul className="st-lines">
              {group.lines.map((line) => {
                const done = line.total > 0 && line.printed >= line.total;
                const name = `${line.size}, ${line.orderRef}${line.position ? `, ${line.position}` : ''}`;
                return (
                  <li key={line.key} className="st-line" data-done={done || undefined}>
                    <span className="st-line-size">{line.size}</span>
                    <div className="st-line-info">
                      <p className="st-line-ref">
                        {line.orderRef}
                        {line.position ? <span className="st-dim"> · {line.position}</span> : null}
                      </p>
                      <div className="st-meter st-meter-thin" role="progressbar" aria-label={`${name}: ${line.printed} of ${line.total} printed`} aria-valuemin={0} aria-valuemax={line.total} aria-valuenow={line.printed}>
                        <span style={{ width: `${percent(line.printed, line.total)}%` }} />
                      </div>
                      {line.flag ? (
                        <p className="st-line-flag">
                          <IconFlag width={18} height={18} /> {line.flag}
                        </p>
                      ) : null}
                    </div>
                    <button type="button" className="st-count" disabled={!canCount} onClick={() => onOpenKeypad(line)} aria-label={`${name}: ${line.printed} of ${line.total} printed. Type a number`}>
                      <b>{line.printed}</b>
                      <span>/ {line.total}</span>
                    </button>
                    <div className="st-steps" role="group" aria-label={`Change the count of ${name}`}>
                      {QUICK_STEPS.map((delta) => (
                        <button key={delta} type="button" className="st-step" disabled={!canCount || !stepChanges(line.printed, delta, line.total)} onClick={() => onAdjust(line, delta)} aria-label={`${delta > 0 ? 'Add' : 'Take'} ${Math.abs(delta)}`}>
                          {delta > 0 ? `+${delta}` : `−${-delta}`}
                        </button>
                      ))}
                      <button type="button" className="st-step st-step-all" disabled={!canCount || remaining(line.printed, line.total) === 0} onClick={() => onSet(line, allCount(line.total))} aria-label={`All ${line.total}`}>
                        All
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
