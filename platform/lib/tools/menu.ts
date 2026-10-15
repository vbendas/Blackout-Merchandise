import { randomUUID } from 'crypto';
import { z } from 'zod';
import { can, isTeamRole, type AccessHolder, type Area, type Level } from '@/lib/auth/permissions';
import { defineTool } from '@/lib/tools/types';
import { storeSummary } from '@/lib/services/stores';
import type { Chip } from '@/lib/ui-cards/schemas';

interface MenuSection {
  title: string;
  chips: Chip[];
}

/** The owner's and staff menu: each chip names the area and level its tool
 * needs, so an employee is only offered what their access allows. */
const TEAM_MENU: { title: string; chips: { chip: Chip; area: Area; level: Level }[] }[] = [
  {
    title: 'Queue',
    chips: [
      { chip: { label: 'Admin queue', prompt: 'Show the admin queue' }, area: 'production', level: 'view' },
      { chip: { label: 'Production', prompt: 'Show the production queue' }, area: 'production', level: 'view' },
      { chip: { label: 'Supplier orders', prompt: 'Show supplier orders' }, area: 'production', level: 'view' },
    ],
  },
  {
    title: 'Artists',
    chips: [{ chip: { label: 'Waitlist', prompt: 'List the waitlist' }, area: 'applications', level: 'view' }],
  },
  {
    title: 'Support',
    chips: [{ chip: { label: 'Open tickets', prompt: 'Show open support tickets' }, area: 'support', level: 'view' }],
  },
  {
    title: 'Money',
    chips: [{ chip: { label: 'Payout anomalies', prompt: 'Show payout anomalies' }, area: 'money', level: 'view' }],
  },
];

export function teamMenuSections(ctx: AccessHolder): MenuSection[] {
  return TEAM_MENU.map((section) => ({
    title: section.title,
    chips: section.chips.filter((c) => can(ctx, c.area, c.level)).map((c) => c.chip),
  })).filter((section) => section.chips.length > 0);
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
    "Show a menu of things the user can do right now, grouped by category and tailored to their current state (new shop, shop with no products yet, shop with live products, or the owner's and staff work they have access to). Call this when the user asks 'what can you do', 'help', or seems unsure of the next step.",
  input: z.object({}).strict(),
  scope: 'both',
  readOnly: true,
  run: async (ctx) => {
    let sections: MenuSection[];
    if (isTeamRole(ctx.role)) {
      sections = teamMenuSections(ctx);
      // Staff with no admin area yet still get a way forward.
      if (sections.length === 0) sections = [{ title: 'Catalogue', chips: [{ label: 'Browse blanks', prompt: 'Show me blanks' }] }];
    } else {
      sections = await artistSections(ctx.storeId);
    }
    return {
      data: { sections: sections.map((s) => s.title) },
      ui: { cards: [{ id: `menu_${randomUUID()}`, kind: 'menu', title: 'What can I do?', sections }] },
    };
  },
});
