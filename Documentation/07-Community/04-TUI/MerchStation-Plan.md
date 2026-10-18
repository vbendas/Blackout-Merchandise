# MerchStation - Admin TUI Control Center

> **Project:** Blackout Merchandise Admin TUI  
> **Version:** 1.1  
> **Status:** APPROVED - Ready for Implementation  
> **Start Date:** Phase 4 (Feb 12, 2026)  
> **Estimated Duration:** 1.5-2 days (Victor's velocity)  
> **Decision Date:** February 4, 2026  
> **Replaces:** Internal Admin Web Dashboard (PRD Phase 4)

---

## Executive Decision Summary

**Decision:** Build MerchStation TUI instead of internal admin web dashboard  
**Rationale:** Replaces planned work, saves 1 day vs original plan, better fit for team capabilities  
**ROI:** 4 days build → 50+ hours saved over 90 days (break-even in 10-20 days)  
**Confidence:** 10/10

### Why This Replaces the Web Admin Dashboard

| Aspect | Original Plan | New Plan | Impact |
|--------|---------------|----------|--------|
| **Internal Admin Tool** | Web Dashboard (3 days) | **TUI (1.5-2 days)** | **-1 day** |
| **Artist Dashboard** | Web (2 days) | Web (2 days) | Unchanged |
| **Total Admin Build** | 5 days | **4 days** | **Net savings: 1 day** |
| **Team Access** | Web (any device) | TUI (terminal-literate only) | Acceptable - team is technical |
| **Mobile Access** | Responsive web | Not needed | Production floor has fixed workstations |
| **Future Scale** | Web scales to non-technical | TUI requires training | "If they can't learn TUI, they're a bad hire" |

### Production Floor Integration

```
Production Floor Setup:
┌─────────────────────────────────────────┐
│  Screen Printing Press Area            │
│                                         │
│  [Monitor 1]    [Monitor 2]            │
│  Orders         Production Pipeline     │
│  Dashboard      (Kanban View)          │
│                                         │
│  [Wireless Keyboard + Mouse]           │
│  (Shared input device)                 │
│                                         │
│  Manager updates order status in       │
│  real-time as work flows through       │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ Single source of truth (one TUI instance)
- ✅ Real-time visibility for entire floor
- ✅ Zero context switching (no laptop/phone)
- ✅ Security (one device to secure)
- ✅ Competitive advantage (real-time order tracking)  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Security Model](#security-model)
5. [Role-Based Access Control](#role-based-access-control)
6. [Screen Specifications](#screen-specifications)
   - [Campaigns (MCP Integration)](#5-campaigns-mcp-integration)
7. [Database Schema Additions](#database-schema-additions)
8. [Leopoldo AI Integration](#leopoldo-ai-integration)
9. [Task Breakdown](#task-breakdown)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Implementation Timeline](#implementation-timeline)
12. [Dependencies](#dependencies)
13. [Campaign Management MCP](./Campaign-Management-MCP-Plan.md)

---

## Executive Summary

**MerchStation** is a React-based terminal control center built with **Ink** (the same framework powering Claude Code). It connects directly to your Neon PostgreSQL database via Drizzle ORM and features **Leopoldo** as an AI co-pilot for intelligent data queries and admin actions.

### Key Features

- **Local-only operation** for maximum security
- **Multi-user RBAC** with 5 role levels (owner, admin, manager, support, viewer)
- **Full platform management**: users, stores, products, orders, waitlist
- **Production pipeline** with granular order status tracking
- **Campaign Management** via MCP (Meta/TikTok Ads) - auto-pause on CAC/CPC limits
- **AI-powered insights** via Leopoldo
- **Global notifications** system
- **Comprehensive analytics** and reporting

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    YOUR TERMINAL                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │              MerchStation (Ink/React)               │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ Sidebar  │  │  Main Panel  │  │  Leopoldo   │  │  │
│  │  │ Nav      │  │  (Dynamic)   │  │  AI Panel   │  │  │
│  │  │          │  │              │  │             │  │  │
│  │  │ Dashboard│  │  Tables      │  │  Chat       │  │  │
│  │  │ Users    │  │  Forms       │  │  Insights   │  │  │
│  │  │ Stores   │  │  Charts      │  │  Commands   │  │  │
│  │  │ Products │  │  Details     │  │             │  │  │
│  │  │ Orders   │  │              │  │             │  │  │
│  │  │ Waitlist │  │              │  │             │  │  │
│  │  │ Campaigns│  │              │  │             │  │  │
│  │  │ Notifs   │  │              │  │             │  │  │
│  │  │ Analytics│  │              │  │             │  │  │
│  │  │ Settings │  │              │  │             │  │  │
│  │  └──────────┘  └──────────────┘  └─────────────┘  │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │          Status Bar / Command Input           │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐           ┌─────────────────┐
│  Neon PostgreSQL │           │  OpenRouter API  │
│  (Drizzle ORM)   │           │  (Leopoldo AI)   │
└─────────────────┘           └─────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Bun | Latest | Fast TypeScript-native runtime |
| **TUI Framework** | Ink | 5.x | React-based terminal UI |
| **React** | React | 18.x | Component framework |
| **UI Components** | @inkjs/ui | 2.0 | Official Ink component library |
| **Tables** | ink-table | 3.1 | Data table rendering |
| **Charts** | asciichart | 1.5 | ASCII sparklines and charts |
| **Database** | Drizzle ORM | 0.45.x | Type-safe SQL |
| **DB Driver** | @neondatabase/serverless | 1.0.x | Neon connection |
| **AI (LLM)** | Mistral Small 4 | API | Natural language queries, insights |
| **AI (Code)** | Codestral | API | SQL/script generation |
| **AI Client** | @mistralai/mistral-sdk | Latest | Mistral API client |
| **Auth** | argon2 | 0.41.x | Passphrase hashing |
| **State** | Zustand | 5.x | Global state management |
| **Encryption** | Node.js crypto | Built-in | AES-256-GCM for config |
| **Validation** | Zod | 3.x | Schema validation |
| **Dates** | date-fns | 4.x | Date formatting |
| **MCP** | @modelcontextprotocol/server | Latest | Meta/TikTok Ads integration |
| **Scheduling** | node-cron | 2.x | Automation polling |

---

## Security Model

### Local-Only Architecture

- **No remote deployment** - MerchStation runs only on your local machine
- **Direct Neon connection** via SSL (Neon's native encryption)
- **No SSH tunnel required** - Neon provides secure connections out of the box

### Authentication

```
~/.config/merchstation/
├── config.enc        # AES-256-GCM encrypted JSON
├── session.tmp       # Short-lived session token (30 min TTL)
└── audit.log         # Local audit trail (append-only)
```

**Security Features:**
- Passphrase hashed with **argon2id** (memory-hard, GPU-resistant)
- Config file encrypted with **AES-256-GCM**
- Session tokens auto-expire after 30 minutes of inactivity
- 3 failed login attempts trigger 5-minute lockout
- All actions logged with timestamp, user, IP, and action details

### Defense in Depth

| Layer | Protection |
|-------|-----------|
| Physical | Runs only on your machine |
| Auth | Local passphrase (not Clerk) |
| Network | Neon SSL + IP allowlisting |
| Data | Encrypted config, audit logging |
| Access | RBAC with principle of least privilege |

---

## Role-Based Access Control

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| **owner** | 0 | You (Victor). Full access. Cannot be demoted. |
| **admin** | 1 | Future senior employees. Full ops access, cannot manage other admins. |
| **manager** | 2 | Department leads. Access to their domain (orders, products, artists). |
| **support** | 3 | Customer support. Read-only + waitlist + order status updates. |
| **viewer** | 4 | Read-only access to dashboards and reports. |

### Permission Matrix

| Feature | Owner | Admin | Manager | Support | Viewer |
|---------|-------|-------|---------|---------|--------|
| Dashboard (all KPIs) | R | R | R | R (limited) | R |
| Users - List/View | R | R | R | R | R |
| Users - Ban/Suspend | RW | RW | - | - | - |
| Users - Role Change | RW | - | - | - | - |
| Stores - List/View | R | R | R | R | R |
| Stores - Toggle Live | RW | RW | RW | - | - |
| Stores - Delete | RW | RW | - | - | - |
| Products - List/View | R | R | R | R | R |
| Products - Edit/Deactivate | RW | RW | RW | - | - |
| Orders - List/View | R | R | R | R | R |
| Orders - Update Status | RW | RW | RW | RW | - |
| Orders - Refund | RW | RW | - | - | - |
| Waitlist - View | R | R | R | R | R |
| Waitlist - Approve/Reject | RW | RW | RW | RW | - |
| Notifications - Send Global | RW | RW | - | - | - |
| Analytics - Full | R | R | R | - | - |
| Analytics - Basic | R | R | R | R | R |
| Settings - Manage Users | RW | - | - | - | - |
| Settings - Audit Log | R | R | - | - | - |
| Leopoldo AI | Full | Full | Limited | Query only | Query only |
| DB Direct Query | RW | R | - | - | - |

---

## Screen Specifications

### 1. Login Screen

```
┌──────────────────────────────────────────────────┐
│                                                  │
│           ╔╦╗┌─┐┬─┐┌─┐┬ ┬╔═╗┌┬┐┌─┐┌┬┐┬┌─┐┌┐┌  │
│           ║║║├┤ ├┬┘│  ├─┤╚═╗ │ ├─┤ │ ││ ││││  │
│           ╩ ╩└─┘┴└─└─┘┴ ┴╚═╝ ┴ ┴ ┴ ┴ ┴└─┘┘└┘  │
│                   Control Center                 │
│                                                  │
│           Username: [victor          ]           │
│           Passphrase: [••••••••••••  ]           │
│                                                  │
│                   [ Login ]                      │
│                                                  │
│           🐱 Leopoldo is waiting for you...      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 2. Dashboard

```
┌─ MerchStation ───────────────────────────────────────────────────────────┐
│ victor (owner)                                          14:32 UTC Jan 15│
├───────────┬───────────────────────────────────────────┬──────────────────┤
│           │  DASHBOARD                                │  LEOPOLDO       │
│ Dashboard │                                           │                 │
│ > Users   │  ┌─────────┐ ┌─────────┐ ┌─────────┐     │  Hey Victor!    │
│   Stores  │  │ Users   │ │ Revenue │ │ Orders  │     │  3 waitlist     │
│   Products│  │   247   │ │ $12,450 │ │    89   │     │  entries need   │
│   Orders  │  │ +12 /wk │ │ +8% /wk │ │ 5 pend  │     │  review today.  │
│   Waitlist│  └─────────┘ └─────────┘ └─────────┘     │                 │
│   Notifs  │                                           │  Top seller:    │
│   Analytics│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │  "Luna Tee" by  │
│   Settings│  │ Stores  │ │Waitlist │ │Top Prod │    │  @starartist    │
│           │  │    34   │ │   156   │ │Luna Tee │    │  (42 units/wk)  │
│           │  │ 12 live │ │ 23 new  │ │ 42/week │    │                 │
│           │  └─────────┘ └─────────┘ └─────────┘     │  ─────────────  │
│           │                                           │  Ask me anything│
│           │  REVENUE (30 days)                        │  > [          ] │
│           │  $800 ┤      ╭──╮                         │                 │
│           │  $600 ┤   ╭──╯  ╰─╮  ╭╮                  │                 │
│           │  $400 ┤╭──╯       ╰──╯╰─╮                │                 │
│           │  $200 ┤╯                 ╰──              │                 │
│           │       └───────────────────────            │                 │
├───────────┴───────────────────────────────────────────┴──────────────────┤
│ [D]ashboard [U]sers [S]tores [P]roducts [O]rders [W]aitlist [?] Help   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3. Users Management

```
┌─ Users ──────────────────────────────────────────────────────────────────┐
│ Search: [                    ]  Role: [All ▼]  Sort: [Newest ▼]  247   │
├──────────────────────────────────────────────────────────────────────────┤
│ # │ Name            │ Email               │ Role    │ Stores │ Joined  │
│───┼─────────────────┼─────────────────────┼─────────┼────────┼─────────│
│ 1 │ Maria Santos    │ maria@email.com     │ artist  │ 2      │ Jan 10  │
│ 2 │ Jake Thompson   │ jake@email.com      │ customer│ -      │ Jan 09  │
│ 3 │ Luna Park       │ luna@studio.io      │ artist  │ 1      │ Jan 08  │
│ 4 │ Alex Rivera     │ alex@brand.co       │ artist  │ 3      │ Jan 05  │
│ 5 │ Sam Chen        │ sam@email.com       │ customer│ -      │ Jan 03  │
│                                                                         │
│ ◄ Page 1 of 25 ►                                                       │
├──────────────────────────────────────────────────────────────────────────┤
│ [Enter] View  [B]an  [R]ole  [E]xport  [/] Search  [Esc] Back         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4. Waitlist Review

```
┌─ Waitlist Review ────────────────────────────────────────────────────────┐
│ Pending: 23  │  Approved: 98  │  Rejected: 35  │  Total: 156           │
├──────────────────────────────────┬───────────────────────────────────────┤
│ PENDING ENTRIES                  │  APPLICANT DETAIL                    │
│                                  │                                      │
│ > Sofia Martinez  ★ 12.5K  Jan14│  Sofia Martinez                      │
│   David Kim       ★ 3.2K   Jan13│  sofia@artistry.io                   │
│   Ava Johnson     ★ 890    Jan12│  instagram.com/sofiamart             │
│   Leo Williams    ★ 45.1K  Jan11│  Followers: 10K-50K                  │
│   Mia Brown       ★ 2.1K   Jan10│                                      │
│                                  │  INTERVIEW RESPONSES:                │
│                                  │                                      │
│                                  │  Q1: Artist Name?                    │
│                                  │  "Sofia Martinez Artistry"           │
│                                  │                                      │
│                                  │  Q2: Merch Type?                     │
│                                  │  "Eco-friendly apparel, tote bags"   │
│                                  │                                      │
│                                  │  Q3: Biggest Challenge?              │
│                                  │  "Finding quality manufacturers..."  │
│                                  │                                      │
│                                  │  LEOPOLDO ANALYSIS:                  │
│                                  │  Score: 8.2/10                       │
│                                  │  "Strong social presence, aligned    │
│                                  │   values. Recommend approval."       │
├──────────────────────────────────┴───────────────────────────────────────┤
│ [A]pprove  [R]eject  [N]ote  [↑↓] Navigate  [L]eopoldo analyze all    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5. Campaigns (MCP Integration)

> **NEW - Phase 4b Feature**  
> See: [`Campaign-Management-MCP-Plan.md`](./Campaign-Management-MCP-Plan.md) for full specification

```
┌─ Campaigns ───────────────────────────────────────────────────────────────────┐
│ Platform: [All ▼]  Status: [All ▼]  Sort: [Spend ▼]  Search: [      ]   │
├──────────────────────────────────────────────────────────────────────────┤
│ # │ Platform │ Name              │ Status  │ Spend   │ CAC    │ CPC     │
│───┼─────────┼───────────────────┼─────────┼─────────┼────────┼─────────│
│ 1 │ Meta 🟦  │ Luna Tee Launch  │ RUNNING │ €234/500│ €23    │ €0.89   │
│   │          │                   │    🟢   │  47%    │ < €30 ✓│ < €1.20✓│
├───┼─────────┼───────────────────┼─────────┼─────────┼────────┼─────────│
│ 2 │ TikTok  │ Band Merch Drop   │ PAUSED  │ €189/300│ €47    │ €1.15   │
│   │    🎵   │                   │    🔴   │  63%    │ > €40 ⚠️│ < €1.50 ✓│
├───┼─────────┼───────────────────┼─────────┼─────────┼────────┼─────────│
│ 3 │ Meta 🟦  │ Retargeting Q1    │ RUNNING │ €156/200│ €18    │ €1.45   │
│   │          │                   │    🟢   │  78%    │ < €25 ✓│ > €1.20⚠️│
├──────────────────────────────────────────────────────────────────────────┤
│ [R]efresh  [N]ew  [E]dit Limits  [D]aily Report  [Enter] Detail  [C]    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Real-time campaign status via Meta/TikTok MCP servers
- Per-campaign CAC/CPC limits with auto-pause
- Daily automated report of paused campaigns
- Leopoldo AI alerts when limits exceeded

### 6. Production Pipeline

```
┌─ Production Pipeline ────────────────────────────────────────────────────┐
│                                                                          │
│  PENDING (5)    │  PAID (12)     │  PROCESSING (8) │  SHIPPED (3)       │
│  ──────────     │  ──────────    │  ──────────      │  ──────────        │
│  ┌──────────┐   │  ┌──────────┐  │  ┌──────────┐   │  ┌──────────┐     │
│  │ #1089    │   │  │ #1085    │  │  │ #1078    │   │  │ #1072    │     │
│  │ Luna Tee │   │  │ Eco Mug  │  │  │ Art Tote │   │  │ Cap Set  │     │
│  │ $34.99   │   │  │ $19.99   │  │  │ $29.99   │   │  │ $89.97   │     │
│  │ 2h ago   │   │  │ 5h ago   │  │  │ 1d ago   │   │  │ 2d ago   │     │
│  └──────────┘   │  └──────────┘  │  └──────────┘   │  └──────────┘     │
│  ┌──────────┐   │  ┌──────────┐  │  ┌──────────┐   │  ┌──────────┐     │
│  │ #1088    │   │  │ #1084    │  │  │ #1077    │   │  │ #1070    │     │
│  │ Bottle   │   │  │ Hoodie   │  │  │ Luna Tee │   │  │ Mug x3   │     │
│  │ $24.99   │   │  │ $59.99   │  │  │ $34.99   │   │  │ $59.97   │     │
│  │ 3h ago   │   │  │ 8h ago   │  │  │ 2d ago   │   │  │ 3d ago   │     │
│  └──────────┘   │  └──────────┘  │  └──────────┘   │  └──────────┘     │
│                 │                │                  │                    │
├──────────────────────────────────────────────────────────────────────────┤
│ [Enter] Detail  [→] Advance status  [←] Revert  [F]ilter  [Esc] Back   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6. Analytics

```
┌─ Analytics ──────────────────────────────────────────────────────────────┐
│ Period: [Last 30 days ▼]                                                │
├────────────────────────────────────┬─────────────────────────────────────┤
│ TOP SELLING ARTISTS                │  TOP PRODUCTS                      │
│                                    │                                     │
│ 1. Luna Park        $4,230 (42u)  │  1. Luna Tee       42u  $1,469.58  │
│ 2. Maria Santos     $3,890 (38u)  │  2. Eco Hoodie     28u  $1,679.72  │
│ 3. Alex Rivera      $2,100 (21u)  │  3. Art Tote       35u  $1,049.65  │
│ 4. Jake Art         $1,800 (19u)  │  4. Stanley Mug    31u    $619.69  │
│ 5. Zen Studio       $1,450 (15u)  │  5. Snapback Cap   22u    $549.78  │
│                                    │                                     │
├────────────────────────────────────┼─────────────────────────────────────┤
│ REVENUE BY CATEGORY                │  CONVERSION FUNNEL                  │
│                                    │                                     │
│ Apparel   ████████████████  62%    │  Visitors   ████████████████ 5,200  │
│ Drinkware ██████           23%    │  Signups    ████████         1,200  │
│ Bags      ████              11%    │  Waitlist   ████               420  │
│ Headwear  █                  4%    │  Approved   ██                 156  │
│                                    │  First Sale █                   42  │
├────────────────────────────────────┴─────────────────────────────────────┤
│ [E]xport CSV  [R]efresh  [P]eriod  [L]eopoldo insights  [Esc] Back     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Additions

### New Tables

```typescript
// admin-tui/src/db/schema-extensions.ts

import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from '../../../src/db/schema';

// Admin TUI users (separate from app users for security isolation)
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  role: text('role').notNull(), // owner, admin, manager, support, viewer
  passphraseHash: text('passphrase_hash').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Audit trail for all admin actions
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id),
  action: text('action').notNull(), // 'user.ban', 'waitlist.approve', etc.
  targetTable: text('target_table'),
  targetId: text('target_id'),
  details: jsonb('details'), // Before/after state, reason, etc.
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Global notifications (server-persisted, app picks up via API)
export const globalNotifications = pgTable('global_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // info, success, warning, error
  agentName: text('agent_name'), // 'Leopoldo', 'Francisca', 'Antonia'
  targetRoles: jsonb('target_roles'), // ['artist', 'customer'] or null for all
  isActive: boolean('is_active').default(true).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// User bans with history
export const userBans = pgTable('user_bans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  reason: text('reason').notNull(),
  bannedBy: uuid('banned_by').references(() => adminUsers.id).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // null = permanent
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Updated Order Status Enum

```typescript
// Update in /src/db/schema.ts
export const orderStatusEnum = pgEnum('order_status', [
  'pending',        // Awaiting payment
  'paid',           // Payment confirmed
  'printing',       // In production - screen printing
  'quality_check',  // QC inspection
  'packaging',      // Being packed for shipment
  'shipped',        // In transit
  'delivered',      // Successfully delivered
  'cancelled',      // Order cancelled
  'refunded'        // Payment refunded
]);
```

---

## Leopoldo AI Integration

### System Prompt (Admin Mode)

```
You are Leopoldo, the lead administrator AI for Blackout Merchandise. You are speaking 
with an admin user in the MerchStation terminal control center.

Your role:
- Help the admin manage the Blackout Merchandise platform efficiently
- Provide insights on sales, user behavior, and platform health
- Analyze waitlist applicants and recommend approve/reject decisions
- Answer questions about platform data using your database query tools
- Suggest proactive actions based on data patterns

Your personality:
- Professional but warm (you're still a cat, after all)
- Data-driven and precise with numbers
- Proactive about flagging issues or opportunities
- Brief in the terminal - respect the compact UI

You have access to these tools:
- query_users: Search and filter users
- query_orders: Search orders with status filters
- query_stores: Browse artist stores
- query_analytics: Revenue, growth, and trend data
- query_waitlist: Waitlist entries and stats
- analyze_applicant: Score a waitlist applicant
- execute_action: Perform admin actions (with confirmation)

Current context: {screen_name}, viewing {data_summary}
Admin user: {username} (role: {role})
```

### AI Features

| Feature | Description |
|---------|-------------|
| **Natural Language Queries** | "Show me all artists who joined this month" → SQL via Mistral Small 4 |
| **Waitlist Analysis** | Analyze interview responses, score applicants 0-10 via Mistral Large 3 |
| **Sales Insights** | "What's trending?", "Why did revenue drop?" — Mistral Small 4 + data context |
| **Anomaly Detection** | Proactive alerts for unusual patterns |
| **Action Execution** | "Approve Sofia Martinez", "Ban user #123" (with confirmation) |
| **Context Awareness** | Screen-aware suggestions, data-aware insights |
| **Code Generation** | Codestral generates SQL, shell scripts, automation workflows |
| **On-Premise Path** | At 250+ artists, self-host Mistral Small/Codestral at Portugal facility |

---

## Task Breakdown

### Phase 1: Project Setup & Auth (2 days)

| # | Task | Subtasks | Est. Time |
|---|------|----------|-----------|
| 1.1 | Initialize project | Bun init, package.json, tsconfig | 30 min |
| 1.2 | Install dependencies | Ink, React, @inkjs/ui, Drizzle, argon2 | 30 min |
| 1.3 | Database connection | Wrap existing /src/db/index.ts | 1 hour |
| 1.4 | Auth system | argon2 hashing, AES-256-GCM encryption | 3 hours |
| 1.5 | Login screen | Username/passphrase inputs | 2 hours |
| 1.6 | Setup wizard | First-run configuration | 2 hours |
| 1.7 | Session management | 30-min TTL, auto-refresh | 1 hour |
| 1.8 | Schema migrations | adminUsers, adminAuditLog, globalNotifications, userBans | 2 hours |

### Phase 2: Core UI Framework (2 days)

| # | Task | Subtasks | Est. Time |
|---|------|----------|-----------|
| 2.1 | Layout system | Sidebar, header, status bar, panels | 4 hours |
| 2.2 | Navigation | useNavigation hook, screen routing | 2 hours |
| 2.3 | Keybindings | Global shortcuts (D, U, S, P, O, W, etc.) | 2 hours |
| 2.4 | Shared components | DataTable, KpiCard, MiniChart, ConfirmDialog | 4 hours |
| 2.5 | Utilities | Formatters, colors, ASCII art, constants | 2 hours |
| 2.6 | Zustand store | Global state management | 2 hours |

### Phase 3: Admin Screens (4 days)

| # | Task | Subtasks | Est. Time |
|---|------|----------|-----------|
| 3.1 | Dashboard | KPI cards, revenue chart, activity feed | 4 hours |
| 3.2 | Users | List, detail, actions (ban, role change), search | 6 hours |
| 3.3 | Stores | List, detail, actions (toggle live, delete) | 4 hours |
| 3.4 | Products | List, detail, blanks catalog, analytics | 6 hours |
| 3.5 | Orders | List, detail, actions, production pipeline | 8 hours |
| 3.6 | Waitlist | List, review screen, stats, batch operations | 6 hours |
| 3.7 | Notifications | Composer, history, templates | 4 hours |
| 3.8 | Analytics | Revenue, top artists, top products, growth | 6 hours |

### Phase 4: Leopoldo AI (2 days)

| # | Task | Subtasks | Est. Time |
|---|------|----------|-----------|
| 4.1 | Mistral API client | Connection with streaming | 2 hours |
| 4.2 | Leopoldo persona | System prompt, context builder | 2 hours |
| 4.3 | AI tools | Function-calling for DB queries | 4 hours |
| 4.4 | AI panel UI | Chat interface, message bubbles | 4 hours |
| 4.5 | Suggestions | Context-aware quick actions | 2 hours |

### Phase 5: Settings & Polish (1-2 days)

| # | Task | Subtasks | Est. Time |
|---|------|----------|-----------|
| 5.1 | Settings | Access control, DB status, audit log | 4 hours |
| 5.2 | Data export | CSV, JSON export for all tables | 2 hours |
| 5.3 | Error handling | Connection recovery, graceful errors | 2 hours |
| 5.4 | Polish | Logo, loading states, help system | 3 hours |
| 5.5 | Integration | Add to root package.json scripts | 30 min |

**Total: ~11-12 days, 85+ subtasks**

---

## Keyboard Shortcuts

### Global Shortcuts

| Key | Action |
|-----|--------|
| `D` | Go to Dashboard |
| `U` | Go to Users |
| `S` | Go to Stores |
| `P` | Go to Products |
| `O` | Go to Orders |
| `W` | Go to Waitlist |
| `C` | Go to Campaigns (MCP) |
| `N` | Go to Notifications |
| `A` | Go to Analytics |
| `Ctrl+S` | Go to Settings |
| `Tab` | Toggle AI panel |
| `?` | Show help |
| `Esc` | Back / Close dialog |
| `Ctrl+Q` | Quit MerchStation |
| `/` | Focus search |

### Table Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Enter` | View detail |
| `[` / `]` | Previous / Next page |
| `s` | Sort toggle |
| `f` | Filter |
| `e` | Export |
| `Space` | Select (for bulk ops) |

### AI Panel

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Ctrl+L` | Clear chat |
| `↑` | Previous message (history) |

---

## Implementation Timeline

```
CURRENT ROADMAP + TUI INTEGRATION:

Phase 3.5-3.6 (NOW - Feb 9)    Main app UI enhancements + waitlist
                                 No TUI work yet

Phase 4 (Feb 12-26)             Backend Core
                                 ├── Main: Clerk auth, CRUD ops, webhooks
                                 └── TUI Phase 1-2: Setup + Auth + DB layer
                                     (build in parallel - shared DB work)

Phase 5 (Feb 26 - Mar 12)       AI Integration
                                 ├── Main: MiMo, Flux, U-Net
                                 └── TUI Phase 3-4: Screens + Leopoldo AI
                                     (reuse OpenRouter setup from main)

Phase 6 (Mar 12 - Apr 2)        Commerce
                                 ├── Main: Stripe, orders, artist dashboard
                                 └── TUI Phase 3 continued: Order screens,
                                     production pipeline, analytics

Phase 7 (Apr 2+)                 Beta Launch
                                 └── TUI Phase 5: Polish, export, full
                                     analytics with real data
```

---

## Dependencies

### package.json

```json
{
  "name": "merchstation",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "merchstation": "./merchstation.ts"
  },
  "scripts": {
    "dev": "bun merchstation.ts",
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "ink": "^5.0.1",
    "react": "^18.3.1",
    "@inkjs/ui": "^2.0.0",
    "ink-table": "^3.1.0",
    "ink-big-text": "^2.0.0",
    "ink-gradient": "^3.0.0",
    "zustand": "^5.0.0",
    "drizzle-orm": "^0.45.1",
    "@neondatabase/serverless": "^1.0.2",
    "@mistralai/mistral-sdk": "^1.0.0",
    "argon2": "^0.41.0",
    "asciichart": "^1.5.25",
    "chalk": "^5.3.0",
    "dotenv": "^17.2.3",
    "ulid": "^3.0.2",
    "date-fns": "^4.1.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.7.0",
    "ink-testing-library": "^4.0.0",
    "vitest": "^3.0.0"
  }
}
```

---

## File Structure

```
admin-tui/
├── package.json
├── tsconfig.json
├── merchstation.ts                 # Entry point (#!/usr/bin/env bun)
│
├── src/
│   ├── app.tsx                     # Root <App /> component
│   │
│   ├── auth/
│   │   ├── auth-manager.ts         # Passphrase verification, session tokens
│   │   ├── roles.ts                # Role definitions & permission matrix
│   │   ├── login-screen.tsx        # TUI login component
│   │   └── setup-wizard.tsx        # First-run config setup
│   │
│   ├── db/
│   │   ├── connection.ts           # Neon connection (wraps /src/db/index.ts)
│   │   ├── admin-queries.ts        # Admin-specific complex queries
│   │   ├── analytics-queries.ts    # Aggregation, stats, trends
│   │   └── audit-log.ts            # Action audit trail
│   │
│   ├── ai/
│   │   ├── leopoldo.ts             # Leopoldo persona + system prompt
│   │   ├── openrouter-client.ts    # OpenRouter connection
│   │   ├── tools.ts                # Function-calling tools for DB queries
│   │   └── context-builder.ts      # Build context from current view
│   │
│   ├── screens/
│   │   ├── dashboard.tsx           # Main dashboard with KPIs
│   │   ├── users/
│   │   │   ├── user-list.tsx       # Paginated user table
│   │   │   ├── user-detail.tsx     # Single user deep view
│   │   │   └── user-actions.tsx    # Ban, role change, etc.
│   │   ├── stores/
│   │   │   ├── store-list.tsx      # All artist stores
│   │   │   ├── store-detail.tsx    # Store deep view with products
│   │   │   └── store-actions.tsx   # Toggle live, edit theme
│   │   ├── products/
│   │   │   ├── product-list.tsx    # All products (filterable)
│   │   │   ├── product-detail.tsx  # Single product view
│   │   │   ├── blanks-list.tsx     # Product blanks catalog
│   │   │   └── product-analytics.tsx # Top sellers, trends
│   │   ├── orders/
│   │   │   ├── order-list.tsx      # All orders with status filters
│   │   │   ├── order-detail.tsx    # Full order breakdown
│   │   │   ├── order-actions.tsx   # Status updates, refunds
│   │   │   └── production-pipeline.tsx # Kanban-style pipeline view
│   │   ├── waitlist/
│   │   │   ├── waitlist-list.tsx   # All entries with interview data
│   │   │   ├── waitlist-review.tsx # Approve/reject with AI insights
│   │   │   └── waitlist-stats.tsx  # Conversion funnel stats
│   │   ├── notifications/
│   │   │   ├── notification-composer.tsx # Create global notifications
│   │   │   ├── notification-history.tsx  # Sent notifications log
│   │   │   └── templates.tsx       # Notification templates
│   │   ├── analytics/
│   │   │   ├── revenue.tsx         # Revenue charts & trends
│   │   │   ├── top-artists.tsx     # Best performing artists
│   │   │   ├── top-products.tsx    # Best selling products
│   │   │   └── growth.tsx          # User/store growth metrics
│   │   └── settings/
│   │       ├── access-control.tsx  # Manage TUI users & roles
│   │       ├── db-status.tsx       # Connection health
│   │       └── audit-log.tsx       # View admin action history
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx         # Navigation sidebar
│   │   │   ├── header.tsx          # Top bar with user info + clock
│   │   │   ├── status-bar.tsx      # Bottom bar with shortcuts
│   │   │   └── panel.tsx           # Reusable bordered panel
│   │   ├── data/
│   │   │   ├── data-table.tsx      # Sortable, paginated table
│   │   │   ├── mini-chart.tsx      # ASCII sparkline/bar chart
│   │   │   ├── kpi-card.tsx        # Stat card (value + delta)
│   │   │   └── progress-bar.tsx    # Custom progress bar
│   │   ├── leopoldo/
│   │   │   ├── ai-panel.tsx        # Right-side AI chat panel
│   │   │   ├── message-bubble.tsx  # Chat message rendering
│   │   │   └── suggestion-bar.tsx  # AI quick-action suggestions
│   │   └── shared/
│   │       ├── confirm-dialog.tsx  # Y/N confirmation
│   │       ├── search-input.tsx    # Search with debounce
│   │       ├── pagination.tsx      # Page controls
│   │       └── toast.tsx           # Temporary notification
│   │
│   ├── hooks/
│   │   ├── use-db-query.ts         # Data fetching with loading/error states
│   │   ├── use-navigation.ts       # Screen routing
│   │   ├── use-keybindings.ts      # Global keyboard shortcuts
│   │   ├── use-pagination.ts       # Pagination logic
│   │   └── use-ai.ts              # Leopoldo chat state
│   │
│   ├── store/
│   │   ├── app-store.ts           # Zustand global state
│   │   └── types.ts               # State type definitions
│   │
│   └── utils/
│       ├── formatters.ts          # Currency, dates, numbers
│       ├── colors.ts              # Terminal color palette
│       ├── ascii-art.ts           # Logo, borders, decorations
│       └── constants.ts           # Key mappings, config defaults
│
├── config/
│   └── .merchstation.enc          # Encrypted config (generated on setup)
│
└── tests/
    ├── auth.test.ts
    ├── queries.test.ts
    └── components/
```

---

## Implementation Timeline (Updated)

### Phase 3.6 (Now - Feb 9)
- ✅ Finish waitlist page
- ✅ Finish artist dashboard (already in progress)
- ❌ ~~Internal admin web dashboard~~ **CANCELLED** - Replaced by TUI

### Phase 4 (Feb 12-19) - Backend Core + TUI Phase 1-2
**Days 1-3:**
- Database schema extensions (adminUsers, adminAuditLog, globalNotifications, userBans)
- TUI setup, auth system, DB connection layer
- **Shared work:** Both TUI and main app use same Drizzle schema

**Days 4-7:**
- Main app CRUD operations (users, stores, products)
- TUI core UI (layout, navigation, keybindings)
- **Priority:** Production pipeline screen (highest value for manager)

### Phase 5 (Feb 20-26) - AI Integration + TUI Phase 3
**Days 1-3:**
- Main app MiMo/Flux integration
- TUI screens: Orders, Waitlist, Users, Dashboard
- **Reuse:** OpenRouter setup from main app

**Days 4-5:**
- TUI Leopoldo AI panel (simplified: text-only, pre-computed queries)
- Analytics screen

### Phase 6 (Feb 27 - Mar 5) - Commerce + TUI Polish
- Stripe integration (main app)
- TUI polish: Notifications, export features, error handling
- **Total TUI time:** 1.5-2 days of YOUR time (spread across 3 weeks)

### Production Floor Setup (Phase 6-7)
- Install monitors near presses
- Configure wireless keyboard/mouse
- Manager training (30 minutes)
- Go live with real-time order tracking

---

## Scope Adjustments (From Original Plan)

### Simplified for Faster Delivery

| Feature | Original Plan | Simplified Version | Rationale |
|---------|---------------|-------------------|-----------|
| **Leopoldo AI** | Full streaming + function-calling | Text-only, 5 pre-computed queries | Faster, no API latency |
| **Export** | CSV/JSON for all tables | Defer to Phase 7+ | Not needed for ops |
| **Stores/Products** | Full CRUD | Read-only initially | Artists manage their own |
| **Settings** | Full UI | Config file editing | Rarely changed |

### Priority Order (Build This First)

1. **Production Pipeline** (Day 1) - Manager's primary tool
2. **Orders List + Detail** (Day 1) - Order management
3. **Waitlist Review** (Day 2) - Your primary tool
4. **Users Management** (Day 2) - Ban users, role changes
5. **Dashboard** (Day 3) - Quick visibility
6. **Leopoldo AI** (Day 3-4) - Context-aware insights
7. **Analytics** (Day 4) - Revenue, top artists/products

---

## Next Steps

1. **✅ Decision made** - Build TUI, replace web admin
2. **Feb 12** - Start Phase 4 + TUI in parallel
3. **Week 1** - Get production pipeline working (highest priority)
4. **Week 2** - Add waitlist, users, orders screens
5. **Week 3** - Polish + Leopoldo AI panel
6. **Phase 6** - Production floor setup with monitors

---

## Appendix A: OpenCode-Powered Plan Mode Architecture (NEW)

> **Added:** February 7, 2026  
> **Status:** Future Enhancement - Post v1.0

### Overview

After v1.0 is stable, we'll enhance MerchStation with an **AI-powered "Plan → Review → Execute" workflow** using OpenCode as the intelligent backend. This adds natural language command processing with safety guardrails.

### Why OpenCode Integration?

| Feature | Traditional TUI | OpenCode-Powered |
|---------|----------------|------------------|
| Command Input | Structured commands only | Natural language + structured |
| Operation Planning | Immediate execution | Preview plan before execution |
| Safety | Basic confirmations | AI-detected sensitive operations |
| Batch Operations | Manual | AI-assisted with review |
| Learning Curve | Memorize commands | Conversational interface |

### Plan Mode Workflow

```
User Request → Intent Parsing → Plan Generation → User Review → Safety Check → Execution
     │              │                │               │              │            │
     ▼              ▼                ▼               ▼              ▼            ▼
  Natural      OpenCode Skill    High-level      Editable      Type-to      Deterministic
  Language     extracts data     plan with       plan with     confirm      code executes
  "Add baggy    and validates     details         clarifications for          with full
   t-shirt..."                   (21 variants,   and edits     sensitive      rollback
                                  3 images)                     operations     support
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MERCHSTATION TUI v2.0                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │   Ink/React  │────▶│  Plan Parser │────▶│  TUI Render  │                 │
│  │    Interface │     │   & Validator│     │   Engine     │                 │
│  └──────────────┘     └──────────────┘     └──────────────┘                 │
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
│  SKILLS:                    CUSTOM TOOLS:              MCP SERVERS:          │
│  ├── intent-parser          ├── product-tools          ├── neon-mcp         │
│  ├── plan-generator         ├── customer-tools         ├── cloudinary-mcp   │
│  ├── safety-checker         ├── order-tools            ├── stripe-mcp       │
│  └── batch-operations       ├── image-tools            └── redis-mcp        │
│                             └── analytics-tools                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Example Interaction

