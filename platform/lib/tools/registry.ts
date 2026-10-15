import { can, type AccessHolder, type Area } from '@/lib/auth/permissions';
import type { Tool } from '@/lib/tools/types';
import { getBlankTool, listBlanksTool } from '@/lib/tools/catalog';
import { getMyStoreTool, publishStoreTool, unpublishStoreTool, updateStoreTool } from '@/lib/tools/store';
import { rememberTool } from '@/lib/tools/memory';
import { getInboxTool, markInboxReadTool } from '@/lib/tools/inbox';
import { whatCanIDoTool } from '@/lib/tools/menu';
import { suggestNextTool } from '@/lib/tools/suggest-next';
import { DESIGN_TOOLS } from '@/lib/tools/design';
import { PRODUCT_TOOLS } from '@/lib/tools/products';
import { MOCKUP_TOOLS } from '@/lib/tools/mockups';
import { BULK_TOOLS } from '@/lib/tools/bulk';
import { ADMIN_TOOLS } from '@/lib/tools/admin';
import { WAITLIST_TOOLS } from '@/lib/tools/waitlist';
import { SUPPORT_TOOLS } from '@/lib/tools/support';
import { DOMAIN_TOOLS } from '@/lib/tools/domains';
import { COMMERCE_TOOLS } from '@/lib/tools/commerce';
import { DISCORD_TOOLS } from '@/lib/tools/discord';
import { PRINT_TOOLS } from '@/lib/tools/print';
import { PREPRESS_TOOLS } from '@/lib/tools/prepress';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_TOOLS: Tool<any, any>[] = [
  listBlanksTool,
  getBlankTool,
  getMyStoreTool,
  updateStoreTool,
  publishStoreTool,
  unpublishStoreTool,
  rememberTool,
  getInboxTool,
  markInboxReadTool,
  whatCanIDoTool,
  suggestNextTool,
  ...DESIGN_TOOLS,
  ...PRODUCT_TOOLS,
  ...MOCKUP_TOOLS,
  ...BULK_TOOLS,
  ...ADMIN_TOOLS,
  ...WAITLIST_TOOLS,
  ...SUPPORT_TOOLS,
  ...DOMAIN_TOOLS,
  ...COMMERCE_TOOLS,
  ...DISCORD_TOOLS,
  ...PRINT_TOOLS,
  ...PREPRESS_TOOLS,
];

/** Whether this caller may be offered, and run, this tool. Artist tools go to
 * artists; 'both' tools to everyone signed in; staff tools to the owner and
 * to employees whose level for the tool's area reaches its `access`. A
 * suspended employee gets nothing, and a staff tool without `access` goes to
 * no one (registry.test.ts fails on it). The agent loop asks this again
 * right before a tool runs, so a change of access counts from the next call. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canUseTool(actor: AccessHolder, tool: Tool<any, any>): boolean {
  if (actor.suspended) return false;
  switch (tool.scope) {
    case 'artist':
      return actor.role === 'artist';
    case 'both':
      return actor.role === 'artist' || actor.role === 'staff' || actor.role === 'admin';
    case 'staff':
      return Boolean(tool.access) && can(actor, tool.access.area, tool.access.level);
    default:
      return false;
  }
}

/** The tools this caller is offered, in a deterministic (name-sorted) order,
 * so the assistant never sees what the caller can't do. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toolsFor(actor: AccessHolder): Tool<any, any>[] {
  return ALL_TOOLS.filter((tool) => canUseTool(actor, tool)).sort((a, b) => a.name.localeCompare(b.name));
}

/** Every registered tool (tests and the team activity log read this). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function allTools(): readonly Tool<any, any>[] {
  return ALL_TOOLS;
}

/** The staff tools that change something, with their area: what the team
 * activity log shows of the assistant's work (reads are left out). */
export function staffActionTools(): { name: string; area: Area }[] {
  return ALL_TOOLS.flatMap((tool) => (tool.scope === 'staff' && !tool.readOnly ? [{ name: tool.name, area: tool.access.area }] : []));
}

/** Looks a tool up by name, whoever is asking: callers that run it must check
 * `canUseTool` first (lib/agent/loop.ts does). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTool(name: string): Tool<any, any> | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}
