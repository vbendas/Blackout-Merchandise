'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { CLIENTS } from '@/lib/clients';

// One uniform size for every line, like the reference — short names are
// simply narrower. Longest roster name (18 chars) still fits the
// viewport at this size in Oswald Bold's condensed caps.
const NAME_FONT_SIZE = 'clamp(2.6rem, 7.1vw, 8rem)';

// Reveal image: one large photo anchored to the bottom-right of the
// viewport, the way the reference places it. Shrinks on small screens.
// Its bottom edge sits exactly WAITLIST_GAP above the Waitlist corner
// link, measured live so it holds at any viewport size or resolution.
const REVEAL_MAX_WIDTH = 440;
const VIEWPORT_MARGIN = 24;
const WAITLIST_GAP = 15;

// Top of the visible Waitlist corner link (there are two in the DOM,
// desktop + mobile; the hidden one measures 0×0). Falls back to the
// viewport bottom margin when none is measurable.
function waitlistTop(viewportH: number): number {
  const links = document.querySelectorAll('a[href="/waitlist"]');
  for (const link of links) {
    const rect = link.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect.top;
  }
  return viewportH - VIEWPORT_MARGIN;
}

interface ClusterState {
  index: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ListView() {
  const [active, setActive] = useState<ClusterState | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  function computeState(index: number): ClusterState | null {
    if (typeof window === 'undefined') return null;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const width = Math.min(REVEAL_MAX_WIDTH, viewportW - VIEWPORT_MARGIN * 2);
    const height = (width * 5) / 4;
    const left = viewportW - width - VIEWPORT_MARGIN - 16;
    const top = Math.max(waitlistTop(viewportH) - WAITLIST_GAP - height, VIEWPORT_MARGIN);

    return { index, top, left, width, height };
  }

  // Keep the 10px gap to the Waitlist link intact if the window is
  // resized while a reveal is open.
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      setActive((cur) => (cur ? computeState(cur.index) : cur));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active !== null]);

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
    // Always open, never toggle: on touch devices a tap fires
    // mouseenter (opens) then click — a toggle here would close it
    // again instantly. Tapping elsewhere closes via the root onClick.
    setActive(computeState(index));
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
          from { opacity: 0; transform: scale(1.035); }
          to { opacity: 1; transform: scale(1); }
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
              fontSize: NAME_FONT_SIZE,
              lineHeight: 0.94,
              letterSpacing: '-0.015em',
              color: 'var(--signal)',
              textTransform: 'uppercase',
              textAlign: 'center',
              cursor: 'pointer',
              filter: isBlurred ? 'blur(8px)' : 'none',
              transition: 'filter 400ms ease',
              animation: 'list-view-fade-up 650ms ease-out both',
              animationDelay: `${index * 55}ms`,
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
            width: active.width,
            height: active.height,
            pointerEvents: 'none',
            zIndex: 50,
            animation: 'list-view-cluster-fade 450ms cubic-bezier(0.22, 1, 0.36, 1) both',
            // Hairline so near-black photos separate from the black page
            outline: '1px solid color-mix(in srgb, var(--signal) 22%, transparent)',
          }}
        >
          <Image
            src={activeClient.images[0]}
            alt=""
            fill
            sizes="440px"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
    </div>
  );
}
