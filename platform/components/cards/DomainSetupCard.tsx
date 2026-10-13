'use client';

import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, useCopy } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type DomainSetupCardType = Extract<Card, { kind: 'domain_setup' }>;

const statusLabel: Record<DomainSetupCardType['status'], string> = {
  pending: 'Waiting',
  verifying: 'Checking',
  active: 'Connected',
  error: 'Needs attention',
};

const statusTone: Record<DomainSetupCardType['status'], StatusTone> = {
  pending: 'neutral',
  verifying: 'dim',
  active: 'positive',
  error: 'danger',
};

function CopyValue({ value }: { value: string }) {
  const { state, copy } = useCopy();
  return (
    <button type="button" className="mfc-link" data-quiet="" onClick={() => void copy(value)} aria-live="polite">
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Copy'}
    </button>
  );
}

export function DomainSetupCard({ card, ctx }: { card: DomainSetupCardType; ctx: CardActionContext }) {
  return (
    <CardFrame>
      <CardHead
        label="Domain"
        title={card.hostname}
        sentence={card.message}
        aside={<StatusPill label={statusLabel[card.status]} tone={statusTone[card.status]} />}
      />
      {card.records.length > 0 ? (
        <div>
          {card.records.map((record, index) => (
            <div key={`${record.type}-${record.name}-${index}`} className="mfc-record">
              <div className="mfc-record-head">
                <span>{record.type}</span>
                <span>{record.name}</span>
              </div>
              <div className="mfc-record-value">
                <span>{record.value}</span>
                <CopyValue value={record.value} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
