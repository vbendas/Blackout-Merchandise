import Link from 'next/link';
import { requireStaffPage } from '@/lib/auth';
import { listTeam } from '@/lib/services/team';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PeopleTable } from '@/components/admin/team/PeopleTable';
import { TeamTabs } from '@/components/admin/team/TeamTabs';
import '@/components/admin/team/team.css';

export default async function TeamPage() {
  const { actor } = await requireStaffPage('team', 'manage', { page: '/admin/team' });
  const { members, invites } = await listTeam(actor);
  const pending = invites.filter((invite) => invite.status === 'pending').length;

  return (
    <>
      <AdminPageHeader title="Team" meta={`${members.length} ${members.length === 1 ? 'person' : 'people'}`}>
        <Link href="/admin/team/invite" className="mf-pill mf-pill-primary min-h-11">
          Invite someone
        </Link>
      </AdminPageHeader>
      <TeamTabs current="people" pendingInvites={pending} />
      <div className="tm">
        <p className="tm-intro">
          Each person gets their own access, area by area. A change counts from their next click; removing someone ends their access at once.
        </p>
        <PeopleTable members={members} selfId={actor.userId} />
      </div>
    </>
  );
}
