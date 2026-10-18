# MerchStation TUI - Comprehensive Development Plan

## Executive Summary

**MerchStation** is an AI-powered TUI (Terminal User Interface) control center for managing the Blackout Merchandise platform. It uses OpenCode as the intelligent backend with a "Plan → Review → Execute" workflow to ensure safe, auditable operations on production data.

**Core Philosophy**: LLM plans, human reviews, deterministic code executes.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MERCHSTATION TUI                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │   Ink/React  │────▶│  Plan Parser │────▶│  TUI Render  │                 │
│  │    Interface │     │   & Validator│     │   Engine     │                 │
│  └──────────────┘     └──────────────┘     └──────────────┘                 │
│         │                                              │                     │
│         │                                              │                     │
│         └──────────────────┬───────────────────────────┘                     │
│                            │                                                 │
│                            ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    OPENCODE SDK / HTTP CLIENT                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                            │                                                 │
└────────────────────────────┼─────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OPENCODE SERVER (HEADLESS)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SKILLS                                                             │   │
│  │  ├── intent-parser/          Parse natural language to structured   │   │
│  │  ├── plan-generator/         Generate human-readable plans          │   │
│  │  ├── batch-operations/       Handle multi-item workflows            │   │
│  │  └── safety-checker/         Identify sensitive operations          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CUSTOM TOOLS (Deterministic)                                       │   │
│  │  ├── product-tools.ts        CRUD operations for products           │   │
│  │  ├── customer-tools.ts       Customer management                    │   │
│  │  ├── order-tools.ts          Order operations                       │   │
│  │  ├── image-tools.ts          Photo upload/processing                │   │
│  │  ├── catalog-tools.ts        Catalog management                     │   │
│  │  └── analytics-tools.ts      Reporting & insights                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MCP SERVERS                                                        │   │
│  │  ├── neon-mcp/               Database operations                    │   │
│  │  ├── cloudinary-mcp/         Image CDN operations                   │   │
│  │  ├── stripe-mcp/             Payment operations                     │   │
│  │  └── redis-mcp/              Session/cache operations               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                   │
│  Neon PostgreSQL │ Cloudinary │ Stripe │ Upstash Redis │ Clerk Auth        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Plan Mode Workflow (Detailed)

### 2.1 Stage 1: Intent Parsing

**Input**: Natural language request
```
"Add a baggy t-shirt, 100% cotton, sizes XS-3XL, colors black/white/red, 
pics in /uploads/tshirt/"
```

**Processing**:
1. **Intent Classification**: Identify operation type (CREATE_PRODUCT)
2. **Entity Extraction**: Pull out key data points
3. **Validation**: Check for required fields, valid values
4. **Context Enrichment**: Add computed fields (SKU generation, timestamps)

**Output**: Structured Intent Object
```typescript
{
  operation: "CREATE_PRODUCT",
  confidence: 0.95,
  entities: {
    name: "Baggy T-Shirt",
    description: "100% cotton",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    colors: ["black", "white", "red"],
    imagePath: "/uploads/tshirt/",
    category: null,  // Missing - will ask
    price: null      // Missing - will ask
  },
  missingRequired: ["category", "price"],
  suggestedSku: "BAGGY-TSHIRT-001"
}
```

### 2.2 Stage 2: Clarification (If Needed)

If missing required fields:
```
MerchStation: I need a bit more information:

  ? What category?  [Use arrows to move, type to filter]
  > Apparel
    Accessories
    Home & Living
    
  ? What's the base price?  $29.99
```

### 2.3 Stage 3: Plan Generation (High-Level)

**Format**: Human-readable, structured plan

```
┌─ OPERATION PLAN ───────────────────────────────────────────────────────────┐
│                                                                             │
│  ACTION: Create New Product                                                 │
│                                                                             │
│  PRODUCT DETAILS:                                                           │
│  ├─ Name: Baggy T-Shirt                                                     │
│  ├─ SKU: BAGGY-TSHIRT-001                                                   │
│  ├─ Description: 100% cotton premium baggy fit                              │
│  ├─ Category: Apparel                                                       │
│  └─ Base Price: $29.99                                                      │
│                                                                             │
│  VARIANTS TO CREATE:                                                        │
│  ├─ 7 Sizes: XS, S, M, L, XL, 2XL, 3XL                                     │
│  ├─ 3 Colors: Black, White, Red                                            │
│  └─ Total: 21 product variants                                             │
│                                                                             │
│  IMAGES TO PROCESS:                                                         │
│  ├─ Source: /uploads/tshirt/                                               │
│  ├─ Found: 3 images (front.jpg, back.jpg, detail.jpg)                      │
│  └─ Destination: Cloudinary → merch/products/baggy-tshirt-001/             │
│                                                                             │
│  SAFETY CHECK: ⚠️  This will create 21 new database records                 │
│                                                                             │
│  [Edit Details]  [Cancel]  [Proceed]                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Stage 4: User Review & Edit

**Options**:
- **Proceed**: Continue to execution
- **Edit**: Modify any field inline
- **Cancel**: Abort operation

**Edit Flow**:
```
MerchStation: What would you like to edit?

  ? Select field to edit:
  > Product name
    Description
    Price
    Sizes
    Colors
    Image folder
    
  ? New product name:  Oversized Baggy T-Shirt
  
