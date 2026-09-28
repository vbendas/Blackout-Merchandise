'use client';

import Link from 'next/link';
import { useT, type Key } from '@/lib/i18n';
import { FOCUS_RING, HAIRLINE, MONO_LABEL, MORE_LINK, PRIMARY_BTN, SECTION_PAD } from './styles';

interface Column {
  titleKey: Key;
  bodyKey: Key;
}

const COLUMNS: Column[] = [
  { titleKey: 'home.zero.stock.title', bodyKey: 'home.zero.stock.body' },
  { titleKey: 'home.zero.min.title', bodyKey: 'home.zero.min.body' },
  { titleKey: 'home.zero.margin.title', bodyKey: 'home.zero.margin.body' },
];

// Splits a two-sentence English-style title ("A. B.") onto two lines —
// the mock (HomeCopyV2) sets this as a hard <br>. Falls back to a single
// line if a translation doesn't share that shape.
function twoLines(title: string): [string, string | null] {
  const idx = title.indexOf('. ');
  if (idx === -1) return [title, null];
  return [title.slice(0, idx + 1), title.slice(idx + 2)];
}

export function ZeroUpfront() {
  const t = useT();
  const [firstLine, secondLine] = twoLines(t('home.zero.title'));

  return (
    <section
      id="zero-upfront"
      className={`flex flex-col gap-14 ${SECTION_PAD}`}
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', background: 'var(--raised)' }}
    >
      <div className="flex flex-col gap-5">
        <span style={MONO_LABEL}>{t('home.zero.label')}</span>
        <h2 className="m-0 text-[36px] leading-[1.08] font-semibold tracking-[-0.015em] md:text-[56px] md:leading-[1.05]">
          {firstLine}
          {secondLine && (
            <>
              <br />
              {secondLine}
            </>
          )}
        </h2>
      </div>

      <div
        className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6"
        style={{ borderTop: HAIRLINE, paddingTop: '32px' }}
      >
        {COLUMNS.map((col) => (
          <div key={col.titleKey} className="flex flex-col gap-3">
            <h3 className="m-0 text-[24px] font-semibold md:text-[28px]">{t(col.titleKey)}</h3>
            <p className="m-0 text-[16px] leading-[1.55] md:text-[17px]" style={{ color: 'var(--soft)' }}>
              {t(col.bodyKey)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <Link href="/waitlist" className={FOCUS_RING} style={PRIMARY_BTN}>
          {t('home.zero.cta')}
        </Link>
        <Link href="/#paths" className={FOCUS_RING} style={MORE_LINK}>
          {t('home.zero.bulk')} →
        </Link>
      </div>
    </section>
  );
}
