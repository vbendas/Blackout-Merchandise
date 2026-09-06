'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { placeSupplierOrderAction, receiveSupplierOrderAction } from '@/app/(chat)/admin/actions';
import { StatusPill } from '@/components/cards/StatusPill';

export interface SupplierLineRow {
  blankCode: string;
  blankName: string;
  colourCode: string;
  colourName: string;
  size: string;
  qty: number;
  unitCostCents: number;
  receivedQty: number;
}

export interface SupplierOrderRow {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  lines: SupplierLineRow[];
  forOrders: string[];
  totalUnits: number;
  totalCostCents: number;
  createdAt: string;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

const RECEIVABLE = new Set(['placed', 'confirmed', 'shipped']);

export function SupplierTable({ orders }: { orders: SupplierOrderRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, action: (id: string) => Promise<void>) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await action(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed.');
      } finally {
        setPendingId(null);
      }
    });
  }

  if (orders.length === 0) {
    return <div className="mf-dimmed text-[13px]">No supplier orders yet.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="mf-hairline rounded-lg px-3 py-2 text-[13px]" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      ) : null}
      {orders.map((order) => (
        <div key={order.id} className="mf-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[14px]">{order.poNumber}</div>
              <div className="mf-dimmed text-[12px]">
                {order.supplier} · {order.totalUnits} units · {formatCents(order.totalCostCents)} · {order.forOrders.length} order{order.forOrders.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusPill label={order.status} tone={order.status === 'received' ? 'positive' : order.status === 'cancelled' ? 'dim' : 'neutral'} />
              {order.status === 'draft' && (
                <button
                  type="button"
                  className="mf-pill mf-pill-sm mf-pill-primary"
                  disabled={pendingId === order.id}
                  onClick={() => run(order.id, placeSupplierOrderAction)}
                >
                  {pendingId === order.id ? '…' : 'Place'}
                </button>
              )}
              {RECEIVABLE.has(order.status) && (
                <button
                  type="button"
                  className="mf-pill mf-pill-sm mf-pill-primary"
                  disabled={pendingId === order.id}
                  onClick={() => run(order.id, receiveSupplierOrderAction)}
                >
                  {pendingId === order.id ? '…' : 'Receive'}
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {order.lines.map((line) => (
              <div key={`${line.blankCode}-${line.colourCode}-${line.size}`} className="mf-hairline rounded-lg px-2.5 py-2 text-[12px]">
                <div>{line.blankName}</div>
                <div className="mf-dimmed">
                  {line.colourName || line.colourCode} · {line.size}
                </div>
                <div>{line.qty} units</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
