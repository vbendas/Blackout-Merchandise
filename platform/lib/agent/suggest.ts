import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { Role } from '@/lib/tools/types';
import type { Suggestion, SuggestionArea } from '@/lib/agent/protocol';
import { type GuidanceState, quickActionsFor } from '@/lib/agent/guidance';
import { can, type Area, type Level, type PermissionMap } from '@/lib/auth/permissions';

// Ranked prompt suggestions for the composer autocomplete. Combines a
// curated static catalogue with dynamic entries derived from the blank
// catalogue (types, supplier names, colours), loaded once per server
// instance. Admin suggestions name the access their tool needs, so an
// employee is only offered what their access allows.

export interface SuggestContext {
  role: Role;
  state: GuidanceState;
  /** staff only: their access by area; without it a staff caller gets no
   * admin suggestions */
  permissions?: PermissionMap | null;
  suspended?: boolean;
}

interface Template {
  text: string;
  area: SuggestionArea;
  /** admin templates: the area and level the tool behind them needs */
  access?: { area: Area; level: Level };
}

/** A template is offered only to those its tools serve: artists get
 * everything but the admin; the owner and staff get the catalogue (tools
 * shared with everyone) and the admin prompts their access reaches. */
function allowed(template: Template, ctx: SuggestContext): boolean {
  if (template.area !== 'Admin') return ctx.role === 'artist' || template.area === 'Catalog';
  if (!template.access) return ctx.role === 'admin';
  return can(ctx, template.access.area, template.access.level);
}

const CATALOGUE_TEMPLATES: Template[] = [
  // Catalog
  { text: 'Show me hoodies', area: 'Catalog' },
  { text: 'Show me T-shirts', area: 'Catalog' },
  { text: 'Show me tote bags', area: 'Catalog' },
  { text: 'Show me caps', area: 'Catalog' },
  { text: 'Show me sweatshirts', area: 'Catalog' },
  { text: 'What blanks do you have?', area: 'Catalog' },
  { text: 'Show me blanks in black', area: 'Catalog' },
  { text: 'Show me blanks under 15 euros', area: 'Catalog' },
  { text: 'Which blanks print well with 2 colours?', area: 'Catalog' },
  { text: "What's your best-selling blank?", area: 'Catalog' },
  // Product
  { text: 'Hoodie in bottle green, sizes S–2XL', area: 'Product' },
  { text: 'Add a new product', area: 'Product' },
  { text: 'Continue my draft', area: 'Product' },
  { text: 'Prepare the print files', area: 'Product' },
  { text: 'Price my product', area: 'Product' },
  { text: 'Show my products', area: 'Product' },
  { text: 'Create a hoodie with my design', area: 'Product' },
  { text: 'Price it at €35', area: 'Product' },
  { text: 'Show me the print proofs', area: 'Product' },
  { text: 'Approve the artwork', area: 'Product' },
  { text: 'Publish the product', area: 'Product' },
  { text: 'Archive this product', area: 'Product' },
  { text: "What's my margin at €40?", area: 'Product' },
  { text: 'Add a collection called Winter Tour', area: 'Product' },
  { text: 'Move this product to Winter Tour', area: 'Product' },
  // Design
  { text: 'Upload my artwork', area: 'Design' },
  { text: 'I want to upload artwork', area: 'Design' },
  { text: 'Generate a design for me', area: 'Design' },
  { text: 'Redo the placement on my design', area: 'Design' },
  { text: 'What print services do you support?', area: 'Design' },
  // Shop
  { text: 'Show my shop', area: 'Shop' },
  { text: 'Set my shop name to …', area: 'Shop' },
  { text: 'Change my shop address', area: 'Shop' },
  { text: 'Set my accent colour', area: 'Shop' },
  { text: 'Set up payouts', area: 'Shop' },
  { text: 'Publish my shop', area: 'Shop' },
  { text: 'Show my sales this month', area: 'Shop' },
  { text: 'Check my inbox', area: 'Shop' },
  // Bulk
  { text: 'How much is a run of 40 hoodies?', area: 'Bulk' },
  { text: 'Start a bulk order', area: 'Bulk' },
  { text: "What's the price break at 100 units?", area: 'Bulk' },
  { text: 'Bulk order status', area: 'Bulk' },
  { text: 'What does 25 hoodies cost?', area: 'Bulk' },
  { text: 'Quote a run of 50', area: 'Bulk' },
  { text: 'Send the proof for my run', area: 'Bulk' },
  { text: 'Approve the proof for my run', area: 'Bulk' },
  // Orders
  { text: 'Show my orders', area: 'Orders' },
  { text: 'Where is my last order?', area: 'Orders' },
  { text: 'Order tracking', area: 'Orders' },
  { text: 'Show pending orders', area: 'Orders' },
  // Admin
  { text: 'Show the admin queue', area: 'Admin', access: { area: 'production', level: 'view' } },
  { text: 'List the waitlist', area: 'Admin', access: { area: 'applications', level: 'view' } },
  { text: 'Show open support tickets', area: 'Admin', access: { area: 'support', level: 'view' } },
  { text: 'Show payout anomalies', area: 'Admin', access: { area: 'money', level: 'view' } },
  { text: 'Show the production queue', area: 'Admin', access: { area: 'production', level: 'view' } },
  { text: 'Approve waitlist entries', area: 'Admin', access: { area: 'applications', level: 'work' } },
];

const STARTER_PICKS: Template[] = [
  { text: 'Show me hoodies', area: 'Catalog' },
  { text: 'What blanks do you have?', area: 'Catalog' },
];

/** Common query fragments that don't literally appear in the canonical
 * type strings stored on `blanks.type` (e.g. 'tee' -> 'T-shirts'). */
