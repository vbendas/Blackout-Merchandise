'use client';

import { useState } from 'react';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type DomainSetupCardType = Extract<Card, { kind: 'domain_setup' }>;

const statusLabel: Record<DomainSetupCardType['status'], string> = {
  pending: 'Pending',
  verifying: 'Verifying',
  active: 'Active',
  error: 'Error',
};

const statusTone: Record<DomainSetupCardType['status'], StatusTone> = {
  pending: 'neutral',
  verifying: 'dim',
  active: 'positive',
  error: 'danger',
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context) — no-op.
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="mf-dimmed shrink-0 text-[11px] underline">
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function DomainSetupCard({ card, ctx }: { card: DomainSetupCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="mf-display truncate text-[18px]">{card.hostname}</div>
        <StatusPill label={statusLabel[card.status]} tone={statusTone[card.status]} />
      </div>
      {card.records.length > 0 ? (
        <div className="mf-hairline-t mt-3 overflow-x-auto pt-2">
          <table className="w-full min-w-[320px] border-collapse text-[12px]">
            <thead>
              <tr className="mf-dimmed text-left uppercase tracking-wide">
                <th className="pb-1.5 pr-2 font-normal">Type</th>
                <th className="pb-1.5 pr-2 font-normal">Name</th>
                <th className="pb-1.5 font-normal">Value</th>
              </tr>
            </thead>
            <tbody>
              {card.records.map((record, index) => (
                <tr key={`${record.type}-${record.name}-${index}`} className="mf-hairline-t align-top">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{record.type}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{record.name}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 break-all">{record.value}</span>
                      <CopyButton value={record.value} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {card.message ? <p className="mf-dimmed mt-2 text-[12px] leading-relaxed">{card.message}</p> : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