MerchStation: Updated plan:
  ├─ Name: Oversized Baggy T-Shirt ✓
  └─ SKU: OVERSIZED-BAGGY-TSHIRT-001 (auto-updated)
  
  [Proceed with updated plan?]  [Edit more]  [Cancel]
```

### 2.5 Stage 5: Safety Confirmation (For Sensitive Operations)

**Trigger Conditions**:
- DELETE operations
- UPDATE on orders, payments, customer data
- Bulk operations (>10 items)
- Price changes >20%
- Status changes (order cancellation, refund)

**Safety Prompt**:
```
┌─ SAFETY CONFIRMATION ──────────────────────────────────────────────────────┐
│                                                                             │
│  ⚠️  SENSITIVE OPERATION DETECTED                                           │
│                                                                             │
│  This operation will:                                                       │
│  ├─ Delete 1 product                                                        │
│  ├─ Delete 21 product variants                                              │
│  ├─ Delete 3 product images from Cloudinary                                 │
│  └─ Archive 156 associated orders (historical reference only)              │
│                                                                             │
│  This action CANNOT be undone after 24 hours.                               │
│                                                                             │
│  To proceed, type the product name: Baggy T-Shirt                           │
│                                                                             │
│  [Cancel]                                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.6 Stage 6: Execution

**Progress Display**:
```
┌─ EXECUTING PLAN ───────────────────────────────────────────────────────────┐
│                                                                             │
│  [▓▓▓▓▓▓▓▓▓░] Validating images... ✓ 3 valid images found                  │
│  [▓▓▓▓▓▓▓▓▓▓] Uploading to Cloudinary... ✓ 3 images uploaded               │
│  [▓▓▓▓▓▓▓▓▓▓] Creating product... ✓ ID: prod_12345                         │
│  [▓▓▓▓▓▓▓░░░] Creating variants... 15/21 completed                         │
│                                                                             │
│  Time elapsed: 12s | Est. remaining: 5s                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Success State**:
```
┌─ COMPLETED ────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ✓ Product created successfully!                                            │
│                                                                             │
│  SUMMARY:                                                                   │
│  ├─ Product ID: prod_12345                                                  │
│  ├─ SKU: BAGGY-TSHIRT-001                                                   │
│  ├─ Variants created: 21                                                    │
│  ├─ Images uploaded: 3                                                      │
│  └─ Total time: 18s                                                         │
│                                                                             │
│  NEXT ACTIONS:                                                              │
│  [View Product]  [Add Another]  [Go to Dashboard]  [Undo (24h)]            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Batch Operations

### 3.1 Batch Plan Display

```
┌─ BATCH OPERATION PLAN ─────────────────────────────────────────────────────┐
│                                                                             │
│  ACTION: Import 15 Products from CSV                                        │
│                                                                             │
│  SOURCE: /uploads/batch-import/products-march-2024.csv                     │
│                                                                             │
│  ITEMS TO PROCESS:                                                          │
│  ┌────┬──────────────────────┬────────┬───────────┬──────────┐             │
│  │ #  │ Product Name         │ Price  │ Variants  │ Status   │             │
│  ├────┼──────────────────────┼────────┼───────────┼──────────┤             │
│  │ 1  │ Vintage Band Tee     │ $34.99 │ 12        │ ✓ Ready  │             │
│  │ 2  │ Embroidered Hoodie   │ $59.99 │ 8         │ ✓ Ready  │             │
│  │ 3  │ Canvas Tote Bag      │ $24.99 │ 4         │ ⚠️ No images│          │
│  │ 4  │ Enamel Pin Set       │ $12.99 │ 1         │ ✓ Ready  │             │
│  │ ...│ ...                  │ ...    │ ...       │ ...      │             │
│  └────┴──────────────────────┴────────┴───────────┴──────────┘             │
│                                                                             │
│  SUMMARY:                                                                   │
│  ├─ Total products: 15                                                      │
│  ├─ Total variants: 127                                                     │
│  ├─ Issues found: 2 (missing images)                                        │
│  └─ Estimated time: 3m 45s                                                  │
│                                                                             │
│  ⚠️  This will create 142 new database records                              │
│                                                                             │
│  [Review Items 1-5]  [Fix Issues]  [Proceed Anyway]  [Cancel]              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Individual Item Review

```
MerchStation: Reviewing item 3 of 15

