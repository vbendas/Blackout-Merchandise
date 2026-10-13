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
    /** the supplier's own model name; shown only as small detail text, `name` is the display name */
    supplierName: z.string().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('blank_grid'),
    items: z
      .array(
        z.object({
          code: z.string(),
          /** display name (lib/catalog/display-names.ts) */
          name: z.string(),
          imageUrl: z.string(),
          fromPriceCents: z.number().optional(),
          /** fabric facts line, e.g. '100% organic cotton · 350 g · relaxed fit' */
          facts: z.string().optional(),
        }),
      )
      .max(24),
    total: z.number().optional(),
    /** the catalogue category the grid was filtered to; 'Browse all' opens the catalogue on it */
    category: z.string().max(60).optional(),
    /** the search text the grid came from; 'Browse all' opens the catalogue with it */
    query: z.string().max(120).optional(),
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
    /** shown as a 'Sales this month' row when the tool has it (lib/services/studio-home.ts getSalesThisMonth) */
    salesThisMonth: z.object({ count: z.number(), grossCents: z.number() }).optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('confirm'),
    /** id of the pending tool call awaiting the human click */
    toolCallId: z.string(),
    toolName: z.string(),
    summary: z.string(),
    details: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    /** button words (see lib/tools/labels.ts); default 'Approve' / 'Cancel' */
    approveLabel: z.string().min(1).max(32).optional(),
    cancelLabel: z.string().min(1).max(32).optional(),
    /** set when history is loaded, from the stored call: what became of the
     * step. Absent while it still waits, so the buttons show. */
    outcome: z.enum(['approved', 'declined', 'done', 'failed']).optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('inbox'),
    items: z.array(z.object({ id: z.string(), at: z.string(), text: z.string(), unread: z.boolean(), prompt: z.string().optional() })),
  }),
  z.object({ ...base, kind: z.literal('menu'), sections: z.array(z.object({ title: z.string(), chips: z.array(chipSchema) })) }),
  z.object({ ...base, kind: z.literal('notice'), tone: z.enum(['info', 'success', 'warning', 'error']), text: z.string() }),
  // --- wave 1: design → product ---
  z.object({
    ...base,
    kind: z.literal('design'),
    designId: z.string(),
    previewUrl: z.string(),
    widthPx: z.number().optional(),
    heightPx: z.number().optional(),
    dpiAtPrint: z.number().optional(),
    hasAlpha: z.boolean().optional(),
    readiness: z.enum(['ready', 'needs_cleanup', 'blocked']),
    notes: z.array(z.string()).optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('mockup_grid'),
    items: z
      .array(
        z.object({
          id: z.string(),
          url: z.string(),
          label: z.string().optional(),
          designId: z.string().optional(),
          colourCode: z.string().optional(),
          /** message sent when the item is chosen, e.g. 'Use design d_123' */
          prompt: z.string().optional(),
        }),
      )
      .max(12),
    columns: z.number().min(1).max(4).optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('product'),
    productId: z.string(),
    name: z.string(),
    blankCode: z.string(),
    blankName: z.string(),
    imageUrl: z.string().optional(),
    colours: z.array(z.object({ code: z.string(), name: z.string(), hex: z.string(), mockupUrl: z.string().optional() })),
    sizes: z.array(z.string()),
    printService: z.string(),
    placement: z.string().optional(),
    baseCostCents: z.number().optional(),
    retailPriceCents: z.number().optional(),
    marginCents: z.number().optional(),
    status: z.enum(['draft', 'proof_pending', 'live', 'archived']),
  }),
  z.object({
    ...base,
    kind: z.literal('quote'),
    lines: z.array(z.object({ label: z.string(), qty: z.number(), unitCents: z.number(), totalCents: z.number() })),
    totalCents: z.number(),
    currency: z.string().default('EUR'),
    note: z.string().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('proof'),
    proofId: z.string(),
    productId: z.string().optional(),
    version: z.number(),
    mockupUrls: z.array(z.string()),
    spec: z.array(z.object({ label: z.string(), value: z.string() })),
    status: z.enum(['pending', 'approved', 'changes_requested']),
  }),
  z.object({ ...base, kind: z.literal('upload'), accept: z.string().default('image/*'), hint: z.string().optional() }),
  // --- wave 2: money ---
  z.object({
    ...base,
    kind: z.literal('stripe_onboarding'),
    status: z.enum(['not_started', 'in_progress', 'action_required', 'ready']),
    onboardingUrl: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    chargesEnabled: z.boolean(),
    payoutsEnabled: z.boolean(),
  }),
  z.object({
    ...base,
    kind: z.literal('domain_setup'),
    hostname: z.string(),
    status: z.enum(['pending', 'verifying', 'active', 'error']),
    records: z.array(z.object({ type: z.string(), name: z.string(), value: z.string() })),
    message: z.string().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('order'),
    orderId: z.string(),
    reference: z.string(),
    kind_: z.enum(['pod', 'bulk']).optional(),
    status: z.string(),
    productionStatus: z.string().optional(),
    placedAt: z.string(),
    fanEmail: z.string().optional(),
    lines: z.array(z.object({ label: z.string(), colour: z.string().optional(), size: z.string().optional(), qty: z.number(), unitCents: z.number() })),
    totals: z.object({ grossCents: z.number(), shippingCents: z.number(), taxCents: z.number(), feeCents: z.number().optional(), transferCents: z.number().optional() }),
    tracking: z.object({ carrier: z.string(), code: z.string(), url: z.string().optional() }).optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('orders_table'),
    rows: z.array(z.object({ orderId: z.string(), reference: z.string(), placedAt: z.string(), status: z.string(), productionStatus: z.string().optional(), grossCents: z.number(), transferCents: z.number().optional(), prompt: z.string().optional() })).max(50),
    total: z.number().optional(),
  }),
  // --- wave 4: reach ---
  z.object({
    ...base,
    kind: z.literal('discord_link'),
    linked: z.boolean(),
    discordUsername: z.string().optional(),
    dmEnabled: z.boolean(),
    linkUrl: z.string().optional(),
  }),
  // --- wave 3: bulk + admin ---
  z.object({
    ...base,
    kind: z.literal('bulk_quote'),
    bulkOrderId: z.string(),
    status: z.enum(['quoted', 'proof_pending', 'awaiting_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled']),
    lines: z.array(z.object({ label: z.string(), colour: z.string().optional(), sizes: z.string().optional(), qty: z.number(), unitCents: z.number(), totalCents: z.number() })),
    setupCents: z.number().optional(),
    shippingCents: z.number(),
    totalCents: z.number(),
    shipTo: z.string().optional(),
    leadTime: z.string().optional(),
    checkoutUrl: z.string().optional(),
  }),
  // A run (one bulk order) as the artist follows it: its stage, not a piece count.
  z.object({
    ...base,
    kind: z.literal('run'),
    bulkOrderId: z.string(),
    /** per-shop number from lib/services/runs.ts, shown as 'Run 3' */
    runNumber: z.number().int().min(1),
    title: z.string().max(120),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    /** status in plain words, e.g. 'In production' */
    status: z.string(),
    /** stages in order: proof, payment, production, shipping */
    steps: z.array(z.object({ label: z.string(), state: z.enum(['done', 'current', 'next']), value: z.string().optional() })),
    /** next steps as chips (each sends its prompt) */
    actions: z.array(chipSchema).max(4).optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('admin_queue'),
    sections: z.array(z.object({
      key: z.string(),
      title: z.string(),
      count: z.number(),
      items: z.array(z.object({ id: z.string(), text: z.string(), meta: z.string().optional(), prompt: z.string().optional() })).max(8),
    })),
    generatedAt: z.string(),
  }),
  z.object({
    ...base,
    kind: z.literal('supplier_order'),
    supplierOrderId: z.string(),
    supplier: z.string(),
    status: z.enum(['draft', 'placed', 'confirmed', 'shipped', 'received', 'cancelled']),
    lines: z.array(z.object({ blankCode: z.string(), blankName: z.string(), colour: z.string(), size: z.string(), qty: z.number() })).max(60),
    forOrders: z.array(z.string()).optional(),
    totalUnits: z.number(),
    note: z.string().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('ticket'),
    ticketId: z.string(),
    subject: z.string(),
    status: z.string(),
    from: z.string().optional(),
    messages: z.array(z.object({ author: z.enum(['artist', 'admin', 'system']), text: z.string(), at: z.string() })).max(20),
  }),
  z.object({
    ...base,
    kind: z.literal('waitlist_table'),
    rows: z.array(z.object({ id: z.string(), email: z.string(), role: z.string().optional(), project: z.string().optional(), at: z.string(), status: z.string(), prompt: z.string().optional() })).max(50),
    total: z.number().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('sales_summary'),
    period: z.string(),
    orders: z.number(),
    grossCents: z.number(),
    transferCents: z.number(),
    topProducts: z.array(z.object({ name: z.string(), qty: z.number(), grossCents: z.number() })).max(5),
    series: z.array(z.object({ day: z.string(), grossCents: z.number() })).max(31).optional(),
  }),
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

/** State carried by the 'product' project card (right-hand / top-bar pill). */
export interface ProductProjectState {
  productId: string;
  name: string;
  blankCode: string;
  blankName: string;
  imageUrl?: string;
  colours: { code: string; name: string; hex: string; mockupUrl?: string }[];
  sizes: string[];
  printService: string;
  placement?: string;
  baseCostCents?: number;
  retailPriceCents?: number;
  marginCents?: number;
  status: 'draft' | 'proof_pending' | 'live' | 'archived';
  proofStatus?: 'pending' | 'approved' | 'changes_requested';
}
