'use client';

import { EditorialPage, Row } from '@/components/editorial/EditorialPage';
import { useT } from '@/lib/i18n';
import { SOCIALS } from '@/lib/socials';

// PLACEHOLDER — swap for the real address when the inbox exists.
const EMAIL = 'hello@merchfrom.com';

const VALUE = 'font-[family-name:var(--font-condensed)] text-[32px] leading-none font-semibold uppercase';

export function ContactCopy() {
  const t = useT();

  return (
    <EditorialPage
      index={`INDX.30 — ${t('contact.headline')}`}
      title={t('contact.headline')}
      statement={t('contact.statement')}
      lede={t('contact.line')}
      plate={{ src: '/gallery/7a.png', caption: `${t('plate.label')} 03 — Void · Outerwear` }}
    >
      <Row n="01" label={t('contact.email')}>
        <a href={`mailto:${EMAIL}`} className="link-ink w-fit text-[13px]">
          {EMAIL}
        </a>
      </Row>
      <Row n="02" label={t('contact.shop')}>
        <span className={VALUE}>Barcelona, Spain</span>
      </Row>
      <Row n="03" label={t('contact.elsewhere')} last>
        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          {SOCIALS.map((social) => (
            <li key={social.label}>
              <a href={social.href} target="_blank" rel="noreferrer" className="link-ink">
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </Row>
    </EditorialPage>
  );
}