┌─ ITEM DETAILS ─────────────────────────────────────────────────────────────┐
│                                                                             │
│  Canvas Tote Bag                                                            │
│  ├─ SKU: CANVAS-TOTE-001                                                    │
│  ├─ Price: $24.99                                                           │
│  ├─ Variants: 4 (2 sizes × 2 colors)                                       │
│  └─ Images: ⚠️  None specified                                              │
│                                                                             │
│  ISSUES:                                                                    │
│  ├─ Missing product images                                                  │
│  └─ Suggested: Use placeholder image or skip?                              │
│                                                                             │
│  [Use Placeholder]  [Skip This Item]  [Add Images]  [Edit Details]         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Undo System

### 4.1 Undo Availability

```
┌─ UNDO HISTORY ─────────────────────────────────────────────────────────────┐
│                                                                             │
│  Recent Operations (available for undo):                                    │
│                                                                             │
│  1. ✓ Create Product "Baggy T-Shirt" (18s ago)                             │
│     [Undo] - Available for 23h 59m                                          │
│                                                                             │
│  2. ✓ Update Price "Vintage Hoodie" $49.99 → $59.99 (2m ago)               │
│     [Undo] - Available for 23h 58m                                          │
│                                                                             │
│  3. ✓ Batch Import 15 Products (1h ago)                                    │
│     [Undo] - Available for 22h 59m                                          │
│     └─ Note: Will remove all 15 products and associated data               │
│                                                                             │
│  4. ✗ Delete Product "Test Item" (25h ago)                                 │
│     [Expired] - Undo window closed                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Undo Confirmation

```
┌─ CONFIRM UNDO ─────────────────────────────────────────────────────────────┐
│                                                                             │
│  You are about to UNDO: Create Product "Baggy T-Shirt"                     │
│                                                                             │
│  This will:                                                                 │
│  ├─ Delete product and all variants                                        │
│  ├─ Remove images from Cloudinary                                          │
│  ├─ Archive from customer view                                             │
│  └─ Keep in database for 30 days (admin recovery possible)                 │
│                                                                             │
│  ⚠️  This action cannot be reversed.                                        │
│                                                                             │
│  Type "undo baggy-tshirt" to confirm:                                      │
│                                                                             │
│  [Cancel]                                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Undo Implementation

**Storage Strategy**:
```typescript
// Undo log table (Drizzle schema)
{
  id: "undo_12345",
  operationType: "CREATE_PRODUCT",
  originalIntent: { /* full intent object */ },
  executedActions: [
    { type: "INSERT", table: "products", id: "prod_123", data: {...} },
    { type: "INSERT", table: "variants", ids: [...], data: [...] },
    { type: "UPLOAD", service: "cloudinary", urls: [...] }
  ],
  createdAt: "2024-01-15T10:30:00Z",
  expiresAt: "2024-01-16T10:30:00Z",  // 24h window
  status: "AVAILABLE"
}
```

---

## 5. TUI Interface Components

### 5.1 Main Dashboard

```
┌─ MERCHSTATION v1.0 ────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─ QUICK STATS ─────────────┐  ┌─ RECENT ACTIVITY ─────────────────────┐  │
│  │  Products: 156            │  │  ✓ Created "Baggy T-Shirt" (2m ago)   │  │
│  │  Orders (24h): 23         │  │  ✓ Updated 5 prices (15m ago)         │  │
│  │  Revenue (24h): $1,247    │  │  ✓ Batch import completed (1h ago)    │  │
│  │  Pending: 3               │  │  ⚠️ Low stock: "Vintage Tee" (2h ago) │  │
│  └───────────────────────────┘  └───────────────────────────────────────┘  │
│                                                                             │
│  QUICK ACTIONS:                                                             │
│  [Add Product]  [View Orders]  [Manage Customers]  [Analytics]             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  MerchStation> _                                                            │
│                                                                             │
│  Type a command or "help" for available operations                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Natural Language Input

```
MerchStation> Add a new hoodie with front pocket, available in gray and navy,
              sizes S to XXL, $45, images in /uploads/hoodie-v2/

  Processing your request...
  
  ┌─ PLAN ───────────────────────────────────────────────────────────────────┐
  │  ACTION: Create New Product                                              │
  │  ...                                                                     │
  └──────────────────────────────────────────────────────────────────────────┘
  
  [Proceed]  [Edit]  [Cancel]
