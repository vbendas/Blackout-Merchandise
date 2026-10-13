import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool } from '@/lib/tools/types';
import { storeSummary } from '@/lib/services/stores';
import type { Chip } from '@/lib/ui-cards/schemas';

interface MenuSection {
  title: string;
  chips: Chip[];
}

function adminSections(): MenuSection[] {
  return [
    { title: 'Queue', chips: [{ label: 'Admin queue', prompt: 'Show the admin queue' }, { label: 'Waitlist', prompt: 'List the waitlist' }] },
    { title: 'Support', chips: [{ label: 'Open tickets', prompt: 'Show open support tickets' }] },
  ];
}

async function artistSections(storeId: string | null): Promise<MenuSection[]> {
  const summary = storeId ? await storeSummary(storeId) : null;

  if (!summary || summary.name.trim().length === 0) {
    return [
      { title: 'Get started', chips: [{ label: 'Name my shop', prompt: 'Help me name my shop', primary: true }, { label: 'Browse blanks', prompt: 'Show me blanks' }] },
    ];
  }

  if (!summary.hasAnyProduct) {
    return [
      { title: 'Get started', chips: [{ label: 'Browse blanks', prompt: 'Show me blanks', primary: true }, { label: 'Upload artwork', prompt: 'I want to upload artwork' }] },
      { title: 'Shop', chips: [{ label: 'Shop status', prompt: 'Show my shop' }] },
    ];
  }

  return [
    { title: 'Products', chips: [{ label: 'Add a product', prompt: 'Add a new product', primary: true }, { label: 'Browse blanks', prompt: 'Show me blanks' }] },
    { title: 'Shop', chips: [{ label: 'Shop status', prompt: 'Show my shop' }, { label: 'Publish shop', prompt: 'Publish my shop' }] },
    { title: 'Inbox', chips: [{ label: "What's new", prompt: 'Check my inbox' }] },
  ];
}

export const whatCanIDoTool = defineTool({
  name: 'what_can_i_do',
  description:
    "Show a menu of things the user can do right now, grouped by category and tailored to their current state (new shop, shop with no products yet, shop with live products, or admin). Call this when the user asks 'what can you do', 'help', or seems unsure of the next step.",
  input: z.object({}).strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx) => {
    const sections = ctx.role === 'admin' ? adminSections() : await artistSections(ctx.storeId);
    return {
      data: { sections: sections.map((s) => s.title) },
      ui: { cards: [{ id: `menu_${randomUUID()}`, kind: 'menu', title: 'What can I do?', sections }] },
    };
  },
});
