import Link from 'next/link';
import { createElement, type ComponentProps, type ReactNode } from 'react';
import { SpecRow } from './SpecRow';

// SpecCard primitive (Round 9 WP6a). Look: .mf-card in design-tokens/components.css.
//
//   product  packshot (`media`) on --bg-raised with a flat --scrim caption
//            bar over its bottom edge: SKU code, name, spec cells
//   plain    boxed block with the same caption below (no media)
//
// priceFrom / moq / lead render only when their value is defined, so an
// unset fact (lib/site.ts) never leaves an empty cell. Labels come from the
// caller (i18n); values are formatted by the caller.
//
// Action: pass href (next/link) or onClick (button) and the title becomes a
// stretched action over the whole card; with neither the card is static.

export interface CardSpec {
  label: ReactNode;
  value: ReactNode | null | undefined;
}

interface SpecCardProps {
  variant?: 'product' | 'plain';
  title: ReactNode;
  /** SKU / catalogue code, mono (e.g. built from PRODUCTS data). */
  code?: ReactNode;
  /** Packshot (an <img>, next/image or <svg>); product variant. */
  media?: ReactNode;
  priceFrom?: CardSpec;
  moq?: CardSpec;
  lead?: CardSpec;
  href?: ComponentProps<typeof Link>['href'];
  onClick?: () => void;
  /** Heading level for the title; default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Extra content under the caption. */
  children?: ReactNode;
  className?: string;
}

export function SpecCard({
  variant = 'product',
  title,
  code,
  media,
  priceFrom,
  moq,
  lead,
  href,
  onClick,
  headingLevel = 3,
  children,
  className,
}: SpecCardProps) {
  const specs = [priceFrom, moq, lead].filter((s): s is CardSpec => Boolean(s));
  const hasSpecs = specs.some((s) => s.value !== null && s.value !== undefined && s.value !== '');

  let heading: ReactNode = title;
  if (href !== undefined) {
    heading = (
      <Link href={href} className="mf-card__action" data-ring="custom">
        {title}
      </Link>
    );
  } else if (onClick) {
    heading = (
      <button type="button" className="mf-card__action" data-ring="custom" onClick={onClick}>
        {title}
      </button>
    );
  }

  const caption = (
    <div className="mf-card__caption">
      {code ? <span className="mf-card__code">{code}</span> : null}
      {createElement(`h${headingLevel}`, { className: 'mf-card__title' }, heading)}
      {hasSpecs ? (
        <dl className="mf-card__specs">
          {specs.map((s, i) => (
            <SpecRow key={i} label={s.label} value={s.value} layout="stack" />
          ))}
        </dl>
      ) : null}
    </div>
  );

  return (
    <article className={['mf-card', className].filter(Boolean).join(' ')} data-variant={variant}>
      {variant === 'product' ? (
        <div className="mf-card__media">
          {media}
          {caption}
        </div>
      ) : (
        caption
      )}
      {children ? <div className="mf-card__extra">{children}</div> : null}
    </article>
  );
}
