import type { TeamInviteView } from '@/lib/services/team';
import { accessLine, formatDay, formatWhen } from '@/components/admin/team/format';
import { InviteActions } from '@/components/admin/team/InviteActions';

const STATUS_WORDS: Record<TeamInviteView['status'], string> = {
  pending: 'Waiting',
  expired: 'Expired',
  revoked: 'Withdrawn',
  accepted: 'Accepted',
};

/** The latest invites, newest first, with what can still be done to each. */
export function InvitesTable({ invites }: { invites: TeamInviteView[] }) {
  if (invites.length === 0) return <p className="tm-dim">No invites yet.</p>;
  return (
    <div className="tm-table-wrap">
      <table className="tm-table">
        <thead>
          <tr>
            <th scope="col">Email</th>
            <th scope="col">Access</th>
            <th scope="col">Sent</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id}>
              <td>
                <span className="block font-medium">{invite.email}</span>
                {invite.title ? <span className="tm-dim block">{invite.title}</span> : null}
              </td>
              <td className="max-w-[360px]">{accessLine('staff', invite.permissions)}</td>
              <td className="tm-mono tm-dim whitespace-nowrap">{formatWhen(invite.invitedAt)}</td>
              <td className={invite.status === 'pending' ? 'font-semibold' : 'tm-dim'}>
                {STATUS_WORDS[invite.status]}
                {invite.status === 'pending' ? <span className="tm-dim block font-normal">until {formatDay(invite.expiresAt)}</span> : null}
              </td>
              <td>
                {invite.status === 'pending' || invite.status === 'expired' ? (
                  <InviteActions inviteId={invite.id} canWithdraw={invite.status === 'pending'} />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