const TYPE_ALIASES: Record<string, string> = {
  tee: 'T-shirts',
  tees: 'T-shirts',
  tshirt: 'T-shirts',
  hoodie: 'Sweats & Hoodies',
  hoody: 'Sweats & Hoodies',
  hoodies: 'Sweats & Hoodies',
  sweatshirt: 'Sweats & Hoodies',
  sweater: 'Sweats & Hoodies',
  crewneck: 'Sweats & Hoodies',
  tote: 'Bags & Accessories',
  bag: 'Bags & Accessories',
  cap: 'Bags & Accessories',
  hat: 'Bags & Accessories',
  beanie: 'Bags & Accessories',
  jogger: 'Bottoms',
  sweatpant: 'Bottoms',
  shorts: 'Bottoms',
  pants: 'Bottoms',
  polo: 'Polos',
  jacket: 'Jackets',
  bomber: 'Jackets',
  vest: 'Jackets',
  shirt: 'Shirts',
  flannel: 'Shirts',
  kids: 'Kids & Baby',
  baby: 'Kids & Baby',
};

interface CatalogueIndex {
  types: string[];
  names: string[];
  colours: string[];
}

let cataloguePromise: Promise<CatalogueIndex> | null = null;

async function loadCatalogueIndex(): Promise<CatalogueIndex> {
  if (!cataloguePromise) {
    cataloguePromise = (async () => {
      const [blankRows, colourRows] = await Promise.all([
        db
          .select({ name: schema.blanks.supplierName, type: schema.blanks.type })
          .from(schema.blanks)
          .where(eq(schema.blanks.isActive, true)),
        db.select({ name: schema.colours.name }).from(schema.colours),
      ]);
      return {
        types: Array.from(new Set(blankRows.map((r) => r.type))),
        names: Array.from(new Set(blankRows.map((r) => r.name).filter((n): n is string => !!n))),
        colours: Array.from(new Set(colourRows.map((r) => r.name))),
      };
    })().catch((err) => {
      cataloguePromise = null;
      throw err;
    });
  }
  return cataloguePromise;
}

/** 0 = exact prefix, 1 = word-prefix, 2 = substring, null = no match. */
function matchRank(candidate: string, q: string): number | null {
  const text = candidate.toLowerCase();
  const query = q.toLowerCase();
  if (text.startsWith(query)) return 0;
  if (text.split(/\s+/).some((word) => word.startsWith(query))) return 1;
  if (text.includes(query)) return 2;
  return null;
}

function aliasRank(type: string, q: string): number | null {
  let best: number | null = null;
  for (const [alias, target] of Object.entries(TYPE_ALIASES)) {
    if (target !== type) continue;
    const rank = matchRank(alias, q);
    if (rank !== null && (best === null || rank < best)) best = rank;
  }
  return best;
}

interface Ranked {
  text: string;
  area: SuggestionArea;
  rank: number;
}

function dedupeAndCap(candidates: Ranked[], limit: number): Suggestion[] {
  const byText = new Map<string, Ranked>();
  for (const candidate of candidates) {
    const key = candidate.text.toLowerCase();
    const existing = byText.get(key);
    if (!existing || candidate.rank < existing.rank) byText.set(key, candidate);
  }
  return Array.from(byText.values())
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ text, area }) => ({ text, area }));
}

function areaForPrompt(prompt: string): SuggestionArea {
  const p = prompt.toLowerCase();
  if (p.includes('waiting') || p.includes('queue') || p.includes('waitlist') || p.includes('payout anomal')) return 'Admin';
  if (p.includes('bulk')) return 'Bulk';
  if (p.includes('draft') || p.includes('proof') || p.includes('product')) return 'Product';
  if (p.includes('artwork') || p.includes('design')) return 'Design';
  if (p.includes('blank')) return 'Catalog';
  return 'Shop';
}

function defaultSuggestions(ctx: SuggestContext): Suggestion[] {
  const quick: Ranked[] = quickActionsFor(ctx.state, ctx).map((chip, i) => ({
    text: chip.prompt ?? chip.label,
    area: areaForPrompt(chip.prompt ?? chip.label),
    rank: i,
  }));
  const picks: Ranked[] = STARTER_PICKS.filter((p) => allowed(p, ctx)).map((p, i) => ({
    ...p,
    rank: 100 + i,
  }));
  return dedupeAndCap([...quick, ...picks], 5);
}

export async function suggestFor(q: string, ctx: SuggestContext): Promise<Suggestion[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return defaultSuggestions(ctx);

  const index = await loadCatalogueIndex();
  const candidates: Ranked[] = [];

  for (const template of CATALOGUE_TEMPLATES) {
    if (!allowed(template, ctx)) continue;
    const rank = matchRank(template.text, trimmed);
    if (rank !== null) candidates.push({ text: template.text, area: template.area, rank });
  }

  for (const type of index.types) {
    const direct = matchRank(type, trimmed);
    const alias = aliasRank(type, trimmed);
    const rank = direct === null ? alias : alias === null ? direct : Math.min(direct, alias);
    if (rank !== null) candidates.push({ text: `Show me ${type}`, area: 'Catalog', rank });
  }

  for (const name of index.names) {
    const rank = matchRank(name, trimmed);
    if (rank !== null) candidates.push({ text: `Show me ${name}`, area: 'Catalog', rank });
  }

  for (const colour of index.colours) {
    const rank = matchRank(colour, trimmed);
    if (rank !== null) candidates.push({ text: `Blanks in ${colour}`, area: 'Catalog', rank });
  }

  return dedupeAndCap(candidates, 5);
}
