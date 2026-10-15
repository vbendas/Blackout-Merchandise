'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { placeSupplierOrderAction, receiveSupplierOrderAction, type AdminActionResult } from '@/app/(chat)/admin/actions';
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
  return (cents / 100).toLocaleString('en-GB', { style: 'currency', currency: 'EUR' });
}

const RECEIVABLE = new Set(['placed', 'confirmed', 'shipped']);
const BUTTON = 'mf-pill mf-pill-sm mf-pill-primary min-h-11';

/** Supplier purchase orders. `canWork`: the person may place and receive
 * them (Production, Work); without it the list is read only. */
export function SupplierTable({ orders, canWork }: { orders: SupplierOrderRow[]; canWork: boolean }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, action: (id: string) => Promise<AdminActionResult>) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        const result = await action(id);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError('That did not go through. Please try again.');
      } finally {
        setPendingId(null);
      }
    });
  }

  if (orders.length === 0) {
    return <p className="opacity-80">No supplier orders yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="rounded-[2px] px-4 py-3 [border:var(--hairline-strong)]">
          {error}
        </p>
      ) : null}
      {orders.map((order) => (
        <section key={order.id} aria-label={order.poNumber} className="rounded-[2px] p-4 [border:var(--hairline)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-mono text-[13px]">{order.poNumber}</h2>
              <p className="text-[13px] opacity-50">
                {order.supplier} · {order.totalUnits} units · {formatCents(order.totalCostCents)} · {order.forOrders.length} order{order.forOrders.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill label={order.status} tone={order.status === 'received' ? 'positive' : order.status === 'cancelled' ? 'dim' : 'neutral'} />
              {canWork && order.status === 'draft' ? (
                <button type="button" className={BUTTON} disabled={pendingId === order.id} onClick={() => run(order.id, placeSupplierOrderAction)}>
                  {pendingId === order.id ? 'Saving' : 'Place'}
                </button>
              ) : null}
              {canWork && RECEIVABLE.has(order.status) ? (
                <button type="button" className={BUTTON} disabled={pendingId === order.id} onClick={() => run(order.id, receiveSupplierOrderAction)}>
                  {pendingId === order.id ? 'Saving' : 'Receive'}
                </button>
              ) : null}
            </div>
          </div>
          <ul className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {order.lines.map((line) => (
              <li key={`${line.blankCode}-${line.colourCode}-${line.size}`} className="rounded-[2px] px-3 py-2 text-[13px] [border:var(--hairline)]">
                <div>{line.blankName}</div>
                <div className="opacity-50">
                  {line.colourName || line.colourCode} · {line.size}
                </div>
                <div>{line.qty} units</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
