import Form from 'next/form';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { requireStaffPage } from '@/lib/auth';
import { listPrepressQueue } from '@/lib/services/prepress';
import { cleanSearch, parseTab, PREPRESS_TABS, queueHref } from '@/components/admin/prepress/format';
import { QueueTable } from '@/components/admin/prepress/QueueTable';
import { TabNav } from '@/components/admin/prepress/TabNav';
// AdminPageHeader's count is drawn with .mf-meta, which lives in studio.css.
import '@/components/studio/studio.css';
import '@/components/admin/prepress/prepress.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pre-press' };

/** Tabs that name work still to do show how much; Approved is a record, not a count to watch. */
const COUNTED = new Set(['waiting', 'being_fixed', 'sent_back']);

/** The pre-press queue (Plan section 8): the packs an order needs, waiting for a
 * person to check them before production can start. Pre-press "View" or more.
 * The tab and the search live in the address (?tab=approved&q=crow), so a view can
 * be shared and Back works. */
export default async function PrepressQueuePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { actor } = await requireStaffPage('prepress', 'view', { page: '/admin/prepress' });
  const tab = parseTab(params.tab);
  const search = cleanSearch(params.q);

  const { rows, counts } = await listPrepressQueue(actor, { tab, search: search || undefined });

  return (
    <>
      <AdminPageHeader title="Pre-press" meta={`${counts.waiting} waiting`}>
        <Form action="/admin/prepress" replace prefetch={false} role="search" className="pp-search">
          {tab !== 'waiting' ? <input type="hidden" name="tab" value={tab} /> : null}
          <label htmlFor="pp-search" className="sr-only">
            Search designs and runs
          </label>
          {/* keyed on the search, so a link that clears it clears the box too */}
          <input
            key={search}
            id="pp-search"
            className="pp-field"
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search designs and runs"
            autoComplete="off"
            enterKeyHint="search"
          />
        </Form>
      </AdminPageHeader>

      <div className="pp-page">
        <TabNav
          label="Pack status"
          items={PREPRESS_TABS.map((entry) => ({
            href: queueHref(entry.id, search),
            label: entry.label,
            count: COUNTED.has(entry.id) ? counts[entry.id] : null,
            current: entry.id === tab,
          }))}
        />
        <div className="pp">
          <p className="pp-lede">A pack arrives here when the first order needs it. Production can’t start until a person approves it.</p>
          <QueueTable rows={rows} tab={tab} search={search} now={new Date()} />
        </div>
      </div>
    </>
  );
}
