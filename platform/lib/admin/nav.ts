// The admin sidebar entries. Each one names the area and level its page asks
// for (the page's own requireStaffPage call must ask for the same, which
// lib/admin/nav.test.ts checks), and the admin layout shows only the
// entries `can(actor, area, level)` allows (lib/auth/permissions.ts). New
// admin pages add their entry here. Client-safe.
import { can, type AccessHolder, type Area, type Level } from '@/lib/auth/permissions';

export interface AdminNavEntry {
  href: string;
  label: string;
  area: Area;
  /** the level the page needs; 'view' when not given */
  level?: Level;
}

export const ADMIN_NAV: AdminNavEntry[] = [
  { href: '/admin/prepress', label: 'Pre-press', area: 'prepress' },
  { href: '/admin/production', label: 'Production', area: 'production' },
  { href: '/admin/supplier', label: 'Supplier orders', area: 'production' },
  { href: '/admin/ink-system', label: 'Ink system', area: 'prepress' },
  { href: '/admin/pricing', label: 'Pricing', area: 'catalogue' },
  { href: '/admin/team', label: 'Team', area: 'team', level: 'manage' },
];

/** The entries this person may open, in sidebar order. */
export function adminNavFor(actor: AccessHolder): AdminNavEntry[] {
  return ADMIN_NAV.filter((entry) => can(actor, entry.area, entry.level ?? 'view'));
}

/** Where /admin sends this person: their first page, or null when they have
 * no admin page at all. */
export function firstAdminHref(actor: AccessHolder): string | null {
  return adminNavFor(actor)[0]?.href ?? null;
}
