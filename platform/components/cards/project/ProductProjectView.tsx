import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';
import type { ProductProjectState } from '@/components/cards/project/types';

function formatCents(cents?: number): string | null {
  if (cents === undefined) return null;
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

export function ProductProjectView({ state, ctx }: { state: ProductProjectState; ctx: CardActionContext }) {
  const base = formatCents(state.baseCostCents);
  const retail = formatCents(state.retailCents);
  const margin =
    state.baseCostCents !== undefined && state.retailCents !== undefined
      ? formatCents(state.retailCents - state.baseCostCents)
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="mf-hairline aspect-square w-full p-[9%]">
        {state.imageUrl ? (
          <img src={state.imageUrl} alt={state.name ?? ''} className="h-full w-full object-contain" loading="lazy" />
        ) : null}
      </div>
      <div>
        <div className="text-[15px] leading-snug">{state.name ?? 'Untitled product'}</div>
        {state.code ? <div className="mf-label mf-dimmed mt-1">{state.code}</div> : null}
      </div>
      {state.colours && state.colours.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Colours">
          {state.colours.map((colour) => (
            <span
              key={colour.code}
              role="listitem"
              title={colour.name}
              className="h-4 w-4 shrink-0 border"
              style={{ background: colour.hex, borderColor: 'color-mix(in srgb, var(--signal) 30%, transparent)' }}
            />
          ))}
        </div>
      ) : null}
      {state.sizes && state.sizes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {state.sizes.map((size) => (
            <span key={size} className="mf-hairline px-2 py-0.5 text-[11px]">
              {size}
            </span>
          ))}
        </div>
      ) : null}
      {state.printService ? (
        <div className="flex items-center justify-between text-[13px]">
          <span className="mf-dimmed">Print</span>
          <span>{state.printService}</span>
        </div>
      ) : null}
      <div className="mf-hairline-t flex flex-col gap-1 pt-2 text-[13px]">
        {base ? (
          <div className="flex items-center justify-between">
            <span className="mf-dimmed">Base cost</span>
            <span>{base}</span>
          </div>
        ) : null}
        {retail ? (
          <div className="flex items-center justify-between">
            <span className="mf-dimmed">Retail</span>
            <span>{retail}</span>
          </div>
        ) : null}
        {margin ? (
          <div className="flex items-center justify-between">
            <span className="mf-dimmed">Margin</span>
            <span>{margin}</span>
          </div>
        ) : null}
      </div>
      {state.status ? <div className="mf-label mf-dimmed">{state.status}</div> : null}
      <CardActions actions={state.actions} ctx={ctx} />
    </div>
  );
}
