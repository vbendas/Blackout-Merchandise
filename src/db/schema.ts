import { pgTable, text, boolean, integer, jsonb, timestamp, uuid, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['artist', 'customer', 'admin']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled']);
export const agentNameEnum = pgEnum('agent_name', ['Leopoldo', 'Francisca', 'Antônia']);

// Support / Human Handoff Enums
export const staffRoleEnum = pgEnum('staff_role', [
  'head_of_operations',
  'head_of_design',
  'head_of_customer_success',
  'support_agent',
  'admin',
  'viewer',
]);
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

// Users Table
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkId: text('clerk_id').notNull().unique(), // Connected to Clerk
    email: text('email').notNull(),
    displayName: text('display_name'),
    role: userRoleEnum('role').default('customer').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeConnectId: text('stripe_connect_id'), // For Stripe Connect payouts
    imageUrl: text('image_url'),
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

// Products Table
export const products = pgTable('products', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    baseCost: integer('base_cost').notNull(), // In cents
    retailPrice: integer('retail_price').notNull(), // In cents
    mockupUrl: text('mockup_url').notNull(),
    designFileUrl: text('design_file_url'), // Private URL
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    storeIdIdx: index('products_store_id_idx').on(table.storeId),
}));

// Orders Table
export const orders = pgTable('orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id').references(() => artistStores.id).notNull(),
    customerId: uuid('customer_id').references(() => users.id).notNull(),
    status: orderStatusEnum('status').default('pending').notNull(),
    totalAmount: integer('total_amount').notNull(), // In cents
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    shippingAddress: jsonb('shipping_address'), // Address blob
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    customerIdIdx: index('orders_customer_id_idx').on(table.customerId),
    stripePaymentIntentIdIdx: index('orders_stripe_payment_intent_id_idx').on(table.stripePaymentIntentId),
    statusIdx: index('orders_status_idx').on(table.status),
}));

// Order Items Table
export const orderItems = pgTable('order_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    productId: uuid('product_id').references(() => products.id).notNull(),
    quantity: integer('quantity').notNull(),
    priceAtPurchase: integer('price_at_purchase').notNull(),
}, (table) => ({
    orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
    productIdIdx: index('order_items_product_id_idx').on(table.productId),
}));

// Chat Sessions Table (for AI Context)
export const chatSessions = pgTable('chat_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    messages: jsonb('messages').notNull(), // Using JSONB for array of message objects
    supportTicketId: uuid('support_ticket_id'),
    humanHandoffRequestedAt: timestamp('human_handoff_requested_at'),
    humanHandoffStatus: text('human_handoff_status'), // 'pending' | 'assigned' | 'joined' | 'resolved'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index('chat_sessions_user_id_idx').on(table.userId),
    supportTicketIdIdx: index('chat_sessions_support_ticket_id_idx').on(table.supportTicketId),
}));

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

// Waitlist Table (Enhanced for AI Interview)
export const waitlist = pgTable('waitlist', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    socialLink: text('social_link'), // Twitter, Instagram, TikTok URL
    followerRange: text('follower_range'), // "1k-5k", "5k-10k", "10k-50k", "50k-100k", "100k+"
    interviewResponses: jsonb('interview_responses'), // { question1: answer1, question2: answer2, ... }
    source: text('source').default('organic').notNull(), // How they found us
    position: integer('position'), // Queue position
    status: text('status').default('pending').notNull(), // pending, approved, rejected, notified
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    notified: boolean('notified').default(false).notNull(),
}, (table) => ({
    statusIdx: index('waitlist_status_idx').on(table.status),
    positionIdx: index('waitlist_position_idx').on(table.position),
}));

// ============================================================================
// SUPPORT / HUMAN HANDOFF TABLES
// ============================================================================

// Staff Table (Human team members)
export const staff = pgTable('staff', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id), // Optional link to app user
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    role: staffRoleEnum('role').notNull(),
    department: text('department'), // e.g. "Operations", "Design", "Support"
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    emailIdx: index('staff_email_idx').on(table.email),
    roleIdx: index('staff_role_idx').on(table.role),
    isActiveIdx: index('staff_is_active_idx').on(table.isActive),
}));

