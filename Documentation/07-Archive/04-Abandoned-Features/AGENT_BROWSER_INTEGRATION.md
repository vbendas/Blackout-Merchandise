# Agent-Browser Integration Plan

> **Document Version:** 1.0
> **Created:** January 21, 2026
> **Purpose:** Comprehensive plan for integrating agent-browser into MerchFrom platform
> **Owner:** Victor Bendas

---

## Executive Summary

agent-browser is a headless browser automation CLI for AI agents (Vercel Labs). It will be integrated into MerchFrom for **testing, quality assurance, and backend operations** with **zero impact** on production website performance.

**Key Principle:** agent-browser runs as **separate background services/workers**, not embedded in the production Next.js application.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│         MerchFrom Production Platform                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ Next.js     │  │ Neon DB     │  │ Clerk    │ │
│  │ (Vercel)    │  │ (Database)  │  │ (Auth)   │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
                    ↕ API/Webhooks (Async)
┌─────────────────────────────────────────────────────────────┐
│         Agent-Browser Worker Services                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ Testing     │  │ Automation  │  │ Monitoring│ │
│  │ Jobs        │  │ Workers     │  │ Services  │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Isolation Guarantees:**
- Separate CPU/memory pools
- Independent deployment cycles
- Zero shared request queues
- No impact on user-facing response times

---

## Use Cases (Excluded)

The following agent-browser use cases are **NOT part of MerchFrom** (per founder decision):

| Use Case | Reason |
|-----------|--------|
| **Competitor Price Monitoring** | Manual approach preferred; not business priority |
| **Social Media Sync Automation** | Manual management sufficient; not automated |
| **AI Agent-Enhanced Web Browsing** | Cat-Suite agents focus on internal platform, not external browsing |

---

## Approved Use Cases

### 1. Testing & Quality Assurance (Priority: HIGH)

#### 1.1 End-to-End User Journey Testing
**Goal:** Automate critical path testing before each deployment

**Workflows:**
- Sign up/Sign in flow (Clerk auth)
- Browse products → Add to cart
- Stripe checkout process
- Order confirmation page
- Artist dashboard access

**Implementation:**
```typescript
// tests/e2e/checkout-flow.ts
import { execSync } from 'child_process';

export async function testCheckoutFlow() {
  execSync('agent-browser open localhost:3000');
  execSync('agent-browser click "Get Started"');
  execSync('agent-browser fill @email "test@example.com"');
  execSync('agent-browser click "Sign Up"');
  // ... continue through full flow
}
```

**Trigger:** GitHub Actions CI/CD pipeline on every push/PR
**Environment:** GitHub Actions runners (free)
**Impact:** Zero - runs before production deployment

---

#### 1.2 Cross-Browser Compatibility Testing
**Goal:** Verify functionality across Chrome, Safari, Firefox

**Workflows:**
- Test core features on each browser
- Validate responsive layouts (mobile, tablet, desktop)
- Check CSS rendering consistency
- Test JavaScript functionality

**Implementation:**
```bash
# .github/workflows/cross-browser-test.yml
jobs:
  test-chrome:
    runs-on: ubuntu-latest
    steps:
      - run: |
        CHROMIUM_PATH=$(which chromium) \
        agent-browser --executable-path $CHROMIUM_PATH \
        open localhost:3000
  test-firefox:
    runs-on: ubuntu-latest
    # Firefox automation setup
```

**Trigger:** Weekly scheduled run + pre-release
**Environment:** GitHub Actions + BrowserStack (optional)
**Impact:** Zero - async scheduled job

---

#### 1.3 Automated Smoke Tests
**Goal:** Verify site is operational after deployments

**Workflows:**
- Homepage loads successfully
- Auth endpoints respond
- API routes return valid JSON
- Database connection works
- Stripe webhook endpoints accessible

**Implementation:**
```typescript
// scripts/smoke-test.sh
#!/bin/bash
agent-browser open https://merchfrom.com
agent-browser wait --load networkidle
agent-browser get title
agent-browser snapshot --json > /tmp/smoke-test.json
# Assert critical elements present
```

