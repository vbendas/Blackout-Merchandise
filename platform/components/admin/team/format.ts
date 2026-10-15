// Words and dates for the team pages. Client-safe.
import { AREA_LABELS, LEVEL_LABELS, STAFF_AREAS, isArea, normalisePermissions, type PermissionMap, type Role } from '@/lib/auth/permissions';

const TIME_ZONE = 'Europe/Madrid';

/** '15 Oct, 13:40' in the shop's time; '–' for nothing. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '–';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '–';
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TIME_ZONE });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
  return `${day}, ${time}`;
}

/** '22 Oct 2026'. */
export function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });
}

/** One line for a person's access, e.g. 'Pre-press Work · Production View'. */
export function accessLine(role: Role, permissions: PermissionMap | null | undefined): string {
  if (role === 'admin') return 'Everything, the team and money included';
  const clean = normalisePermissions(permissions);
  const parts = STAFF_AREAS.filter((area) => clean[area]).map((area) => `${AREA_LABELS[area]} ${LEVEL_LABELS[clean[area]!]}`);
  return parts.length > 0 ? parts.join(' · ') : 'No areas yet';
}

/** An activity row's area as a label ('' when it has none). */
export function activityAreaLabel(area: string): string {
  return isArea(area) ? AREA_LABELS[area] : '';
}