// Agent-to-Staff Assignments (which human handles which AI agent)
export const agentStaffAssignments = pgTable('agent_staff_assignments', {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: agentNameEnum('agent_id').notNull(), // 'Leopoldo', 'Francisca', 'Antônia'
    staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'cascade' }).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    agentIdIdx: index('agent_staff_agent_id_idx').on(table.agentId),
    staffIdIdx: index('agent_staff_staff_id_idx').on(table.staffId),
    // Partial unique index: only one primary assignment per agent
    primaryAssignmentIdx: {
        columns: [table.agentId],
        name: 'agent_staff_primary_unique',
        unique: true,
        where: sql`${table.isPrimary} = true AND ${table.isActive} = true`,
    },
}));

// Support Tickets (Human handoff queue)
export const supportTickets = pgTable('support_tickets', {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    visitorToken: text('visitor_token'), // For anonymous users from mainpage
    agentId: agentNameEnum('agent_id').notNull(), // Which AI agent was active
    assignedStaffId: uuid('assigned_staff_id').references(() => staff.id, { onDelete: 'set null' }),
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

// Product Blanks Table (Catalog of producible items)
export const productBlanks = pgTable('product_blanks', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(), // e.g. "Unisex T-Shirt"
    category: text('category').notNull(), // "apparel", "drinkware", "accessories"
    brand: text('brand').notNull(), // e.g. "Gildan", "Fruit of the Loom"
    sku: text('sku').notNull().unique(),
    baseCost: integer('base_cost').notNull(), // In cents (cost to produce)
    suggestedRetail: integer('suggested_retail').notNull(), // In cents (MSRP)
    imageUrls: jsonb('image_urls').notNull(), // Array of Cloudinary URLs (multiple angles/colors)
    colors: jsonb('colors'), // Array: { name: "Black", hex: "#000000", available: true }
    sizes: jsonb('sizes'), // Array: { size: "XS", minQuantity: 6 }
    specs: jsonb('specs'), // { material: "100% cotton", weight: "6oz", etc }
    sustainabilityBadges: jsonb('sustainability_badges'), // Array of badge names
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    categoryIdx: index('product_blanks_category_idx').on(table.category),
    isActiveIdx: index('product_blanks_is_active_idx').on(table.isActive),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    stores: many(artistStores),
    orders: many(orders),
    chatSessions: many(chatSessions),
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

export const productsRelations = relations(products, ({ one }) => ({
    store: one(artistStores, {
        fields: [products.storeId],
        references: [artistStores.id],
    }),
}));

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

// GDPR Relations
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
export const staffRelations = relations(staff, ({ one, many }) => ({
    user: one(users, {
        fields: [staff.userId],
        references: [users.id],
    }),
    assignedTickets: many(supportTickets),
    agentAssignments: many(agentStaffAssignments),
}));

export const agentStaffAssignmentsRelations = relations(agentStaffAssignments, ({ one }) => ({
    staff: one(staff, {
        fields: [agentStaffAssignments.staffId],
        references: [staff.id],
    }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
    session: one(chatSessions, {
        fields: [supportTickets.sessionId],
        references: [chatSessions.id],
    }),
    user: one(users, {
        fields: [supportTickets.userId],
        references: [users.id],
    }),
    assignedStaff: one(staff, {
        fields: [supportTickets.assignedStaffId],
        references: [staff.id],
    }),
    messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
    ticket: one(supportTickets, {
        fields: [ticketMessages.ticketId],
        references: [supportTickets.id],
    }),
}));

// Chat Sessions Relations (update existing)
export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
    user: one(users, {
        fields: [chatSessions.userId],
        references: [users.id],
    }),
    supportTicket: one(supportTickets, {
        fields: [chatSessions.supportTicketId],
        references: [supportTickets.id],
    }),
}));

// Product Blanks Relations
// ProductBlanks are standalone catalog items (no foreign keys)
// Products table can optionally reference productBlanks for design templates

// Webhook Idempotency Table
export const processedWebhookEvents = pgTable('processed_webhook_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    provider: text('provider').notNull(), // 'stripe', 'clerk', etc.
    eventId: text('event_id').notNull(),
    objectId: text('object_id'), // e.g. order ID, user ID
    processedAt: timestamp('processed_at').defaultNow().notNull(),
}, (table) => ({
    providerEventUnique: { 
        columns: [table.provider, table.eventId],
        name: 'processed_webhook_events_provider_event_unique'
    },
}));