**Trigger:** Post-deploy webhook (Vercel)
**Environment:** Vercel Edge Function or external worker
**Impact:** Minimal - 2-3 second delay to notify team if site down

---

#### 1.4 Network Resilience Testing
**Goal:** Ensure graceful degradation under poor connections

**Workflows:**
- Simulate Slow 3G connection
- Test loading states and spinners
- Verify error handling
- Check offline mode (PWA)

**Implementation:**
```typescript
agent-browser open localhost:3000
agent-browser set network "Slow3G"
agent-browser navigate /shop/test-artist
agent-browser screenshot /tmp/slow3g.png
```

**Trigger:** Monthly performance audit
**Environment:** Local testing environment
**Impact:** Zero - offline testing

---

#### 1.5 Console Error Detection
**Goal:** Zero JavaScript errors in production

**Workflows:**
- Navigate all pages
- Collect console logs
- Flag `error` and `warning` messages
- Generate error reports

**Implementation:**
```typescript
const errors = await agent.browser.errors();
if (errors.length > 0) {
  throw new Error(`${errors.length} console errors detected`);
}
```

**Trigger:** Every E2E test run
**Environment:** CI/CD pipeline
**Impact:** Zero - prevents deployment with errors

---

#### 1.6 Accessibility Testing
**Goal:** Ensure WCAG 2.1 AA compliance

**Workflows:**
- Keyboard-only navigation
- Screen reader compatibility testing
- ARIA label validation
- Color contrast checking
- Focus trap testing

**Implementation:**
```typescript
agent-browser open localhost:3000
agent-browser navigate --tab 20  // Tab through entire page
agent-browser get attr --name "aria-label" @e1
agent-browser screenshot /tmp/a11y-test.png
```

**Trigger:** Weekly + pre-release
**Environment:** CI/CD pipeline
**Impact:** Zero - improves accessibility

---

### 2. Stripe Webhook Testing (Priority: HIGH)

#### 2.1 Checkout Flow Simulation
**Goal:** Verify payment processing works end-to-end

**Workflows:**
- Test mode checkout with card 4242 4242 4242 4242
- Verify Stripe Checkout Session creation
- Test payment intent completion
- Confirm webhook receives `checkout.session.completed`
- Validate database updates (order created, status set)

**Implementation:**
```typescript
// tests/stripe/checkout-flow.ts
export async function testStripeCheckout() {
  await agent.browser.open('http://localhost:3000/shop/test-artist/product-1');
  await agent.browser.click('[data-testid="add-to-cart"]');
  await agent.browser.click('[data-testid="checkout-button"]');
  await agent.browser.fill('[name="cardNumber"]', '4242424242424242');
  await agent.browser.fill('[name="expDate"]', '12/28');
  await agent.browser.fill('[name="cvc"]', '123');
  await agent.browser.click('[type="submit"]');
  await agent.browser.wait --url '*/confirmation';
}
```

**Trigger:** Pre-deploy + weekly regression
**Environment:** Local development + staging
**Impact:** Zero - prevents payment issues

---

#### 2.2 Payment Failure Scenarios
**Goal:** Test error handling for declined payments

**Workflows:**
- Insufficient funds card (4000 0025 0000 3155)
- Expired card (4000 0000 0000 0069)
- Incorrect CVC (4000 0000 0000 0127)
- Generic decline (4000 0000 0000 9995)

**Implementation:**
```typescript
const testCards = [
  { number: '4000002500003155', name: 'Insufficient Funds' },
  { number: '4000000000000069', name: 'Expired Card' },
  // ... more scenarios
];

for (const card of testCards) {
  await testPaymentDecline(card);
}
```

**Trigger:** Monthly regression testing
**Environment:** Staging environment
**Impact:** Zero - better error handling

---

#### 2.3 Webhook Idempotency Testing
**Goal:** Ensure duplicate webhooks don't create duplicate orders

