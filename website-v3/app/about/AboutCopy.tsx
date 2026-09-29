'use client';

import { EditorialPage, Row } from '@/components/editorial/EditorialPage';
import { useT } from '@/lib/i18n';

const VALUE = 'font-[family-name:var(--font-condensed)] text-[32px] leading-none font-semibold uppercase';

export function AboutCopy() {
  const t = useT();

  return (
    <EditorialPage
      index={`INDX.20 — ${t('about.headline')}`}
      title={t('about.headline')}
      statement={t('about.statement')}
      plate={{ src: '/gallery/9a.png', caption: `${t('plate.label')} 02 — Iron Legacy · Tees` }}
    >
      <Row n="01" label={t('about.est')}>
        <span className={VALUE}>2017</span>
        <p className="max-w-[560px] text-[17px] leading-[1.5]" style={{ color: 'var(--soft)' }}>
          {t('about.paragraph1')}
        </p>
      </Row>
      <Row n="02" label={t('about.shop')}>
        <span className={VALUE}>Barcelona, ES</span>
        <p className="max-w-[560px] text-[17px] leading-[1.5]" style={{ color: 'var(--soft)' }}>
          {t('about.paragraph2')}
        </p>
      </Row>
      <Row n="03" label={t('about.press')} last>
        <span className={VALUE}>Anatol Volt-M</span>
      </Row>
    </EditorialPage>
  );
}