// ============================================================================
// PRODUCT CATALOG TABLES (Single Source of Truth)
// ============================================================================

// Enums for Product Catalog
export const productStatusEnum = pgEnum('product_status', ['active', 'archived', 'discontinued']);
export const variantStatusEnum = pgEnum('variant_status', ['in_stock', 'low_stock', 'out_of_stock', 'discontinued']);
export const productBatchStatusEnum = pgEnum('product_batch_status', ['active', 'sold_out', 'expired']);
export const attributeTypeEnum = pgEnum('attribute_type', ['text', 'number', 'boolean', 'enum', 'json']);

// Categories Table (e.g., T-Shirts, Hoodies, Pants)
export const categories = pgTable('categories', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(), // "T-Shirts", "Hoodies"
    slug: text('slug').notNull().unique(), // "t-shirts", "hoodies"
    description: text('description'),
    parentId: uuid('parent_id'), // For subcategories
    displayOrder: integer('display_order').default(0),
    imageUrl: text('image_url'), // Category hero image
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    slugIdx: index('categories_slug_idx').on(table.slug),
    parentIdIdx: index('categories_parent_id_idx').on(table.parentId),
}));

// Category Attribute Definitions (dynamic attributes per category)
export const categoryAttributes = pgTable('category_attributes', {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(), // "fit_type", "fabric_weight", "neckline"
    label: text('label').notNull(), // "Fit Type", "Fabric Weight"
    attributeType: attributeTypeEnum('attribute_type').notNull(),
    required: boolean('required').default(false).notNull(),
    displayOrder: integer('display_order').default(0),
    unit: text('unit'), // "gsm", "cm", etc. for number types
    options: jsonb('options'), // For enum: ["slim", "regular", "relaxed"]
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    categoryIdIdx: index('category_attributes_category_id_idx').on(table.categoryId),
}));

// Colors Table (standardized palette)
export const colors = pgTable('colors', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(), // "Black", "White", "Navy"
    hexCode: text('hex_code'), // "#000000"
    cloudinaryFolder: text('cloudinary_folder'), // For organizing images
    displayOrder: integer('display_order').default(0),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    nameIdx: index('colors_name_idx').on(table.name),
}));

// Sizes Table (standardized)
export const sizes = pgTable('sizes', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(), // "S", "M", "L", "XL", "2XL", "3XL"
    categoryId: uuid('category_id').references(() => categories.id).notNull(), // Different sizes per category
    displayOrder: integer('display_order').default(0),
    measurements: jsonb('measurements'), // { chest: "50cm", length: "70cm" }
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    categoryIdIdx: index('sizes_category_id_idx').on(table.categoryId),
}));

// Products Table (Main catalog items - replaces/enhances productBlanks)
export const catalogProducts = pgTable('catalog_products', {
    id: uuid('id').defaultRandom().primaryKey(),
    sku: text('sku').notNull().unique(), // "STTU258" (Hypster Tee)
    name: text('name').notNull(), // "Stanley/Stella Hypster"
    description: text('description'),
    categoryId: uuid('category_id').references(() => categories.id).notNull(),
    brand: text('brand').notNull(), // "Stanley/Stella"
    material: text('material'), // "100% Organic Cotton"
    weightG: integer('weight_g'), // 180 (fabric weight in GSM)
    
    // Pricing (all in EUR cents)
    costPriceEur: integer('cost_price_eur'), // INTERNAL: What WE pay (never exposed)
    baseCostEur: integer('base_cost_eur').notNull(), // EXTERNAL: What artists pay
    suggestedRetailEur: integer('suggested_retail_eur'), // EXTERNAL: Recommended retail
    
    // Multi-currency support (for future)
    currencyCode: text('currency_code').default('EUR').notNull(),
    
    // Status
    status: productStatusEnum('status').default('active').notNull(),
    
    // Additional attributes (dynamic based on category)
    attributes: jsonb('attributes'), // { fit_type: "relaxed", fabric_weight: 180 }
    
    // Metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    skuIdx: index('catalog_products_sku_idx').on(table.sku),
    categoryIdIdx: index('catalog_products_category_id_idx').on(table.categoryId),
    statusIdx: index('catalog_products_status_idx').on(table.status),
}));