**Workflows:**
- Send same webhook twice
- Verify only one order created
- Test retry scenarios
- Validate webhook signatures

**Implementation:**
```typescript
// Send identical webhook twice
await sendWebhook('checkout.session.completed', payload);
await sendWebhook('checkout.session.completed', payload);

// Verify single order
const orders = await db.select().from(orders);
assert(orders.length === 1);
```

**Trigger:** Pre-deploy
**Environment:** Staging
**Impact:** Zero - prevents duplicate orders

---

### 3. Backend Operations Automation (Priority: MEDIUM)

#### 3.1 Order Tracking Aggregation
**Goal:** Automatically fetch shipping updates from carriers

**Workflows:**
- Query database for pending orders
- For each order, fetch tracking info from UPS/DHL/FedEx
- Update database with latest status
- Send customer notifications (via Antonia)

**Implementation:**
```typescript
// workers/order-tracking.ts
import { BrowserManager } from 'agent-browser';

export async function updateOrderTracking() {
  const pendingOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.status, 'shipped'));

  for (const order of pendingOrders) {
    const browser = new BrowserManager();
    await browser.launch({ headless: true });

    await browser.navigate(`https://www.ups.com/track/${order.trackingNumber}`);
    const status = await browser.getText('[data-tracking-status]');

    await db.update(orders)
      .set({ trackingStatus: status })
      .where(eq(orders.id, order.id));

    await browser.close();
  }
}
```

**Trigger:** Every 2 hours via cron job
**Environment:** Separate worker service (VPS or Vercel Cron)
**Impact:** Zero - background job, async updates

---

#### 3.2 Bulk Order Workflow Automation
**Goal:** Streamline artist bulk merchandise orders

**Workflows:**
- Artist initiates bulk order via chat with Leopoldo
- Leopoldo generates order details (quantities, sizes, colors)
- Backend worker fetches supplier stock levels
- Calculates pricing and creates invoice
- Sends quote to artist for approval
- On approval, submits order to supplier

**Implementation:**
```typescript
// workers/bulk-order.ts
export async function processBulkOrder(orderId: string) {
  const order = await getBulkOrder(orderId);

  const browser = new BrowserManager();
  await browser.launch({ headless: true });

  // Navigate supplier portal
  await browser.navigate('https://supplier-portal.com/login');
  await browser.fill('[name="email"]', process.env.SUPPLIER_EMAIL);
  await browser.fill('[name="password"]', process.env.SUPPLIER_PASSWORD);
  await browser.click('[type="submit"]');

  // Create order
  await browser.navigate('/orders/new');
  for (const item of order.items) {
    await browser.fill('[name="sku"]', item.sku);
    await browser.fill('[name="quantity"]', item.quantity);
    await browser.click('[name="add-line-item"]');
  }
  await browser.click('[name="submit-order"]');

  // Capture order number
  const orderNumber = await browser.getText('[data-order-number]');

  await browser.close();
  return orderNumber;
}
```

**Trigger:** Artist approves bulk order quote
**Environment:** Worker service (separate VPS)
**Impact:** Zero - async processing, notification on completion

---

#### 3.3 Supplier Stock Monitoring
**Goal:** Keep product inventory current in dashboard

**Workflows:**
- Query database for all active products
- For each SKU, fetch current stock from supplier
- Update `inStock` field in database
- Alert if out-of-stock or low stock

**Implementation:**
```typescript
// workers/stock-monitor.ts
export async function monitorStockLevels() {
  const products = await db.select().from(products);

  for (const product of products) {
    const stock = await fetchSupplierStock(product.sku);
    await db.update(products)
      .set({ inStock: stock > 0, stockLevel: stock })
      .where(eq(products.id, product.id));
  }
}

