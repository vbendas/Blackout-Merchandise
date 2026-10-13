'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { ChevronUp, X } from 'lucide-react';
import type { PickBlank } from '@/lib/agent/pick';
import { pickSummary } from './catalogue-pick';
import type { CatalogueDesign } from './catalogue-url';

const dotColour = (hex: string) => ({ '--c': hex }) as CSSProperties;

export interface CataloguePickTrayProps {
  pick: readonly PickBlank[];
  /** the design the pick is for, when the artist came from a design card */
  design: CatalogueDesign | null;
  onRemove: (code: string) => void;
  onClear: () => void;
  /** 'design': one design on every blank; 'run': a quote for the lot */
  onUse: (intent: 'design' | 'run') => void;
}

/** "Your pick" at the bottom of the catalogue's results: how many blanks and
 * colours, a small plate for each with its colour dots and a remove cross,
 * then Clear, Quote a run and the primary action (Use with one design, or
 * Put <design> on 3 blanks when the page was opened for a design). The page
 * renders it only while something is picked. On phones it is a compact bar,
 * the count and the primary action, that opens out to the whole tray. */
export function CataloguePickTray({ pick, design, onRemove, onClear, onUse }: CataloguePickTrayProps) {
  const [expanded, setExpanded] = useState(false);
  const blanks = pick.length;
  const primary = design ? `Put ${design.name} on ${blanks} ${blanks === 1 ? 'blank' : 'blanks'}` : 'Use with one design';

  return (
    <section className="cat-tray" aria-label="Your pick" data-expanded={expanded}>
      <div className="cat-tray-count">
        <button
          type="button"
          className="cat-tray-expand"
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide the garments in your pick' : 'Show the garments in your pick'}
          onClick={() => setExpanded((current) => !current)}
        >
          <ChevronUp className="mf-icon cat-ic" aria-hidden />
        </button>
        <span className="cat-tray-text">
          <span className="cat-label cat-dim">Your pick</span>
          <b role="status">{pickSummary(pick)}</b>
        </span>
      </div>

      <ul className="cat-tray-strip" aria-label="Blanks in your pick">
        {pick.map((entry) => (
          <li key={entry.code} className="cat-mpick">
            <span className="cat-mplate mf-plate">
              <Image src={entry.image} alt={`${entry.name}, ${entry.colours.map((colour) => colour.name).join(', ')}`} fill sizes="64px" />
            </span>
            <span className="cat-mdots" aria-hidden>
              {entry.colours.map((colour) => (
                <i key={colour.code} title={colour.name} style={dotColour(colour.hex)} />
              ))}
            </span>
            <button type="button" className="cat-mx" aria-label={`Remove ${entry.name} from your pick`} onClick={() => onRemove(entry.code)}>
              <X className="mf-icon cat-ic" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="cat-tray-acts">
        <button type="button" className="mf-pill cat-tray-clear" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="mf-pill cat-tray-run" onClick={() => onUse('run')}>
          Quote a run
        </button>
        <button type="button" className="mf-pill mf-pill-primary cat-tray-use" onClick={() => onUse('design')}>
          <span className="cat-tray-usetext">{primary}</span>
        </button>
      </div>
    </section>
  );
}