// Product Variants Table (Specific size/color combinations)
export const productVariants = pgTable('product_variants', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => catalogProducts.id, { onDelete: 'cascade' }).notNull(),
    sku: text('sku').notNull().unique(), // "STTU258-C001-S" (Hypster-Black-Small)
    colorId: uuid('color_id').references(() => colors.id).notNull(),
    sizeId: uuid('size_id').references(() => sizes.id).notNull(),
    barcode: text('barcode'), // EAN/UPC for scanning
    
    // Variant-specific pricing (can override product base)
    baseCostOverride: integer('base_cost_override'), // Null = use product.baseCostEur
    
    status: variantStatusEnum('status').default('in_stock').notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
    return {
        skuIdx: index('product_variants_sku_idx').on(table.sku),
        productIdIdx: index('product_variants_product_id_idx').on(table.productId),
        colorIdIdx: index('product_variants_color_id_idx').on(table.colorId),
        sizeIdIdx: index('product_variants_size_id_idx').on(table.sizeId),
        compositeUnique: { columns: [table.productId, table.colorId, table.sizeId], name: 'product_variants_composite_unique' },
    };
});

// Inventory Table (Stock tracking per variant)
export const inventory = pgTable('inventory', {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull().unique(),
    quantityAvailable: integer('quantity_available').default(0).notNull(),
    quantityReserved: integer('quantity_reserved').default(0).notNull(), // For pending orders
    reorderPoint: integer('reorder_point').default(10), // Alert when below this
    warehouseLocation: text('warehouse_location'), // "A-12-3" for physical picking
    lastCountedAt: timestamp('last_counted_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    variantIdIdx: index('inventory_variant_id_idx').on(table.variantId),
}));

// Product Images Table (Cloudinary URLs)
export const productImages = pgTable('product_images', {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }), // NULL = generic product image
    productId: uuid('product_id').references(() => catalogProducts.id, { onDelete: 'cascade' }).notNull(), // Required
    
    cloudinaryPublicId: text('cloudinary_public_id').notNull(),
    cloudinaryUrl: text('cloudinary_url').notNull(),
    
    imageType: text('image_type').notNull(), // "front", "back", "detail", "lifestyle", "swatch"
    isPrimary: boolean('is_primary').default(false).notNull(),
    displayOrder: integer('display_order').default(0),
    altText: text('alt_text'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    variantIdIdx: index('product_images_variant_id_idx').on(table.variantId),
    productIdIdx: index('product_images_product_id_idx').on(table.productId),
}));

// Pricing History Table (Audit trail)
export const pricingHistory = pgTable('pricing_history', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => catalogProducts.id, { onDelete: 'cascade' }).notNull(),
    fieldChanged: text('field_changed').notNull(), // "base_cost_eur", "suggested_retail_eur"
    oldValue: integer('old_value'), // In cents
    newValue: integer('new_value').notNull(), // In cents
    changedBy: text('changed_by').notNull(), // "merchstation_tui" or user email
    changeReason: text('change_reason'), // "Monthly price update", "Stanley Stella promo"
    effectiveDate: timestamp('effective_date').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    productIdIdx: index('pricing_history_product_id_idx').on(table.productId),
    effectiveDateIdx: index('pricing_history_effective_date_idx').on(table.effectiveDate),
}));

