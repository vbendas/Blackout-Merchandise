// Staff access by area (Documentation/Dev/Print-Prep-Plan.md section 9).
// The owner ('admin') can do everything; an employee ('staff') gets one level
// per area; artists get no admin access. Client-safe: no server imports here,
// so pages and components can use the labels and `can()` too. Loading an
// actor's permissions from the database lives in lib/services/team.ts; the
// page, action and route gates that call `can()` live in lib/auth.ts.

export const AREAS = [
  'prepress',
  'production',
  'shop_orders',
  'runs',
  'support',
  'applications',
  'shops',
  'catalogue',
  'money',
  'team',
] as const;
export type Area = (typeof AREAS)[number];

/** Each level includes the ones before it. */
export const LEVELS = ['none', 'view', 'work', 'manage'] as const;
export type Level = (typeof LEVELS)[number];

export type Role = 'artist' | 'staff' | 'admin';

/** An employee's access: a missing area means 'none'. */
export type PermissionMap = Partial<Record<Area, Level>>;

/** Who is acting, as every permission check sees them. */
export interface Actor {
  userId: string;
  role: Role;
  /** staff only; ignored for the owner and for artists */
  permissions?: PermissionMap | null;
  /** a suspended staff account has no access at all */
  suspended?: boolean;
}

/** The fields `can()` reads. A ToolContext and a SessionInfo's actor both fit. */
export type AccessHolder = Pick<Actor, 'role' | 'permissions' | 'suspended'>;

export const AREA_LABELS: Record<Area, string> = {
  prepress: 'Pre-press',
  production: 'Production',
  shop_orders: 'Shop orders',
  runs: 'Runs',
  support: 'Support',
  applications: 'Applications',
  shops: 'Shops and artists',
  catalogue: 'Catalogue and pricing',
  money: 'Money',
  team: 'Team',
};

export const LEVEL_LABELS: Record<Level, string> = {
  none: 'None',
  view: 'View',
  work: 'Work',
  manage: 'Manage',
};

/** What "Work" and "Manage" allow in each area, for the /admin/team grid. */
export const AREA_LEVEL_HELP: Record<Area, { work: string; manage: string }> = {
  prepress: {
    work: 'Approve packs, upload corrected PSDs, enter Pantone codes, run again, send back to the artist',
    manage: 'Engine defaults and the ink system profile',
  },
  production: { work: 'Advance production, add tracking, draft supplier orders', manage: 'Production settings' },
  shop_orders: { work: 'Handle order issues', manage: 'Refunds and cancellations' },
  runs: { work: 'Prepare quotes and proofs', manage: 'Run prices and discounts' },
  support: { work: 'Reply to, assign and close tickets', manage: 'Support settings' },
  applications: { work: 'Approve or reject artists', manage: 'Invite codes' },
  shops: { work: 'Help with products and domains', manage: 'Suspend a shop' },
  catalogue: { work: 'Edit blank details', manage: 'Prices and print services' },
  money: { work: 'View only', manage: 'Payout and Stripe settings' },
  team: { work: 'Owner only', manage: 'Owner only' },
};

/** Areas only the owner can ever use, whatever an employee's map says. */
export const OWNER_ONLY_AREAS: readonly Area[] = ['team'];

/** Areas where 'work' adds nothing over 'view' (the grid offers None/View/Manage). */
export const VIEW_OR_MANAGE_AREAS: readonly Area[] = ['money'];

/** The areas an employee can be given: the rows of the /admin/team grid. */
export const STAFF_AREAS: readonly Area[] = AREAS.filter((area) => !OWNER_ONLY_AREAS.includes(area));

/** Starting points for a new employee; the owner adjusts each person after. */
export const PRESETS = {
  prepress: { label: 'Pre-press', permissions: { prepress: 'work', production: 'view', runs: 'view' } },
  production: { label: 'Production', permissions: { production: 'work', prepress: 'view', shop_orders: 'view', runs: 'view' } },
  support: { label: 'Support', permissions: { support: 'work', shop_orders: 'view', runs: 'view', shops: 'view', applications: 'view' } },
  operations_lead: {
    label: 'Operations lead',
    permissions: {
      prepress: 'manage',
      production: 'manage',
      shop_orders: 'work',
      runs: 'work',
      support: 'work',
      applications: 'work',
      shops: 'work',
      catalogue: 'view',
      money: 'view',
    },
  },
} as const satisfies Record<string, { label: string; permissions: PermissionMap }>;
export type PresetId = keyof typeof PRESETS;

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

export function isArea(value: string): value is Area {
  return (AREAS as readonly string[]).includes(value);
}

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

export function isPresetId(value: string): value is PresetId {
  return Object.prototype.hasOwnProperty.call(PRESETS, value);
}

