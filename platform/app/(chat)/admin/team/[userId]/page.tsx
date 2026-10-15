import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaffPage } from '@/lib/auth';
import { AREA_LABELS } from '@/lib/auth/permissions';
import { countOwners, getTeamMember, listActivity } from '@/lib/services/team';
import { staffActionTools } from '@/lib/tools/registry';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ActivityList } from '@/components/admin/team/ActivityList';
import { MemberAccessForm } from '@/components/admin/team/MemberAccessForm';
import { MemberActions } from '@/components/admin/team/MemberActions';
import { formatWhen } from '@/components/admin/team/format';
import '@/components/admin/team/team.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeamMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { actor } = await requireStaffPage('team', 'manage', { page: `/admin/team/${userId}`, itemType: 'user', itemId: userId });
  if (!UUID.test(userId)) notFound();

  const member = await getTeamMember(actor, userId);
  if (!member) notFound();

  const tools = staffActionTools();
  const [owners, activity] = await Promise.all([
    countOwners(actor),
    listActivity(actor, { userId, limit: 50, toolNames: tools.map((tool) => tool.name) }),
  ]);
  const areaLabels = new Map(tools.map((tool) => [tool.name, AREA_LABELS[tool.area]]));
  const self = member.userId === actor.userId;
  const isOwner = member.role === 'admin';

  return (
    <>
      <AdminPageHeader
        title={member.name}
        meta={isOwner ? 'Owner' : member.suspended ? 'Staff · paused' : member.title || 'Staff'}
        lead={
          <Link href="/admin/team" aria-label="Back to Team" className="inline-flex size-11 items-center justify-center rounded-[2px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        }
      />
      <div className="tm">
        <section className="tm-section" aria-labelledby="member-h">
          <h2 id="member-h" className="tm-h">
            Account
          </h2>
          <dl className="tm-facts">
            <dt>Email</dt>
            <dd className="tm-mono text-[13px]">{member.email}</dd>
            <dt>Role</dt>
            <dd>{isOwner ? 'Owner: every area, the team and money included' : 'Staff: the areas below'}</dd>
            <dt>Status</dt>
            <dd className={member.suspended ? 'font-semibold' : undefined}>{member.suspended ? 'Paused: no access until resumed' : 'Active'}</dd>
            <dt>Last active</dt>
            <dd className="tm-mono text-[13px]">{formatWhen(member.lastActiveAt)}</dd>
          </dl>
          {self ? (
            <p className="tm-dim">This is you. Another owner can change your role.</p>
          ) : (
            <MemberActions userId={member.userId} name={member.name} role={member.role} suspended={member.suspended} isLastOwner={isOwner && owners <= 1} />
          )}
        </section>

        <section className="tm-section" aria-labelledby="access-h">
          <h2 id="access-h" className="tm-h">
            Access
          </h2>
          {isOwner ? (
            <p className="tm-intro">Owners have every area. To give someone less, make them staff and choose their areas.</p>
          ) : (
            <MemberAccessForm userId={member.userId} initialPermissions={member.permissions} initialTitle={member.title ?? ''} />
          )}
        </section>

        <section className="tm-section" aria-labelledby="activity-h">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="activity-h" className="tm-h">
              Activity
            </h2>
            <Link href={`/admin/team/activity?userId=${member.userId}`} className="mf-ulink inline-flex min-h-11 items-center">
              All activity
            </Link>
          </div>
          <ActivityList entries={activity} showActor={false} areaLabels={areaLabels} />
        </section>
      </div>
    </>
  );
}
