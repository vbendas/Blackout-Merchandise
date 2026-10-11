// Picks the model for one user turn. Sonnet (AGENT_MODEL) is the default;
// Haiku (AGENT_LIGHT_MODEL) takes only turns that are clearly simple:
// greetings, thanks, and read-only lookups (status, shop, orders, payouts).
// Anything with an attachment, an open product or bulk project, a long
// message or a design / pricing / production word stays on Sonnet. When in
// doubt the router picks Sonnet: a wrong blank or price costs more than the
// tokens saved. Set AGENT_ROUTING=off to send every turn to AGENT_MODEL.

export const AGENT_MODEL = process.env.AGENT_MODEL ?? 'claude-sonnet-5-5';
export const AGENT_LIGHT_MODEL = process.env.AGENT_LIGHT_MODEL ?? 'claude-haiku-5-5';

export type ModelTier = 'main' | 'light';

export interface RouteInput {
  userText: string;
  hasAttachments: boolean;
  /** kind of the conversation's open project card, if any */
  projectKind: string | null;
}

export interface RouteDecision {
  model: string;
  tier: ModelTier;
  reason: string;
}

const LIGHT_MAX_CHARS = 140;

// Work that needs the stronger model even when phrased briefly.
const HEAVY_WORDS = [
  'design', 'logo', 'artwork', 'art\\b', 'mockup', 'mock-up', 'print', 'embroider', 'colou?r', 'font', 'style',
  'price', 'pricing', 'margin', 'cost', 'quote', 'bulk', 'wholesale', 'minimum', 'moq',
  'create', 'make', 'generate', 'build', 'new product', 'add\\b', 'edit', 'change', 'update', 'replace', 'remove', 'delete',
  'launch', 'publish', 'drop', 'collection', 'size', 'fabric', 'blank', 'hoodie', 'tee\\b', 't-shirt', 'shirt', 'tote', 'cap\\b',
  'refund', 'cancel', 'return', 'domain', 'connect', 'stripe', 'tax', 'invoice',
  'why', 'how should', 'recommend', 'suggest', 'idea', 'compare', 'better',
  // es / pt / fr / de / it essentials (same locales as Settings)
  'diseñ', 'precio', 'crear', 'cambiar', 'desenh', 'preço', 'criar', 'prix', 'créer', 'entwurf', 'preis', 'erstell', 'prezzo', 'crea',
];
const HEAVY = new RegExp(`\\b(${HEAVY_WORDS.join('|')})`, 'i');

// Clearly simple turns: social niceties and read-only lookups.
const LIGHT = new RegExp(
  [
    '^(hi|hey|hello|hola|ola|olá|bonjour|hallo|ciao|yo|good (morning|afternoon|evening))(?![a-z])',
    '^(thanks|thank you|thx|ty|gracias|obrigad[oa]|merci|danke|grazie|cheers|great|perfect|cool|nice)(?![a-z])',
    '\\b(status|where is|where\'s|track|tracking|shipped|delivered)\\b',
    '\\b(show|list|see|open|view)( me)? (my|the) (shop|store|products?|orders?|sales|payouts?|earnings|balance|designs?|collections?)\\b',
    '\\b(what|how much|how many)( are| is|\'s)? (my|i) ',
    '^(help|menu|what can you do)\\b',
  ].join('|'),
  'i',
);

const HEAVY_PROJECTS = new Set(['product', 'bulk_order']);

export function routeTurn(input: RouteInput): RouteDecision {
  const main = (reason: string): RouteDecision => ({ model: AGENT_MODEL, tier: 'main', reason });
  if (process.env.AGENT_ROUTING === 'off') return main('routing off');

  const text = input.userText.trim();
  if (input.hasAttachments) return main('attachment');
  if (input.projectKind && HEAVY_PROJECTS.has(input.projectKind)) return main(`open ${input.projectKind} project`);
  if (text.length > LIGHT_MAX_CHARS) return main('long message');
  if (HEAVY.test(text)) return main('design, pricing or production request');
  if (!LIGHT.test(text)) return main('default');
  return { model: AGENT_LIGHT_MODEL, tier: 'light', reason: 'simple lookup or greeting' };
}
