'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PrintTechnique } from '@/lib/print/types';
import type { ApprovalArea, ApprovalGarment, ApprovalLoupe, ApprovalProof } from '@/lib/services/print-prep';
import { loupeAlt, sleevePlaceholder } from './approve-logic';

/** The left column: the garment colour buttons with the placement and size,
 * the print areas when there are several (front, back, a sleeve), the proof on
 * the ecru plate, the true-size loupe over it, and the switch for the loupe.
 * The proof is drawn from the production files themselves: on the garment
 * photo, or for a sleeve flat and true size on a sleeve outline. */
export function ProofColumn({
  garments,
  garment,
  onPick,
  areas = [],
  area = null,
  onPickArea,
  proof,
  loupe,
  technique,
  loupeOn,
  onToggleLoupe,
  placementLabel,
}: {
  garments: readonly ApprovalGarment[];
  garment: ApprovalGarment | null;
  onPick: (code: string) => void;
  /** every print area of the design; empty for a view with one */
  areas?: readonly ApprovalArea[];
  area?: ApprovalArea | null;
  onPickArea?: (key: string) => void;
  proof: ApprovalProof | null;
  loupe: ApprovalLoupe | null;
  technique: PrintTechnique;
  loupeOn: boolean;
  onToggleLoupe: () => void;
  placementLabel: string;
}) {
  // The loupe lies over the proof, so without a proof there is nothing for it to sit on.
  const detail = proof ? loupe : null;
  const where = area ? `${area.label} · ${area.size}` : placementLabel;
  return (
    <section className="ap-proof" aria-label="Proof">
      <div className="ap-colours">
        <div className="ap-colour-list" role="group" aria-label="Garment colour">
          {garments.map((item) => (
            <button key={item.code} type="button" className="ap-colour" aria-pressed={item.code === garment?.code} onClick={() => onPick(item.code)}>
              <span className="ap-swatch" aria-hidden style={{ background: item.hex }} />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        {where ? <span className="ap-place">{where}</span> : null}
      </div>

      {areas.length > 1 && onPickArea ? (
        <div className="ap-colour-list ap-areas" role="group" aria-label="Print area">
          {areas.map((item) => (
            <button key={item.key} type="button" className="ap-colour" aria-pressed={item.key === area?.key} onClick={() => onPickArea(item.key)}>
              <span>{item.label}</span>
              <span className="ap-area-size">{item.size}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="ap-stage">
        <div className="mf-plate ap-plate">{proof ? <ProofImage proof={proof} /> : area?.sleeve ? <SleeveComing area={area} /> : <MissingProof garment={garment} />}</div>
        {detail && loupeOn ? (
          <figure className="ap-loupe">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={detail.url} alt={loupeAlt(technique)} width={300} height={300} decoding="async" />
            <figcaption>{detail.caption}</figcaption>
          </figure>
        ) : null}
      </div>

      <div className="ap-foot">
        {detail ? (
          <button type="button" className="ap-btn" onClick={onToggleLoupe}>
            {loupeOn ? 'Hide true-size detail' : 'Show true-size detail'}
          </button>
        ) : null}
        <span className="ap-note">This proof is drawn from the production files, so it shows what will actually print.</span>
      </div>
    </section>
  );
}

/** The proof, or, if its address no longer works (a link to a private file
 * runs out while the page stays open), a button that asks the server for a
 * fresh one. */
function ProofImage({ proof }: { proof: ApprovalProof }) {
  const router = useRouter();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (failedUrl === proof.url) {
    return (
      <PlateNote
        text="The proof did not load."
        action="Try again"
        onAction={() => {
          setFailedUrl(null);
          router.refresh();
        }}
      />
    );
  }

  // The engine's proofs are about 1000 px wide, 4:5 like the packshots; the
  // size keeps the page from jumping when the image arrives. The server sends
  // the <img>, so a proof can fail before React is listening for its error
  // event; the ref looks for an image that has already finished with no
  // picture in it.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setFailedUrl(proof.url);
      }}
      src={proof.url}
      alt={proof.alt}
      width={1000}
      height={1250}
      decoding="async"
      onError={() => setFailedUrl(proof.url)}
    />
  );
}

/** A sleeve whose flat proof isn't drawn yet: the print's size, on the plate where the proof will be. */
function SleeveComing({ area }: { area: ApprovalArea }) {
  const card = sleevePlaceholder(area);
  return (
    <div className="ap-plate-note ap-sleeve-coming" role="status">
      <p className="ap-sleeve-title">{card.title}</p>
      <p className="ap-sleeve-size">{card.size}</p>
      <p>{card.note}</p>
    </div>
  );
}

/** A colour with no proof yet (the view says ready, but this one is missing). */
function MissingProof({ garment }: { garment: ApprovalGarment | null }) {
  const router = useRouter();
  const [checking, startChecking] = useTransition();
  return (
    <PlateNote
      text={garment ? `There is no proof for ${garment.name} yet.` : 'There is no proof yet.'}
      action={checking ? 'Checking…' : 'Check again'}
      onAction={() => startChecking(() => router.refresh())}
      busy={checking}
    />
  );
}

/** A line of dark type and one button on the plate, where the proof would be. */
function PlateNote({ text, action, onAction, busy }: { text: string; action: string; onAction: () => void; busy?: boolean }) {
  return (
    <div className="ap-plate-note" role="status">
      <p>{text}</p>
      <button type="button" className="ap-btn" onClick={onAction} disabled={busy}>
        {action}
      </button>
    </div>
  );
}
