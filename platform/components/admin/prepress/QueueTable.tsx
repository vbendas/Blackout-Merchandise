import Link from 'next/link';
import type { PrepressQueueRow, PrepressTab } from '@/lib/services/prepress';
import { formatWaiting, PREPRESS_TABS } from './format';
import { PrintImage } from './PrintImage';

const STATUS_WORDS: Partial<Record<PrepressQueueRow['auditStatus'], string>> = {
  approved: 'Approved',
  sent_back: 'Sent back',
  being_fixed: 'Being fixed',
};

const EMPTY: Record<PrepressTab, string> = {
  waiting: 'Nothing is waiting. A pack arrives here when the first order needs it.',
  being_fixed: 'Nothing is being fixed.',
  approved: 'No packs have been approved yet.',
  sent_back: 'No packs have been sent back.',
};

/** The queue of packs: one row each, with a way in. On the two tabs where a pack
 * is still open the last column counts how long it has waited; on the others a
 * running count would be meaningless, so it says where the pack ended up. The
 * table scrolls sideways on a narrow screen instead of squeezing. */
export function QueueTable({ rows, tab, search, now }: { rows: PrepressQueueRow[]; tab: PrepressTab; search: string; now: Date }) {
  const tabLabel = PREPRESS_TABS.find((entry) => entry.id === tab)?.label ?? 'Waiting';
  if (rows.length === 0) {
    return <p className="pp-empty">{search ? `No packs match “${search}”.` : EMPTY[tab]}</p>;
  }

  const open = tab === 'waiting' || tab === 'being_fixed';
  return (
    <div className="pp-scroll" role="region" aria-label="Pre-press queue" tabIndex={0}>
      <table className="pp-table pp-table-queue">
        <caption className="sr-only">Packs: {tabLabel.toLowerCase()}</caption>
        <thead>
          <tr>
            <th scope="col">Design</th>
            <th scope="col">File</th>
            <th scope="col">Screens</th>
            <th scope="col">Method</th>
            <th scope="col">Checks</th>
            <th scope="col">Needed for</th>
            <th scope="col">{open ? 'Waiting' : 'Status'}</th>
            <th scope="col">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.packId}>
              <td>
                <div className="pp-design">
                  {row.thumbUrl ? (
                    <PrintImage src={row.thumbUrl} alt="" className="pp-thumb" />
                  ) : (
                    <span aria-hidden="true" className="pp-thumb pp-thumb-initials">
                      {row.initials}
                    </span>
                  )}
                  <span>
                    <span className="pp-name">{row.designName}</span>
                    <span className="pp-shop">{row.shopName}</span>
                  </span>
                </div>
              </td>
              <td>
                <span>{row.fileLabel}</span>
                <span className="pp-sub">{row.garmentsLabel}</span>
              </td>
              <td className="pp-mono">{row.screensLabel}</td>
              <td>{row.methodLabel}</td>
              <td>
                <span className="pp-summary">
                  <span aria-hidden="true" className="pp-dot" data-state={row.checks.state} />
                  {row.checks.label}
                </span>
              </td>
              <td>{row.neededForLabel}</td>
              <td className="pp-mono pp-soft">
                {open ? <time dateTime={row.waitingSince}>{formatWaiting(row.waitingSince, now)}</time> : (STATUS_WORDS[row.auditStatus] ?? tabLabel)}
              </td>
              <td>
                <Link href={`/admin/prepress/${row.packId}`} className="pp-btn pp-btn-sm">
                  Open
                  <span className="sr-only">
                    {' '}
                    {row.designName}, {row.fileLabel}
                  </span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
