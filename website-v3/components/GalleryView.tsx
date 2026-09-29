'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CLIENTS } from '@/lib/clients';
import { useT } from '@/lib/i18n';

// The full contact sheet — every photo of every client, not one per
// client. Each client carries two shots under /gallery/; every tile
// knows its counterpart so hover can swap between the pair.
interface WallPhoto {
  src: string;
  hover: string;
  client: string;
  category: string;
}

function flattenImages(): WallPhoto[] {
  return CLIENTS.flatMap((client) => [
    { src: client.images[0], hover: client.images[1], client: client.name, category: client.category },
    { src: client.images[1], hover: client.images[0], client: client.name, category: client.category },
  ]);
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Deterministic chaos: each photo's shape and width are derived from its
// post-shuffle index, cycling through a handful of aspect ratios and
// column widths so the wall reads as hand-hung rather than gridded.
const ASPECT_RATIOS = ['4/5', '3/4', '1/1', '4/5', '5/7', '3/4'];
const WIDTHS = ['100%', '88%', '94%'];

const ALL_IMAGES = flattenImages();

export function GalleryView() {
  // Server-render in source order (deterministic, no hydration
  // mismatch), then Fisher-Yates shuffle after mount — same pattern as
  // GridView, so every visit gets a fresh hang of the wall.
  const [images, setImages] = useState<readonly WallPhoto[]>(ALL_IMAGES);
  // The swap is CSS group-hover, which touch has no real equivalent for —
  // a tap on a plain div doesn't trigger :hover. Track a tapped tile so
  // touch users get the same swap, without disturbing the hover path.
  const [tapped, setTapped] = useState<number | null>(null);
  const t = useT();

  useEffect(() => {
    setImages(shuffle(ALL_IMAGES));
  }, []);

  return (
    <>
      {/* Same giant-header treatment as the catalog's vintage intro
          band: kicker, big title, a mono count. */}
      <section
        style={{
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          paddingTop: 'clamp(28px, 5vw, 48px)',
          paddingBottom: '32px',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <div className="flex flex-wrap items-start gap-4">
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display), sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(3.25rem, 11vw, 9.5rem)',
              lineHeight: 0.85,
              letterSpacing: '-0.03em',
            }}
          >
            {t('gallery.title')}
          </h1>
          <span
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: '10px',
              opacity: 0.62,
            }}
          >
            {t('nav.gallery')} · {t.tPlural('gallery.count', ALL_IMAGES.length)}
          </span>
        </div>
      </section>

      <div
        className="columns-1 sm:columns-2 lg:columns-3"
        style={{
          columnGap: '20px',
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          paddingTop: '48px',
          paddingBottom: '48px',
        }}
      >
      {images.map((photo, index) => {
        const aspect = ASPECT_RATIOS[index % ASPECT_RATIOS.length];
        const width = WIDTHS[index % WIDTHS.length];
        const alignRight = index % 2 === 1;
        const raggedTop = index % 4 === 0;

        const isTapped = tapped === index;

        return (
          <div
            key={`${photo.src}-${index}`}
            className="group break-inside-avoid"
            role="button"
            tabIndex={0}
            aria-label={`${photo.client} — ${t('gallery.pieceLabel', { n: index + 1 })} — ${t('gallery.tapHint')}`}
            onClick={() => setTapped((cur) => (cur === index ? null : index))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTapped((cur) => (cur === index ? null : index));
              }
            }}
            style={{
              width,
              marginLeft: alignRight ? 'auto' : 0,
              marginBottom: '20px',
              marginTop: raggedTop ? '40px' : 0,
              animation: 'fade-in 550ms ease both',
              animationDelay: `${index * 35}ms`,
              cursor: 'pointer',
            }}
          >
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: aspect }}>
              <Image
                src={photo.src}
                alt={t('gallery.pieceLabel', { n: index + 1 })}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="gallery-zoom object-cover transition-opacity duration-500 ease-out group-hover:opacity-0"
                style={{ opacity: isTapped ? 0 : undefined }}
              />
              <Image
                src={photo.hover}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="gallery-zoom object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                style={{ opacity: isTapped ? 1 : undefined }}
              />
            </div>
            <span
              className="block uppercase"
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '12px',
                letterSpacing: '0.08em',
                color: 'var(--muted)',
                paddingTop: '10px',
              }}
            >
              {photo.client} · {photo.category}
            </span>
          </div>
        );
      })}
      </div>
    </>
  );
}
