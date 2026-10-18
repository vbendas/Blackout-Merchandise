# Blackout Merchandise - Parallel Execution Plan

> **Goal**: Mitigate timeline risk through parallel workstreams  
> **Duration**: 2 weeks (Feb 3 - Feb 16, 2026)  
> **Target**: Phase 3 Complete + Phase 4 Kickoff Ready  
> **Last Updated**: January 30, 2026

---

## 🎯 Overview

This plan distributes work across **5 parallel agent sessions** to maximize velocity:

| Agent | Focus Area | Critical Path? | Est. Duration |
|-------|-----------|----------------|---------------|
| **Agent 1** | Waitlist Page + Frontend Polish | ✅ YES | 5-7 days |
| **Agent 2** | Real AI Chat Integration | ✅ YES | 7-10 days |
| **Agent 3** | Backend Hardening + DB Ops | ⚠️ Medium | 5-7 days |
| **Agent 4** | Testing Infrastructure + E2E | ⚠️ Medium | 5-7 days |
| **Agent 5** | Technical Debt + DevEx | ❌ Low | 3-5 days |

**Parallel Efficiency Gain**: ~60% faster than sequential execution

---

## 📋 Critical Path Analysis

### Blockers & Dependencies

```
AGENT 1 (Waitlist) ───────────────────────────────────────┐
    │                                                      │
    ▼                                                      ▼
[Waitlist Page Live] ────────────────────────────────► [PHASE 3 COMPLETE]
    │                                                      ▲
    │                                                      │
AGENT 2 (AI Chat) ────────────────────────────────────────┤
    │                                                      │
    ├──► [OpenRouter Integration]                          │
    ├──► [Agent Routing Logic]                             │
    └──► [Chat Persistence]                                │
                                                           │
AGENT 3 (Backend) ─────────────────────────────────────────┤
    │                                                      │
    ├──► [DB Migrations] ─────► AGENT 2 uses for persistence
    └──► [API Routes]                                        
                                                           │
AGENT 4 (Testing) ─────────────────────────────────────────┤
    │                                                      │
    └──► [Waitlist E2E Tests] validates AGENT 1 work       │
                                                           │
AGENT 5 (DevEx) ───────────────────────────────────────────┘
    │
    └──► [Convex Cleanup] can happen anytime
```

---

## 🤖 Agent 1: Waitlist & Frontend Sprint

**Priority**: 🔴 CRITICAL  
**Owner**: Frontend Specialist  
**Time Estimate**: 5-7 days  
**Deliverable**: Production-ready `/waitlist` page

### Tasks & Subtasks

#### Task 1.1: Waitlist Landing Page Core (Day 1-2)
- [ ] Create `/app/src/app/waitlist/page.tsx` with new design
- [ ] Implement 4-step interview flow:
  - Step 1: Welcome + AI introduction (Leopoldo)
  - Step 2: Basic info (name, email, artist type)
  - Step 3: Social proof (follower count, portfolio links)
  - Step 4: Interview questions + GDPR consent
- [ ] Add form validation with Zod schemas
- [ ] Implement progress indicator

#### Task 1.2: Waitlist Backend Integration (Day 2-3)
- [ ] Update `/app/src/app/api/waitlist/route.ts` with new fields
- [ ] Enhance `src/db/waitlist.ts` with interview data
- [ ] Add email notification (SendGrid/Resend integration)
- [ ] Implement duplicate prevention

#### Task 1.3: UI/UX Polish (Day 3-4)
- [ ] Add animations between steps (Framer Motion)
- [ ] Implement inline product suggestions during interview
- [ ] Add "people ahead of you" counter (from DB count)
- [ ] Mobile responsiveness verification
- [ ] Dark mode consistency check

#### Task 1.4: Integration & Testing (Day 4-5)
- [ ] Connect to main website CTA buttons
- [ ] Add success/error toast notifications
- [ ] Implement form auto-save (localStorage)
- [ ] Add analytics tracking (Vercel Analytics events)

### Agent 1 Prompt

