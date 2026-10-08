import type { CSSProperties, ReactNode } from 'react';
import { OutlinedWord } from '@/components/home/OutlinedWord';
import { Halftone } from './Halftone';

export const MONO: CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

const RULE = '1px solid var(--hairline)';

interface EditorialPageProps {
  /** Mono index line above the title. */
  index: string;
  /** The outlined word — the page's h1. */
  title: string;
  /** Light statement under the title. */
  statement: string;
  /** Optional smaller line under the statement. */
  lede?: string;
  /** Halftone plate (right column on desktop, below the rows on mobile). */
  plate: { src: string; alt?: string; caption: string; priority?: boolean };
  /** Extra content under the plate (e.g. "What happens next"). */
  aside?: ReactNode;
  /** Left column, under the statement: numbered rows, form, etc. */
  children?: ReactNode;
}

/**
 * Shared grammar for waitlist / about / contact / 404: mono index line,
 * outlined title, light statement, numbered hairline rows, halftone
 * plate with a mono caption.
 */
export function EditorialPage({ index, title, statement, lede, plate, aside, children }: EditorialPageProps) {
  return (
    <main
      className="min-h-screen"
      style={{
        paddingLeft: 'var(--gutter)',
        paddingRight: 'var(--gutter)',
        paddingTop: 'calc(var(--header-h) + 40px)',
        paddingBottom: '120px',
      }}
    >
      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col lg:col-span-7">
          <p style={MONO}>{index}</p>
          <div style={{ marginTop: '18px', ['--chars' as string]: title.length }}>
            <OutlinedWord as="h1" className="page-word">
              {title}
            </OutlinedWord>
          </div>
          <p
            className="max-w-[620px] text-[22px] leading-[1.25] font-light tracking-[-0.01em] md:text-[30px]"
            style={{ margin: '28px 0 0' }}
          >
            {statement}
          </p>
          {lede ? (
            <p className="max-w-[520px] text-[17px] leading-[1.5]" style={{ margin: '20px 0 0', color: 'var(--soft)' }}>
              {lede}
            </p>
          ) : null}
          <div style={{ marginTop: '48px' }}>{children}</div>
        </div>

        <aside className="mt-16 flex min-w-0 flex-col gap-[14px] lg:col-span-4 lg:col-start-9 lg:mt-0 lg:pt-10">
          <Halftone
            src={plate.src}
            alt={plate.alt ?? ''}
            priority={plate.priority}
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="aspect-[4/5] w-full lg:aspect-auto lg:h-[720px]"
          />
          <p style={MONO}>{plate.caption}</p>
          {aside}
        </aside>
      </div>
    </main>
  );
}

interface RowProps {
  n: string;
  label?: ReactNode;
  children: ReactNode;
  /** Last row closes with a rule too. */
  last?: boolean;
  as?: 'div' | 'li';
}

/** Numbered hairline row: mono number, mono label, content. */
export function Row({ n, label, children, last, as: Tag = 'div' }: RowProps) {
  return (
    <Tag
      className="grid grid-cols-[44px_minmax(0,1fr)] items-start md:grid-cols-[72px_minmax(0,1fr)]"
      style={{ padding: '22px 0', borderTop: RULE, borderBottom: last ? RULE : undefined }}
    >
      <span style={{ ...MONO, paddingTop: '6px' }}>{n}</span>
      <div className="flex min-w-0 flex-col gap-3">
        {label ? <span style={MONO}>{label}</span> : null}
        {children}
      </div>
    </Tag>
  );
}
