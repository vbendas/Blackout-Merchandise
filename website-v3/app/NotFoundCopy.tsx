'use client';

import Link from 'next/link';
import { EditorialPage, Row } from '@/components/editorial/EditorialPage';
import { useT } from '@/lib/i18n';

export function NotFoundCopy() {
  const t = useT();

  return (
    <EditorialPage
      index="INDX.40 — 404"
      title="404"
      statement={`${t('notFound.headline')} ${t('notFound.paragraph')}`}
      plate={{ src: '/gallery/11a.png', caption: `${t('plate.label')} 04 — Game Over · Drop` }}
    >
      <Row n="01" last>
        <Link href="/" className="btn-ink w-fit">
          {t('notFound.backLink')} →
        </Link>
      </Row>
    </EditorialPage>
  );
}
