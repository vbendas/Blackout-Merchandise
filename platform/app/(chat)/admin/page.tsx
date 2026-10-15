import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { firstAdminHref } from '@/lib/admin/nav';

/** /admin has no page of its own: it opens the first admin page this person
 * may see, or the Studio when there is none (an employee whose areas are all
 * worked from the chat, such as Support). */
export default async function AdminIndexPage(): Promise<never> {
  const { actor } = await requireUser();
  redirect(firstAdminHref(actor) ?? '/studio');
}
