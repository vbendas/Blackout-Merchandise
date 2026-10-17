'use client';

// The proofs of the design, as big as the iPad allows, on the ecru plate the garments sit on elsewhere in the platform. A tap opens one full
// screen; a tap on it there zooms to look at the detail, and the arrows go to the next one. Nothing here is hover-only.
import { useEffect, useRef, useState } from 'react';
import type { JobSheetViewProof } from '@/lib/print/job-sheet-view';
import { IconBack, IconClose, IconNext, IconZoom } from './icons';

export function ProofsPanel({ proofs, problem }: { proofs: JobSheetViewProof[]; problem: string | null }) {
  const [open, setOpen] = useState<number | null>(null);
  if (proofs.length === 0) return <p className="st-empty">{problem ?? 'There are no proofs for this design yet.'}</p>;
  return (
    <>
      <ul className="st-proofs">
        {proofs.map((proof, i) => (
          <li key={`${proof.label}|${proof.colourName}|${i}`}>
            <button type="button" className="st-proof" onClick={() => proof.url && setOpen(i)} disabled={!proof.url} aria-label={`${proof.colourName}, ${proof.label}. Zoom in`}>
              <span className="st-proof-plate">
                {proof.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proof.url} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="st-dim">No image</span>
                )}
              </span>
              <span className="st-proof-caption">
                <span>
                  <b>{proof.colourName}</b>
                  <span className="st-dim"> · {proof.label}</span>
                </span>
                {proof.url ? (
                  <span className="st-proof-zoom">
                    <IconZoom width={20} height={20} /> Zoom
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && proofs[open] ? <Lightbox proofs={proofs} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function Lightbox({ proofs, index, onIndex, onClose }: { proofs: JobSheetViewProof[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const proof = proofs[index];
  const last = proofs.length - 1;
  const go = (to: number) => {
    setZoomed(false);
    onIndex(Math.max(0, Math.min(last, to)));
  };

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') go(index - 1);
      else if (event.key === 'ArrowRight') go(index + 1);
    };
    document.addEventListener('keydown', onKey);
    // The page behind does not scroll while a proof is up.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="st-lightbox" role="dialog" aria-modal="true" aria-label={`${proof.colourName}, ${proof.label}`}>
      <header className="st-lightbox-bar">
        <p className="st-lightbox-title">
          <b>{proof.colourName}</b>
          <span className="st-dim"> · {proof.label}</span>
          <span className="st-mono st-dim">
            {' '}
            · {index + 1} of {proofs.length}
          </span>
        </p>
        <div className="st-lightbox-actions">
          <button type="button" className="st-btn st-btn-icon" aria-label="Previous proof" disabled={index === 0} onClick={() => go(index - 1)}>
            <IconBack />
          </button>
          <button type="button" className="st-btn st-btn-icon" aria-label="Next proof" disabled={index === last} onClick={() => go(index + 1)}>
            <IconNext />
          </button>
          <button type="button" className="st-btn" aria-pressed={zoomed} onClick={() => setZoomed((z) => !z)}>
            <IconZoom /> {zoomed ? 'Fit' : 'Zoom'}
          </button>
          <button ref={closeRef} type="button" className="st-btn st-btn-icon" aria-label="Close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
      </header>
      <div className="st-lightbox-stage" data-zoomed={zoomed || undefined}>
        {proof.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proof.url} alt={`${proof.colourName}, ${proof.label}`} onClick={() => setZoomed((z) => !z)} />
        ) : null}
      </div>
    </div>
  );
}
