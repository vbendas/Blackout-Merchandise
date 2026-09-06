'use client';

import { useState, useTransition } from 'react';
import { advanceProductionAction, setTrackingAction } from '@/app/(chat)/admin/actions';
import { StatusPill } from '@/components/cards/StatusPill';

export interface ProductionRow {
  orderId: string;
  reference: string;
  storeName: string;
  itemsSummary: string;
  placedAt: string;
  productionStatus: string;
  grossCents: number;
}

const NEXT_LABEL: Record<string, string> = {
  queued: 'Start printing',
  printing: 'Mark packed',
  packed: 'Mark shipped',
  shipped: 'Mark delivered',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

function TrackingForm({ orderId, onDone, onError }: { orderId: string; onDone: () => void; onError: (message: string) => void }) {
  const [carrier, setCarrier] = useState('');
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            await setTrackingAction(orderId, carrier, code);
            onDone();
          } catch (err) {
            onError(err instanceof Error ? err.message : 'Could not save tracking.');
          }
        });
      }}
    >
      <input
        className="mf-hairline rounded-md bg-transparent px-2 py-1 text-[12px]"
        style={{ color: 'var(--signal)', width: 92 }}
        placeholder="Carrier"
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        required
      />
      <input
        className="mf-hairline rounded-md bg-transparent px-2 py-1 text-[12px]"
        style={{ color: 'var(--signal)', width: 120 }}
        placeholder="Tracking code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />
      <button type="submit" className="mf-pill mf-pill-sm" disabled={pending}>
        {pending ? '…' : 'Save'}
      </button>
    </form>
  );
}

export function ProductionTable({ rows }: { rows: ProductionRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [trackingOpenId, setTrackingOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function advanceRow(orderId: string) {
    setError(null);
    setPendingId(orderId);
    startTransition(async () => {
      try {
        await advanceProductionAction(orderId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not advance this order.');
      } finally {
        setPendingId(null);
      }
    });
  }

  if (rows.length === 0) {
    return <div className="mf-dimmed text-[13px]">Nothing in production right now.</div>;
  }

  return (
    <div>
      {error ? (
        <div className="mf-hairline mb-3 rounded-lg px-3 py-2 text-[13px]" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr className="mf-dimmed mf-hairline-b text-[10px] uppercase tracking-wide">
              <th className="px-2 py-2 text-left font-normal">Ref</th>
              <th className="px-2 py-2 text-left font-normal">Store</th>
              <th className="px-2 py-2 text-left font-normal">Items</th>
              <th className="px-2 py-2 text-left font-normal">Placed</th>
              <th className="px-2 py-2 text-right font-normal">Gross</th>
              <th className="px-2 py-2 text-left font-normal">Status</th>
              <th className="px-2 py-2 text-left font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.orderId} className="mf-hairline-t align-top">
                <td className="px-2 py-2 whitespace-nowrap">{row.reference}</td>
                <td className="px-2 py-2">{row.storeName}</td>
                <td className="mf-dimmed px-2 py-2">{row.itemsSummary}</td>
                <td className="mf-dimmed px-2 py-2 whitespace-nowrap">{formatDate(row.placedAt)}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">{formatCents(row.grossCents)}</td>
                <td className="px-2 py-2">
                  <StatusPill label={row.productionStatus} tone={row.productionStatus === 'shipped' || row.productionStatus === 'delivered' ? 'positive' : 'neutral'} />
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.productionStatus === 'packed' &&
                      (trackingOpenId === row.orderId ? (
                        <TrackingForm orderId={row.orderId} onDone={() => setTrackingOpenId(null)} onError={setError} />
                      ) : (
                        <button type="button" className="mf-pill mf-pill-sm" onClick={() => setTrackingOpenId(row.orderId)}>
                          Set tracking
                        </button>
                      ))}
                    {row.productionStatus in NEXT_LABEL && (
                      <button
                        type="button"
                        className="mf-pill mf-pill-sm mf-pill-primary"
                        disabled={pendingId === row.orderId}
                        onClick={() => advanceRow(row.orderId)}
                      >
                        {pendingId === row.orderId ? '…' : NEXT_LABEL[row.productionStatus]}
                      </button>
                    )}
                    <a className="mf-pill mf-pill-sm" href={`/chat?prompt=${encodeURIComponent(`Open order ${row.orderId}`)}`}>
                      Open in chat
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
