'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { blankDisplayName } from '@/lib/catalog/display-names';
import '@/components/cards/cards.css';

// Card grammar (see cards.css): the website's run page as a card. Every card
// is built from these parts: a label, a plain title and sentence (CardHead),
// hairline rows with the state on the right (SpecRows), the piece on the ecru
// plate (Plate, or CardFrame's media), and actions as underlined links with
// one filled pill for the step that matters (ActionRow).

// A fixed locale, like the rest of the Studio's copy: the same figure reads
// the same on the server, in the thread and on the Billing page.
const MONEY: Record<string, Intl.NumberFormat> = {};

export function formatMoney(cents: number, currency = 'EUR'): string {
  MONEY[currency] ??= new Intl.NumberFormat('en-GB', { style: 'currency', currency });
  return MONEY[currency].format(cents / 100);
}

/** '13 Oct 2026' (or '13 Oct'); anything that is not a date comes back as it was. */
export function formatDate(iso: string, withYear = true): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Plate

export interface PlateProps {
  src?: string | null;
  /** empty by default: the card's own text names the piece */
  alt?: string;
  className?: string;
  /** CSS aspect-ratio, e.g. '4 / 5'; square by default */
  ratio?: string;
  /** keep an empty plate when there is no image (tiles in a grid stay aligned) */
  keep?: boolean;
}

/** A garment or mockup on the ecru plate. Renders nothing without an image,
 * unless `keep` is set. */
