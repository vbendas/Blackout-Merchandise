import { pgTable, uuid, integer, text, timestamp, unique, index, foreignKey, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const agentName = pgEnum("agent_name", ['Leopoldo', 'Francisca', 'Antônia'])
export const attributeType = pgEnum("attribute_type", ['text', 'number', 'boolean', 'enum', 'json'])
export const breachSeverity = pgEnum("breach_severity", ['low', 'medium', 'high'])
export const consentMethod = pgEnum("consent_method", ['explicit_opt_in', 'implicit', 'withdrawn'])
export const consentType = pgEnum("consent_type", ['essential', 'analytics', 'marketing'])
export const orderStatus = pgEnum("order_status", ['pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled'])
export const productBatchStatus = pgEnum("product_batch_status", ['active', 'sold_out', 'expired'])
export const productStatus = pgEnum("product_status", ['active', 'archived', 'discontinued'])
export const requestStatus = pgEnum("request_status", ['pending', 'completed', 'rejected'])
export const requestType = pgEnum("request_type", ['access', 'deletion', 'portability'])
export const userRole = pgEnum("user_role", ['artist', 'customer', 'admin'])
export const variantStatus = pgEnum("variant_status", ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'])


export const dataBreachLogs = pgTable("data_breach_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	severity: breachSeverity().notNull(),
	affectedCount: integer("affected_count").notNull(),
	dataTypes: text("data_types").notNull(),
	description: text().notNull(),
	notifiedAt: timestamp("notified_at", { mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	email: text().notNull(),
	displayName: text("display_name"),
	role: userRole().default('customer').notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_clerk_id_unique").on(table.clerkId),
]);

export const artistStores = pgTable("artist_stores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	artistId: uuid("artist_id").notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	isLive: boolean("is_live").default(false).notNull(),
	themeConfig: jsonb("theme_config"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("artist_stores_artist_id_idx").using("btree", table.artistId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [users.id],
			name: "artist_stores_artist_id_users_id_fk"
		}),
	unique("artist_stores_slug_unique").on(table.slug),
]);

export const chatSessions = pgTable("chat_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	messages: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chat_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_sessions_user_id_users_id_fk"
		}),
]);

export const consents = pgTable("consents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	consentType: consentType("consent_type").notNull(),
	granted: boolean().notNull(),
	grantedAt: timestamp("granted_at", { mode: 'string' }),
	withdrawnAt: timestamp("withdrawn_at", { mode: 'string' }),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	consentVersion: text("consent_version").default('1.0').notNull(),
	method: consentMethod().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "consents_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const dataSubjectRequests = pgTable("data_subject_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	requestType: requestType("request_type").notNull(),
	status: requestStatus().default('pending').notNull(),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "data_subject_requests_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	customerId: uuid("customer_id").notNull(),
	status: orderStatus().default('pending').notNull(),
	totalAmount: integer("total_amount").notNull(),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	shippingAddress: jsonb("shipping_address"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("orders_customer_id_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("orders_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("orders_stripe_payment_intent_id_idx").using("btree", table.stripePaymentIntentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [artistStores.id],
			name: "orders_store_id_artist_stores_id_fk"
		}),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [users.id],
			name: "orders_customer_id_users_id_fk"
		}),
]);

export const orderItems = pgTable("order_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	productId: uuid("product_id").notNull(),
	quantity: integer().notNull(),
	priceAtPurchase: integer("price_at_purchase").notNull(),
}, (table) => [
	index("order_items_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("order_items_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_products_id_fk"
		}),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	name: text().notNull(),
	description: text(),
	baseCost: integer("base_cost").notNull(),
	retailPrice: integer("retail_price").notNull(),
	mockupUrl: text("mockup_url").notNull(),
	designFileUrl: text("design_file_url"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("products_store_id_idx").using("btree", table.storeId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [artistStores.id],
			name: "products_store_id_artist_stores_id_fk"
		}),
]);