// Pricing Schedules Table (Future price changes)
export const pricingSchedules = pgTable('pricing_schedules', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => catalogProducts.id, { onDelete: 'cascade' }).notNull(),
    fieldToChange: text('field_to_change').notNull(), // "base_cost_eur", "suggested_retail_eur"
    newValue: integer('new_value').notNull(),
    effectiveDate: timestamp('effective_date').notNull(),
    status: text('status').default('pending').notNull(), // "pending", "applied", "cancelled"
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    productIdIdx: index('pricing_schedules_product_id_idx').on(table.productId),
    effectiveDateIdx: index('pricing_schedules_effective_date_idx').on(table.effectiveDate),
}));

// Product Batches Table (For internal profit tracking)
export const productBatches = pgTable('product_batches', {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
    batchCode: text('batch_code').notNull(), // "SS-PROMO-MAR2026"
    supplier: text('supplier'), // "Stanley Stella"
    purchaseCostEur: integer('purchase_cost_eur').notNull(), // What WE paid (INTERNAL)
    
    quantityReceived: integer('quantity_received').notNull(),
    quantityRemaining: integer('quantity_remaining').notNull(),
    
    status: productBatchStatusEnum('status').default('active').notNull(),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
    notes: text('notes'), // "Last units sale - 40% off wholesale"
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    variantIdIdx: index('product_batches_variant_id_idx').on(table.variantId),
    batchCodeIdx: index('product_batches_batch_code_idx').on(table.batchCode),
}));

// ============================================================================
// RELATIONS
// ============================================================================

// Categories Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
    parent: one(categories, {
        fields: [categories.parentId],
        references: [categories.id],
    }),
    children: many(categories),
    attributes: many(categoryAttributes),
    products: many(catalogProducts),
    sizes: many(sizes),
}));

export const categoryAttributesRelations = relations(categoryAttributes, ({ one }) => ({
    category: one(categories, {
        fields: [categoryAttributes.categoryId],
        references: [categories.id],
    }),
}));

// Colors Relations (no relations needed - standalone)

export const sizesRelations = relations(sizes, ({ one }) => ({
    category: one(categories, {
        fields: [sizes.categoryId],
        references: [categories.id],
    }),
}));

export const catalogProductsRelations = relations(catalogProducts, ({ one, many }) => ({
    category: one(categories, {
        fields: [catalogProducts.categoryId],
        references: [categories.id],
    }),
    variants: many(productVariants),
    images: many(productImages),
    pricingHistory: many(pricingHistory),
    pricingSchedules: many(pricingSchedules),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
    product: one(catalogProducts, {
        fields: [productVariants.productId],
        references: [catalogProducts.id],
    }),
    color: one(colors, {
        fields: [productVariants.colorId],
        references: [colors.id],
    }),
    size: one(sizes, {
        fields: [productVariants.sizeId],
        references: [sizes.id],
    }),
    inventory: one(inventory),
    images: many(productImages),
    batches: many(productBatches),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
    variant: one(productVariants, {
        fields: [inventory.variantId],
        references: [productVariants.id],
    }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
    product: one(catalogProducts, {
        fields: [productImages.productId],
        references: [catalogProducts.id],
    }),
    variant: one(productVariants, {
        fields: [productImages.variantId],
        references: [productVariants.id],
    }),
}));

export const pricingHistoryRelations = relations(pricingHistory, ({ one }) => ({
    product: one(catalogProducts, {
        fields: [pricingHistory.productId],
        references: [catalogProducts.id],
    }),
}));

export const pricingSchedulesRelations = relations(pricingSchedules, ({ one }) => ({
    product: one(catalogProducts, {
        fields: [pricingSchedules.productId],
        references: [catalogProducts.id],
    }),
}));

export const productBatchesRelations = relations(productBatches, ({ one }) => ({
    variant: one(productVariants, {
        fields: [productBatches.variantId],
        references: [productVariants.id],
    }),
}));

// ─── App Settings ───────────────────────────────────────────────────────────

export const appSettings = pgTable('app_settings', {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull().unique(),
    value: text('value').notNull(),
    description: text('description'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    keyIdx: index('app_settings_key_idx').on(table.key),
}));
