import { pgTable, text, boolean, integer, serial, jsonb, timestamp, uuid, pgEnum, index, primaryKey, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', ['artist', 'admin']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled']);
export const orderTypeEnum = pgEnum('order_type', ['pod', 'bulk']);
export const productionStatusEnum = pgEnum('production_status', ['queued', 'printing', 'packed', 'shipped', 'delivered']);
export const agentNameEnum = pgEnum('agent_name', ['Leopoldo', 'Francisca', 'Antônia']);

// Support / Human Handoff Enums
export const ticketStatusEnum = pgEnum('ticket_status', [
  'pending',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
]);
export const ticketPriorityEnum = pgEnum('ticket_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);
export const senderTypeEnum = pgEnum('sender_type', [
  'user',
  'ai',
  'human',
  'system',
]);

// GDPR Enums
export const consentTypeEnum = pgEnum('consent_type', ['essential', 'analytics', 'marketing']);
export const requestTypeEnum = pgEnum('request_type', ['access', 'deletion', 'portability']);
export const requestStatusEnum = pgEnum('request_status', ['pending', 'completed', 'rejected']);
export const consentMethodEnum = pgEnum('consent_method', ['explicit_opt_in', 'implicit', 'withdrawn']);
export const breachSeverityEnum = pgEnum('breach_severity', ['low', 'medium', 'high']);
export const supplierOrderStatusEnum = pgEnum('supplier_order_status', ['draft', 'placed', 'confirmed', 'shipped', 'received', 'cancelled']);

// Design / product / commerce Enums
export const designSourceEnum = pgEnum('design_source', ['upload', 'generated', 'edited']);
export const designReadinessEnum = pgEnum('design_readiness', ['ready', 'needs_cleanup', 'blocked']);
export const productStatusEnum = pgEnum('product_status', ['draft', 'proof_pending', 'live', 'archived']);
export const proofStatusEnum = pgEnum('proof_status', ['pending', 'approved', 'changes_requested']);
export const bulkOrderStatusEnum = pgEnum('bulk_order_status', [
  'quoted',
  'proof_pending',
  'awaiting_payment',
  'paid',
  'in_production',
  'shipped',
  'delivered',
  'cancelled',
]);
export const domainStatusEnum = pgEnum('domain_status', ['pending', 'verifying', 'active', 'error']);

// Agent runtime Enums
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'tool']);
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'discord', 'inapp']);
export const projectKindEnum = pgEnum('project_kind', ['onboarding', 'product', 'bulk_order']);

// Users Table
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkId: text('clerk_id').notNull().unique(), // Connected to Clerk
    email: text('email').notNull(),
    displayName: text('display_name'),
    role: userRoleEnum('role').default('artist').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeConnectId: text('stripe_connect_id'), // For Stripe Connect payouts
    imageUrl: text('image_url'),
    discordUserId: text('discord_user_id'),
    locale: text('locale').default('en'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Artist Stores Table
export const artistStores = pgTable('artist_stores', {
    id: uuid('id').defaultRandom().primaryKey(),
    artistId: uuid('artist_id').references(() => users.id).notNull(), // Foreign Key
    slug: text('slug').notNull().unique(), // e.g. "iron-casket"
    name: text('name').notNull(),
    isLive: boolean('is_live').default(false).notNull(),
    themeConfig: jsonb('theme_config'), // Flexible JSON for colors/fonts
    isPublished: boolean('is_published').default(false).notNull(),
    publishedAt: timestamp('published_at'),
    accentColour: text('accent_colour'),
    logoUrl: text('logo_url'),
    bannerUrl: text('banner_url'),
    about: text('about'),
    socials: jsonb('socials'),
    country: text('country'), // ISO-2
    currency: text('currency').default('EUR'),
    locale: text('locale').default('en'),
    memory: jsonb('memory'), // Agent's remembered facts about this store
    customDomain: text('custom_domain').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    artistIdIdx: index('artist_stores_artist_id_idx').on(table.artistId),
}));

// Shop Customization Table
export const shopCustomizations = pgTable('shop_customizations', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id, { onDelete: 'cascade' }).notNull().unique(),
    sliderImages: jsonb('slider_images').default([]),
    backgroundColor: text('background_color').default('#0A0A0A'),
    textColor: text('text_color').default('#FFFFFF'),
    aboutText: text('about_text'),
    socialLinks: jsonb('social_links').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    storeIdIdx: index('shop_customizations_store_id_idx').on(table.storeId),
}));