export function Plate({ src, alt = '', className, ratio, keep }: PlateProps) {
  if (!src && !keep) return null;
  return (
    <span className={cn('mf-plate mfc-plate', className)} style={ratio ? ({ '--mfc-ratio': ratio } as CSSProperties) : undefined}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Frame

export interface CardFrameProps extends Pick<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-label'> {
  /** image for the plate beside (or, on narrow cards, above) the text */
  media?: string | null;
  mediaAlt?: string;
  className?: string;
  children: ReactNode;
}

/** The card box: a hairline frame with an optional plate and the text body. */
export function CardFrame({ media, mediaAlt = '', className, children, ...aria }: CardFrameProps) {
  return (
    <div className={cn('mfc', className)} {...aria}>
      <div className="mfc-grid" data-media={media ? '' : undefined}>
        {media ? <Plate src={media} alt={mediaAlt} className="mfc-media" /> : null}
        <div className="mfc-body">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Head

export interface CardHeadProps {
  /** 11px uppercase at 50% */
  label?: ReactNode;
  /** 22px / 600 */
  title?: ReactNode;
  /** one plain sentence at 50% */
  sentence?: ReactNode;
  /** right of the label, typically a StatusPill */
  aside?: ReactNode;
}

export function CardHead({ label, title, sentence, aside }: CardHeadProps) {
  if (!label && !title && !sentence && !aside) return null;
  return (
    <div className="mfc-head">
      {label || aside ? (
        <div className="mfc-labelrow">
          {label ? <span className="mfc-label">{label}</span> : null}
          {aside}
        </div>
      ) : null}
      {title ? <div className="mfc-title">{title}</div> : null}
      {sentence ? <p className="mfc-sentence">{sentence}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spec rows

export interface SpecRowData {
  key?: string;
  label: ReactNode;
  /** right side; omit for a note row */
  value?: ReactNode;
  /** 'current' puts the white dot before the value; 'next' dims the whole row */
  state?: 'done' | 'current' | 'next';
  /** quiet row (subtotals) */
  dim?: boolean;
  /** emphasised value (totals) */
  strong?: boolean;
}

/** Hairline rows, the label left and the state on the right. 'caps' is the
 * run page's 11px uppercase; 'plain' is sentence case for item lines and prices. */
export function SpecRows({ rows, variant = 'caps' }: { rows: SpecRowData[]; variant?: 'caps' | 'plain' }) {
  if (rows.length === 0) return null;
  return (
    <dl className="mfc-spec" data-variant={variant}>
      {rows.map((row, index) => (
        <div
          key={row.key ?? index}
          className="mfc-row"
          data-state={row.state}
          data-dim={row.dim ? '' : undefined}
          data-strong={row.strong ? '' : undefined}
        >
          <dt className="mfc-k">{row.label}</dt>
          {row.value !== undefined && row.value !== null && row.value !== '' ? (
            <dd className="mfc-v">
              {row.state === 'current' ? <span className="mfc-dot" aria-hidden /> : null}
              {row.value}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/** Second, quieter line inside a row label. */
export function RowSub({ children }: { children: ReactNode }) {
  return <span className="mfc-sub">{children}</span>;
}

// ---------------------------------------------------------------------------
// Actions

export interface ActionItem {
  key?: string;
  label: string;
  /** the one step that matters: a small filled pill instead of a link */
  primary?: boolean;
  /** secondary link at 50% */
  quiet?: boolean;
  /** opens in a new tab */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** the label changes after a click ('Copy link' then 'Copied'): announce it */
  live?: boolean;
}

function ExternalIcon() {
  return (
    <svg className="mfc-ext" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 1.5h5v5M8.3 1.7 1.5 8.5" />
    </svg>
  );
}

function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function ActionControl({ action }: { action: ActionItem }) {
  const className = action.primary ? 'mf-pill mf-pill-sm mf-pill-primary' : 'mfc-link';
  const quiet = action.quiet && !action.primary ? '' : undefined;

  if (action.href) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={className} data-quiet={quiet}>
        {action.label}
        <ExternalIcon />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-quiet={quiet}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-live={action.live ? 'polite' : undefined}
    >
      {action.label}
    </button>
  );
}

/** Actions under a card's rows. Links are web addresses only. */
export function ActionRow({ actions }: { actions: ActionItem[] }) {
  const shown = actions.filter((action) => !action.href || isWebUrl(action.href));
  if (shown.length === 0) return null;
  return (
    <div className="mfc-actions">
      {shown.map((action, index) => (
        <ActionControl key={action.key ?? `${action.label}-${index}`} action={action} />
      ))}
    </div>
  );
}

/** Copy to the clipboard with a short 'copied' state. Fails quietly into 'failed'. */
export function useCopy(resetMs = 1800) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      let next: 'copied' | 'failed' = 'copied';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard can be unavailable (permissions, insecure context).
        next = 'failed';
      }
      setState(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState('idle'), resetMs);
    },
    [resetMs],
  );

  return { state, copy };
}

// ---------------------------------------------------------------------------
// Colours and sizes

export interface SwatchColour {
  code: string;
  name: string;
  hex: string;
}

/** Colour squares. With onPick they are buttons (one is pressed); without, they just show the range. */
export function Swatches<T extends SwatchColour>({
  colours,
  activeCode,
  onPick,
  canPick,
}: {
  colours: T[];
  activeCode?: string;
  onPick?: (colour: T) => void;
  /** a colour with nothing to show stays inert */
  canPick?: (colour: T) => boolean;
}) {
  if (colours.length === 0) return null;
  return (
    <div className="mfc-swatches" role="group" aria-label="Colours">
      {colours.map((colour) =>
        onPick ? (
          <button
            key={colour.code}
            type="button"
            className="mfc-swatch"
            title={colour.name}
            aria-label={colour.name}
            aria-pressed={colour.code === activeCode}
            data-static={canPick && !canPick(colour) ? '' : undefined}
            onClick={() => onPick(colour)}
          >
            <span style={{ background: colour.hex }} />
          </button>
        ) : (
          <span key={colour.code} className="mfc-swatch" data-static="" title={colour.name}>
            <span style={{ background: colour.hex }} />
            <span className="sr-only">{colour.name}</span>
          </span>
        ),
      )}
    </div>
  );
}

export function Sizes({ sizes }: { sizes: string[] }) {
  if (sizes.length === 0) return null;
  return (
    <ul className="mfc-sizes" aria-label="Sizes">
      {sizes.map((size) => (
        <li key={size} className="mfc-size">
          {size}
        </li>
      ))}
    </ul>
  );
}

/** The name people read for a blank. Card and project state saved before blank
 * codes were carried may have no code; then the name it came with stands. */
export function blankLabel(code: string | undefined, fallback: string | undefined): string {
  return code ? blankDisplayName(code, fallback ?? '') : (fallback ?? '');
}

/** 'front_chest · 28cm' becomes 'Front chest · 28 cm'. */
export function placementWords(raw: string | undefined): string {
  if (!raw) return '';
  const words = raw
    .replace(/_/g, ' ')
    .replace(/(\d)\s*cm\b/gi, '$1 cm')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
