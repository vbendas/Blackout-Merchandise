import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREAS,
  LEVELS,
  PRESETS,
  PRESET_IDS,
  STAFF_AREAS,
  PermissionError,
  can,
  describeAccess,
  hasAnyAdminAccess,
  levelsFor,
  matchingPreset,
  normalisePermissions,
  permissionsFromRows,
  presetPermissions,
  requirePermission,
  visibleAreas,
  type Area,
  type Level,
  type PermissionMap,
  type Role,
} from './permissions';

// An independent statement of the rules in Print-Prep-Plan section 9, to
// check can() against for every combination.
const RANK: Record<string, number> = { none: 0, view: 1, work: 2, manage: 3 };
function expected(role: Role, suspended: boolean, have: unknown, area: Area, level: Level): boolean {
  if (role === 'admin') return true; // the owner: everything, team and money included
  if (role !== 'staff') return false; // artists: no admin access
  if (suspended) return false; // a suspended employee: nothing
  if (area === 'team') return false; // team is the owner's alone
  if (level === 'none') return true;
  const held = typeof have === 'string' && have in RANK ? RANK[have] : 0; // unknown values count as none
  return held >= RANK[level];
}

test('can() matches the rules for every role, suspension, held level, area and asked level', () => {
  const held: unknown[] = [undefined, 'none', 'view', 'work', 'manage', 'owner', 'MANAGE', 3, null];
  let checked = 0;
  for (const role of ['artist', 'staff', 'admin'] as const) {
    for (const suspended of [false, true]) {
      for (const area of AREAS) {
        for (const have of held) {
          // Every other area at Manage: access in one area must never leak into another.
          const permissions = Object.fromEntries(AREAS.map((a) => [a, a === area ? have : 'manage'])) as PermissionMap;
          if (have === undefined) delete permissions[area];
          for (const level of LEVELS) {
            const actor = { role, permissions, suspended };
            assert.equal(can(actor, area, level), expected(role, suspended, have, area, level), JSON.stringify({ role, suspended, area, have, level }));
            checked += 1;
          }
        }
      }
    }
  }
  assert.equal(checked, 3 * 2 * AREAS.length * held.length * LEVELS.length);
});

test('a missing map, an empty map and a null map give staff nothing', () => {
  for (const permissions of [undefined, null, {}]) {
    for (const area of AREAS) assert.equal(can({ role: 'staff', permissions }, area, 'view'), false);
  }
});

test('inherited and prototype keys never grant access', () => {
  const inherited = Object.create({ prepress: 'manage', money: 'manage' }) as PermissionMap;
  assert.equal(can({ role: 'staff', permissions: inherited }, 'prepress', 'view'), false);
  const polluted = JSON.parse('{"__proto__": {"production": "manage"}}') as PermissionMap;
  assert.equal(can({ role: 'staff', permissions: polluted }, 'production', 'view'), false);
});

test('the owner can do everything; the role decides, not the map or a suspended flag', () => {
  for (const area of AREAS) {
    assert.equal(can({ role: 'admin' }, area, 'manage'), true);
    assert.equal(can({ role: 'admin', permissions: {} }, area, 'manage'), true);
    // Owners can't be suspended (lib/services/team.ts refuses it), so the flag
    // means nothing on them.
    assert.equal(can({ role: 'admin', suspended: true }, area, 'manage'), true);
  }
});

test('artists and suspended staff can do nothing in the admin', () => {
  assert.equal(can({ role: 'artist' }, 'prepress', 'view'), false);
  assert.equal(can({ role: 'artist', permissions: { prepress: 'manage' } }, 'prepress', 'view'), false);
  assert.equal(can({ role: 'staff', permissions: { prepress: 'manage' }, suspended: true }, 'prepress', 'view'), false);
  assert.equal(hasAnyAdminAccess({ role: 'staff', permissions: { prepress: 'manage' }, suspended: true }), false);
});