```

### 5.3 Interactive Tables

```
┌─ PRODUCT CATALOG ──────────────────────────────────────────────────────────┐
│                                                                             │
│  Showing 1-10 of 156 products                                               │
│                                                                             │
│  ┌────┬──────────────────────┬────────┬───────────┬────────┬─────────────┐ │
│  │ ID │ Name                 │ Price  │ Stock     │ Status │ Actions     │ │
│  ├────┼──────────────────────┼────────┼───────────┼────────┼─────────────┤ │
│  │ 001│ Baggy T-Shirt        │ $29.99 │ 45 units  │ ✓ Live │ [Edit][Del] │ │
│  │ 002│ Vintage Hoodie       │ $59.99 │ 12 units  │ ✓ Live │ [Edit][Del] │ │
│  │ 003│ Embroidered Cap      │ $24.99 │ 0 units   │ ⚠️ Low │ [Edit][Del] │ │
│  │ 004│ Canvas Tote          │ $19.99 │ 89 units  │ ✓ Live │ [Edit][Del] │ │
│  └────┴──────────────────────┴────────┴───────────┴────────┴─────────────┘ │
│                                                                             │
│  [Previous]  Page 1 of 16  [Next]  [Jump to...]                            │
│                                                                             │
│  Bulk actions: [Select All]  [Delete Selected]  [Update Prices]            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. OpenCode Integration

### 6.1 Skills Structure

```
.opencode/skills/
├── intent-parser/
│   └── SKILL.md              # Parse NL to structured intent
├── plan-generator/
│   └── SKILL.md              # Generate human-readable plans
├── safety-checker/
│   └── SKILL.md              # Identify sensitive operations
├── batch-operations/
│   └── SKILL.md              # Handle multi-item workflows
└── merch-domain/
    └── SKILL.md              # E-commerce domain knowledge
```

### 6.2 Custom Tools

```typescript
// .opencode/tools/product-tools.ts
export const productTools = {
  // Read operations (safe, no confirmation needed)
  getProduct: tool({
    description: "Fetch product by ID or SKU",
    execute: async ({ id, sku }) => {
      // Deterministic database query
      return await db.query.products.findFirst(...)
    }
  }),
  
  listProducts: tool({
    description: "List products with filters",
    execute: async (filters) => {
      return await db.query.products.findMany(...)
    }
  }),
  
  // Write operations (require plan approval)
  createProduct: tool({
    description: "Create new product with validation",
    execute: async (productData) => {
      // 1. Validate all data (Zod schema)
      // 2. Check SKU uniqueness
      // 3. Generate variants
      // 4. Return structured result
    }
  }),
  
  updateProduct: tool({
    description: "Update existing product",
    execute: async (id, updates) => {
      // Similar validation pattern
    }
  }),
  
  deleteProduct: tool({
    description: "Delete product (requires safety confirmation)",
    execute: async (id) => {
      // Mark as deleted, archive data
      // Return undo information
    }
  })
}
```

### 6.3 MCP Server Configuration

```json
// opencode.json
{
  "mcp": {
    "neon": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-postgres"],
      "environment": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "cloudinary": {
      "type": "local",
      "command": ["node", "./mcp/cloudinary-mcp.js"],
      "environment": {
        "CLOUDINARY_CLOUD_NAME": "${CLOUDINARY_CLOUD_NAME}",
        "CLOUDINARY_API_KEY": "${CLOUDINARY_API_KEY}"
      }
    }
  }
}
```

---

## 7. Safety & Validation Layers

### 7.1 Input Validation

```typescript
// Zod schemas for all operations
const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  price: z.number().positive().max(10000),
  sku: z.string().regex(/^[A-Z0-9-]+$/),
  category: z.enum([...CATEGORIES]),
  sizes: z.array(z.enum([...SIZES])),
  colors: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)),
  images: z.array(z.string().url()).min(1)
})
```

### 7.2 Safety Rules

