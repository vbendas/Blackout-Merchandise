'use client';

import { useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import Image from 'next/image';
import type { CatalogueItem } from '@/lib/catalog/catalogue-index';
import { formatMoney } from '@/components/cards/CardKit';
import { loadCatalogueDetail } from './catalogue-client';

// The packshots are 1200 x 1500 PNGs of 0.4 to 1 MB. next/image serves them
// as WebP at the width the tile needs. The catalogue is 85vw wide (1440px at
// most) with a rail of 236px (200px below 1200px) and 20px of grid padding,
// 16px between tiles: four columns from 1200px, three from 900px, two from
// 760px, and on phones two across the whole screen.
const TILE_SIZES = [
  '(max-width: 759px) 46vw',
  '(max-width: 899px) calc((85vw - 256px) / 2)',
  '(max-width: 1199px) calc((85vw - 272px) / 3)',
  'calc((min(85vw, 1440px) - 324px) / 4)',
].join(', ');

/** A mouse resting on a tile this long is likely to open it: fetch its detail then. */
const PREFETCH_DELAY_MS = 180;

const dotColour = (hex: string) => ({ '--c': hex }) as CSSProperties;

/** One blank in the grid: the ecru plate with its front, then name, facts,
 * up to five colour dots with the colour count, and the base price. */
export function CatalogueTile({ item, onOpen }: { item: CatalogueItem; onOpen: (code: string) => void }) {
  // The back view is not requested until the tile is hovered (or focused with
  // the keyboard), and only shows once it has loaded.
  const [back, setBack] = useState<'idle' | 'loading' | 'ready'>('idle');
  const prefetchTimer = useRef<number | undefined>(undefined);

  function onPointerEnter(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    setBack((state) => (state === 'idle' ? 'loading' : state));
    window.clearTimeout(prefetchTimer.current);
    prefetchTimer.current = window.setTimeout(() => void loadCatalogueDetail(item.code).catch(() => undefined), PREFETCH_DELAY_MS);
  }

  function onPointerLeave() {
    window.clearTimeout(prefetchTimer.current);
  }

  function onFocus(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.matches(':focus-visible')) setBack((state) => (state === 'idle' ? 'loading' : state));
  }

  return (
    <li className="cat-cell">
      <button
        type="button"
        className="cat-tile"
        data-code={item.code}
        data-back={back}
        onClick={() => onOpen(item.code)}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
      >
        <span className="cat-tplate mf-plate">
          {/* Eager: a tile only renders when it is about to be looked at (12 at a time),
              and lazy loading inside the scrolling list shows empty plates as it scrolls. */}
          <Image className="cat-front" src={item.front} alt="" fill sizes={TILE_SIZES} loading="eager" />
          {item.back && back !== 'idle' ? (
            <Image className="cat-back" src={item.back} alt="" fill sizes={TILE_SIZES} onLoad={() => setBack('ready')} />
          ) : null}
        </span>
        <span className="cat-tinfo">
          <span className="cat-tname">{item.name}</span>
          {item.facts ? <span className="cat-tfacts">{item.facts}</span> : null}
          <span className="cat-tmeta">
            <span className="cat-dots">
              {item.colours.slice(0, 5).map((colour) => (
                <i key={colour.code} aria-hidden style={dotColour(colour.hex)} />
              ))}
              <span aria-hidden>{item.colourCount}</span>
              <span className="sr-only">{item.colourCount} colours</span>
            </span>
            {item.fromPriceCents !== null ? <span className="cat-price">from {formatMoney(item.fromPriceCents)}</span> : null}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Quiet stand-in while the index loads. */
export function CatalogueTileSkeleton() {
  return (
    <li className="cat-cell" aria-hidden>
      <div className="cat-tile">
        <span className="cat-tplate mf-skel" />
        <span className="cat-tinfo">
          <span className="cat-sk mf-skel" style={{ width: '58%', height: 15 }} />
          <span className="cat-sk mf-skel" style={{ width: '88%', height: 11 }} />
          <span className="cat-sk mf-skel" style={{ width: '40%', height: 11, marginTop: 4 }} />
        </span>
      </div>
    </li>
  );
}
