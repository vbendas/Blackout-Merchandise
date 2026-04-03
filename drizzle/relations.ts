import { relations } from "drizzle-orm/relations";
import { users, artistStores, chatSessions, consents, dataSubjectRequests, orders, orderItems, products, shopCustomizations, categories, catalogProducts, productVariants, colors, sizes, pricingHistory, pricingSchedules, productBatches, productImages, categoryAttributes, inventory } from "./schema";

export const artistStoresRelations = relations(artistStores, ({one, many}) => ({
	user: one(users, {
		fields: [artistStores.artistId],
		references: [users.id]
	}),
	orders: many(orders),
	products: many(products),
	shopCustomizations: many(shopCustomizations),
}));

export const usersRelations = relations(users, ({many}) => ({
	artistStores: many(artistStores),
	chatSessions: many(chatSessions),
	consents: many(consents),
	dataSubjectRequests: many(dataSubjectRequests),
	orders: many(orders),
}));

export const chatSessionsRelations = relations(chatSessions, ({one}) => ({
	user: one(users, {
		fields: [chatSessions.userId],
		references: [users.id]
	}),
}));

export const consentsRelations = relations(consents, ({one}) => ({
	user: one(users, {
		fields: [consents.userId],
		references: [users.id]
	}),
}));

export const dataSubjectRequestsRelations = relations(dataSubjectRequests, ({one}) => ({
	user: one(users, {
		fields: [dataSubjectRequests.userId],
		references: [users.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	artistStore: one(artistStores, {
		fields: [orders.storeId],
		references: [artistStores.id]
	}),
	user: one(users, {
		fields: [orders.customerId],
		references: [users.id]
	}),
	orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	orderItems: many(orderItems),
	artistStore: one(artistStores, {
		fields: [products.storeId],
		references: [artistStores.id]
	}),
}));

export const shopCustomizationsRelations = relations(shopCustomizations, ({one}) => ({
	artistStore: one(artistStores, {
		fields: [shopCustomizations.storeId],
		references: [artistStores.id]
	}),
}));

export const catalogProductsRelations = relations(catalogProducts, ({one, many}) => ({
	category: one(categories, {
		fields: [catalogProducts.categoryId],
		references: [categories.id]
	}),
	productVariants: many(productVariants),
	pricingHistories: many(pricingHistory),
	pricingSchedules: many(pricingSchedules),
	productImages: many(productImages),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	catalogProducts: many(catalogProducts),
	sizes: many(sizes),
	categoryAttributes: many(categoryAttributes),
}));

export const productVariantsRelations = relations(productVariants, ({one, many}) => ({
	catalogProduct: one(catalogProducts, {
		fields: [productVariants.productId],
		references: [catalogProducts.id]
	}),
	color: one(colors, {
		fields: [productVariants.colorId],
		references: [colors.id]
	}),
	size: one(sizes, {
		fields: [productVariants.sizeId],
		references: [sizes.id]
	}),
	productBatches: many(productBatches),
	productImages: many(productImages),
	inventories: many(inventory),
}));

export const colorsRelations = relations(colors, ({many}) => ({
	productVariants: many(productVariants),
}));

export const sizesRelations = relations(sizes, ({one, many}) => ({
	productVariants: many(productVariants),
	category: one(categories, {
		fields: [sizes.categoryId],
		references: [categories.id]
	}),
}));

export const pricingHistoryRelations = relations(pricingHistory, ({one}) => ({
	catalogProduct: one(catalogProducts, {
		fields: [pricingHistory.productId],
		references: [catalogProducts.id]
	}),
}));

export const pricingSchedulesRelations = relations(pricingSchedules, ({one}) => ({
	catalogProduct: one(catalogProducts, {
		fields: [pricingSchedules.productId],
		references: [catalogProducts.id]
	}),
}));

export const productBatchesRelations = relations(productBatches, ({one}) => ({
	productVariant: one(productVariants, {
		fields: [productBatches.variantId],
		references: [productVariants.id]
	}),
}));

export const productImagesRelations = relations(productImages, ({one}) => ({
	productVariant: one(productVariants, {
		fields: [productImages.variantId],
		references: [productVariants.id]
	}),
	catalogProduct: one(catalogProducts, {
		fields: [productImages.productId],
		references: [catalogProducts.id]
	}),
}));

export const categoryAttributesRelations = relations(categoryAttributes, ({one}) => ({
	category: one(categories, {
		fields: [categoryAttributes.categoryId],
		references: [categories.id]
	}),
}));

export const inventoryRelations = relations(inventory, ({one}) => ({
	productVariant: one(productVariants, {
		fields: [inventory.variantId],
		references: [productVariants.id]
	}),
}));