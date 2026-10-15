import Link from 'next/link';
import { requireStaffPage } from '@/lib/auth';
import { AREA_LABELS } from '@/lib/auth/permissions';
import { listActivity, listTeam } from '@/lib/services/team';
import { staffActionTools } from '@/lib/tools/registry';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ActivityList } from '@/components/admin/team/ActivityList';
import { TeamTabs } from '@/components/admin/team/TeamTabs';
import '@/components/admin/team/team.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() ? first.trim().slice(0, 200) : undefined;
}

/** Everything the team did, newest first: per person (the dropdown) or per
 * item (other pages link here with ?itemType=&itemId=, e.g. a pack's history). */
export default async function TeamActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { actor } = await requireStaffPage('team', 'manage', { page: '/admin/team/activity' });
  const params = await searchParams;
  const userId = one(params.userId);
  const itemType = one(params.itemType);
  const itemId = one(params.itemId);
  const person = userId && UUID.test(userId) ? userId : undefined;

  const tools = staffActionTools();
  const [{ members, invites }, entries] = await Promise.all([
    listTeam(actor),
    listActivity(actor, { userId: person, itemType, itemId, limit: 100, toolNames: tools.map((tool) => tool.name) }),
  ]);
  const areaLabels = new Map(tools.map((tool) => [tool.name, AREA_LABELS[tool.area]]));
  const pending = invites.filter((invite) => invite.status === 'pending').length;

  return (
    <>
      <AdminPageHeader title="Team" meta={`${entries.length} entries`} />
      <TeamTabs current="activity" pendingInvites={pending} />
      <div className="tm">
        <form method="get" className="tm-filters" aria-label="Filter activity">
          <label className="tm-field">
            <span className="tm-dim">Person</span>
            <select name="userId" defaultValue={person ?? ''} className="mf-field mf-select min-w-[220px]">
              <option value="">Everyone</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          {itemType && itemId ? (
            <>
              <input type="hidden" name="itemType" value={itemType} />
              <input type="hidden" name="itemId" value={itemId} />
            </>
          ) : null}
          <button type="submit" className="tm-btn">
            Show
          </button>
        </form>
        {itemType && itemId ? (
          <p className="tm-intro">
            Activity on {itemType.replace(/_/g, ' ')} <span className="tm-mono text-[13px]">{itemId}</span>.{' '}
            <Link href={person ? `/admin/team/activity?userId=${person}` : '/admin/team/activity'} className="mf-ulink inline-flex min-h-11 items-center">
              Show all
            </Link>
          </p>
        ) : null}
        <ActivityList entries={entries} areaLabels={areaLabels} />
      </div>
    </>
  );
}