```markdown
# AGENT 1: Waitlist Page Development

## Your Mission
Build a production-ready, conversion-optimized waitlist landing page that makes artists EXCITED to join. This is our primary conversion funnel.

## Context
- Current waitlist page exists at `/app/src/app/waitlist/page.tsx` but needs complete redesign
- Database schema already supports waitlist entries (`src/db/waitlist.ts`)
- Design system: Dark mode only, Gold sheen gradients for CTAs, Space Grotesk headings
- Must integrate with existing NavigationContext and styling

## Technical Requirements
1. **4-Step Interview Flow**:
   - Step 1: Leopoldo welcomes artist, explains what Blackout Merchandise is
   - Step 2: Capture name, email, artist type (musician, designer, etc.)
   - Step 3: Social validation - follower count, portfolio links (Instagram, TikTok, etc.)
   - Step 4: Qualifying questions + GDPR consent checkbox

2. **UI Components**:
   - Progress indicator (step 1 of 4, etc.)
   - Animated transitions between steps
   - Inline validation with error messages
   - "X people ahead of you" counter (query DB for position)
   - Success state with share buttons

3. **Backend Integration**:
   - POST to `/api/waitlist` (enhance existing route)
   - Store: name, email, artistType, followerRange, socialLinks, interviewResponses, gdprConsent
   - Send confirmation email (use console.log for now, we'll integrate later)
   - Prevent duplicate emails

4. **Polish**:
   - Mobile-first responsive design
   - Loading states on buttons
   - Auto-save form data to localStorage
   - Smooth scroll to top on step change

## Files to Modify
- `/app/src/app/waitlist/page.tsx` - COMPLETE REWRITE
- `/app/src/app/api/waitlist/route.ts` - Enhance with new fields
- `/app/src/components/waitlist/` - Create directory with step components
- `src/db/waitlist.ts` - Add new operations

## Success Criteria
- [ ] All 4 steps work with smooth animations
- [ ] Form validates on each step (can't proceed with errors)
- [ ] Data saves to Neon database correctly
- [ ] Mobile responsive (test on iPhone SE width)
- [ ] Build passes: `cd app && bun run build`
- [ ] Lighthouse accessibility score > 90

## Design References
- Use existing shadcn/ui components (Button, Input, Checkbox, etc.)
- Gold gradient: `linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)`
- Background: zinc-950
- Leopoldo avatar in top-right (use ChatAvatar component)

## Critical Notes
- This is a CONVERSION page - every pixel matters
- The form should feel like a conversation, not a bureaucracy
- GDPR checkbox must be explicit (required for legal compliance)
- Test the full flow end-to-end before marking complete
```

---

## 🤖 Agent 2: Real AI Chat Integration

**Priority**: 🔴 CRITICAL  
**Owner**: Full-Stack AI Specialist  
**Time Estimate**: 7-10 days  
**Deliverable**: Working AI chat with OpenRouter + agent routing

### Tasks & Subtasks

#### Task 2.1: OpenRouter Integration (Day 1-2)
- [ ] Create `/app/src/lib/openrouter.ts` client
- [ ] Implement streaming response handler
- [ ] Add retry logic with exponential backoff
- [ ] Set up model routing (Claude 3.5 Sonnet for complex, GPT-4o-mini for simple)
- [ ] Add cost tracking per request

#### Task 2.2: Agent Routing System (Day 2-4)
- [ ] Create `/app/src/lib/agent-router.ts`
- [ ] Implement topic classification (onboarding, design, orders, support)
- [ ] Create system prompts for each agent (Leopoldo, Francisca, Antonia)
- [ ] Add context window management (conversation history)
- [ ] Implement handoff detection (when to switch agents)

#### Task 2.3: Chat Persistence (Day 4-6)
- [ ] Update database schema for chat sessions
- [ ] Create `/app/src/app/api/chat/route.ts` API route
- [ ] Implement message history fetch/save
- [ ] Add session resumption
- [ ] Create chat summary for sidebar

#### Task 2.4: UI Integration (Day 6-8)
- [ ] Connect workspace page to real AI
- [ ] Add typing indicator during AI response
- [ ] Implement streaming text display
- [ ] Add error handling with retry button
- [ ] Create "Switch Agent" button in UI

#### Task 2.5: Testing & Optimization (Day 8-10)
- [ ] Test all three agent personalities
- [ ] Verify context retention across messages
- [ ] Test agent handoffs
- [ ] Optimize token usage
- [ ] Add rate limiting per user

### Agent 2 Prompt