```typescript
// Safety checker configuration
const SAFETY_RULES = {
  // Always require confirmation
  deleteOperations: true,
  bulkOperations: { threshold: 10 },
  priceChanges: { threshold: 0.20 },  // >20% change
  orderModifications: true,
  paymentRefunds: true,
  customerDataChanges: true,
  
  // Never allow
  directSql: false,
  massDelete: { threshold: 100 },
  priceZero: false,
  negativeInventory: false
}
```

### 7.3 Audit Logging

```typescript
// Every operation logged
{
  timestamp: "2024-01-15T10:30:00Z",
  userId: "admin_123",
  operation: "CREATE_PRODUCT",
  intent: { /* original NL request */ },
  plan: { /* generated plan */ },
  approvedAt: "2024-01-15T10:30:15Z",
  executedActions: [...],
  result: "SUCCESS",
  undoId: "undo_12345"
}
```

---

## 8. Error Handling

### 8.1 Graceful Degradation

```
┌─ ERROR ────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ⚠️  Image upload failed for 1 of 3 images                                  │
│                                                                             │
│  Failed: detail.jpg                                                         │
│  Error: File too large (8.2MB > 5MB limit)                                  │
│                                                                             │
│  OPTIONS:                                                                   │
│  [Continue without this image]  [Compress & Retry]  [Cancel entire operation]│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Rollback on Failure

```
┌─ ROLLBACK ─────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ✗ Operation failed during variant creation                                │
│                                                                             │
│  Rolling back changes...                                                    │
│  ├─ ✓ Deleted product record                                               │
│  ├─ ✓ Deleted uploaded images                                              │
│  └─ ✓ Released reserved SKUs                                               │
│                                                                             │
│  System returned to previous state. No changes were saved.                 │
│                                                                             │
│  [View Error Details]  [Retry]  [Cancel]                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Commands Reference

### 9.1 Natural Language Commands

```
Product Management:
  "Add a [product name] with [details]"
  "Update [product] price to [amount]"
  "Delete [product name]"
  "Show me [product name]"
  "List all products in [category]"
  
Batch Operations:
  "Import products from [file path]"
  "Update prices for [category] by [percentage]"
  "Delete all products with [condition]"
  
Customer Management:
  "Show customer [email/name]"
  "List orders for [customer]"
  "Approve customer [name]"
  
Analytics:
  "Show sales for last [time period]"
  "What are my top products?"
  "Show low stock items"
```

### 9.2 Structured Commands

```
/products list --category apparel --status active
/products create --name "T-Shirt" --price 29.99
/products update --sku ABC123 --price 34.99
/products delete --sku ABC123 --force
/customers show --email customer@example.com
/orders list --status pending --limit 20
/import csv --file /path/to/file.csv --dry-run
/undo --id undo_12345
/help products
/help batch
```

---

## 10. Development Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic TUI structure and OpenCode integration

**Tasks**:
- [ ] **1.1** Set up project structure
  - [ ] 1.1.1 Create `/merchstation` directory
  - [ ] 1.1.2 Initialize with TypeScript + Bun
  - [ ] 1.1.3 Install Ink (React TUI framework)
  - [ ] 1.1.4 Set up ESLint + Prettier
  
- [ ] **1.2** OpenCode integration
  - [ ] 1.2.1 Install @opencode-ai/sdk
  - [ ] 1.2.2 Create OpenCode client wrapper
  - [ ] 1.2.3 Test basic communication
  - [ ] 1.2.4 Configure headless server mode
  
- [ ] **1.3** Basic TUI components
  - [ ] 1.3.1 Main layout component
  - [ ] 1.3.2 Input box component
  - [ ] 1.3.3 Output display component
  - [ ] 1.3.4 Status bar component
  
- [ ] **1.4** Intent parsing skill
  - [ ] 1.4.1 Create intent-parser skill
  - [ ] 1.4.2 Define intent schemas
  - [ ] 1.4.3 Test basic NL parsing
  - [ ] 1.4.4 Handle common e-commerce intents

**Deliverable**: Working TUI that can parse basic commands and echo intent

---

### Phase 2: Plan Mode Core (Week 3-4)
**Goal**: Full Plan → Review → Execute workflow

**Tasks**:
- [ ] **2.1** Plan generator skill
  - [ ] 2.1.1 Create plan-generator skill
  - [ ] 2.1.2 Define plan structure/format
  - [ ] 2.1.3 Generate human-readable plans
  - [ ] 2.1.4 Handle missing information
  
- [ ] **2.2** TUI plan display
  - [ ] 2.2.1 Plan visualization component
  - [ ] 2.2.2 Interactive plan editing
  - [ ] 2.2.3 Missing field prompts
  - [ ] 2.2.4 Plan approval flow
  