// ============================================================================
// BLANK CATALOG (garments we can print on — seeded from platform/lib/catalog)
// ============================================================================

// Print Services Table (screen print, DTG, embroidery, ...)
export const printServices = pgTable('print_services', {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(), // 'screen_1c', 'screen_2c', 'screen_3c', 'dtg', 'embroidery'
    name: text('name').notNull(),
    maxColours: integer('max_colours'),
    positions: jsonb('positions').default([]), // ['front', 'back', 'sleeve']
    setupCents: integer('setup_cents').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
});

// Colours Table (supplier colourways)
export const colours = pgTable('colours', {
    code: text('code').primaryKey(), // 'C002'
    name: text('name').notNull(),
    hex: text('hex'),
    isLight: boolean('is_light').default(false).notNull(),
    displayOrder: integer('display_order'),
});

// Blanks Table (blank garments — one row per supplier style code)
export const blanks = pgTable('blanks', {
    code: text('code').primaryKey(), // 'STTU169'
    name: text('name').notNull(), // catalog name e.g. 'T-shirt'
    supplierName: text('supplier_name'), // 'Creator 2.0'
    description: text('description'),
    type: text('type').notNull(), // canonical English category (catalog typeFor)
    fit: text('fit'), // catalog fitFor
    composition: text('composition'),
    weightGsm: integer('weight_gsm'),
    certifications: jsonb('certifications').default([]), // string[]
    details: jsonb('details').default([]), // string[] (extra detail-shot URLs)
    frontImageUrl: text('front_image_url'),
    backImageUrl: text('back_image_url'),
    videoUrl: text('video_url'),
    isActive: boolean('is_active').default(true).notNull(),
    displayOrder: integer('display_order'),
}, (table) => ({
    typeIdx: index('blanks_type_idx').on(table.type),
}));

// Blank Colours Table (which colourways exist for which blank, + mockup shots)
export const blankColours = pgTable('blank_colours', {
    blankCode: text('blank_code').references(() => blanks.code, { onDelete: 'cascade' }).notNull(),
    colourCode: text('colour_code').references(() => colours.code).notNull(),
    frontImageUrl: text('front_image_url'),
    backImageUrl: text('back_image_url'),
}, (table) => [
    primaryKey({ columns: [table.blankCode, table.colourCode] }),
]);

// Blank Sizes Table (which sizes exist for which blank)
export const blankSizes = pgTable('blank_sizes', {
    blankCode: text('blank_code').references(() => blanks.code, { onDelete: 'cascade' }).notNull(),
    size: text('size').notNull(),
    displayOrder: integer('display_order'),
}, (table) => [
    primaryKey({ columns: [table.blankCode, table.size] }),
]);

// Size Guides Table (garment measurement tables, one per blank)
export const sizeGuides = pgTable('size_guides', {
    blankCode: text('blank_code').primaryKey().references(() => blanks.code, { onDelete: 'cascade' }),
    unit: text('unit').default('cm'),
    columns: jsonb('columns').default([]), // string[] — measurement names
    rows: jsonb('rows').default([]), // { size, values[] }[]
});

// Blank Print Services Table (which print techniques are offered per blank)
export const blankPrintServices = pgTable('blank_print_services', {
    blankCode: text('blank_code').references(() => blanks.code, { onDelete: 'cascade' }).notNull(),
    printServiceCode: text('print_service_code').references(() => printServices.code).notNull(),
}, (table) => [
    primaryKey({ columns: [table.blankCode, table.printServiceCode] }),
]);

// Base Costs Table (garment + print + margin, per blank x print service x qty break)
export const baseCosts = pgTable('base_costs', {
    id: uuid('id').defaultRandom().primaryKey(),
    blankCode: text('blank_code').references(() => blanks.code, { onDelete: 'cascade' }).notNull(),
    printServiceCode: text('print_service_code').references(() => printServices.code).notNull(),
    qtyFrom: integer('qty_from').default(1).notNull(),
    garmentCostCents: integer('garment_cost_cents').notNull(),
    printCostCents: integer('print_cost_cents').notNull(),
    marginCents: integer('margin_cents').notNull(),
    totalCents: integer('total_cents').generatedAlwaysAs(
        sql`garment_cost_cents + print_cost_cents + margin_cents`
    ),
    currency: text('currency').default('EUR').notNull(),
    validFrom: timestamp('valid_from').defaultNow().notNull(),
    validTo: timestamp('valid_to'),
}, (table) => [
    unique('base_costs_blank_service_qty_unique').on(table.blankCode, table.printServiceCode, table.qtyFrom),
]);