```
MerchStation> Add a baggy t-shirt, 100% cotton, sizes XS-3XL, colors black/white/red, 
              pics in /uploads/tshirt/

  Processing your request...
  
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

MerchStation> proceed

  [▓▓▓▓▓▓▓▓▓░] Validating images... ✓ 3 valid images found
  [▓▓▓▓▓▓▓▓▓▓] Uploading to Cloudinary... ✓ 3 images uploaded
  [▓▓▓▓▓▓▓▓▓▓] Creating product... ✓ ID: prod_12345
  [▓▓▓▓▓▓▓▓▓▓] Creating variants... ✓ 21/21 completed

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
│  [View Product]  [Add Another]  [Go to Dashboard]  [Undo (24h)]            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Safety Features

| Feature | Implementation |
|---------|----------------|
| **High-Level Plans** | Human-readable, not SQL dumps |
| **Editable Plans** | Modify any field before execution |
| **Safety Confirmation** | Type-to-confirm for deletes, refunds, bulk ops |
| **Validation Layer** | Zod schemas before any execution |
| **24-Hour Undo** | Full rollback for all operations |
| **Audit Trail** | Every action logged with intent + approval |
| **Deterministic Execution** | LLM plans, validated code executes |

### Batch Operations Example

```
MerchStation> Import 15 products from /uploads/batch-import/products-march-2024.csv

