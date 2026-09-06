'use client';

import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';
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
  proof_pending: 'dim',
  live: 'positive',
  archived: 'dim',
};

const proofLabel: Record<NonNullable<ProductProjectState['proofStatus']>, string> = {
  pending: 'Proof pending',
  approved: 'Proof approved',
  changes_requested: 'Changes requested',
};

const proofTone: Record<NonNullable<ProductProjectState['proofStatus']>, StatusTone> = {
  pending: 'neutral',
  approved: 'positive',
  changes_requested: 'warning',
};

function formatCents(cents?: number): string | null {
  if (cents === undefined) return null;
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

export function ProductProjectView({ state, ctx }: { state: ProductProjectState; ctx: CardActionContext }) {
  const [activeCode, setActiveCode] = useState(state.colours[0]?.code);
  const activeColour = state.colours.find((colour) => colour.code === activeCode) ?? state.colours[0];
  const image = activeColour?.mockupUrl ?? state.imageUrl;
  const margin = formatCents(state.marginCents);

  return (
    <div className="flex flex-col gap-3">
      <div className="mf-hairline aspect-square w-full overflow-hidden rounded-2xl">
        {image ? <img src={image} alt={state.name} className="h-full w-full object-cover" loading="lazy" /> : null}
      </div>
      <div>
        <div className="mf-display text-[18px] leading-snug">{state.name}</div>
        <div className="mf-label mf-dimmed mt-1">
          {state.blankName} · {state.blankCode}
        </div>
      </div>
      {state.colours.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Colours">
          {state.colours.map((colour) => (
            <button
              key={colour.code}
              type="button"
              role="listitem"
              title={colour.name}
              aria-pressed={colour.code === activeCode}
              onClick={() => colour.mockupUrl && setActiveCode(colour.code)}
              className="h-4 w-4 shrink-0 rounded-full border"
              style={{
                background: colour.hex,
                borderColor: colour.code === activeCode ? 'var(--signal)' : 'color-mix(in srgb, var(--signal) 30%, transparent)',
                borderWidth: colour.code === activeCode ? 2 : 1,
              }}
            />
          ))}
        </div>
      ) : null}
      {state.sizes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {state.sizes.map((size) => (
            <span key={size} className="mf-hairline px-2 py-0.5 text-[11px]">
              {size}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mf-dimmed text-[13px]">
        {state.printService}
        {state.placement ? ` · ${state.placement}` : ''}
      </div>
      <div className="mf-hairline-t flex flex-col gap-1 pt-2 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Base cost</span>
          <span className="mf-dimmed">{formatCents(state.baseCostCents) ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Retail</span>
          <span className="mf-dimmed">{formatCents(state.retailPriceCents) ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Margin</span>
          <span style={{ color: 'var(--signal)' }}>{margin ?? '—'}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={statusLabel[state.status]} tone={statusTone[state.status]} />
        {state.proofStatus ? <StatusPill label={proofLabel[state.proofStatus]} tone={proofTone[state.proofStatus]} /> : null}
      </div>
      <div className="mf-hairline-t flex flex-wrap gap-2 pt-3">
        {/* the mock pricing tool needs a euro amount in the text (e.g. 'price
            it at €35'), so this re-sends the current retail price, or a
            sensible default the first time it's priced. */}
        <Chip
          small
          onClick={() => ctx.onPrompt(`Price it at €${Math.round((state.retailPriceCents ?? 3500) / 100)}`)}
        >
          Price it
        </Chip>
        <Chip small onClick={() => ctx.onPrompt('Send the proof')}>
          Send the proof
        </Chip>
        <Chip small primary onClick={() => ctx.onPrompt('Publish')}>
          Publish
        </Chip>
      </div>
    </div>
  );
}
