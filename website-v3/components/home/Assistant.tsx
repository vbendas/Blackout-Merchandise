'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useT } from '@/lib/i18n';
import { HAIRLINE, MONO_LABEL, SECTION_PAD } from './styles';

const DRAFT_A_IMAGE = '/gallery/2a.png';
const DRAFT_B_IMAGE = '/gallery/2b.png';

const ROW: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '80px minmax(0, 1fr)',
  columnGap: '24px',
  padding: '22px 0',
  borderBottom: HAIRLINE,
};

export function Assistant() {
  const t = useT();

  return (
    <section
      id="assistant"
      className={`grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-x-6 ${SECTION_PAD}`}
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: HAIRLINE }}
    >
      <div className="flex flex-col gap-6 md:col-span-5">
        <span style={MONO_LABEL}>{t('home.assistant.label')}</span>
        <h2
          className="m-0 text-[36px] leading-[1.08] font-semibold tracking-[-0.015em] md:text-[56px] md:leading-[1.05]"
        >
          {t('home.assistant.title')}
        </h2>
        <p
          className="m-0 max-w-[440px] text-[17px] leading-[1.55] md:text-[18px]"
          style={{ color: 'var(--soft)' }}
        >
          {t('home.assistant.body')}
        </p>
      </div>

      <div className="flex flex-col md:col-span-6 md:col-start-7" style={{ borderTop: HAIRLINE }}>
        <div style={ROW}>
          <span style={MONO_LABEL}>00:00</span>
          <div className="flex flex-col gap-1.5">
            <span className="text-[17px] font-medium">{t('home.assistant.you')}</span>
            <span className="text-[16px]" style={{ color: 'var(--soft)' }}>
              {t('home.assistant.youText')}
            </span>
          </div>
        </div>

        <div style={ROW}>
          <span style={MONO_LABEL}>00:04</span>
          <div className="flex flex-col gap-3">
            <span className="text-[17px] font-medium">{t('home.assistant.mockups')}</span>
            <div className="flex gap-3">
              <figure className="relative m-0 h-[120px] w-[120px] overflow-hidden rounded-[4px]" style={{ background: 'var(--surface)' }}>
                <Image src={DRAFT_A_IMAGE} alt={t('home.assistant.draftA')} fill className="object-cover" sizes="120px" />
                <figcaption className="sr-only">{t('home.assistant.draftA')}</figcaption>
              </figure>
              <figure className="relative m-0 h-[120px] w-[120px] overflow-hidden rounded-[4px]" style={{ background: 'var(--surface)' }}>
                <Image src={DRAFT_B_IMAGE} alt={t('home.assistant.draftB')} fill className="object-cover" sizes="120px" />
                <figcaption className="sr-only">{t('home.assistant.draftB')}</figcaption>
              </figure>
            </div>
          </div>
        </div>

        <div style={ROW}>
          <span style={MONO_LABEL}>00:09</span>
          <div className="flex flex-col gap-1.5">
            <span className="text-[17px] font-medium">{t('home.assistant.quote')}</span>
            <span style={{ ...MONO_LABEL, color: '#d8cfc8' }}>{t('home.assistant.quoteText')}</span>
          </div>
        </div>

        <div style={ROW}>
          <span style={MONO_LABEL}>00:12</span>
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-medium">{t('home.assistant.proof')}</span>
            <span
              style={{
                ...MONO_LABEL,
                border: '1px solid rgba(237,228,221,.3)',
                padding: '6px 10px',
                borderRadius: '4px',
              }}
            >
              {t('home.assistant.approved')}
            </span>
          </div>
        </div>

        <div style={{ ...ROW, borderBottom: 'none' }}>
          <span style={MONO_LABEL}>Day 5</span>
          <div className="flex flex-col gap-1.5">
            <span className="text-[17px] font-medium">{t('home.assistant.shipped')}</span>
            <span className="text-[16px]" style={{ color: 'var(--soft)' }}>
              {t('home.assistant.shippedText')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
