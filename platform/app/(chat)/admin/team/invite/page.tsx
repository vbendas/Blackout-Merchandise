import Link from 'next/link';
import { requireStaffPage } from '@/lib/auth';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { InviteForm } from '@/components/admin/team/InviteForm';
import '@/components/admin/team/team.css';

export default async function InviteStaffPage() {
  await requireStaffPage('team', 'manage', { page: '/admin/team/invite' });

  return (
    <>
      <AdminPageHeader
        title="Invite someone"
        lead={
          <Link href="/admin/team" aria-label="Back to Team" className="inline-flex size-11 items-center justify-center rounded-[2px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        }
      />
      <div className="tm">
        <p className="tm-intro">
          They get an email with a link. They sign in with this address and land in the admin with the areas you pick here. You can change their access at any time.
        </p>
        <InviteForm />
      </div>
    </>
  );
}