- [ ] **2.3** Safety checker
  - [ ] 2.3.1 Create safety-checker skill
  - [ ] 2.3.2 Define sensitive operations
  - [ ] 2.3.3 Implement safety confirmation UI
  - [ ] 2.3.4 Type-to-confirm mechanism
  
- [ ] **2.4** Execution engine
  - [ ] 2.4.1 Create execution orchestrator
  - [ ] 2.4.2 Progress tracking
  - [ ] 2.4.3 Error handling
  - [ ] 2.4.4 Rollback mechanism
  
- [ ] **2.5** Read-only operations
  - [ ] 2.5.1 List products command
  - [ ] 2.5.2 View product details
  - [ ] 2.5.3 Search/filter products
  - [ ] 2.5.4 Basic analytics display

**Deliverable**: Can plan, review, and execute basic product operations

---

### Phase 3: Product Management (Week 5-6)
**Goal**: Full CRUD for products with image handling

**Tasks**:
- [ ] **3.1** Product tools
  - [ ] 3.1.1 createProduct tool
  - [ ] 3.1.2 updateProduct tool
  - [ ] 3.1.3 deleteProduct tool
  - [ ] 3.1.4 getProduct tool
  
- [ ] **3.2** Image handling
  - [ ] 3.2.1 Image validation
  - [ ] 3.2.2 Cloudinary upload tool
  - [ ] 3.2.3 Image optimization
  - [ ] 3.2.4 Progress tracking for uploads
  
- [ ] **3.3** Variant management
  - [ ] 3.3.1 Generate variant SKUs
  - [ ] 3.3.2 Bulk variant creation
  - [ ] 3.3.3 Variant inventory tracking
  - [ ] 3.3.4 Price tier management
  
- [ ] **3.4** Product catalog UI
  - [ ] 3.4.1 Product table component
  - [ ] 3.4.2 Filtering and sorting
  - [ ] 3.4.3 Pagination
  - [ ] 3.4.4 Quick actions
  
- [ ] **3.5** Validation layer
  - [ ] 3.5.1 Zod schemas for products
  - [ ] 3.5.2 SKU uniqueness checks
  - [ ] 3.5.3 Price validation
  - [ ] 3.5.4 Image requirements

**Deliverable**: Full product management with images and variants

---

### Phase 4: Batch Operations (Week 7-8)
**Goal**: Import/export and bulk operations

**Tasks**:
- [ ] **4.1** CSV import
  - [ ] 4.1.1 CSV parser
  - [ ] 4.1.2 Validation engine
  - [ ] 4.1.3 Preview before import
  - [ ] 4.1.4 Error reporting
  
- [ ] **4.2** Batch operations skill
  - [ ] 4.2.1 Create batch-operations skill
  - [ ] 4.2.2 Multi-item plan generation
  - [ ] 4.2.3 Individual item review
  - [ ] 4.2.4 Progress tracking for batches
  
- [ ] **4.3** Bulk actions UI
  - [ ] 4.3.1 Multi-select in tables
  - [ ] 4.3.2 Bulk update interface
  - [ ] 4.3.3 Bulk delete with safety
  - [ ] 4.3.4 Batch progress display
  
- [ ] **4.4** Export functionality
  - [ ] 4.4.1 Export to CSV
  - [ ] 4.4.2 Export to JSON
  - [ ] 4.4.3 Filtered exports
  - [ ] 4.4.4 Scheduled exports (future)

**Deliverable**: Can import/export products and perform bulk operations

---

### Phase 5: Undo System (Week 9)
**Goal**: 24-hour undo window for all operations

**Tasks**:
- [ ] **5.1** Undo log infrastructure
  - [ ] 5.1.1 Create undo_logs table
  - [ ] 5.1.2 Log all write operations
  - [ ] 5.1.3 Store operation context
  - [ ] 5.1.4 Automatic expiration
  
- [ ] **5.2** Undo engine
  - [ ] 5.2.1 Reverse operation logic
  - [ ] 5.2.2 Soft delete implementation
  - [ ] 5.2.3 Image cleanup scheduling
  - [ ] 5.2.4 Undo confirmation flow
  
- [ ] **5.3** Undo UI
  - [ ] 5.3.1 Undo history display
  - [ ] 5.3.2 Quick undo from success screen
  - [ ] 5.3.3 Undo expiration warnings
  - [ ] 5.3.4 Bulk undo (for batch ops)
  
