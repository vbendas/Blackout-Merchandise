// The tool registry hands each caller only the tools their role and access
// allow (Print-Prep-Plan section 9). These tests fail when a staff tool has
// no area and level, when the access map drifts, or when filtering lets a
// tool through that the caller can't use.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestDb, type TestDb } from '../../scripts/test/pglite';
import { AREAS, PRESETS, can, type AccessHolder, type PermissionMap } from '@/lib/auth/permissions';

let t: TestDb;
let registry: typeof import('./registry');

before(async () => {
  t = await setupTestDb();
  registry = await import('./registry');
});

after(async () => {
  await t.close();
});

/** Tool -> area:level, from Documentation/Dev/Print-Prep-Build.md (tool access map). */
const ACCESS_MAP: Record<string, string> = {
  admin_queue: 'production:view',
  list_production: 'production:view',
  advance_production: 'production:work',
  set_tracking: 'production:work',
  list_supplier_orders: 'production:view',
  draft_supplier_order: 'production:work',
  place_supplier_order: 'production:work',
  receive_supplier_order: 'production:work',
  list_payout_anomalies: 'money:view',
  review_payout: 'money:manage',
  list_base_costs: 'catalogue:view',
  set_base_cost: 'catalogue:manage',
  update_shipping_zone: 'catalogue:manage',
  list_waitlist: 'applications:view',
  approve_waitlist: 'applications:work',
  reject_waitlist: 'applications:work',
  list_tickets: 'support:view',
  resolve_ticket: 'support:work',
  refund_order: 'shop_orders:manage',
};

function names(actor: AccessHolder): string[] {
  return registry.toolsFor(actor).map((tool) => tool.name);
}

test('every staff tool declares an area and a level, and no tool keeps the old admin scope', () => {
  const tools = registry.allTools();
  assert.ok(tools.length > 40);
  for (const tool of tools) {
    const scope = tool.scope as string;
    assert.ok(['artist', 'both', 'staff'].includes(scope), `${tool.name} has scope ${scope}`);
    if (scope === 'staff') {
      const access = (tool as { access?: { area?: string; level?: string } }).access;
      assert.ok(access, `${tool.name} is a staff tool without access`);
      assert.ok((AREAS as readonly string[]).includes(access.area ?? ''), `${tool.name} has an unknown area`);
      assert.ok(['view', 'work', 'manage'].includes(access.level ?? ''), `${tool.name} has level ${access.level}`);
    } else {
      assert.equal((tool as { access?: unknown }).access, undefined, `${tool.name} is ${scope} but declares access`);
    }
  }
});

test('the 19 former admin tools carry exactly the access in the map', () => {
  for (const [name, expected] of Object.entries(ACCESS_MAP)) {
    const tool = registry.getTool(name);
    assert.ok(tool, `${name} is registered`);
    assert.equal(tool.scope, 'staff', name);
    assert.equal(`${tool.access?.area}:${tool.access?.level}`, expected, name);
  }
  assert.equal(Object.keys(ACCESS_MAP).length, 19);
});

test('tool names are unique', () => {
  const all = registry.allTools().map((tool) => tool.name);
  assert.equal(new Set(all).size, all.length);
});

test('artists get artist and shared tools, never a staff tool', () => {
  const tools = registry.toolsFor({ role: 'artist' });
  assert.ok(tools.length > 0);
  for (const tool of tools) assert.ok(tool.scope === 'artist' || tool.scope === 'both', tool.name);
  assert.ok(names({ role: 'artist' }).includes('create_product'));
  assert.ok(!names({ role: 'artist' }).includes('list_production'));
});

test('the owner gets every staff tool and the shared ones, but no artist tool', () => {
  const owner = names({ role: 'admin' });
  for (const tool of registry.allTools()) {
    if (tool.scope === 'staff' || tool.scope === 'both') assert.ok(owner.includes(tool.name), tool.name);
    if (tool.scope === 'artist') assert.ok(!owner.includes(tool.name), tool.name);
  }
});

test('an employee is offered exactly the staff tools their access reaches, for every preset', () => {
  const maps: PermissionMap[] = [...Object.values(PRESETS).map((p) => p.permissions as PermissionMap), { prepress: 'work' }, { money: 'view' }, { money: 'manage' }, {}];
  for (const permissions of maps) {
    const actor = { role: 'staff' as const, permissions };
    const offered = new Set(names(actor));
    for (const tool of registry.allTools()) {
      const shouldGet = tool.scope === 'both' || (tool.scope === 'staff' && can(actor, tool.access.area, tool.access.level));
      assert.equal(offered.has(tool.name), shouldGet, `${tool.name} for ${JSON.stringify(permissions)}`);
    }
  }
});

test('Phase 1 acceptance: Pre-press Work alone is offered no tool outside Pre-press', () => {
  const actor = { role: 'staff' as const, permissions: { prepress: 'work' as const } };
  for (const tool of registry.toolsFor(actor)) {
    if (tool.scope !== 'staff') continue;
    assert.equal(tool.access.area, 'prepress', tool.name);
    assert.notEqual(tool.access.level, 'manage', tool.name);
  }
  const offered = names(actor);
  for (const name of ['list_payout_anomalies', 'review_payout', 'refund_order', 'list_production', 'list_tickets']) assert.ok(!offered.includes(name), name);
});

test('the Support preset gets the ticket queue but not refunds, money or production writes', () => {
  const offered = names({ role: 'staff', permissions: PRESETS.support.permissions as PermissionMap });
  assert.ok(offered.includes('list_tickets'));
  assert.ok(offered.includes('resolve_ticket'));
  assert.ok(offered.includes('list_waitlist'));
  for (const name of ['approve_waitlist', 'refund_order', 'review_payout', 'list_payout_anomalies', 'advance_production', 'admin_queue']) assert.ok(!offered.includes(name), name);
});

test('a suspended employee is offered nothing, and an employee is never offered artist tools', () => {
  assert.deepEqual(registry.toolsFor({ role: 'staff', permissions: { prepress: 'manage', production: 'manage' }, suspended: true }), []);
  const staff = registry.toolsFor({ role: 'staff', permissions: PRESETS.operations_lead.permissions as PermissionMap });
  for (const tool of staff) assert.notEqual(tool.scope, 'artist', tool.name);
});

test('canUseTool refuses a tool whose scope is unknown or whose access is missing', () => {
  const rogue = { ...registry.getTool('list_production')!, scope: 'admin' } as unknown as Parameters<typeof registry.canUseTool>[1];
  assert.equal(registry.canUseTool({ role: 'admin' }, rogue), false);
  const noAccess = { ...registry.getTool('list_production')!, access: undefined } as unknown as Parameters<typeof registry.canUseTool>[1];
  assert.equal(registry.canUseTool({ role: 'admin' }, noAccess), false);
});

test('tools come back sorted by name, so the prompt cache stays warm', () => {
  const list = names({ role: 'admin' });
  assert.deepEqual(list, [...list].sort((a, b) => a.localeCompare(b)));
});

test('the activity log reads only staff tools that change something', () => {
  const action = registry.staffActionTools();
  assert.ok(action.some((t) => t.name === 'advance_production' && t.area === 'production'));
  assert.ok(!action.some((t) => t.name === 'list_production'));
});