// ============================================================================
// DESIGNS
// ============================================================================

export const designs = pgTable('designs', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id).notNull(),
    source: designSourceEnum('source').notNull(),
    originalUrl: text('original_url'),
    printUrl: text('print_url'), // cleaned/upscaled
    previewUrl: text('preview_url'),
    widthPx: integer('width_px'),
    heightPx: integer('height_px'),
    dpiAtPrint: integer('dpi_at_print'),
    hasAlpha: boolean('has_alpha'),
    readiness: designReadinessEnum('readiness'),
    readinessNotes: text('readiness_notes'),
    parentDesignId: uuid('parent_design_id'), // self-ref, left unconstrained (see categories.parentId precedent)
    generationParams: jsonb('generation_params'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    storeIdIdx: index('designs_store_id_idx').on(table.storeId),
}));

// ============================================================================
// COLLECTIONS & PRODUCTS
// ============================================================================

// Collections Table (artist-defined groupings of products)
export const collections = pgTable('collections', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isVisible: boolean('is_visible').default(true).notNull(),
}, (table) => [
    unique('collections_store_id_slug_unique').on(table.storeId, table.slug),
]);

// Products Table (an artist's design printed on a blank, for sale in their shop)
export const products = pgTable('products', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id).notNull(),
    designId: uuid('design_id').references(() => designs.id),
    blankCode: text('blank_code').references(() => blanks.code).notNull(),
    printServiceCode: text('print_service_code').references(() => printServices.code).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    placement: jsonb('placement'), // { position, widthCm, offsetYcm }
    baseCostCents: integer('base_cost_cents'), // snapshot at creation time
    retailPriceCents: integer('retail_price_cents'),
    status: productStatusEnum('status').default('draft').notNull(),
    collectionId: uuid('collection_id').references(() => collections.id),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    storeIdIdx: index('products_store_id_idx').on(table.storeId),
}));

// Product Colours Table (enabled colourways per product)
export const productColours = pgTable('product_colours', {
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
    colourCode: text('colour_code').references(() => colours.code).notNull(),
    mockupUrl: text('mockup_url'),
}, (table) => [
    primaryKey({ columns: [table.productId, table.colourCode] }),
]);

// Product Sizes Table (enabled sizes per product)
export const productSizes = pgTable('product_sizes', {
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
    size: text('size').notNull(),
}, (table) => [
    primaryKey({ columns: [table.productId, table.size] }),
]);

// ============================================================================
// ORDERS
// ============================================================================

// Orders Table
export const orders = pgTable('orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id).notNull(),
    // Nullable: POD fan orders have no account (email-only, order lookup by token).
    customerId: uuid('customer_id').references(() => users.id),
    orderType: orderTypeEnum('order_type').default('pod').notNull(),
    status: orderStatusEnum('status').default('pending').notNull(),
    totalAmount: integer('total_amount').notNull(), // In cents
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    shippingAddress: jsonb('shipping_address'), // Address blob
    fanEmail: text('fan_email'),
    shippingCents: integer('shipping_cents').default(0).notNull(),
    taxCents: integer('tax_cents').default(0).notNull(),
    applicationFeeCents: integer('application_fee_cents').default(0).notNull(),
    transferCents: integer('transfer_cents').default(0).notNull(),
    stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
    stripeTransferId: text('stripe_transfer_id'),
    productionStatus: productionStatusEnum('production_status'),
    tracking: jsonb('tracking'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    customerIdIdx: index('orders_customer_id_idx').on(table.customerId),
    stripePaymentIntentIdIdx: index('orders_stripe_payment_intent_id_idx').on(table.stripePaymentIntentId),
    statusIdx: index('orders_status_idx').on(table.status),
    orderTypeIdx: index('orders_order_type_idx').on(table.orderType),
}));

// Order Items Table
export const orderItems = pgTable('order_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    productId: uuid('product_id').references(() => products.id).notNull(),
    quantity: integer('quantity').notNull(),
    priceAtPurchase: integer('price_at_purchase').notNull(),
    colourCode: text('colour_code'),
    size: text('size'),
    unitBaseCostCents: integer('unit_base_cost_cents'),
}, (table) => ({
    orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
    productIdIdx: index('order_items_product_id_idx').on(table.productId),
}));

