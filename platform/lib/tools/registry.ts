import type { Role, Tool } from '@/lib/tools/types';
import { getBlankTool, listBlanksTool } from '@/lib/tools/catalog';
import { getMyStoreTool, publishStoreTool, updateStoreTool } from '@/lib/tools/store';
import { rememberTool } from '@/lib/tools/memory';
import { getInboxTool } from '@/lib/tools/inbox';
import { whatCanIDoTool } from '@/lib/tools/menu';
import { suggestNextTool } from '@/lib/tools/suggest-next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_TOOLS: Tool<any, any>[] = [
  listBlanksTool,
  getBlankTool,
  getMyStoreTool,
  updateStoreTool,
  publishStoreTool,
  rememberTool,
  getInboxTool,
  whatCanIDoTool,
  suggestNextTool,
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
