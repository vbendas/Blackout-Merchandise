'use client';

import { useState } from 'react';
import type { NeedsYouItem } from '@/lib/services/studio-home';

const VISIBLE = 5;

/** What is waiting on the artist, as hairline rows on the Studio home: the
 * name, the stage in small caps and one action word that sends its message
 * to the Studio. The whole row is the tap target. Shows the first five and
 * folds the rest behind "Show more". */
export function NeedsYou({
  items,
  onPrompt,
  className = '',
}: {
  items: NeedsYouItem[];
  onPrompt: (text: string) => void;
  className?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (items.length === 0) return null;
  const visible = showAll ? items : items.slice(0, VISIBLE);
  const hidden = items.length - VISIBLE;

  return (
    <section aria-labelledby="needs-you-label" className={`mf-rise mf-rise-d4 w-full max-w-[720px] ${className}`}>
      <div className="flex justify-between pb-2.5">
        <h2 id="needs-you-label" className="mf-label mf-dimmed">
          Needs you
        </h2>
        <span aria-hidden className="mf-label mf-dimmed">
          {items.length}
        </span>
      </div>
      <ul>
        {visible.map((item) => (
          <li key={item.id} className="mf-needs-row">
            <span className="mf-needs-title">{item.title}</span>
            <span className="mf-needs-state">
              {item.kind === 'production' ? <i className="mf-dot mf-dot-pulse" aria-hidden /> : null}
              {item.state}
            </span>
            <button type="button" className="mf-needs-action" onClick={() => onPrompt(item.action.prompt)}>
              {item.action.label}
              <span className="sr-only"> {item.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button type="button" className="mf-ulink mt-3" aria-expanded={showAll} onClick={() => setShowAll((all) => !all)}>
          {showAll ? 'Show fewer' : `Show ${hidden} more`}
        </button>
      ) : null}
    </section>
  );
}
