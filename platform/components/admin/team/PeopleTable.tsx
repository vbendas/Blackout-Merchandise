import Link from 'next/link';
import type { TeamMemberView } from '@/lib/services/team';
import { accessLine, formatWhen } from '@/components/admin/team/format';

/** Everyone on the team: owners first, then employees. */
export function PeopleTable({ members, selfId }: { members: TeamMemberView[]; selfId: string }) {
  return (
    <div className="tm-table-wrap">
      <table className="tm-table">
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Role</th>
            <th scope="col">Access</th>
            <th scope="col">Status</th>
            <th scope="col">Last active</th>
            <th scope="col">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId}>
              <td>
                <span className="block font-medium">
                  {member.name}
                  {member.userId === selfId ? <span className="tm-dim"> (you)</span> : null}
                </span>
                <span className="tm-mono tm-dim block text-[11px]">{member.email}</span>
              </td>
              <td>{member.role === 'admin' ? 'Owner' : member.title || 'Staff'}</td>
              <td className="max-w-[360px]">{accessLine(member.role, member.permissions)}</td>
              <td className={member.suspended ? 'font-semibold' : 'tm-dim'}>{member.suspended ? 'Paused' : 'Active'}</td>
              <td className="tm-mono tm-dim whitespace-nowrap">{formatWhen(member.lastActiveAt)}</td>
              <td>
                <Link href={`/admin/team/${member.userId}`} className="tm-btn" aria-label={`Open ${member.name}`}>
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