```markdown
# AGENT 2: Real AI Chat Integration

## Your Mission
Replace the scripted demo chat with REAL AI powered by OpenRouter. Artists should be able to have genuine conversations with Leopoldo, Francisca, and Antonia.

## Context
- Current chat at `/app/src/app/app/workspace/page.tsx` uses scripted responses
- OpenRouter API key is configured in env
- Three agents exist with distinct personalities (see CLAUDE.md)
- NavigationContext has `activeAgent` state for switching

## Technical Requirements

### 2.1 OpenRouter Client
Create `/app/src/lib/openrouter.ts`:
```typescript
// Should support:
- Streaming responses (SSE)
- Model selection per request
- Retry logic (3 attempts with backoff)
- Error handling for rate limits
- Token usage tracking
```

### 2.2 Agent Router
Create `/app/src/lib/agent-router.ts`:
- Analyze user message to determine topic
- Route to appropriate agent:
  - **Leopoldo**: onboarding, account, general questions, sales
  - **Francisca**: design, catalog, products, visual identity
  - **Antonia**: orders, shipping, support, tracking
- Each agent has unique system prompt reflecting their personality
- Support explicit agent switching via UI

### 2.3 System Prompts
Create `/app/src/lib/agent-prompts.ts`:
- Leopoldo: São Paulo street-smart, persistent, protective
- Francisca: Porto princess, perfectionist, passionate about design
- Antonia: Irish gypsy, optimistic, "the hunter" for solutions
- All prompts should include:
  - Agent personality description
  - Available tools/functions they can reference
  - Response format guidelines
  - When to suggest human handoff

### 2.4 Chat API Route
Create/enhance `/app/src/app/api/chat/route.ts`:
- POST: Send message, get streaming response
- GET: Fetch conversation history
- PATCH: Update conversation metadata
- DELETE: Clear conversation
- Include user ID from Clerk auth

### 2.5 Database Schema
Update `src/db/schema.ts` for chat persistence:
```typescript
// Add tables:
- chat_sessions (id, userId, agent, createdAt, updatedAt)
- chat_messages (id, sessionId, role, content, createdAt)
```

### 2.6 UI Integration
Modify `/app/src/app/app/workspace/page.tsx`:
- Replace mock responses with real API calls
- Show typing indicator while waiting for AI
- Stream AI response word-by-word
- Add error state with retry button
- Show which agent is responding

## Files to Create/Modify
- NEW: `/app/src/lib/openrouter.ts`
- NEW: `/app/src/lib/agent-router.ts`
- NEW: `/app/src/lib/agent-prompts.ts`
- NEW/UPDATE: `/app/src/app/api/chat/route.ts`
- UPDATE: `src/db/schema.ts` (add chat tables)
- UPDATE: `src/db/chat.ts` (new file for chat operations)
- UPDATE: `/app/src/app/app/workspace/page.tsx`

## Success Criteria
- [ ] Can have a real conversation with Leopoldo about onboarding
- [ ] Can switch to Francisca and discuss design
- [ ] Can switch to Antonia and ask about orders
- [ ] Conversation history persists across page reloads
- [ ] Streaming responses feel smooth (not jumpy)
- [ ] Token usage is logged per conversation
- [ ] Rate limiting prevents abuse (10 requests/minute per user)
- [ ] Build passes: `cd app && bun run build`

## Agent Personalities (From CLAUDE.md)
**Leopoldo** (Store Manager):
- Domain: Onboarding, administration, sales
- Personality: São Paulo street-smart, persistent, protective
- Voice: Direct, confident, uses Brazilian Portuguese phrases occasionally

**Francisca** (Art Director):
- Domain: Design, catalog, visual identity
- Personality: Porto princess, perfectionist, passionate
- Voice: Artistic, descriptive, enthusiastic about aesthetics

**Antonia** (Operations Lead):
- Domain: Order tracking, shipping, support
- Personality: Irish gypsy, optimistic, "the hunter"
- Voice: Energetic, solution-oriented, empathetic

## Testing Checklist
- [ ] Start chat → Should greet as Leopoldo
- [ ] Ask "I need help with design" → Should suggest Francisca
- [ ] Switch to Francisca → Should acknowledge context
- [ ] Ask about an order → Should route to Antonia or suggest switching
- [ ] Reload page → Should restore conversation
- [ ] Send 15 messages quickly → Should rate limit
- [ ] Disconnect internet → Should show error with retry

## Cost Considerations
- Use GPT-4o-mini for simple queries ($0.15/1M tokens)
- Use Claude 3.5 Sonnet for complex design discussions ($3/1M tokens)
- Track usage in database for cost monitoring
```