// Bulk Orders Table (an artist ordering a run for themselves)
export const bulkOrders = pgTable('bulk_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id).notNull(),
    quote: jsonb('quote'), // lines, qty breaks, unit cost, total
    status: bulkOrderStatusEnum('status').default('quoted').notNull(),
    shipTo: jsonb('ship_to'),
    orderId: uuid('order_id').references(() => orders.id), // set after payment
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Proofs Table (mockup approval for a product or bulk order)
export const proofs = pgTable('proofs', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => products.id),
    bulkOrderId: uuid('bulk_order_id').references(() => bulkOrders.id),
    version: integer('version').default(1).notNull(),
    mockupUrls: jsonb('mockup_urls'),
    spec: jsonb('spec'),
    status: proofStatusEnum('status').default('pending').notNull(),
    notes: text('notes'),
    approvedAt: timestamp('approved_at'),
    approvedBy: uuid('approved_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// MONEY
// ============================================================================

// Payout Ledger Table (Stripe Connect destination-charge audit trail)
export const payoutLedger = pgTable('payout_ledger', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    storeId: uuid('store_id').references(() => artistStores.id).notNull(),
    stripeChargeId: text('stripe_charge_id'),
    stripeTransferId: text('stripe_transfer_id'),
    grossCents: integer('gross_cents').notNull(),
    feeCents: integer('fee_cents').notNull(), // our base cost
    transferCents: integer('transfer_cents').notNull(),
    stripeFeeCents: integer('stripe_fee_cents'),
    status: text('status').notNull(),
    anomalyFlags: jsonb('anomaly_flags').default([]), // string[]
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Stripe Accounts Table (Connect Express onboarding status per store)
export const stripeAccounts = pgTable('stripe_accounts', {
    storeId: uuid('store_id').primaryKey().references(() => artistStores.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull().unique(),
    chargesEnabled: boolean('charges_enabled').default(false).notNull(),
    payoutsEnabled: boolean('payouts_enabled').default(false).notNull(),
    requirements: jsonb('requirements'),
    lastSyncedAt: timestamp('last_synced_at'),
});

// Custom Domains Table
export const customDomains = pgTable('custom_domains', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id).notNull(),
    hostname: text('hostname').notNull().unique(),
    status: domainStatusEnum('status').default('pending').notNull(),
    vercelDomainId: text('vercel_domain_id'),
    verification: jsonb('verification'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// AGENT RUNTIME (conversations, messages, tools, notifications, project cards)
// ============================================================================

export const conversations = pgTable('conversations', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    roleAtTime: userRoleEnum('role_at_time'),
    title: text('title'),
    summary: text('summary'),
    lastMessageAt: timestamp('last_message_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('conversations_user_id_idx').on(table.userId),
}));

export const messages = pgTable('messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
    role: messageRoleEnum('role').notNull(),
    content: jsonb('content').notNull(), // Anthropic content blocks + ui cards
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    conversationIdCreatedAtIdx: index('messages_conversation_id_created_at_idx').on(table.conversationId, table.createdAt),
}));

export const toolInvocations = pgTable('tool_invocations', {
    id: uuid('id').defaultRandom().primaryKey(),
    messageId: uuid('message_id').references(() => messages.id),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
    toolName: text('tool_name').notNull(),
    input: jsonb('input'),
    output: jsonb('output'),
    status: text('status').notNull(), // 'ok' | 'error' | 'pending_confirm' | 'cancelled'
    confirmedBy: uuid('confirmed_by'),
    confirmedAt: timestamp('confirmed_at'),
    idempotencyKey: text('idempotency_key').unique(),
    durationMs: integer('duration_ms'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    conversationIdIdx: index('tool_invocations_conversation_id_idx').on(table.conversationId),
}));

export const notifications = pgTable('notifications', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    event: text('event').notNull(),
    payload: jsonb('payload'),
    status: text('status').default('pending').notNull(),
    readAt: timestamp('read_at'),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
}));

export const notificationPrefs = pgTable('notification_prefs', {
    userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    discordDm: boolean('discord_dm').default(true).notNull(),
    email: boolean('email').default(true).notNull(),
    discordUserId: text('discord_user_id'),
});

// Project Cards Table (the persistent right-hand card mirroring a conversation's state)
export const projectCards = pgTable('project_cards', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
    kind: projectKindEnum('kind').notNull(),
    refId: uuid('ref_id'),
    state: jsonb('state'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
    unique('project_cards_conversation_id_unique').on(table.conversationId),
]);

// ============================================================================
// SHIPPING
// ============================================================================