┌─ BATCH OPERATION PLAN ─────────────────────────────────────────────────────┐
│                                                                             │
│  ACTION: Import 15 Products from CSV                                        │
│                                                                             │
│  ITEMS TO PROCESS:                                                          │
│  ┌────┬──────────────────────┬────────┬───────────┬──────────┐             │
│  │ #  │ Product Name         │ Price  │ Variants  │ Status   │             │
│  ├────┼──────────────────────┼────────┼───────────┼──────────┤             │
│  │ 1  │ Vintage Band Tee     │ $34.99 │ 12        │ ✓ Ready  │             │
│  │ 2  │ Embroidered Hoodie   │ $59.99 │ 8         │ ✓ Ready  │             │
│  │ 3  │ Canvas Tote Bag      │ $24.99 │ 4         │ ⚠️ No images│          │
│  │ ...│ ...                  │ ...    │ ...       │ ...      │             │
│  └────┴──────────────────────┴────────┴───────────┴──────────┘             │
│                                                                             │
│  SUMMARY: 15 products, 127 variants, 2 issues found                         │
│  ⚠️  This will create 142 new database records                              │
│                                                                             │
│  [Review Items]  [Fix Issues]  [Proceed Anyway]  [Cancel]                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Additions for v2.0

| Component | Purpose |
|-----------|---------|
| **@opencode-ai/sdk** | OpenCode integration |
| **Custom Skills** | intent-parser, plan-generator, safety-checker |
| **Custom Tools** | Deterministic CRUD operations |
| **MCP Servers** | neon, cloudinary, stripe connectors |
| **Undo Log Table** | 24-hour rollback storage |
| **Audit Log Table** | Complete operation history |

### Implementation Timeline

**Phase 8+ (Post-Beta):**
- Week 1: OpenCode integration, intent parsing
- Week 2: Plan generator, safety checker
- Week 3: Execution engine, undo system
- Week 4: Batch operations, polish

**Prerequisite:** MerchStation v1.0 must be stable and production-tested.

### Full Specification

See detailed specification: `.opencode/plans/merchstation-tui.md`

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 4, 2026 | Initial plan |
| 1.1 | Feb 4, 2026 | **APPROVED** - Replaces web admin dashboard, updated timeline, simplified scope |
| 1.2 | Feb 7, 2026 | Added Appendix A: OpenCode-powered Plan Mode architecture for v2.0 |

---

**Document Owner:** Victor Bendas  
**Created:** February 4, 2026  
**Last Updated:** February 7, 2026  
**Status:** ✅ **APPROVED - Ready for Implementation**