---

## 🤖 Agent 3: Backend & Database Sprint

**Priority**: 🟡 MEDIUM-HIGH  
**Owner**: Backend/Database Specialist  
**Time Estimate**: 5-7 days  
**Deliverable**: Production-ready backend with migrations

### Tasks & Subtasks

#### Task 3.1: Database Schema Finalization (Day 1-2)
- [ ] Review and finalize all table schemas
- [ ] Add indexes for common queries
- [ ] Set up Row Level Security (RLS) policies for Neon
- [ ] Create migration files with Drizzle Kit
- [ ] Add seed data for development

#### Task 3.2: API Route Hardening (Day 2-4)
- [ ] Add input validation to all API routes (Zod)
- [ ] Implement proper error handling
- [ ] Add request logging
- [ ] Set up rate limiting middleware
- [ ] Add CORS configuration for production

#### Task 3.3: Database Operations Layer (Day 4-5)
- [ ] Complete `src/db/users.ts` operations
- [ ] Complete `src/db/orders.ts` operations
- [ ] Create `src/db/chat.ts` for Agent 2
- [ ] Add transaction support for multi-table ops
- [ ] Implement connection pooling optimization

#### Task 3.4: Webhook Security (Day 5-6)
- [ ] Harden Clerk webhook verification
- [ ] Harden Stripe webhook verification
- [ ] Add webhook event logging
- [ ] Implement idempotency for webhook handlers

#### Task 3.5: Performance Optimization (Day 6-7)
- [ ] Add database query performance monitoring
- [ ] Optimize slow queries
- [ ] Add Redis caching layer (Upstash)
- [ ] Set up connection pooling

### Agent 3 Prompt

```markdown
# AGENT 3: Backend & Database Hardening

## Your Mission
Transform our functional but basic backend into a production-grade system that can handle real users, real payments, and real AI conversations at scale.

## Context
- Database: Neon PostgreSQL with Drizzle ORM
- Auth: Clerk with webhook handling
- Payments: Stripe with webhook handling
- Current state: Basic CRUD operations exist, but lack production polish

## Technical Requirements

### 3.1 Schema Finalization
Review and finalize `src/db/schema.ts`:
- Ensure all foreign keys have proper indexes
- Add created_at/updated_at timestamps where missing
- Set up proper enums for status fields
- Add text search indexes (for product search)
- Ensure UUID primary keys for all tables

Generate migrations:
```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### 3.2 Row Level Security (RLS)
Set up RLS policies for Neon:
- Users can only read/update their own data
- Orders: artists see their orders, admins see all
- Chat sessions: private to user
- Waitlist: public read (for counter), admin write

### 3.3 API Route Hardening
Review all routes in `/app/src/app/api/`:

**Input Validation:**
- Use Zod for all request body validation
- Return 400 with detailed error messages
- Sanitize all user inputs

**Error Handling:**
- Try-catch all database operations
- Return appropriate HTTP status codes
- Log errors but don't leak internal details to client

**Rate Limiting:**
- 10 requests/minute per IP for public endpoints
- 100 requests/minute for authenticated users
- Use Upstash Redis for rate limit counters

### 3.4 Database Operations
Complete all operation files in `src/db/`:

**src/db/users.ts:**
- createUser(clerkId, email, name)
- getUserByClerkId(clerkId)
- updateUser(id, data)
- deleteUser(id)

**src/db/orders.ts:**
- createOrder(userId, items, total)
- getOrdersByUser(userId)
- getOrderById(id)
- updateOrderStatus(id, status)

**src/db/chat.ts** (NEW):
- createSession(userId, agent)
- getSession(sessionId)
- getSessionsByUser(userId)
- addMessage(sessionId, role, content)
- getMessages(sessionId)
- deleteSession(sessionId)

### 3.5 Webhook Security
**Clerk Webhook:**
- Verify webhook signature properly
- Handle user.created, user.updated, user.deleted
- Add idempotency (check if already processed)
- Log all webhook events