export const shippingZones = pgTable('shipping_zones', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    countries: jsonb('countries').default([]), // string[] (ISO-2), [] means "rest of world"
    flatCents: integer('flat_cents').notNull(),
    freeOverCents: integer('free_over_cents'),
    isActive: boolean('is_active').default(true).notNull(),
});

// ============================================================================
// GDPR
// ============================================================================

// GDPR Consents Table
export const consents = pgTable('consents', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    consentType: consentTypeEnum('consent_type').notNull(),
    granted: boolean('granted').notNull(),
    grantedAt: timestamp('granted_at'),
    withdrawnAt: timestamp('withdrawn_at'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    consentVersion: text('consent_version').default('1.0').notNull(),
    method: consentMethodEnum('method').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// GDPR Data Subject Requests Table
export const dataSubjectRequests = pgTable('data_subject_requests', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    requestType: requestTypeEnum('request_type').notNull(),
    status: requestStatusEnum('status').default('pending').notNull(),
    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// GDPR Data Breach Logs Table
export const dataBreachLogs = pgTable('data_breach_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    severity: breachSeverityEnum('severity').notNull(),
    affectedCount: integer('affected_count').notNull(),
    dataTypes: text('data_types').notNull(), // JSON array of affected data types
    description: text('description').notNull(),
    notifiedAt: timestamp('notified_at'),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Waitlist Signups Table
//
// Superset of the table the retired website-v3 waitlist form created for
// itself: `id serial primary key, email text not null, product text,
// colour text, created_at timestamptz default now(), role text,
// favourites text`. Column names/types/nullability for those six match
// exactly so a plain INSERT of those columns (which never mentions the
// approval columns below) keeps working against this table.
export const waitlistSignups = pgTable('waitlist_signups', {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    product: text('product'),
    colour: text('colour'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    role: text('role'),
    favourites: text('favourites'),
    // Everything from here down is ours: waitlist approval -> invite ->
    // registration gating (Platform-Plan §7).
    status: text('status').default('pending').notNull(), // 'pending' | 'approved' | 'rejected' | 'registered'
    inviteToken: text('invite_token').unique(),
    invitedAt: timestamp('invited_at'),
    approvedAt: timestamp('approved_at'),
    registeredUserId: uuid('registered_user_id'),
    notes: text('notes'),
}, (table) => ({
    statusIdx: index('waitlist_signups_status_idx').on(table.status),
    emailIdx: index('waitlist_signups_email_idx').on(table.email),
}));

// ============================================================================
// SUPPORT / HUMAN HANDOFF TABLES
// ============================================================================

// Support Tickets (Human handoff queue)
export const supportTickets = pgTable('support_tickets', {
    id: uuid('id').defaultRandom().primaryKey(),
    // Was a FK to the now-removed chatSessions table; kept as a plain id (no
    // referential integrity) since chatSessions is superseded by conversations.
    sessionId: uuid('session_id'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    visitorToken: text('visitor_token'), // For anonymous users from mainpage
    agentId: agentNameEnum('agent_id').notNull(), // Which AI agent was active
    // Was a FK to the now-removed staff table (no human-handoff routing in MVP;
    // admin is the human); kept as a plain id.
    assignedStaffId: uuid('assigned_staff_id'),
    status: ticketStatusEnum('status').default('pending').notNull(),
    priority: ticketPriorityEnum('priority').default('medium').notNull(),
    subject: text('subject').notNull(),
    description: text('description'),
    source: text('source').default('chat').notNull(), // 'chat', 'email', 'discord', etc.
    contactEmail: text('contact_email'), // For reaching user if they leave
    visitorName: text('visitor_name'),   // Optional name for anonymous users
    estimatedWaitMinutes: integer('estimated_wait_minutes'),
    metadata: jsonb('metadata'), // Chat snapshot, context, etc.
    assignedAt: timestamp('assigned_at'),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    statusIdx: index('support_tickets_status_idx').on(table.status),
    agentIdIdx: index('support_tickets_agent_id_idx').on(table.agentId),
    assignedStaffIdIdx: index('support_tickets_assigned_staff_id_idx').on(table.assignedStaffId),
    userIdIdx: index('support_tickets_user_id_idx').on(table.userId),
    visitorTokenIdx: index('support_tickets_visitor_token_idx').on(table.visitorToken),
    createdAtIdx: index('support_tickets_created_at_idx').on(table.createdAt),
}));

// Ticket Messages (conversation within a support ticket)
export const ticketMessages = pgTable('ticket_messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id').references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
    senderType: senderTypeEnum('sender_type').notNull(),
    senderId: uuid('sender_id'), // FK to users.id or staff.id depending on senderType
    content: text('content').notNull(),
    isInternal: boolean('is_internal').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    ticketIdIdx: index('ticket_messages_ticket_id_idx').on(table.ticketId),
    senderTypeIdx: index('ticket_messages_sender_type_idx').on(table.senderType),
    createdAtIdx: index('ticket_messages_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// SUPPLIER ORDERS (Purchase Orders to suppliers)
// ============================================================================

// Supplier Orders Table (POs to Stanley/Stella, etc.)
export const supplierOrders = pgTable('supplier_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    poNumber: text('po_number').notNull().unique(), // "PO-2026-0042"
    supplierName: text('supplier_name').notNull(), // "Stanley Stella", "Gildan"
    orderDate: timestamp('order_date').defaultNow().notNull(),
    expectedDeliveryDate: timestamp('expected_delivery_date'),
    status: supplierOrderStatusEnum('status').default('draft').notNull(),
    totalCostEur: integer('total_cost_eur').default(0).notNull(), // In cents
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    poNumberIdx: index('supplier_orders_po_number_idx').on(table.poNumber),
    statusIdx: index('supplier_orders_status_idx').on(table.status),
    supplierNameIdx: index('supplier_orders_supplier_name_idx').on(table.supplierName),
}));

// Supplier Order Items Table (line items per PO)
export const supplierOrderItems = pgTable('supplier_order_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => supplierOrders.id, { onDelete: 'cascade' }).notNull(),
    // Was a FK to the now-removed productVariants table (legacy catalog); the
    // blank catalog has no single "variant id" equivalent, so this is kept as
    // a plain id (blank/colour/size are tracked by the caller).
    variantId: uuid('variant_id').notNull(),
    quantity: integer('quantity').notNull(),
    unitCostEur: integer('unit_cost_eur').notNull(), // In cents
    receivedQuantity: integer('received_quantity').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    orderIdIdx: index('supplier_order_items_order_id_idx').on(table.orderId),
    variantIdIdx: index('supplier_order_items_variant_id_idx').on(table.variantId),
}));

// ─── App Settings ───────────────────────────────────────────────────────────

export const appSettings = pgTable('app_settings', {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull().unique(),
    value: text('value').notNull(),
    valueJson: jsonb('value_json'),
    description: text('description'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    keyIdx: index('app_settings_key_idx').on(table.key),
}));

// Webhook Idempotency Table
export const processedWebhookEvents = pgTable('processed_webhook_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    provider: text('provider').notNull(), // 'stripe', 'clerk', etc.
    eventId: text('event_id').notNull(),
    objectId: text('object_id'), // e.g. order ID, user ID
    processedAt: timestamp('processed_at').defaultNow().notNull(),
}, (table) => [
    unique('processed_webhook_events_provider_event_unique').on(table.provider, table.eventId),
]);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many, one }) => ({
    stores: many(artistStores),
    orders: many(orders),
    conversations: many(conversations),
    notifications: many(notifications),
    notificationPrefs: one(notificationPrefs, {
        fields: [users.id],
        references: [notificationPrefs.userId],
    }),
    consents: many(consents),
    dataSubjectRequests: many(dataSubjectRequests),
}));

