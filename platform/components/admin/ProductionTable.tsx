'use client';

import { useState, useTransition } from 'react';
import { advanceProductionAction, setTrackingAction } from '@/app/(chat)/admin/actions';
import { StatusPill } from '@/components/cards/StatusPill';
import { jobSheetPath, type JobSheetLink } from '@/lib/print/job-sheet-link';

export interface ProductionRow {
  orderId: string;
  reference: string;
  storeName: string;
  itemsSummary: string;
  placedAt: string;
  productionStatus: string;
  grossCents: number;
  /** the designs the order prints; each one's job sheet covers every garment that uses it */
  designs: JobSheetLink[];
}

const NEXT_LABEL: Record<string, string> = {
  queued: 'Start printing',
  printing: 'Mark packed',
  packed: 'Mark shipped',
  shipped: 'Mark delivered',
};

const TH = 'px-3 py-3 text-left font-mono text-[11px] font-normal tracking-[0.16em] uppercase opacity-50';
const BUTTON = 'mf-pill mf-pill-sm min-h-11';

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-GB', { style: 'currency', currency: 'EUR' });
}

/** 'Job sheet', or 'Job sheet · Underwriter tee' when the order prints several designs. */
function sheetLabel(design: JobSheetLink, several: boolean): string {
  if (!several) return 'Job sheet';
  const name = design.name.length > 22 ? `${design.name.slice(0, 21)}…` : design.name;
  return `Job sheet · ${name}`;
}

function TrackingForm({ orderId, onDone, onError }: { orderId: string; onDone: () => void; onError: (message: string) => void }) {
  const [carrier, setCarrier] = useState('');
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            const result = await setTrackingAction(orderId, carrier, code);
            if (result.error) onError(result.error);
            else onDone();
          } catch {
            onError('Could not save tracking.');
          }
        });
      }}
    >
      <label className="sr-only" htmlFor={`carrier-${orderId}`}>
        Carrier
      </label>
      <input
        id={`carrier-${orderId}`}
        className="mf-field h-11 w-[104px]"
        placeholder="Carrier"
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        required
      />
      <label className="sr-only" htmlFor={`code-${orderId}`}>
        Tracking code
      </label>
      <input
        id={`code-${orderId}`}
        className="mf-field h-11 w-[140px]"
        placeholder="Tracking code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />
      <button type="submit" className={BUTTON} disabled={pending}>
        {pending ? 'Saving' : 'Save'}
      </button>
    </form>
  );
}

/** The production queue. `canWork`: the person may move orders along and add
 * tracking (Production, Work); without it the table is read only. */
export function ProductionTable({ rows, canWork }: { rows: ProductionRow[]; canWork: boolean }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [trackingOpenId, setTrackingOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function advanceRow(orderId: string) {
    setError(null);
    setPendingId(orderId);
    startTransition(async () => {
      try {
        const result = await advanceProductionAction(orderId);
        if (result.error) setError(result.error);
      } catch {
        setError('Could not move this order along.');
      } finally {
        setPendingId(null);
      }
    });
  }

  if (rows.length === 0) {
    return <p className="opacity-80">Nothing in production right now.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="rounded-[2px] px-4 py-3 [border:var(--hairline-strong)]">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto [border-top:var(--hairline)]">
        <table className="w-full min-w-[860px] border-collapse text-[14px]">
          <thead>
            <tr>
              <th scope="col" className={`${TH} pl-0`}>Order</th>
              <th scope="col" className={TH}>Shop</th>
              <th scope="col" className={TH}>Items</th>
              <th scope="col" className={TH}>Placed</th>
              <th scope="col" className={`${TH} text-right`}>Gross</th>
              <th scope="col" className={TH}>Status</th>
              <th scope="col" className={`${TH} pr-0`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.orderId} className="align-top [border-top:var(--hairline)]">
                <td className="py-3 pr-3 font-mono text-[13px] whitespace-nowrap">{row.reference}</td>
                <td className="px-3 py-3">{row.storeName}</td>
                <td className="px-3 py-3 opacity-80">{row.itemsSummary}</td>
                <td className="px-3 py-3 font-mono text-[13px] whitespace-nowrap opacity-80">{formatDate(row.placedAt)}</td>
                <td className="px-3 py-3 text-right font-mono text-[13px] whitespace-nowrap">{formatCents(row.grossCents)}</td>
                <td className="px-3 py-3">
                  <StatusPill label={row.productionStatus} tone={row.productionStatus === 'shipped' || row.productionStatus === 'delivered' ? 'positive' : 'neutral'} />
                </td>
                <td className="py-3 pl-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {canWork && row.productionStatus === 'packed'
                      ? trackingOpenId === row.orderId
                        ? <TrackingForm orderId={row.orderId} onDone={() => setTrackingOpenId(null)} onError={setError} />
                        : (
                            <button type="button" className={BUTTON} onClick={() => setTrackingOpenId(row.orderId)}>
                              Add tracking
                            </button>
                          )
                      : null}
                    {canWork && row.productionStatus in NEXT_LABEL ? (
                      <button
                        type="button"
                        className={`${BUTTON} mf-pill-primary`}
                        disabled={pendingId === row.orderId}
                        onClick={() => advanceRow(row.orderId)}
                      >
                        {pendingId === row.orderId ? 'Saving' : NEXT_LABEL[row.productionStatus]}
                      </button>
                    ) : null}
                    {row.designs.map((design) => (
                      <a key={design.designId} className={BUTTON} href={jobSheetPath(design.designId)} download>
                        {sheetLabel(design, row.designs.length > 1)}
                      </a>
                    ))}
                    <a className={BUTTON} href={`/studio?prompt=${encodeURIComponent(`Open order ${row.orderId}`)}`}>
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
