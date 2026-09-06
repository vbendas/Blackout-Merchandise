import { z } from 'zod';

// Generative-UI contract shared by the agent runtime (which emits cards and
// chips from tool results) and the React chat (which renders them). The
// model never emits markup; it emits structured cards validated here.

export const chipSchema = z.object({
  /** text shown on the chip */
  label: z.string().min(1).max(48),
  /** the user message sent when tapped (defaults to the label) */
  prompt: z.string().min(1).max(400).optional(),
  /** visual emphasis for the primary next step */
  primary: z.boolean().optional(),
});
export type Chip = z.infer<typeof chipSchema>;

export const cardActionSchema = z.object({
  label: z.string().min(1).max(32),
  /** message sent to the agent when clicked, e.g. 'Approve proof pr_123' */
  prompt: z.string().min(1).max(400).optional(),
  /** open an external URL instead (Stripe onboarding, uploads, storefront) */
  href: z.string().url().optional(),
  /** confirm-gated tool call this button completes (see confirm card) */
  confirmToolCallId: z.string().optional(),
  variant: z.enum(['primary', 'secondary', 'danger']).optional(),
});
export type CardAction = z.infer<typeof cardActionSchema>;

const base = {
  /** stable id so the client can replace a card in place on updates */
  id: z.string(),
  title: z.string().max(120).optional(),
  /** long cards render collapsed and open in a modal */
  expandable: z.boolean().optional(),
  actions: z.array(cardActionSchema).max(4).optional(),
};

export const checklistItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
  prompt: z.string().optional(),
});

export const cardSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('onboarding_checklist'), items: z.array(checklistItemSchema) }),
  z.object({
    ...base,
    kind: z.literal('blank'),
    code: z.string(),
    name: z.string(),
    description: z.string().optional(),
    imageUrl: z.string(),
    backImageUrl: z.string().optional(),
    type: z.string().optional(),
    fit: z.string().optional(),
    composition: z.string().optional(),
    weightGsm: z.number().optional(),
    colours: z.array(z.object({ code: z.string(), name: z.string(), hex: z.string() })).optional(),
    sizes: z.array(z.string()).optional(),
    printServices: z.array(z.string()).optional(),
    fromPriceCents: z.number().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('blank_grid'),
    items: z.array(z.object({ code: z.string(), name: z.string(), imageUrl: z.string(), fromPriceCents: z.number().optional() })).max(24),
    total: z.number().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('store'),
    storeId: z.string(),
    name: z.string(),
    slug: z.string(),
    url: z.string(),
    isPublished: z.boolean(),
    accentColour: z.string().optional(),
    logoUrl: z.string().optional(),
    stripeReady: z.boolean(),
    liveProducts: z.number(),
  }),
  z.object({
    ...base,
    kind: z.literal('confirm'),
    /** id of the pending tool call awaiting the human click */
    toolCallId: z.string(),
    toolName: z.string(),
    summary: z.string(),
    details: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('inbox'),
    items: z.array(z.object({ id: z.string(), at: z.string(), text: z.string(), unread: z.boolean(), prompt: z.string().optional() })),
  }),
  z.object({ ...base, kind: z.literal('menu'), sections: z.array(z.object({ title: z.string(), chips: z.array(chipSchema) })) }),
  z.object({ ...base, kind: z.literal('notice'), tone: z.enum(['info', 'success', 'warning', 'error']), text: z.string() }),
]);
export type Card = z.infer<typeof cardSchema>;
export type CardKind = Card['kind'];

/** What every tool may return alongside its data. */
export const toolUiSchema = z.object({
  cards: z.array(cardSchema).max(6).optional(),
  next: z.array(chipSchema).max(5).optional(),
  /** update the persistent right-hand project card */
  project: z
    .object({ kind: z.enum(['onboarding', 'product', 'bulk_order']), refId: z.string().optional(), state: z.record(z.string(), z.unknown()) })
    .optional(),
});
export type ToolUi = z.infer<typeof toolUiSchema>;