**Stripe Webhook:**
- Verify signature with webhook secret
- Handle payment_intent.succeeded, payment_intent.payment_failed
- Handle checkout.session.completed
- Add idempotency checks
- Update order status on payment events

### 3.6 Performance
- Add connection pooling (Neon serverless driver)
- Implement Redis caching for:
  - Product catalog (cache 5 minutes)
  - User sessions (cache 1 hour)
  - Waitlist count (cache 1 minute)
- Add query timing logs

## Files to Modify
- UPDATE: `src/db/schema.ts`
- UPDATE: `src/db/users.ts`
- UPDATE: `src/db/orders.ts`
- NEW: `src/db/chat.ts`
- NEW: `/app/src/lib/rate-limit.ts`
- UPDATE: `/app/src/app/api/webhooks/clerk/route.ts`
- UPDATE: `/app/src/app/api/webhooks/stripe/route.ts`
- UPDATE: All API routes for validation

## Success Criteria
- [ ] All migrations run successfully on Neon
- [ ] RLS policies tested and working
- [ ] API routes return proper error responses
- [ ] Rate limiting blocks excessive requests
- [ ] Webhooks verify signatures correctly
- [ ] Database operations have full CRUD coverage
- [ ] Build passes: `cd app && bun run build`
- [ ] All database queries have <100ms response time

## Testing Checklist
- [ ] Run `bunx drizzle-kit migrate` successfully
- [ ] Test RLS: User A cannot see User B's data
- [ ] Send invalid JSON to API → Should get 400
- [ ] Hit API 15 times in 10 seconds → Should get 429
- [ ] Send fake Clerk webhook → Should reject (invalid signature)
- [ ] Query product catalog twice → Second query should be cached
```

---

## 🤖 Agent 4: Testing & QA Sprint

**Priority**: 🟡 MEDIUM  
**Owner**: QA/Testing Specialist  
**Time Estimate**: 5-7 days  
**Deliverable**: Comprehensive test suite with CI/CD

### Tasks & Subtasks

#### Task 4.1: Testing Framework Setup (Day 1-2)
- [ ] Install and configure Vitest for unit testing
- [ ] Install and configure Playwright for E2E testing
- [ ] Set up test database (Neon branch)
- [ ] Create test utilities and fixtures
- [ ] Configure coverage reporting

#### Task 4.2: Unit Tests (Day 2-4)
- [ ] Test database operations (src/db/*.ts)
- [ ] Test utility functions (src/lib/*.ts)
- [ ] Test API routes with mocked dependencies
- [ ] Test React hooks
- [ ] Test component logic

#### Task 4.3: E2E Tests (Day 4-6)
- [ ] Test waitlist flow end-to-end
- [ ] Test authentication flow (Clerk)
- [ ] Test chat interface
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test accessibility (keyboard navigation, screen readers)

#### Task 4.4: CI/CD Integration (Day 6-7)
- [ ] Create GitHub Actions workflow
- [ ] Run tests on every PR
- [ ] Add build verification
- [ ] Add lint/type check
- [ ] Configure test reporting

### Agent 4 Prompt

```markdown
# AGENT 4: Testing Infrastructure & QA

## Your Mission
Establish a comprehensive testing suite that gives us confidence to deploy without fear. Tests should prevent regressions and catch bugs before they reach users.

## Context
- Currently ZERO automated tests exist
- Tech stack: Next.js 16, React 19, TypeScript, Drizzle ORM
- Testing tools to add: Vitest (unit), Playwright (E2E)
- CI/CD: GitHub Actions (to be configured)

## Technical Requirements

### 4.1 Testing Framework Setup
Install dependencies in `/app`:
```bash
bun add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
bun add -D playwright @playwright/test
bun add -D @vitest/coverage-v8
```

Create configuration:
- `vitest.config.ts` - Unit test config
- `playwright.config.ts` - E2E test config
- `.github/workflows/test.yml` - CI workflow

### 4.2 Unit Tests

**Database Operations** (`src/db/*.test.ts`):
```typescript
// Test pattern for each operation file:
- createX should insert record
- getX should return correct data
- updateX should modify record
- deleteX should remove record
- All should handle errors gracefully
```

**API Routes** (`/app/src/app/api/*/route.test.ts`):
- Test with mocked database
- Test input validation
- Test error handling
- Test authentication (mock Clerk)
- Test response format