async function fetchSupplierStock(sku: string): Promise<number> {
  const browser = new BrowserManager();
  await browser.launch({ headless: true });
  await browser.navigate(`https://supplier.com/products/${sku}`);
  const stockText = await browser.getText('[data-stock-level]');
  await browser.close();
  return parseInt(stockText);
}
```

**Trigger:** Every 4 hours via cron job
**Environment:** Worker service
**Impact:** Zero - background sync

---

#### 3.4 Print-on-Demand Quality Verification
**Goal:** Periodically verify POD provider specifications match requirements

**Workflows:**
- Browse POD provider documentation
- Verify print area dimensions
- Check fabric specifications (weight, material)
- Compare color accuracy specs
- Generate report if discrepancies found

**Implementation:**
```typescript
// workers/pod-verification.ts
export async function verifyPODSpecs() {
  const browser = new BrowserManager();
  await browser.launch({ headless: true });
  await browser.navigate('https://pod-provider.com/specs');

  const printArea = await browser.getText('[data-print-area]');
  const fabricWeight = await browser.getText('[data-fabric-weight]');
  const material = await browser.getText('[data-material]');

  const specs = { printArea, fabricWeight, material };
  const isCompliant = validateSpecs(specs);

  if (!isCompliant) {
    await alertTeam('POD specs changed, review required');
  }

  await browser.close();
}
```

**Trigger:** Monthly
**Environment:** Worker service
**Impact:** Zero - monitoring only

---

### 4. Infrastructure & DevOps (Priority: MEDIUM)

#### 4.1 Deployment Smoke Tests
**Goal:** Verify critical functionality after each Vercel deployment

**Workflows:**
- Homepage loads and renders correctly
- Authentication works (test sign-in)
- API routes respond
- Database connection successful
- Cloudinary images load
- Clerk auth widgets load

**Implementation:**
```typescript
// scripts/post-deploy-test.ts
export async function postDeploySmokeTest() {
  const baseUrl = process.env.VERCEL_URL;

  const browser = new BrowserManager();
  await browser.launch({ headless: true });

  // Test homepage
  await browser.navigate(baseUrl);
  const title = await browser.get title();
  assert(title === 'Merch From');

  // Test auth
  await browser.navigate(`${baseUrl}/sign-in`);
  await browser.snapshot();
  // Verify Clerk widgets loaded

  // Test API
  await browser.navigate(`${baseUrl}/api/health`);
  const response = await browser.get text('body');
  assert(response === '{"status":"ok"}');

  await browser.close();
}
```

**Trigger:** Vercel deployment webhook
**Environment:** Vercel Edge Function or GitHub Actions
**Impact:** Minimal - 5-10 seconds to verify deployment

---

#### 4.2 SEO Validation
**Goal:** Ensure SEO best practices across all pages

**Workflows:**
- Verify meta titles and descriptions
- Check Open Graph tags
- Validate structured data (JSON-LD)
- Test sitemap.xml accessibility
- Check robots.txt

**Implementation:**
```typescript
// scripts/seo-audit.ts
export async function seoAudit() {
  const pages = ['/shop/test-artist', '/about', '/waitlist'];
  const browser = new BrowserManager();
  await browser.launch({ headless: true });

  for (const page of pages) {
    await browser.navigate(`https://merchfrom.com${page}`);
    const metaDescription = await browser.get attr('meta[name="description"]', 'content');
    const ogTitle = await browser.get attr('meta[property="og:title"]', 'content');

    if (!metaDescription) {
      console.log(`Missing meta description on ${page}`);
    }
    // ... more checks
  }

  await browser.close();
}
```

**Trigger:** Weekly
**Environment:** CI/CD pipeline or local
**Impact:** Zero - improves SEO

---

#### 4.3 Security Scanning
**Goal:** Automated security vulnerability checks

**Workflows:**
- Scan for exposed API keys in source
- Test authentication boundaries
- Verify CORS policies
- Check for XSS vulnerabilities
- Validate CSRF protection

**Implementation:**
```typescript
// scripts/security-scan.ts
export async function securityScan() {
  const browser = new BrowserManager();
  await browser.launch({ headless: true });

  // Test auth boundary
  await browser.navigate('http://localhost:3000/dashboard');
  const currentUrl = await browser.get url();
  assert(currentUrl.includes('/sign-in'), 'Unauth user accessed protected route');

  // Test XSS
  await browser.navigate('http://localhost:3000/search?q=<script>alert(1)</script>');
  const alerts = await browser.jsEval('window.alerts');
  assert(alerts.length === 0, 'XSS vulnerability detected');

  await browser.close();
}
```

**Trigger:** Pre-release + monthly
**Environment:** CI/CD pipeline
**Impact:** Zero - improves security

---

#### 4.4 Performance Monitoring
**Goal:** Track performance metrics over time

**Workflows:**
- Measure page load times
- Track Time to Interactive (TTI)
- Monitor Core Web Vitals (LCP, FID, CLS)
- Screenshot slow pages for review

**Implementation:**
```typescript
// scripts/performance-monitor.ts
export async function monitorPerformance() {
  const pages = ['/', '/shop/test-artist', '/dashboard'];
  const results = [];

  for (const page of pages) {
    const browser = new BrowserManager();
    await browser.launch({ headless: true });

    const start = Date.now();
    await browser.navigate(`https://merchfrom.com${page}`);
    await browser.wait --load networkidle;
    const loadTime = Date.now() - start;

    results.push({ page, loadTime });

    if (loadTime > 3000) {
      await browser.screenshot(`/tmp/slow-${page.replace(/\//g, '-')}.png`);
    }

    await browser.close();
  }

  await writePerformanceReport(results);
}
```

**Trigger:** Daily
**Environment:** Worker service or GitHub Actions
**Impact:** Zero - monitoring only

---

### 5. Customer Support Automation (Priority: LOW)

#### 5.1 Bug Reproduction Automation
**Goal:** Automatically reproduce user-reported bugs

**Workflows:**
- Parse support ticket for reproduction steps
- Execute steps via agent-browser
- Capture screenshots/logs
- Generate bug report with context

**Implementation:**
```typescript
// workers/bug-reproduction.ts
export async function reproduceBug(ticketId: string) {
  const ticket = await getSupportTicket(ticketId);
  const steps = parseReproductionSteps(ticket.description);

  const browser = new BrowserManager();
  await browser.launch({ headless: false }); // For debugging

  for (const step of steps) {
    if (step.type === 'navigate') {
      await browser.navigate(step.url);
    } else if (step.type === 'click') {
      await browser.click(step.selector);
    } else if (step.type === 'fill') {
      await browser.fill(step.selector, step.value);
    }
  }

  const screenshot = await browser.screenshot();
  const logs = await browser.errors();

  await attachBugReport(ticketId, { screenshot, logs });

  await browser.close();
}
```

**Trigger:** Support ticket creation (manual trigger by Antonia)
**Environment:** Worker service (manual invocation)
**Impact:** Zero - async bug investigation

---

#### 5.2 Order Status Lookup (Support Tool)
**Goal:** Quick order status retrieval for support agents

**Workflows:**
- Support agent (Antonia) receives order inquiry
- Backend worker fetches order from database
- Navigates carrier website with tracking number
- Returns latest status to chat

**Implementation:**
```typescript
// workers/order-lookup.ts
export async function getOrderStatus(orderId: string) {
  const order = await getOrder(orderId);

  if (order.status !== 'shipped') {
    return order.status;
  }

  const browser = new BrowserManager();
  await browser.launch({ headless: true });
  await browser.navigate(`https://www.ups.com/track/${order.trackingNumber}`);
  const status = await browser.getText('[data-tracking-status]');
  await browser.close();

  return status;
}
```

**Trigger:** Customer asks Antonia for order status
**Environment:** Async API call from Cat-Suite
**Impact:** Minimal - adds 2-3 seconds to chat response

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Set up agent-browser infrastructure

| Task | Owner | Time | Dependencies |
|------|--------|------|--------------|
| Install agent-browser locally | Victor | 1 hour | None |
| Test basic commands (open, snapshot, click) | Victor | 2 hours | Installation |
| Create test environment (localhost) | Victor | 1 hour | Basic commands |
| Document test scripts structure | Victor | 2 hours | Test environment |

**Deliverables:**
- agent-browser installed locally
- Basic test script working
- Documentation of approach

---

### Phase 2: CI/CD Integration (Week 2-3)
**Goal:** Automated testing in GitHub Actions

| Task | Owner | Time | Dependencies |
|------|--------|------|--------------|
| Create GitHub Actions workflow for E2E tests | Victor | 3 hours | Phase 1 |
| Write checkout flow test script | Victor | 4 hours | Phase 1 |
| Write smoke test script | Victor | 2 hours | Phase 1 |
| Add console error detection | Victor | 2 hours | Phase 1 |
| Run first automated test suite | Victor | 1 hour | All above |

**Deliverables:**
- `.github/workflows/test.yml` file
- E2E test scripts in `/tests/e2e/`
- Successful GitHub Actions run

---

### Phase 3: Stripe Testing (Week 4)
**Goal:** Comprehensive payment flow testing

| Task | Owner | Time | Dependencies |
|------|--------|------|--------------|
| Write checkout simulation test | Victor | 4 hours | Phase 2 |
| Write payment failure scenarios | Victor | 3 hours | Phase 2 |
| Write webhook idempotency test | Victor | 2 hours | Phase 2 |
| Integrate with staging environment | Victor | 2 hours | Phase 2 |

**Deliverables:**
- `/tests/stripe/` test suite
- Stripe test automation working
- Payment flows validated

---

### Phase 4: Backend Workers (Week 5-6)
**Goal:** Background automation services

| Task | Owner | Time | Dependencies |
|------|--------|------|--------------|
| Set up worker service infrastructure | Victor | 4 hours | None |
| Implement order tracking worker | Victor | 6 hours | Worker infra |
| Implement stock monitoring worker | Victor | 4 hours | Worker infra |
| Set up cron job scheduling | Victor | 2 hours | Workers implemented |
| Deploy to separate VPS | Victor | 3 hours | All workers |

**Deliverables:**
- Worker service deployed
- Order tracking automation live
- Stock monitoring automation live

---

### Phase 5: Advanced Testing (Week 7-8)
**Goal:** Cross-browser, accessibility, security

| Task | Owner | Time | Dependencies |
|------|--------|------|--------------|
| Implement cross-browser tests | Victor | 4 hours | Phase 2 |
| Add accessibility testing | Victor | 4 hours | Phase 2 |
| Implement security scanning | Victor | 3 hours | Phase 2 |
| Add performance monitoring | Victor | 3 hours | Phase 2 |

**Deliverables:**
- Comprehensive test suite
- Accessibility reports
- Security scans automated

---

### Phase 6: Support Automation (Week 9-10)
**Goal:** Customer support tooling

| Task | Owner | Time | Dependencies |
|------|--------|------|--------------|
| Implement bug reproduction script | Victor | 4 hours | Phase 1 |
| Add order status lookup tool | Victor | 3 hours | Phase 4 |
| Integrate with Cat-Suite (Antonia) | Victor | 5 hours | Phase 4 |
| Test support workflows | Victor | 2 hours | All above |

**Deliverables:**
- Support automation tools
- Cat-Suite integration
- Documentation for support team

---

## Infrastructure Requirements

### Local Development
- **Node.js 20+**
- **agent-browser** CLI installed globally
- **Local test environment** (Next.js dev server)

### CI/CD (GitHub Actions)
- **GitHub Actions runner** (free tier)
- **agent-browser** installed in workflow
- **Test environment** (staging URL)

### Worker Service
- **VPS** (DigitalOcean $5/mo or equivalent)
- **Node.js runtime**
- **Database access** (Neon connection string)
- **Environment variables** securely configured

### Optional: BrowserStack
- For cross-browser testing (Safari, IE, mobile)
- ~$39/mo for basic plan
- Can be skipped initially

---

## Cost Estimate

### Development Time
| Phase | Hours | Estimated Cost (at €50/hr) |
|--------|--------|---------------------------|
| Phase 1 | 6 hours | €300 |
| Phase 2 | 12 hours | €600 |
| Phase 3 | 11 hours | €550 |
| Phase 4 | 19 hours | €950 |
| Phase 5 | 14 hours | €700 |
| Phase 6 | 14 hours | €700 |
| **Total** | **76 hours** | **€3,800** |

### Infrastructure Costs
| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| GitHub Actions (CI/CD) | $0 | Free tier sufficient |
| Worker VPS | $5-10/mo | DigitalOcean/Railway |
| BrowserStack (optional) | $39/mo | Cross-browser testing |
| **Total** | **$5-49/mo** | **~€5-45/mo** |

---

## Risk Mitigation

### Performance Impact
**Risk:** Browser automation slows down production site
**Mitigation:**
- Run all automation in separate worker services
- Use async processing and job queues
- Rate limit requests
- Monitor CPU/memory usage

### Reliability
**Risk:** Browser crashes or hangs
**Mitigation:**
- Implement timeout limits (30s per action)
- Automatic restart on failure
- Fallback to API when available
- Monitoring and alerting

### Maintenance
**Risk:** Scripts break when websites change
**Mitigation:**
- Use semantic locators (ARIA roles, test IDs)
- Version control for automation scripts
- Regular testing and updates
- Monitoring for failures

### Security
**Risk:** Exposing credentials in automation scripts
**Mitigation:**
- Use environment variables (never commit secrets)
- Rotate credentials regularly
- Encrypt sensitive data at rest
- Use separate service accounts for automation

---

## Success Metrics

### Testing Coverage
- [ ] 100% of critical user paths automated
- [ ] 90%+ test pass rate in CI/CD
- [ ] Zero JavaScript errors in production
- [ ] < 3s average page load time

### Automation Efficiency
- [ ] 80%+ reduction in manual testing time
- [ ] 50%+ reduction in support investigation time
- [ ] Real-time inventory accuracy > 95%

### Platform Stability
- [ ] 99.9%+ uptime
- [ ] Zero payment processing failures due to bugs
- [ ] Automated deployment verification < 30s

---

## Immediate Actions (This Week)

### Day 1-2: Setup & Experimentation
- [ ] Install agent-browser locally: `npm install -g agent-browser`
- [ ] Run `agent-browser install` to download Chromium
- [ ] Test basic commands: `agent-browser open localhost:3000`
- [ ] Experiment with `snapshot`, `click`, `fill` commands
- [ ] Document first test script

### Day 3-4: First E2E Test
- [ ] Create `/tests/e2e/` directory structure
- [ ] Write simple test: Homepage loads, title correct
- [ ] Run test manually and verify success
- [ ] Add console error detection to test

### Day 5: CI/CD Integration
- [ ] Create `.github/workflows/test.yml` file
- [ ] Configure workflow to run on push/PR
- [ ] Push changes and verify GitHub Actions runs successfully
- [ ] Review results and fix any issues

### Week 2-3: Expand Test Suite
- [ ] Write checkout flow test script
- [ ] Write smoke test script
- [ ] Add Stripe test scenarios
- [ ] Document test approach in CLAUDE.md

---

## Questions for Founder

1. **Timeline Priority:** Which phases should be accelerated? Which can be deferred?

2. **Budget Approval:** Does €3,800 development cost + €5-45/mo infrastructure align with expectations?

3. **Team Allocation:** Will Victor implement all phases, or delegate to contractors?

4. **Tooling Decision:** Should we invest in BrowserStack ($39/mo) for cross-browser testing, or use free alternatives?

5. **Automation Threshold:** How many automation tasks before investing in dedicated worker VPS vs. ad-hoc scripts?

---

## Next Steps

1. **Review this document** with founder and approve roadmap
2. **Allocate time** in schedule for implementation (suggest 2-3 hours/day)
3. **Begin Phase 1** immediately (setup and experimentation)
4. **Update PRD and Roadmap** to reference this document
5. **Track progress** using this document's checklist system

---

**End of Document**