export const productBlanks = pgTable("product_blanks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	brand: text().notNull(),
	sku: text().notNull(),
	baseCost: integer("base_cost").notNull(),
	suggestedRetail: integer("suggested_retail").notNull(),
	imageUrls: jsonb("image_urls").notNull(),
	colors: jsonb(),
	sizes: jsonb(),
	specs: jsonb(),
	sustainabilityBadges: jsonb("sustainability_badges"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_blanks_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("product_blanks_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	unique("product_blanks_sku_unique").on(table.sku),
]);

export const waitlist = pgTable("waitlist", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	notified: boolean().default(false).notNull(),
	socialLink: text("social_link"),
	followerRange: text("follower_range"),
	interviewResponses: jsonb("interview_responses"),
	source: text().default('organic').notNull(),
	position: integer(),
	status: text().default('pending').notNull(),
}, (table) => [
	index("waitlist_position_idx").using("btree", table.position.asc().nullsLast().op("int4_ops")),
	index("waitlist_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("waitlist_email_unique").on(table.email),
]);

export const processedWebhookEvents = pgTable("processed_webhook_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	provider: text().notNull(),
	eventId: text("event_id").notNull(),
	objectId: text("object_id"),
	processedAt: timestamp("processed_at", { mode: 'string' }).defaultNow().notNull(),
});

export const shopCustomizations = pgTable("shop_customizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	sliderImages: jsonb("slider_images").default([]),
	backgroundColor: text("background_color").default('#0A0A0A'),
	textColor: text("text_color").default('#FFFFFF'),
	aboutText: text("about_text"),
	socialLinks: jsonb("social_links").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("shop_customizations_store_id_idx").using("btree", table.storeId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [artistStores.id],
			name: "shop_customizations_store_id_artist_stores_id_fk"
		}).onDelete("cascade"),
	unique("shop_customizations_store_id_unique").on(table.storeId),
]);

export const catalogProducts = pgTable("catalog_products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sku: text().notNull(),
	name: text().notNull(),
	description: text(),
	categoryId: uuid("category_id").notNull(),
	brand: text().notNull(),
	material: text(),
	weightG: integer("weight_g"),
	costPriceEur: integer("cost_price_eur"),
	baseCostEur: integer("base_cost_eur").notNull(),
	suggestedRetailEur: integer("suggested_retail_eur"),
	currencyCode: text("currency_code").default('EUR').notNull(),
	status: productStatus().default('active').notNull(),
	attributes: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("catalog_products_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("catalog_products_sku_idx").using("btree", table.sku.asc().nullsLast().op("text_ops")),
	index("catalog_products_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "catalog_products_category_id_categories_id_fk"
		}),
	unique("catalog_products_sku_unique").on(table.sku),
]);

export const productVariants = pgTable("product_variants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	sku: text().notNull(),
	colorId: uuid("color_id").notNull(),
	sizeId: uuid("size_id").notNull(),
	barcode: text(),
	baseCostOverride: integer("base_cost_override"),
	status: variantStatus().default('in_stock').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_variants_color_id_idx").using("btree", table.colorId.asc().nullsLast().op("uuid_ops")),
	index("product_variants_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("product_variants_size_id_idx").using("btree", table.sizeId.asc().nullsLast().op("uuid_ops")),
	index("product_variants_sku_idx").using("btree", table.sku.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [catalogProducts.id],
			name: "product_variants_product_id_catalog_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.colorId],
			foreignColumns: [colors.id],
			name: "product_variants_color_id_colors_id_fk"
		}),
	foreignKey({
			columns: [table.sizeId],
			foreignColumns: [sizes.id],
			name: "product_variants_size_id_sizes_id_fk"
		}),
	unique("product_variants_sku_unique").on(table.sku),
]);

export const sizes = pgTable("sizes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	categoryId: uuid("category_id").notNull(),
	displayOrder: integer("display_order").default(0),
	measurements: jsonb(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sizes_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "sizes_category_id_categories_id_fk"
		}),
]);