- [ ] **5.4** Recovery
  - [ ] 5.4.1 Admin recovery (30-day)
  - [ ] 5.4.2 Audit trail viewing
  - [ ] 5.4.3 Operation replay (for debugging)

**Deliverable**: Full undo system with 24h window

---

### Phase 6: Customer & Order Management (Week 10-11)
**Goal**: Manage customers and orders with safety

**Tasks**:
- [ ] **6.1** Customer tools
  - [ ] 6.1.1 View customer profiles
  - [ ] 6.1.2 Search customers
  - [ ] 6.1.3 Update customer info
  - [ ] 6.1.4 Customer approval workflow
  
- [ ] **6.2** Order tools
  - [ ] 6.2.1 View orders
  - [ ] 6.2.2 Update order status
  - [ ] 6.2.3 Process refunds (Stripe)
  - [ ] 6.2.4 Order notes/comments
  
- [ ] **6.3** Enhanced safety
  - [ ] 6.3.1 Extra confirmation for orders
  - [ ] 6.3.2 Refund approval workflow
  - [ ] 6.3.3 Customer data protection
  - [ ] 6.3.4 GDPR compliance checks
  
- [ ] **6.4** Customer/order UI
  - [ ] 6.4.1 Customer table view
  - [ ] 6.4.2 Order detail view
  - [ ] 6.4.3 Order timeline
  - [ ] 6.4.4 Customer order history

**Deliverable**: Customer and order management with enhanced safety

---

### Phase 7: Analytics & Reporting (Week 12)
**Goal**: Business insights and reporting

**Tasks**:
- [ ] **7.1** Analytics tools
  - [ ] 7.1.1 Sales reports
  - [ ] 7.1.2 Inventory reports
  - [ ] 7.1.3 Customer analytics
  - [ ] 7.1.4 Revenue tracking
  
- [ ] **7.2** Natural language queries
  - [ ] 7.2.1 "Show sales last week"
  - [ ] 7.2.2 "Top products this month"
  - [ ] 7.2.3 "Low stock alerts"
  - [ ] 7.2.4 "Customer growth"
  
- [ ] **7.3** Dashboard
  - [ ] 7.3.1 KPI display
  - [ ] 7.3.2 Trend charts (ASCII)
  - [ ] 7.3.3 Alert notifications
  - [ ] 7.3.4 Quick stats
  
- [ ] **7.4** Export reports
  - [ ] 7.4.1 PDF generation
  - [ ] 7.4.2 Email reports
  - [ ] 7.4.3 Scheduled reports (future)

**Deliverable**: Analytics dashboard and reporting

---

### Phase 8: Polish & Production (Week 13-14)
**Goal**: Production-ready with documentation

**Tasks**:
- [ ] **8.1** Performance
  - [ ] 8.1.1 Optimize database queries
  - [ ] 8.1.2 Cache frequently accessed data
  - [ ] 8.1.3 Lazy loading for large lists
  - [ ] 8.1.4 Connection pooling
  
- [ ] **8.2** Testing
  - [ ] 8.2.1 Unit tests for tools
  - [ ] 8.2.2 Integration tests
  - [ ] 8.2.3 TUI component tests
  - [ ] 8.2.4 End-to-end scenarios
  
- [ ] **8.3** Documentation
  - [ ] 8.3.1 User guide
  - [ ] 8.3.2 Command reference
  - [ ] 8.3.3 Troubleshooting guide
  - [ ] 8.3.4 API documentation
  
- [ ] **8.4** Deployment
  - [ ] 8.4.1 Environment configuration
  - [ ] 8.4.2 Docker container
  - [ ] 8.4.3 CI/CD pipeline
  - [ ] 8.4.4 Monitoring setup

**Deliverable**: Production-ready MerchStation v1.0

---

## 11. Technical Specifications

### 11.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Language | TypeScript |
| TUI Framework | Ink (React for terminals) |
| State Management | Zustand |
| Validation | Zod |
| Database ORM | Drizzle (shared with main app) |
| AI Backend | OpenCode SDK |
| Testing | Vitest |
| Linting | ESLint + Prettier |

### 11.2 Project Structure