export const artistStoresRelations = relations(artistStores, ({ one, many }) => ({
    artist: one(users, {
        fields: [artistStores.artistId],
        references: [users.id],
    }),
    products: many(products),
    orders: many(orders),
    designs: many(designs),
    collections: many(collections),
    bulkOrders: many(bulkOrders),
    customDomains: many(customDomains),
    payoutLedger: many(payoutLedger),
    stripeAccount: one(stripeAccounts, {
        fields: [artistStores.id],
        references: [stripeAccounts.storeId],
    }),
    shopCustomization: one(shopCustomizations, {
        fields: [artistStores.id],
        references: [shopCustomizations.storeId],
    }),
}));

export const shopCustomizationsRelations = relations(shopCustomizations, ({ one }) => ({
    store: one(artistStores, {
        fields: [shopCustomizations.storeId],
        references: [artistStores.id],
    }),
}));

// Blank catalog relations
export const printServicesRelations = relations(printServices, ({ many }) => ({
    blankPrintServices: many(blankPrintServices),
    baseCosts: many(baseCosts),
    products: many(products),
}));

export const coloursRelations = relations(colours, ({ many }) => ({
    blankColours: many(blankColours),
    productColours: many(productColours),
}));

export const blanksRelations = relations(blanks, ({ one, many }) => ({
    blankColours: many(blankColours),
    blankSizes: many(blankSizes),
    sizeGuide: one(sizeGuides, {
        fields: [blanks.code],
        references: [sizeGuides.blankCode],
    }),
    blankPrintServices: many(blankPrintServices),
    baseCosts: many(baseCosts),
    products: many(products),
}));