export const pricingHistory = pgTable("pricing_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	fieldChanged: text("field_changed").notNull(),
	oldValue: integer("old_value"),
	newValue: integer("new_value").notNull(),
	changedBy: text("changed_by").notNull(),
	changeReason: text("change_reason"),
	effectiveDate: timestamp("effective_date", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("pricing_history_effective_date_idx").using("btree", table.effectiveDate.asc().nullsLast().op("timestamp_ops")),
	index("pricing_history_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [catalogProducts.id],
			name: "pricing_history_product_id_catalog_products_id_fk"
		}).onDelete("cascade"),
]);

export const pricingSchedules = pgTable("pricing_schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	fieldToChange: text("field_to_change").notNull(),
	newValue: integer("new_value").notNull(),
	effectiveDate: timestamp("effective_date", { mode: 'string' }).notNull(),
	status: text().default('pending').notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("pricing_schedules_effective_date_idx").using("btree", table.effectiveDate.asc().nullsLast().op("timestamp_ops")),
	index("pricing_schedules_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [catalogProducts.id],
			name: "pricing_schedules_product_id_catalog_products_id_fk"
		}).onDelete("cascade"),
]);

export const productBatches = pgTable("product_batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	variantId: uuid("variant_id").notNull(),
	batchCode: text("batch_code").notNull(),
	supplier: text(),
	purchaseCostEur: integer("purchase_cost_eur").notNull(),
	quantityReceived: integer("quantity_received").notNull(),
	quantityRemaining: integer("quantity_remaining").notNull(),
	status: productBatchStatus().default('active').notNull(),
	receivedAt: timestamp("received_at", { mode: 'string' }).defaultNow().notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_batches_batch_code_idx").using("btree", table.batchCode.asc().nullsLast().op("text_ops")),
	index("product_batches_variant_id_idx").using("btree", table.variantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "product_batches_variant_id_product_variants_id_fk"
		}).onDelete("cascade"),
]);

export const productImages = pgTable("product_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	variantId: uuid("variant_id"),
	productId: uuid("product_id").notNull(),
	cloudinaryPublicId: text("cloudinary_public_id").notNull(),
	cloudinaryUrl: text("cloudinary_url").notNull(),
	imageType: text("image_type").notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	displayOrder: integer("display_order").default(0),
	altText: text("alt_text"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_images_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("product_images_variant_id_idx").using("btree", table.variantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "product_images_variant_id_product_variants_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [catalogProducts.id],
			name: "product_images_product_id_catalog_products_id_fk"
		}).onDelete("cascade"),
]);

export const colors = pgTable("colors", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	hexCode: text("hex_code"),
	cloudinaryFolder: text("cloudinary_folder"),
	displayOrder: integer("display_order").default(0),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("colors_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	parentId: uuid("parent_id"),
	displayOrder: integer("display_order").default(0),
	imageUrl: text("image_url"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("categories_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("categories_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	unique("categories_slug_unique").on(table.slug),
]);

export const categoryAttributes = pgTable("category_attributes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	categoryId: uuid("category_id").notNull(),
	name: text().notNull(),
	label: text().notNull(),
	attributeType: attributeType("attribute_type").notNull(),
	required: boolean().default(false).notNull(),
	displayOrder: integer("display_order").default(0),
	unit: text(),
	options: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("category_attributes_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "category_attributes_category_id_categories_id_fk"
		}).onDelete("cascade"),
]);

export const inventory = pgTable("inventory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	variantId: uuid("variant_id").notNull(),
	quantityAvailable: integer("quantity_available").default(0).notNull(),
	quantityReserved: integer("quantity_reserved").default(0).notNull(),
	reorderPoint: integer("reorder_point").default(10),
	warehouseLocation: text("warehouse_location"),
	lastCountedAt: timestamp("last_counted_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("inventory_variant_id_idx").using("btree", table.variantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "inventory_variant_id_product_variants_id_fk"
		}).onDelete("cascade"),
]);