```
/merchstation
├── src/
│   ├── components/           # Ink UI components
│   │   ├── App.tsx          # Main app component
│   │   ├── Dashboard.tsx    # Dashboard view
│   │   ├── PlanView.tsx     # Plan display
│   │   ├── Table.tsx        # Data tables
│   │   ├── InputBox.tsx     # Command input
│   │   └── StatusBar.tsx    # Bottom status
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useOpenCode.ts   # OpenCode connection
│   │   ├── usePlan.ts       # Plan state management
│   │   ├── useExecution.ts  # Execution tracking
│   │   └── useUndo.ts       # Undo functionality
│   │
│   ├── lib/                 # Utilities
│   │   ├── opencode.ts      # OpenCode client
│   │   ├── validation.ts    # Zod schemas
│   │   ├── safety.ts        # Safety checker
│   │   └── constants.ts     # App constants
│   │
│   ├── types/               # TypeScript types
│   │   ├── intent.ts        # Intent types
│   │   ├── plan.ts          # Plan types
│   │   └── operations.ts    # Operation types
│   │
│   └── index.tsx            # Entry point
│
├── .opencode/               # OpenCode configuration
│   ├── skills/              # Custom skills
│   │   ├── intent-parser/
│   │   ├── plan-generator/
│   │   ├── safety-checker/
│   │   └── batch-operations/
│   │
│   ├── tools/               # Custom tools
│   │   ├── product-tools.ts
│   │   ├── customer-tools.ts
│   │   ├── order-tools.ts
│   │   └── image-tools.ts
│   │
│   └── opencode.json        # MCP config
│
├── tests/                   # Test files
├── docs/                    # Documentation
├── package.json
├── tsconfig.json
└── README.md
```

### 11.3 Database Schema Additions

```typescript
// For undo system (add to existing schema)
export const undoLogs = pgTable("undo_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  operationType: text("operation_type").notNull(),
  originalIntent: jsonb("original_intent").notNull(),
  executedActions: jsonb("executed_actions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").default("available"), // available, used, expired
  metadata: jsonb("metadata")
});

// For audit logging
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"),
  operation: text("operation").notNull(),
  intent: jsonb("intent"),
  plan: jsonb("plan"),
  approvedAt: timestamp("approved_at"),
  executedAt: timestamp("executed_at").defaultNow(),
  result: text("result"), // success, failure, cancelled
  errorMessage: text("error_message"),
  undoId: uuid("undo_id").references(() => undoLogs.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});
```

---

## 12. Success Metrics

### 12.1 Performance Targets

| Metric | Target |
|--------|--------|
| Intent parsing | < 2s |
| Plan generation | < 3s |
| Product creation | < 10s (with images) |
| Batch import (100 items) | < 2 minutes |
| TUI startup | < 1s |
| Database query | < 100ms |

### 12.2 Safety Metrics

| Metric | Target |
|--------|--------|
| Accidental deletions | 0 |
| Invalid data entries | < 0.1% |
| Rollback rate | < 1% |
| Undo usage | Track for UX improvements |

### 12.3 User Experience

| Metric | Target |
|--------|--------|
| Operations without editing | > 80% |
| Plan approval rate | > 90% |
| User satisfaction | > 4.5/5 |
| Time saved vs manual | > 50% |

---

## 13. Risk Mitigation

### 13.1 Technical Risks

| Risk | Mitigation |
|------|------------|
| LLM hallucination | Validation layer + human review |
| Database corruption | Transactions + rollback |
| Image upload failures | Retry logic + partial success handling |
| OpenCode downtime | Fallback to structured commands |
| Performance issues | Caching + pagination |

### 13.2 Business Risks

| Risk | Mitigation |
|------|------------|
| Wrong product data | Multi-stage validation |
| Accidental deletion | Safety confirmations + undo |
| Unauthorized access | Clerk auth integration |
| Data loss | Audit logs + backups |

---

## 14. Future Enhancements

### 14.1 Post-v1.0 Features

- [ ] Voice commands (integrate with Deepgram)
- [ ] AI-powered suggestions ("You might want to restock...")
- [ ] Automated workflows ("When stock < 10, notify...")
- [ ] Multi-user collaboration
- [ ] Mobile companion app
- [ ] Advanced analytics with ML predictions
- [ ] Integration with shipping providers
- [ ] Automated customer communications

---

## Summary

**MerchStation** combines the power of OpenCode's AI with a safety-first "Plan → Review → Execute" workflow. Key principles:

1. **LLM plans, humans review, code executes**
2. **High-level plans** with detailed safety confirmations
3. **Editable plans** with iterative refinement
4. **24-hour undo** for all operations
5. **Full audit trail** for compliance
6. **Batch operations** with individual review

This architecture gives you the convenience of natural language with the safety of deterministic execution - perfect for managing production e-commerce data.

Ready to start development? I recommend beginning with **Phase 1** while you finish the backend-frontend connection work.
