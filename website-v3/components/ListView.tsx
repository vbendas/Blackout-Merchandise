'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { CLIENTS } from '@/lib/clients';

// Every line targets this optical width; long names shrink to fit it,
// short names hit MAX_FONT_REM and stay "huge" without spanning it.
const TARGET_WIDTH = 'min(92vw, 1200px)';
// Archivo Black's uppercase glyphs average roughly 0.72em of advance
// width, so fontSize = (targetWidth / chars) * WIDTH_FACTOR with
// WIDTH_FACTOR ~= 1/0.72 makes a fully-scaled name (one that never hits
// the clamp) land close to TARGET_WIDTH regardless of its length.
// Measured against the rendered roster: at 1.65 (the old Anton tuning)
// "The Abysmalker" spanned 1433px of a 1440px viewport vs the 1200px target.
const WIDTH_FACTOR = 1.38;
const MAX_FONT_REM = 9.5;
const MIN_FONT_REM = 2.2;

const CLUSTER_WIDTH = 280;
const CLUSTER_HEIGHT = 350;
const CLUSTER_GAP = 36;
const VIEWPORT_MARGIN = 24;

interface ClusterState {
  index: number;
  top: number;
  left: number;
}

function fontSizeFor(name: string): string {
  const chars = Math.max(name.length, 1);
  return `clamp(${MIN_FONT_REM}rem, calc(${TARGET_WIDTH} / ${chars} * ${WIDTH_FACTOR}), ${MAX_FONT_REM}rem)`;
}

export function ListView() {
  const [active, setActive] = useState<ClusterState | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  function computeState(index: number): ClusterState | null {
    const el = itemRefs.current[index];
    if (!el || typeof window === 'undefined') return null;

    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const centerX = viewportW / 2;
    const isEven = index % 2 === 0;

    let left = isEven ? centerX + CLUSTER_GAP : centerX - CLUSTER_GAP - CLUSTER_WIDTH;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), viewportW - CLUSTER_WIDTH - VIEWPORT_MARGIN);

    let top = rect.top + rect.height / 2 - CLUSTER_HEIGHT / 2;
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), viewportH - CLUSTER_HEIGHT - VIEWPORT_MARGIN);

    return { index, top, left };
  }

  function handleEnter(index: number) {
    setActive(computeState(index));
  }

  function handleLeave(index: number) {
    setActive((cur) => (cur && cur.index === index ? null : cur));
  }

  function handleFocus(index: number) {
    setActive(computeState(index));
  }

  function handleBlur(index: number) {
    setActive((cur) => (cur && cur.index === index ? null : cur));
  }

  function handleClick(index: number, e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    setActive((cur) => (cur && cur.index === index ? null : computeState(index)));
  }

  const activeClient = active ? CLIENTS[active.index] : null;

  return (
    <div
      onClick={() => setActive(null)}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--gutter) 0',
      }}
    >
      <style>{`
        @keyframes list-view-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes list-view-cluster-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .list-view-name:focus-visible {
          outline: 2px solid var(--signal);
          outline-offset: 6px;
        }
      `}</style>

      {CLIENTS.map((client, index) => {
        const isBlurred = active?.index === index;
        return (
          <div
            key={client.name}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="link"
            tabIndex={0}
            aria-label={`${client.name} — ${client.category}`}
            className="list-view-name"
            onMouseEnter={() => handleEnter(index)}
            onMouseLeave={() => handleLeave(index)}
            onFocus={() => handleFocus(index)}
            onBlur={() => handleBlur(index)}
            onClick={(e) => handleClick(index, e)}
            style={{
              fontFamily: 'var(--font-display), sans-serif',
              fontSize: fontSizeFor(client.name),
              lineHeight: 0.94,
              letterSpacing: '-0.015em',
              color: 'var(--signal)',
              textTransform: 'uppercase',
              textAlign: 'center',
              cursor: 'pointer',
              filter: isBlurred ? 'blur(8px)' : 'none',
              transition: 'filter 250ms ease',
              animation: 'list-view-fade-up 520ms ease-out both',
              animationDelay: `${index * 40}ms`,
            }}
          >
            {client.name}
          </div>
        );
      })}

      {active && activeClient && (
        <div
          style={{
            position: 'fixed',
            top: active.top,
            left: active.left,
            width: CLUSTER_WIDTH,
            height: CLUSTER_HEIGHT,
            pointerEvents: 'none',
            zIndex: 50,
            animation: 'list-view-cluster-fade 250ms ease both',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CLUSTER_WIDTH,
              aspectRatio: '4 / 5',
              // Hairline so near-black photos separate from the black page
              outline: '1px solid color-mix(in srgb, var(--signal) 22%, transparent)',
            }}
          >
            <Image
              src={activeClient.images[0]}
              alt=""
              fill
              sizes="280px"
              style={{ objectFit: 'cover' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
