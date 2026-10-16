'use client';

import { useState } from 'react';
import { humanStatus } from '@/lib/format/status';
import { ActionRow, CardHead, Plate, Sizes, SpecRows, Swatches, ViewPicker, blankLabel, productSpecRows, sleevesWaiting, viewImage, type ActionItem, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';
import type { ProductProjectState } from '@/components/cards/project/types';

const statusLabel: Record<ProductProjectState['status'], string> = {
  draft: 'Draft',
  proof_pending: 'Proof pending',
  live: 'Live',
  archived: 'Archived',
};

const statusTone: Record<ProductProjectState['status'], StatusTone> = {
  draft: 'neutral',
  proof_pending: 'warning',
  live: 'positive',
  archived: 'dim',
};

const proofLabel: Record<NonNullable<ProductProjectState['proofStatus']>, string> = {
  pending: 'Proof pending',
  approved: 'Proof approved',
  changes_requested: 'Changes requested',
};

const proofTone: Record<NonNullable<ProductProjectState['proofStatus']>, StatusTone> = {
  pending: 'warning',
  approved: 'positive',
  changes_requested: 'neutral',
};

export function ProductProjectView({ state, ctx }: { state: ProductProjectState; ctx: CardActionContext }) {
  const colours = state.colours ?? [];
  const [activeCode, setActiveCode] = useState(colours[0]?.code);
  // The side on show: the front and back photos, and each sleeve's flat proof once the print files are made.
  const [view, setView] = useState<string | null>(null);
  const activeColour = colours.find((colour) => colour.code === activeCode) ?? colours[0];
  const image = viewImage(activeColour, view) ?? state.imageUrl;
  const waiting = sleevesWaiting(state.areas, activeColour?.views);

  // Publishing waits on the artwork's approval (the design's, for this garment, these colours and this position).
  const approval = state.printApproval;
  const blocked = approval !== undefined && !approval.covered;
  const approvalAction: ActionItem | null =
    blocked && approval.action
      ? {
          key: 'approval',
          label: approval.action.label,
          primary: true,
          href: approval.action.href,
          onClick: approval.action.href ? undefined : () => ctx.onPrompt(approval.action?.prompt ?? approval.action?.label ?? ''),
        }
      : null;

  // Where it prints, area by area, and what the base cost is made of.
  const rows: SpecRowData[] = productSpecRows(state);
  // More print areas, as the assistant adds them (the price follows: front and back, sleeve prints).
  const addable = state.addable ?? [];
  const canEdit = state.status === 'draft' || state.status === 'proof_pending' || state.status === 'live';
  const addActions: ActionItem[] = canEdit
    ? [
        ...(addable.includes('back') ? [{ key: 'add-back', label: 'Add a back print', onClick: () => ctx.onPrompt('Add a back print') }] : []),
        ...(addable.some((p) => p.startsWith('sleeve_')) ? [{ key: 'add-sleeve', label: 'Add a sleeve print', onClick: () => ctx.onPrompt('Add a sleeve print on the left sleeve') }] : []),
      ]
    : [];

  return (
    <div className="mfc-stack">
      <Plate src={image} alt={state.name} ratio="4 / 3" className="w-full max-w-[360px]" />
      <CardHead title={state.name} sentence={blankLabel(state.blankCode, state.blankName)} />
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill label={statusLabel[state.status] ?? humanStatus(state.status)} tone={statusTone[state.status] ?? 'neutral'} />
        {state.proofStatus ? <StatusPill label={proofLabel[state.proofStatus] ?? humanStatus(state.proofStatus)} tone={proofTone[state.proofStatus] ?? 'neutral'} /> : null}
        {approval ? <StatusPill label={approval.covered ? 'Artwork approved' : 'Artwork needs approval'} tone={approval.covered ? 'positive' : 'warning'} /> : null}
      </div>
      {blocked && approval.sentence ? <p className="mfc-sentence">{approval.sentence}</p> : null}
      <Swatches
        colours={colours}
        activeCode={activeCode}
        onPick={(colour) => {
          if (colour.mockupUrl) setActiveCode(colour.code);
        }}
        canPick={(colour) => Boolean(colour.mockupUrl)}
      />
      <ViewPicker views={activeColour?.views} active={view} onPick={setView} />
      <Sizes sizes={state.sizes ?? []} />
      <SpecRows rows={rows} variant="plain" />
      {waiting ? <p className="mfc-sentence">{waiting}</p> : null}
      <ActionRow
        actions={[
          // Blocked: the way to the approval leads, and Publish waits (the tool says the same if it is asked).
          ...(approvalAction ? [approvalAction] : []),
          // The mock pricing tool needs a euro amount in the text (e.g. 'price
          // it at €35'), so this re-sends the current retail price, or a
          // sensible default the first time it's priced. The panel closes
          // after any message it sends (see ProjectPanel).
          { key: 'price', label: 'Price it', onClick: () => ctx.onPrompt(`Price it at €${Math.round((state.retailPriceCents ?? 3500) / 100)}`) },
          // A live or archived product has nothing left to publish.
          ...(state.status === 'draft' || state.status === 'proof_pending'
            ? [{ key: 'publish', label: 'Publish', primary: !blocked, disabled: blocked, onClick: () => ctx.onPrompt('Publish') }]
            : []),
          ...addActions,
        ]}
      />
    </div>
  );
}