export const blankColoursRelations = relations(blankColours, ({ one }) => ({
    blank: one(blanks, {
        fields: [blankColours.blankCode],
        references: [blanks.code],
    }),
    colour: one(colours, {
        fields: [blankColours.colourCode],
        references: [colours.code],
    }),
}));

export const blankSizesRelations = relations(blankSizes, ({ one }) => ({
    blank: one(blanks, {
        fields: [blankSizes.blankCode],
        references: [blanks.code],
    }),
}));

export const sizeGuidesRelations = relations(sizeGuides, ({ one }) => ({
    blank: one(blanks, {
        fields: [sizeGuides.blankCode],
        references: [blanks.code],
    }),
}));

export const blankPrintServicesRelations = relations(blankPrintServices, ({ one }) => ({
    blank: one(blanks, {
        fields: [blankPrintServices.blankCode],
        references: [blanks.code],
    }),
    printService: one(printServices, {
        fields: [blankPrintServices.printServiceCode],
        references: [printServices.code],
    }),
}));

export const baseCostsRelations = relations(baseCosts, ({ one }) => ({
    blank: one(blanks, {
        fields: [baseCosts.blankCode],
        references: [blanks.code],
    }),
    printService: one(printServices, {
        fields: [baseCosts.printServiceCode],
        references: [printServices.code],
    }),
}));

// Designs / collections / products relations
export const designsRelations = relations(designs, ({ one, many }) => ({
    store: one(artistStores, {
        fields: [designs.storeId],
        references: [artistStores.id],
    }),
    products: many(products),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
    store: one(artistStores, {
        fields: [collections.storeId],
        references: [artistStores.id],
    }),
    products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
    store: one(artistStores, {
        fields: [products.storeId],
        references: [artistStores.id],
    }),
    design: one(designs, {
        fields: [products.designId],
        references: [designs.id],
    }),
    blank: one(blanks, {
        fields: [products.blankCode],
        references: [blanks.code],
    }),
    printService: one(printServices, {
        fields: [products.printServiceCode],
        references: [printServices.code],
    }),
    collection: one(collections, {
        fields: [products.collectionId],
        references: [collections.id],
    }),
    colours: many(productColours),
    sizes: many(productSizes),
    orderItems: many(orderItems),
    proofs: many(proofs),
}));

export const productColoursRelations = relations(productColours, ({ one }) => ({
    product: one(products, {
        fields: [productColours.productId],
        references: [products.id],
    }),
    colour: one(colours, {
        fields: [productColours.colourCode],
        references: [colours.code],
    }),
}));

export const productSizesRelations = relations(productSizes, ({ one }) => ({
    product: one(products, {
        fields: [productSizes.productId],
        references: [products.id],
    }),
}));

// Orders / bulk orders / proofs relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
    store: one(artistStores, {
        fields: [orders.storeId],
        references: [artistStores.id],
    }),
    customer: one(users, {
        fields: [orders.customerId],
        references: [users.id],
    }),
    items: many(orderItems),
    bulkOrder: one(bulkOrders, {
        fields: [orders.id],
        references: [bulkOrders.orderId],
    }),
    payoutLedger: many(payoutLedger),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    product: one(products, {
        fields: [orderItems.productId],
        references: [products.id],
    }),
}));

export const bulkOrdersRelations = relations(bulkOrders, ({ one, many }) => ({
    store: one(artistStores, {
        fields: [bulkOrders.storeId],
        references: [artistStores.id],
    }),
    order: one(orders, {
        fields: [bulkOrders.orderId],
        references: [orders.id],
    }),
    proofs: many(proofs),
}));

export const proofsRelations = relations(proofs, ({ one }) => ({
    product: one(products, {
        fields: [proofs.productId],
        references: [products.id],
    }),
    bulkOrder: one(bulkOrders, {
        fields: [proofs.bulkOrderId],
        references: [bulkOrders.id],
    }),
    approvedByUser: one(users, {
        fields: [proofs.approvedBy],
        references: [users.id],
    }),
}));