**Utilities** (`src/lib/*.test.ts`):
- Test pure functions
- Test edge cases
- Test error conditions

**React Hooks** (if complex logic exists):
- Test hook behavior
- Test state transitions
- Test cleanup

### 4.3 E2E Tests

**Authentication Flow** (`e2e/auth.spec.ts`):
- Visit home page
- Click "Get Started"
- Sign up with Clerk (use test credentials)
- Verify redirect to /app
- Verify user created in database

**Waitlist Flow** (`e2e/waitlist.spec.ts`):
- Visit /waitlist
- Complete all 4 steps
- Submit form
- Verify success message
- Verify database entry created
- Test validation (try to submit empty form)

**Chat Interface** (`e2e/chat.spec.ts`):
- Login as test user
- Visit /app/workspace
- Send a message
- Verify AI responds (or mock response)
- Test agent switching
- Test conversation persistence

**Responsive Design** (`e2e/responsive.spec.ts`):
- Test on mobile viewport (375px)
- Test on tablet viewport (768px)
- Test on desktop viewport (1440px)
- Verify no layout breaks

### 4.4 Accessibility Tests
- Run axe-core on all pages
- Test keyboard navigation
- Test screen reader compatibility
- Verify color contrast ratios

### 4.5 CI/CD Integration

Create `.github/workflows/test.yml`:
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:unit
      - run: bun run test:e2e
      - run: bun run build