test('staff levels include the ones below them', () => {
  const staff = { role: 'staff' as const, permissions: { prepress: 'work' as const } };
  assert.equal(can(staff, 'prepress', 'view'), true);
  assert.equal(can(staff, 'prepress', 'work'), true);
  assert.equal(can(staff, 'prepress', 'manage'), false);
  assert.equal(can(staff, 'production', 'view'), false);
});

test('the team area is owner only, whatever the map says', () => {
  assert.equal(can({ role: 'staff', permissions: { team: 'manage' } }, 'team', 'view'), false);
  assert.deepEqual(visibleAreas({ role: 'staff', permissions: { team: 'manage', money: 'view' } }), ['money']);
});

test('Phase 1 acceptance: Pre-press Work and nothing else sees neither Money nor Team', () => {
  const employee = { role: 'staff' as const, permissions: { prepress: 'work' as const } };
  assert.equal(can(employee, 'prepress', 'work'), true);
  assert.equal(can(employee, 'money', 'view'), false);
  assert.equal(can(employee, 'team', 'view'), false);
  assert.deepEqual(visibleAreas(employee), ['prepress']);
});

test('requirePermission throws a PermissionError naming the area and level', () => {
  assert.throws(() => requirePermission({ role: 'staff', permissions: {} }, 'money', 'view'), PermissionError);
  try {
    requirePermission({ role: 'artist' }, 'prepress', 'work');
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof PermissionError);
    assert.equal(err.area, 'prepress');
    assert.equal(err.level, 'work');
    assert.match(err.message, /Work access to Pre-press/);
  }
  assert.doesNotThrow(() => requirePermission({ role: 'admin' }, 'team', 'manage'));
});

test('normalisePermissions keeps staff areas and known levels only', () => {
  assert.deepEqual(
    normalisePermissions({ prepress: 'work', team: 'manage', money: 'work', bogus: 'manage', production: 'none', runs: 'owner', support: 7 }),
    { prepress: 'work', money: 'view' },
  );
  assert.deepEqual(normalisePermissions(null), {});
  assert.deepEqual(normalisePermissions(['prepress']), {});
  assert.deepEqual(normalisePermissions('prepress'), {});
  assert.deepEqual(normalisePermissions(Object.create({ prepress: 'manage' })), {});
});

test('permissionsFromRows reads staff_permissions rows the same way', () => {
  assert.deepEqual(
    permissionsFromRows([
      { area: 'prepress', level: 'manage' },
      { area: 'team', level: 'manage' },
      { area: 'shops', level: 'nonsense' },
      { area: 'money', level: 'work' },
    ]),
    { prepress: 'manage', money: 'view' },
  );
});

test('presets use staff areas and real levels, never the team, and copies are independent', () => {
  for (const id of PRESET_IDS) {
    const preset = PRESETS[id].permissions as PermissionMap;
    assert.deepEqual(normalisePermissions(preset), preset, id);
    assert.ok(!('team' in preset), id);
    const copy = presetPermissions(id);
    copy.prepress = 'manage';
    assert.notEqual(PRESETS[id].permissions, copy);
    assert.equal(matchingPreset(PRESETS[id].permissions), id);
  }
  assert.equal(matchingPreset({ prepress: 'work' }), null);
});

test('the grid offers None/View/Manage for money and every level elsewhere; team has no row', () => {
  assert.deepEqual(levelsFor('money'), ['none', 'view', 'manage']);
  assert.deepEqual(levelsFor('prepress'), LEVELS);
  assert.ok(!STAFF_AREAS.includes('team'));
  assert.equal(STAFF_AREAS.length, AREAS.length - 1);
});

test('describeAccess lists areas with their level in area order', () => {
  assert.deepEqual(describeAccess({ production: 'view', prepress: 'work', team: 'manage' }), ['Pre-press: Work', 'Production: View']);
  assert.deepEqual(describeAccess(null), []);
});
