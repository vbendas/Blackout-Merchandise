import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { DEV_BYPASS, requireUser } from '@/lib/auth';
import { hasAnyAdminAccess } from '@/lib/auth/permissions';
import { adminNavFor } from '@/lib/admin/nav';
import { AdminShell } from '@/components/admin/AdminShell';

// The admin frame: the sidebar of the pages this person may open (the
// owner sees every one, an employee only their areas) around the page.
// Anyone without admin access goes back to the Studio. This is not the gate
// for the pages: each page and action checks its own area and level
// (requireStaffPage, requireStaffAction in lib/auth.ts), because a layout
// doesn't stop a page rendering on its own.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { actor } = await requireUser();
  if (!hasAnyAdminAccess(actor)) redirect('/studio');

  const links = adminNavFor(actor).map(({ href, label }) => ({ href, label }));
  return (
    <AdminShell links={links} devSwitch={DEV_BYPASS}>
      {children}
    </AdminShell>
  );
}