```

## Files to Create
- NEW: `vitest.config.ts`
- NEW: `playwright.config.ts`
- NEW: `.github/workflows/test.yml`
- NEW: `src/db/*.test.ts` (for each db file)
- NEW: `/app/src/app/api/*/route.test.ts`
- NEW: `e2e/*.spec.ts`
- NEW: `src/lib/test-utils.ts`

## Success Criteria
- [ ] Vitest configured and running
- [ ] Playwright configured and running
- [ ] 80%+ code coverage for database operations
- [ ] E2E tests for critical paths (auth, waitlist, chat)
- [ ] CI pipeline runs on every PR
- [ ] Tests block merging on failure
- [ ] Build verification in CI

## Testing Philosophy
- **Test behavior, not implementation** - Tests should survive refactors
- **One assertion per test** - Clear failure messages
- **Mock external dependencies** - Don't hit real APIs in tests
- **Fast feedback** - Unit tests should run in <10 seconds
- **Reliable E2E** - Tests should not be flaky

## Critical Paths to Test (Priority Order)
1. Waitlist submission (conversion critical)
2. User authentication (access critical)
3. Chat message flow (core feature)
4. Payment webhooks (revenue critical)
5. Database operations (data integrity)
```

---

## 🤖 Agent 5: Technical Debt & DevEx Sprint

**Priority**: 🟢 LOW (Can run parallel without blocking)  
**Owner**: DevOps/Infrastructure Specialist  
**Time Estimate**: 3-5 days  
**Deliverable**: Clean codebase, standardized tooling

### Tasks & Subtasks

#### Task 5.1: Convex Cleanup (Day 1-2)
- [ ] Audit `/app/convex/` directory
- [ ] Migrate any remaining functions to Drizzle
- [ ] Remove Convex dependency from package.json
- [ ] Delete convex directory
- [ ] Update documentation

#### Task 5.2: Package Manager Standardization (Day 2)
- [ ] Evaluate Bun vs npm for the project
- [ ] Standardize all subprojects on one manager
- [ ] Update package.json scripts
- [ ] Update documentation
- [ ] Test all commands

#### Task 5.3: Code Quality Enforcement (Day 2-3)
- [ ] Configure Biome/ESLint rules
- [ ] Add import sorting
- [ ] Add consistent type imports
- [ ] Set up pre-commit hooks (Husky already present)
- [ ] Add code formatting check to CI

#### Task 5.4: Documentation Updates (Day 3-4)
- [ ] Update CLAUDE.md with latest changes
- [ ] Update Context.md with current status
- [ ] Create API documentation
- [ ] Document deployment process
- [ ] Create troubleshooting guide

#### Task 5.5: Developer Experience (Day 4-5)
- [ ] Create `.env.example` files for all projects
- [ ] Set up VS Code recommended extensions
- [ ] Add debugging configuration
- [ ] Create database seed scripts
- [ ] Add Makefile or task runner for common commands

### Agent 5 Prompt

```markdown
# AGENT 5: Technical Debt & Developer Experience

## Your Mission
Clean up the codebase, standardize tooling, and improve developer experience. While other agents build features, you ensure the foundation is solid and consistent.

## Context
- Mixed package managers (Bun in /app, npm in /mainpage)
- Convex legacy code still present in /app/convex/
- Documentation exists but may be out of sync
- No standardized development environment setup

## Technical Requirements

### 5.1 Convex Cleanup
The `/app/convex/` directory is marked as legacy but still exists:

1. Audit what's in there:
   - List all files in `/app/convex/`
   - Identify any functions still being imported
   - Check if convex is in package.json dependencies

2. If functions are still used:
   - Migrate them to Drizzle equivalents
   - Update imports in components
   - Test functionality

3. Remove Convex:
   - `bun remove convex`
   - Delete `/app/convex/` directory
   - Remove convex-related environment variables
   - Update documentation to remove Convex references

### 5.2 Package Manager Standardization
Currently:
- `/app` uses Bun
- `/mainpage` uses npm
- Root uses Bun (for Drizzle)

**Decision needed**: Standardize on ONE.

Recommendation: **Bun** (faster, modern, already in use)

Tasks:
1. Convert `/mainpage` to Bun:
   - Replace package-lock.json with bun.lock
   - Update package.json scripts
   - Update all npm commands to bun
   - Test: `cd mainpage && bun install && bun run build`

2. Update documentation:
   - Context.md package manager table
   - CLAUDE.md commands section
   - Any README files

3. Add root-level convenience:
   - Create root package.json with workspace scripts
   - Add scripts like `bun run dev:app`, `bun run dev:mainpage`

### 5.3 Code Quality Enforcement
Review and enhance code quality tools:

**Biome Configuration** (already in app/biome.json):
- Ensure all rules are appropriate
- Add import organization
- Add consistent type imports (`import type`)

**ESLint** (already configured):
- Add a11y (accessibility) rules
- Add React hooks rules
- Add import/export rules

**Pre-commit Hooks** (already has Husky):
- Ensure pre-commit runs linting
- Ensure pre-commit runs type checking
- Add secret scanning (git-secrets or similar)
- Make sure hooks are executable

**VS Code Settings**:
Create `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit"
  }
}
```

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "biomejs.biome",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint"
  ]
}
```

### 5.4 Documentation Updates
Review and update all documentation:

**CLAUDE.md**:
- Verify all file paths are correct
- Update current phase status
- Add any new conventions
- Remove outdated information

**Context.md**:
- Update "Current Phase" section
- Update completed work list
- Update "In Progress" section
- Verify all links work

**New Files to Create**:
- `DEPLOYMENT.md` - How to deploy to Vercel
- `TROUBLESHOOTING.md` - Common issues and solutions
- `CONTRIBUTING.md` - How to contribute (for future team members)

### 5.5 Developer Experience Improvements

**Environment Setup**:
- Ensure `.env.example` exists in both `/app` and `/mainpage`
- List all required environment variables
- Add comments explaining each variable

**Database Seeding**:
Create `src/db/seed.ts`:
- Seed product blanks for catalog
- Seed test users
- Seed test orders
- Run with: `bun run db:seed`

**Convenience Scripts**:
Add to root package.json:
```json
{
  "scripts": {
    "dev:app": "cd app && bun dev",
    "dev:mainpage": "cd mainpage && bun dev",
    "build:app": "cd app && bun build",
    "build:mainpage": "cd mainpage && bun build",
    "db:generate": "bunx drizzle-kit generate",
    "db:migrate": "bunx drizzle-kit migrate",
    "db:studio": "bunx drizzle-kit studio",
    "db:seed": "bun run src/db/seed.ts",
    "test": "cd app && bun test",
    "lint": "cd app && bun lint && cd ../mainpage && bun lint",
    "verify": "./verify.sh"
  }
}
```

**Debug Configuration**:
Create `.vscode/launch.json` for Next.js debugging

## Files to Modify/Create
- DELETE: `/app/convex/` (after migration)
- UPDATE: `/app/package.json` (remove convex)
- UPDATE: `/mainpage/package.json` (convert to bun)
- NEW: `/mainpage/bun.lock`
- UPDATE: `Context.md`
- UPDATE: `CLAUDE.md`
- NEW: `.vscode/settings.json`
- NEW: `.vscode/extensions.json`
- NEW: `.vscode/launch.json`
- NEW: `DEPLOYMENT.md`
- NEW: `TROUBLESHOOTING.md`
- NEW: `src/db/seed.ts`
- NEW: Root `package.json` with convenience scripts

## Success Criteria
- [ ] Convex completely removed (no references anywhere)
- [ ] Both projects use Bun consistently
- [ ] Biome/ESLint pass without errors
- [ ] Pre-commit hooks run successfully
- [ ] Documentation is current and accurate
- [ ] New developers can get started in <10 minutes
- [ ] Root-level scripts work: `bun run dev:app`, `bun run db:migrate`, etc.
- [ ] VS Code recommended extensions are helpful

## Non-Goals (Out of Scope)
- Major refactoring of working code
- Adding new features
- Changing architecture decisions
- Performance optimization (unless obvious)

## Notes
- This work can happen ANYTIME - doesn't block other agents
- Can be done incrementally (one task per day)
- If any task reveals bigger issues, document them for future sprints
```

---

## 📅 Timeline & Coordination

### Week 1 (Feb 3-9)

| Day | Agent 1 | Agent 2 | Agent 3 | Agent 4 | Agent 5 |
|-----|---------|---------|---------|---------|---------|
| Mon | Task 1.1 | Task 2.1 | Task 3.1 | Task 4.1 | Task 5.1 |
| Tue | Task 1.1 | Task 2.1 | Task 3.1 | Task 4.1 | Task 5.1 |
| Wed | Task 1.2 | Task 2.2 | Task 3.2 | Task 4.2 | Task 5.2 |
| Thu | Task 1.2 | Task 2.2 | Task 3.2 | Task 4.2 | Task 5.3 |
| Fri | Task 1.3 | Task 2.2 | Task 3.3 | Task 4.2 | Task 5.3 |
| Sat | Task 1.3 | Task 2.3 | Task 3.3 | Task 4.3 | Task 5.4 |
| Sun | Task 1.4 | Task 2.3 | Task 3.4 | Task 4.3 | Task 5.4 |

### Week 2 (Feb 10-16)

| Day | Agent 1 | Agent 2 | Agent 3 | Agent 4 | Agent 5 |
|-----|---------|---------|---------|---------|---------|
| Mon | Task 1.4 | Task 2.4 | Task 3.4 | Task 4.3 | Task 5.4 |
| Tue | Integration | Task 2.4 | Task 3.5 | Task 4.4 | Task 5.5 |
| Wed | Polish | Task 2.5 | Task 3.5 | Task 4.4 | Task 5.5 |
| Thu | Testing | Task 2.5 | Review | Review | Review |
| Fri | **DONE** | Integration | **DONE** | **DONE** | **DONE** |

### Coordination Points

**Daily Sync** (5 min):
- Agent 1 & 2 discuss waitlist/chat integration
- Agent 3 provides DB schema updates to Agents 1 & 2
- Agent 4 reports test failures

**Mid-Point Review** (End of Week 1):
- Demo progress to stakeholders
- Adjust priorities if needed
- Identify blockers

**Final Integration** (Feb 14-15):
- All agents integrate work
- Full E2E testing
- Build verification
- Deploy to staging

---

## 🚨 Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Agent falls behind | Daily 5-min sync to catch early |
| Integration conflicts | Each agent works on separate files mostly |
| DB schema changes | Agent 3 owns schema, notifies others |
| Build failures | CI runs on every PR, blocks merge |
| Scope creep | Strict task lists, changes require approval |

---

## ✅ Definition of Done

**Phase 3 Complete When:**
- [ ] Agent 1: Waitlist page live and converting
- [ ] Agent 2: Real AI chat working (can demo to investors)
- [ ] Agent 3: Backend production-ready
- [ ] Agent 4: Tests running in CI
- [ ] Agent 5: Technical debt cleared
- [ ] All builds passing
- [ ] Deployed to staging
- [ ] Crowdfunding video can be filmed with real UI

---

**Plan Created**: January 30, 2026  
**Next Review**: February 3, 2026 (Start of Sprint)
