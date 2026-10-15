import Link from 'next/link';
import { requireStaffPage } from '@/lib/auth';
import { listTeam } from '@/lib/services/team';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { InvitesTable } from '@/components/admin/team/InvitesTable';
import { TeamTabs } from '@/components/admin/team/TeamTabs';
import '@/components/admin/team/team.css';

export default async function TeamInvitesPage() {
  const { actor } = await requireStaffPage('team', 'manage', { page: '/admin/team/invites' });
  const { invites } = await listTeam(actor);
  const pending = invites.filter((invite) => invite.status === 'pending').length;

  return (
    <>
      <AdminPageHeader title="Team" meta={`${pending} waiting`}>
        <Link href="/admin/team/invite" className="mf-pill mf-pill-primary min-h-11">
          Invite someone
        </Link>
      </AdminPageHeader>
      <TeamTabs current="invites" pendingInvites={pending} />
      <div className="tm">
        <p className="tm-intro">An invite works once, for 7 days, for the person who signs in with that address. Sending it again makes a new link.</p>
        <InvitesTable invites={invites} />
      </div>
    </>
  );
}