// Money relations
export const payoutLedgerRelations = relations(payoutLedger, ({ one }) => ({
    order: one(orders, {
        fields: [payoutLedger.orderId],
        references: [orders.id],
    }),
    store: one(artistStores, {
        fields: [payoutLedger.storeId],
        references: [artistStores.id],
    }),
}));

export const stripeAccountsRelations = relations(stripeAccounts, ({ one }) => ({
    store: one(artistStores, {
        fields: [stripeAccounts.storeId],
        references: [artistStores.id],
    }),
}));

export const customDomainsRelations = relations(customDomains, ({ one }) => ({
    store: one(artistStores, {
        fields: [customDomains.storeId],
        references: [artistStores.id],
    }),
}));

// Agent runtime relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    user: one(users, {
        fields: [conversations.userId],
        references: [users.id],
    }),
    messages: many(messages),
    projectCards: many(projectCards),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
    }),
    toolInvocations: many(toolInvocations),
}));

export const toolInvocationsRelations = relations(toolInvocations, ({ one }) => ({
    message: one(messages, {
        fields: [toolInvocations.messageId],
        references: [messages.id],
    }),
    conversation: one(conversations, {
        fields: [toolInvocations.conversationId],
        references: [conversations.id],
    }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));

export const notificationPrefsRelations = relations(notificationPrefs, ({ one }) => ({
    user: one(users, {
        fields: [notificationPrefs.userId],
        references: [users.id],
    }),
}));

export const projectCardsRelations = relations(projectCards, ({ one }) => ({
    conversation: one(conversations, {
        fields: [projectCards.conversationId],
        references: [conversations.id],
    }),
}));

// GDPR relations
export const consentsRelations = relations(consents, ({ one }) => ({
    user: one(users, {
        fields: [consents.userId],
        references: [users.id],
    }),
}));

export const dataSubjectRequestsRelations = relations(dataSubjectRequests, ({ one }) => ({
    user: one(users, {
        fields: [dataSubjectRequests.userId],
        references: [users.id],
    }),
}));

// Support / Human Handoff Relations
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
    user: one(users, {
        fields: [supportTickets.userId],
        references: [users.id],
    }),
    messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
    ticket: one(supportTickets, {
        fields: [ticketMessages.ticketId],
        references: [supportTickets.id],
    }),
}));

// Supplier Orders Relations
export const supplierOrdersRelations = relations(supplierOrders, ({ many }) => ({
    items: many(supplierOrderItems),
}));

export const supplierOrderItemsRelations = relations(supplierOrderItems, ({ one }) => ({
    order: one(supplierOrders, {
        fields: [supplierOrderItems.orderId],
        references: [supplierOrders.id],
    }),
}));

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type User = typeof users.$inferSelect;
export type ArtistStore = typeof artistStores.$inferSelect;
export type ShopCustomization = typeof shopCustomizations.$inferSelect;
export type PrintService = typeof printServices.$inferSelect;
export type Colour = typeof colours.$inferSelect;
export type Blank = typeof blanks.$inferSelect;
export type BlankColour = typeof blankColours.$inferSelect;
export type BlankSize = typeof blankSizes.$inferSelect;
export type SizeGuide = typeof sizeGuides.$inferSelect;
export type BlankPrintService = typeof blankPrintServices.$inferSelect;
export type BaseCost = typeof baseCosts.$inferSelect;
export type Design = typeof designs.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductColour = typeof productColours.$inferSelect;
export type ProductSize = typeof productSizes.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type BulkOrder = typeof bulkOrders.$inferSelect;
export type Proof = typeof proofs.$inferSelect;
export type PayoutLedgerEntry = typeof payoutLedger.$inferSelect;
export type StripeAccount = typeof stripeAccounts.$inferSelect;
export type CustomDomain = typeof customDomains.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ToolInvocation = typeof toolInvocations.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NotificationPrefs = typeof notificationPrefs.$inferSelect;
export type ProjectCard = typeof projectCards.$inferSelect;
export type ShippingZone = typeof shippingZones.$inferSelect;
export type Consent = typeof consents.$inferSelect;
export type DataSubjectRequest = typeof dataSubjectRequests.$inferSelect;
export type DataBreachLog = typeof dataBreachLogs.$inferSelect;
export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type SupplierOrder = typeof supplierOrders.$inferSelect;
export type SupplierOrderItem = typeof supplierOrderItems.$inferSelect;
export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
