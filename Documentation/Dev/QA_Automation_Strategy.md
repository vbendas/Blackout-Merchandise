# QA & Automation Strategy

> **Goal:** Ensure "Merch From" delivers a premium, robust experience through automated validation of performance, accessibility, and resilience.

---

## 1. Automated Smoke Tests (Critical Path)

**Tool:** `mcp-chrome-devtools`
**Frequency:** On every PR merge to `main`.

### Script 1: The "Happy Path" Checkout
1.  **Home:** Navigate to `/`. Assert Hero text contains "Merch From".
2.  **Interaction:** Click `#chat-input`. Type "I want to start a store".
3.  **AI Response:** Wait for `#ai-response` bubble to appear (timeout: 5s).
4.  **Navigation:** Click "Showroom" link. Assert URL is `/app/showroom`.
5.  **Cart:** Click "Add to Cart" on first product. Assert Cart Badge = 1.
6.  **Checkout:** Click "Checkout". Assert Stripe/checkout overlay appears.
7.  **Console Check:** `list_console_messages` -> Assert **ZERO** errors.

---

## 2. Performance Budget

**Tool:** `performance_start_trace` / `get_network_request`

| Metric | Target | Tooling Check |
| :--- | :--- | :--- |
| **Animation FPS** | **60fps** | Trace analysis during "Hero-to-Copilot" transition. |
| **LCP (Largest Contentful Paint)** | **< 1.2s** | Landing page load trace. |
| **AI Stream Start (TTFT)** | **< 500ms** | `get_network_request` on `/api/chat` calls. |
| **Main Thread Blocking** | **< 50ms** | No long tasks during scrolling/hovering. |

---

## 3. Accessibility (A11y) Standards

**Tool:** `take_snapshot` (Accessibility Tree)
**Requirement:** All interactive elements must have a valid accessible name.

**Checklist:**
- [ ] `button` elements have text content or `aria-label`.
- [ ] `input` elements have associated `label` or `aria-label`.
- [ ] `img` elements (mockups) have descriptive `alt` text (e.g., "Black t-shirt with Skull design").
- [ ] headings (`h1`-`h6`) follow a logical hierarchy.

---

## 4. Network Resilience

**Tool:** `emulate`
**Profiles:**

| Profile | Specs | Success Criteria |
| :--- | :--- | :--- |
| **Fast 4G** | 9MB/s down, 50ms lat | Standard baseline. Everything instant. |
| **Slow 3G** | 400kb/s down, 400ms lat | Skeletons show immediately. No layout shifts. "Thinking" UI persists. |
| **Offline** | 0kb/s | App shows "You are offline" toast/state. |

---

## 5. Interaction Polish

**Tool:** `hover` / `take_screenshot`

1.  **Hover States:** Identify all `.product-card`. `hover` each one. Take screenshot.
    *   *Verify:* Scale effect, shadow deepening, "Quick Add" button reveal.
2.  **Focus States:** Tab through navigation. Take screenshot.
    *   *Verify:* Visible focus ring (keyboard navigability).
