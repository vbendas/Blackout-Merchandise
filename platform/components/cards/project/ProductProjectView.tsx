'use client';

import { useState } from 'react';
import { humanStatus } from '@/lib/format/status';
import { ActionRow, CardHead, Plate, Sizes, SpecRows, Swatches, blankLabel, formatMoney, placementWords, type SpecRowData } from '@/components/cards/CardKit';
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
  const activeColour = colours.find((colour) => colour.code === activeCode) ?? colours[0];
  const image = activeColour?.mockupUrl ?? state.imageUrl;

  const rows: SpecRowData[] = [
    { key: 'print', label: 'Print', value: [state.printService, placementWords(state.placement)].filter(Boolean).join(' · ') },
    { key: 'base', label: 'Base cost', value: state.baseCostCents !== undefined ? formatMoney(state.baseCostCents) : '—', dim: true },
    { key: 'retail', label: 'Retail', value: state.retailPriceCents !== undefined ? formatMoney(state.retailPriceCents) : '—' },
    { key: 'margin', label: 'Margin', value: state.marginCents !== undefined ? formatMoney(state.marginCents) : '—', strong: true },
  ];

  return (
    <div className="mfc-stack">
      <Plate src={image} alt={state.name} ratio="4 / 3" className="w-full max-w-[360px]" />
      <CardHead title={state.name} sentence={blankLabel(state.blankCode, state.blankName)} />
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill label={statusLabel[state.status] ?? humanStatus(state.status)} tone={statusTone[state.status] ?? 'neutral'} />
        {state.proofStatus ? <StatusPill label={proofLabel[state.proofStatus] ?? humanStatus(state.proofStatus)} tone={proofTone[state.proofStatus] ?? 'neutral'} /> : null}
      </div>
      <Swatches
        colours={colours}
        activeCode={activeCode}
        onPick={(colour) => {
          if (colour.mockupUrl) setActiveCode(colour.code);
        }}
        canPick={(colour) => Boolean(colour.mockupUrl)}
      />
      <Sizes sizes={state.sizes ?? []} />
      <SpecRows rows={rows} variant="plain" />
      <ActionRow
        actions={[
          // The mock pricing tool needs a euro amount in the text (e.g. 'price
          // it at €35'), so this re-sends the current retail price, or a
          // sensible default the first time it's priced. The panel closes
          // after any message it sends (see ProjectPanel).
          { key: 'price', label: 'Price it', onClick: () => ctx.onPrompt(`Price it at €${Math.round((state.retailPriceCents ?? 3500) / 100)}`) },
          { key: 'proof', label: 'Send the proof', onClick: () => ctx.onPrompt('Send the proof') },
          { key: 'publish', label: 'Publish', primary: true, onClick: () => ctx.onPrompt('Publish') },
        ]}
      />
    </div>
  );
}
