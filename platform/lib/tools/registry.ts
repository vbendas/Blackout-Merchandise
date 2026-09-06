import type { Role, Tool } from '@/lib/tools/types';
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
];

/** Tools visible to a caller with this role, in a deterministic (name-sorted) order. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toolsForRole(role: Role): Tool<any, any>[] {
  return ALL_TOOLS.filter((tool) => tool.scope === 'both' || tool.scope === role).sort((a, b) => a.name.localeCompare(b.name));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTool(name: string): Tool<any, any> | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}
