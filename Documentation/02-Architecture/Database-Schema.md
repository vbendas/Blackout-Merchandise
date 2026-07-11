# Database Schema

**Last Updated**: January 17, 2026
**Location**: `/src/db/schema.ts`
**ORM**: Drizzle
**Database**: PostgreSQL (Neon)

---

## Overview

Complete database schema for Merch-From. This is the source of truth for all data modeling.

**Key Note**: The schema is defined in TypeScript using Drizzle ORM and lives in `/src/db/schema.ts`.

---

## 📊 Core Tables

### users
User accounts and authentication data.

```typescript
users {
  id: string (primary key)
  clerkId: string (unique) // Clerk auth ID
  email: string (unique)
  firstName: string
  lastName: string
  avatar?: string (URL)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relationships**:
- hasMany: artistStores
- hasMany: orders
- hasMany: campaigns

---

### artistStores
Artist/creator storefronts and profiles.

```typescript
artistStores {
  id: string (primary key)
  userId: string (foreign key → users)
  slug: string (unique)
  name: string
  description: text
  avatar?: string (URL)
  banner?: string (URL)
  bio?: text
  website?: string (URL)
  socialLinks?: json
  isApproved: boolean (default: false)
  stripeConnectId?: string // Stripe Connect ID (backup gateway)
  nexapayMerchantId?: string // NexaPay merchant ID (primary gateway)
  payoutWalletAddress?: string // Artist's Polygon wallet address for USDC/EURC payouts
  payoutCurrency?: string // Artist's chosen payout currency: 'USDC' | 'EURC'
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relationships**:
- belongsTo: user
- hasMany: products
- hasMany: campaigns

---

### products
Product catalog items.

```typescript
products {
  id: string (primary key)
  artistStoreId: string (foreign key → artistStores)
  name: string
  description: text
  price: decimal (cents)
  currency: string (default: "USD")
  sku: string
  image?: string (URL, primary product image)
  images?: json (array of image URLs)
  category?: string
  tags?: json (array)
  inventory: integer
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relationships**:
- belongsTo: artistStore
- hasMany: orderItems
- hasMany: campaignRewards

---

### orders
Customer orders.

```typescript
orders {
  id: string (primary key)
  userId: string (foreign key → users)
  status: enum ("pending", "processing", "shipped", "delivered", "cancelled")
  total: decimal (cents)
  currency: string (default: "USD")
  stripePaymentIntentId?: string // Stripe payment intent (backup gateway)
  nexapayTransactionId?: string // NexaPay settlement reference (primary gateway)
  settlementStatus?: enum ("pending", "settled", "split_completed") // NexaPay settlement tracking
  platformShareEurc?: decimal // Platform's EURC share (in cents)
  artistShareUsdc?: decimal // Artist's payout amount (in USDC cents)
  artistPayoutTxHash?: string // Polygon tx hash for artist payout
  vaultDepositTxHash?: string // Polygon tx hash for vault deposit
  fxRateUsed?: decimal // EUR/USD rate at settlement time
  shippingAddress: json
  trackingNumber?: string
  shippingProvider?: string
  notes?: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relationships**:
- belongsTo: user
- hasMany: orderItems

---

### orderItems
Individual items within an order.

```typescript
orderItems {
  id: string (primary key)
  orderId: string (foreign key → orders)
  productId: string (foreign key → products)
  quantity: integer
  price: decimal (cents) // Price at time of order
  createdAt: timestamp
}
```

**Relationships**:
- belongsTo: order
- belongsTo: product

---

### campaigns
Crowdfunding campaigns.

```typescript
campaigns {
  id: string (primary key)
  artistStoreId: string (foreign key → artistStores)
  title: string
  description: text
  goal: decimal (cents)
  currency: string (default: "USD")
  status: enum ("draft", "active", "successful", "failed", "cancelled")
  image?: string (URL)
  images?: json (array)
  videoUrl?: string
  startDate: timestamp
  endDate: timestamp
  raised: decimal (cents) // Total raised so far
  backerCount: integer // Total backer count
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relationships**:
- belongsTo: artistStore
- hasMany: campaignRewards
- hasMany: backers

---

### campaignRewards
Reward tiers for campaigns.

```typescript
campaignRewards {
  id: string (primary key)
  campaignId: string (foreign key → campaigns)
  productId?: string (foreign key → products)
  title: string
  description: text
  price: decimal (cents)
  quantity?: integer // Null = unlimited
  claimed: integer (default: 0)
  position: integer // For ordering
  createdAt: timestamp
}
```

**Relationships**:
- belongsTo: campaign
- belongsTo: product (optional)

---

### backers
Individual campaign backers and pledges.

```typescript
backers {
  id: string (primary key)
  campaignId: string (foreign key → campaigns)
  userId?: string (foreign key → users, null for guests)
  email: string
  firstName: string
  lastName: string
  rewardId?: string (foreign key → campaignRewards)
  amount: decimal (cents)
  currency: string (default: "USD")
  status: enum ("pending", "paid", "fulfilled", "cancelled")
  stripePaymentIntentId?: string // Stripe payment intent (backup gateway)
  nexapayTransactionId?: string // NexaPay settlement reference (primary gateway)
  shippingAddress?: json
  trackingNumber?: string
  notes?: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relationships**:
- belongsTo: campaign
- belongsTo: user (optional)
- belongsTo: campaignReward (optional)

---

### wallet_transactions
NexaPay settlement and wallet transfer audit trail.

```typescript
walletTransactions {
  id: string (primary key)
  userId?: string (foreign key → users, null for platform vault)
  orderId?: string (foreign key → orders)
  type: enum ("platform_income", "artist_payout", "vault_deposit", "conversion")
  amount: decimal (cents) // In smallest unit (cents/lamports)
  currency: string // 'USDC' | 'EURC'
  txHash?: string // Polygon transaction hash
  status: enum ("pending", "confirmed", "failed")
  metadata?: json // { fxRate, conversionFrom, conversionTo, etc. }
  createdAt: timestamp
}
```

**Relationships**:
- belongsTo: user (optional)
- belongsTo: order (optional)

---

## 🔐 Indexes

Create indexes on frequently queried columns for performance:

```sql
-- User lookups
CREATE INDEX idx_users_clerkId ON users(clerkId);
CREATE INDEX idx_users_email ON users(email);

-- Store lookups
CREATE INDEX idx_artistStores_userId ON artistStores(userId);
CREATE INDEX idx_artistStores_slug ON artistStores(slug);

-- Product queries
CREATE INDEX idx_products_artistStoreId ON products(artistStoreId);
CREATE INDEX idx_products_category ON products(category);

-- Order queries
CREATE INDEX idx_orders_userId ON orders(userId);
CREATE INDEX idx_orders_status ON orders(status);

-- Campaign queries
CREATE INDEX idx_campaigns_artistStoreId ON campaigns(artistStoreId);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Backer queries
CREATE INDEX idx_backers_campaignId ON backers(campaignId);
CREATE INDEX idx_backers_userId ON backers(userId);
CREATE INDEX idx_backers_status ON backers(status);
```

---

## 📝 Data Types

### Strings
- **varchar(255)**: Standard text fields
- **text**: Long-form content (descriptions, bios)
- **uuid**: Primary keys and foreign keys

### Numbers
- **integer**: Quantities, counts
- **decimal(10,2)**: Money (cents stored as integers recommended)
- **numeric**: Precision calculations

### Timestamps
- **timestamp**: PostgreSQL native timestamp
- Auto-set via triggers or application code

### JSON
- **jsonb**: For flexible data (social links, tags, addresses)
- Queryable and indexable

### Enums
- **enum**: Limited set of values (status, type)
- Type-safe at database level

---

## 🔗 Relationships

### One-to-Many
- **User → Orders**: One user has many orders
- **User → ArtistStores**: One user has many stores
- **ArtistStore → Products**: One store has many products
- **Campaign → Backers**: One campaign has many backers

### Many-to-Many (via junction table)
- Products ↔ Campaigns (via campaignRewards)
- Users ↔ Campaigns (via backers)

### Optional Relationships
- Order items → Product (what was ordered)
- Backer → User (guest vs registered)

---

## 📈 Scalability Considerations

### Current Phase (1-100K users)
- No partitioning needed
- Simple indexes sufficient
- Single database instance fine

### Future Scaling (> 100K users)
- Consider table partitioning by date (orders, backers)
- Add connection pooling (Neon handles this)
- Implement read replicas for analytics
- Archive old campaigns and completed orders

### Optimization Strategies
- Proper indexes (as listed above)
- Query optimization in Drizzle
- Caching layer (Redis) for frequently accessed data
- Archive old data (> 2 years)

---

## 🔄 Migrations

### Creating Migrations
```bash
# Generate migration from schema changes
bunx drizzle-kit generate

# Apply migrations to database
bunx drizzle-kit migrate
```

### Viewing Schema
```bash
# Open Drizzle Studio GUI
bunx drizzle-kit studio
```

---

## 🔐 Security Considerations

### Data Protection
- No passwords stored (Clerk handles auth)
- PII encrypted at rest (Neon default)
- NexaPay transaction IDs stored (no card numbers) — PCI-DSS compliant via NexaPay
- Stripe token IDs stored (backup gateway) — no card numbers
- Email addresses indexed for privacy checks

### Access Control
- Row-level security (RLS) could be added
- API validates user ownership of data
- Database user has limited privileges

### Audit Trail
- Timestamps on all records
- No soft deletes (physical deletion only)
- Logs maintained at application level

---

## 📊 Analytics Queries

### Common Queries

**Total revenue by artist**
```sql
SELECT 
  a.name,
  SUM(oi.price * oi.quantity) as revenue
FROM artistStores a
JOIN products p ON a.id = p.artistStoreId
JOIN orderItems oi ON p.id = oi.productId
GROUP BY a.id, a.name
ORDER BY revenue DESC;
```

**Campaign performance**
```sql
SELECT 
  c.title,
  c.goal,
  c.raised,
  ROUND(CAST(c.raised AS NUMERIC) / c.goal * 100, 2) as percent_funded,
  c.backerCount
FROM campaigns c
ORDER BY c.raised DESC;
```

**User retention**
```sql
SELECT
  DATE_TRUNC('month', createdAt) as signup_month,
  COUNT(*) as new_users
FROM users
GROUP BY DATE_TRUNC('month', createdAt)
ORDER BY signup_month;
```

---

## 🔗 Related Documents

- **Drizzle Schema**: `/src/db/schema.ts`
- **Payment Gateway Architecture**: [[Payment-Gateway]] — NexaPay integration, settlement flow, wallet management
- **API Reference**: API-Reference.md (TBD)
- **PRD**: ../../00-PRD-Roadmap/PRD.md
- **Constraints**: ../../00-PRD-Roadmap/Constraints.md

---

**Owner**: Victor Bendas
**Last Updated**: May 17, 2026
**Status**: Active (Phase 1)
