import type { ReactNode } from 'react';

// Spec rows (Round 9 WP6a): mono label / value pairs in a <dl>, a --rule
// between rows, tabular figures. A row with a null / undefined / empty value
// renders nothing at all, so absent facts never show a blank cell.
// Look: .mf-spec-row in design-tokens/components.css.

export interface SpecItem {
  label: ReactNode;
  value: ReactNode | null | undefined;
}

function isEmpty(value: ReactNode | null | undefined) {
  return value === null || value === undefined || value === false || value === '';
}

interface SpecRowProps extends SpecItem {
  /** 'row' = label left, value right. 'stack' = label over value (card captions). */
  layout?: 'row' | 'stack';
  className?: string;
}

/** One row. Must sit inside a <dl> (use SpecList, or your own <dl>). */
export function SpecRow({ label, value, layout = 'row', className }: SpecRowProps) {
  if (isEmpty(value)) return null;
  return (
    <div className={['mf-spec-row', className].filter(Boolean).join(' ')} data-layout={layout}>
      <dt className="mf-spec-row__label">{label}</dt>
      <dd className="mf-spec-row__value">{value}</dd>
    </div>
  );
}

interface SpecListProps {
  items: readonly SpecItem[];
  layout?: 'row' | 'stack';
  className?: string;
  'aria-label'?: string;
}

/** A <dl> of SpecRows. Renders nothing when every value is empty. */
export function SpecList({ items, layout = 'row', className, ...aria }: SpecListProps) {
  const visible = items.filter((item) => !isEmpty(item.value));
  if (visible.length === 0) return null;
  return (
    <dl className={['mf-spec-list', className].filter(Boolean).join(' ')} {...aria}>
      {visible.map((item, i) => (
        <SpecRow key={i} label={item.label} value={item.value} layout={layout} />
      ))}
    </dl>
  );
}