export function levelRank(level: Level): number {
  return LEVELS.indexOf(level);
}

/** The level a map gives an area. Own properties only, and anything that
 * isn't a known level reads as 'none', so a stray or malformed value (a
 * hand-edited row, an old JSON column) can never grant access. */
function levelIn(permissions: PermissionMap | null | undefined, area: Area): Level {
  if (!permissions || typeof permissions !== 'object') return 'none';
  if (!Object.prototype.hasOwnProperty.call(permissions, area)) return 'none';
  const level: unknown = permissions[area];
  return typeof level === 'string' && isLevel(level) ? level : 'none';
}

/** The single access check. Owner: always. Staff: their level for the area
 * must reach `level`, and never in an owner-only area. Artists and suspended
 * staff: never. */
export function can(actor: AccessHolder, area: Area, level: Level = 'view'): boolean {
  if (actor.role === 'admin') return true;
  if (actor.role !== 'staff' || actor.suspended) return false;
  if (OWNER_ONLY_AREAS.includes(area)) return false;
  if (level === 'none') return true;
  return levelRank(levelIn(actor.permissions, area)) >= levelRank(level);
}

/** True when the actor can see at least one admin area (owner or staff). */
export function hasAnyAdminAccess(actor: AccessHolder): boolean {
  return AREAS.some((area) => can(actor, area, 'view'));
}

/** The owner: every area, the team included. */
export function isOwner(actor: Pick<Actor, 'role'>): boolean {
  return actor.role === 'admin';
}

/** Owner or employee: the people who work in the admin rather than a shop. */
export function isTeamRole(role: Role): role is 'admin' | 'staff' {
  return role === 'admin' || role === 'staff';
}

export class PermissionError extends Error {
  readonly area: Area;
  readonly level: Level;
  constructor(area: Area, level: Level) {
    super(`You don't have ${LEVEL_LABELS[level]} access to ${AREA_LABELS[area]}.`);
    this.name = 'PermissionError';
    this.area = area;
    this.level = level;
  }
}

/** Throws a PermissionError unless `can()` allows it. Services call this first. */
export function requirePermission(actor: AccessHolder, area: Area, level: Level): void {
  if (!can(actor, area, level)) throw new PermissionError(area, level);
}

/** The levels the /admin/team grid offers for an area. */
export function levelsFor(area: Area): readonly Level[] {
  return VIEW_OR_MANAGE_AREAS.includes(area) ? (['none', 'view', 'manage'] as const) : LEVELS;
}

/** A clean map from untrusted input (a form, a JSON column, an invite):
 * staff areas and known levels only, 'none' dropped (a missing area is
 * 'none'), and Work in a view-or-manage area read as View. */
export function normalisePermissions(input: unknown): PermissionMap {
  const out: PermissionMap = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const area of STAFF_AREAS) {
    if (!Object.prototype.hasOwnProperty.call(input, area)) continue;
    const raw: unknown = (input as Record<string, unknown>)[area];
    if (typeof raw !== 'string' || !isLevel(raw) || raw === 'none') continue;
    out[area] = raw === 'work' && VIEW_OR_MANAGE_AREAS.includes(area) ? 'view' : raw;
  }
  return out;
}

/** staff_permissions rows (one per area) as a clean map. */
export function permissionsFromRows(rows: readonly { area: string; level: string }[]): PermissionMap {
  const raw: Record<string, string> = {};
  for (const row of rows) raw[row.area] = row.level;
  return normalisePermissions(raw);
}

/** A copy of a preset's map, ready to adjust. */
export function presetPermissions(id: PresetId): PermissionMap {
  return { ...PRESETS[id].permissions };
}

/** The preset a map matches exactly, if any (to label a person's access). */
export function matchingPreset(permissions: PermissionMap | null | undefined): PresetId | null {
  const clean = normalisePermissions(permissions);
  for (const id of PRESET_IDS) {
    const preset = normalisePermissions(PRESETS[id].permissions);
    if (STAFF_AREAS.every((area) => (preset[area] ?? 'none') === (clean[area] ?? 'none'))) return id;
  }
  return null;
}

/** The areas the actor can at least see, in AREAS order. */
export function visibleAreas(actor: AccessHolder): Area[] {
  return AREAS.filter((area) => can(actor, area, 'view'));
}

/** "Pre-press: Work", one per area with access, in AREAS order. */
export function describeAccess(permissions: PermissionMap | null | undefined): string[] {
  const clean = normalisePermissions(permissions);
  return STAFF_AREAS.filter((area) => clean[area]).map((area) => `${AREA_LABELS[area]}: ${LEVEL_LABELS[clean[area] as Level]}`);
}
