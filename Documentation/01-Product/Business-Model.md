# Business Model



  ### 2.8 Merch Coins System

  > **MerchCoins ≠ MRCH Tokens.** These are two completely separate systems with no connection. MerchCoins (this section) are an off-chain loyalty discount currency stored in PostgreSQL. MRCH tokens (Section 20) are on-chain equity issued on the Stellar blockchain. Never conflate them in code, marketing, or communications. Full comparison: `Documentation/05-Community-Ownership/MERCHANTCOINS_VS_MRCH.md`

  **Simplified Model (v3.1):**

  #### **Platform Merch Coins (Only Type)**
  - **Issued by:** Blackout Merchandise platform
  - **Label:** Simply "**Merch Coin**" (simple, no artist prefix)
  - **Sources:**
    - Crowdfunding backer rewards
    - Platform promotions
    - Seasonal campaigns
  - **Usable for:**
    - Purchase from **any artist's store**
    - Bulk screen printing orders
  - **Deducted from:** Platform's base margin
  - **Never expire** — lifetime value
  - **1 Coin = €1 Value**

  **Key Changes (v3.1):**
  - ✅ **No artist-branded coins** (removed for simplicity)
  - ✅ **No trading/marketplace** (avoid legal complications)
  - ✅ **No KYC required** (simple redemption only)
  - ✅ **No lawyer review needed** (promotional discounts, not securities)

  **Why Simpler:**
  - **Regulatory Safety:** Not a security, just a discount
  - **Development Speed:** 80% less code to write
  - **User Experience:** Easy to understand and use
  - **Platform Control:** Full control over coin supply

  ---

  #### **Crowdfunding Tiers**

  | Tier | Price | Merch Coins | Founding MRCH | Equity at €10M | Notes |
  |------|-------|-------------|---------------|----------------|-------|
  | **Supporter** | €25 | 30 | — | — | No KYC, no blockchain |
  | **Founding Creator** | €99 | 100 | **1,000 MRCH** | €333 | First tier with real equity |
  | **Founding Artist** | €249 | 250 | **3,000 MRCH** | €1,000 | |
  | **Founding Partner** | €999 | 1,000 | **12,500 MRCH** | €4,167 | |
  | **Founding Sponsor** | €2,500 | 3,000 | **35,000 MRCH** | €11,667 | |

  **About Founding MRCH Tokens:**
  - Real tokens on Stellar blockchain — visible on stellarexpert.io immediately
  - This founding cohort is permanent: allocation closes when campaign ends, never reopens at this price
  - Tokens carry **active governance rights from day one** — off-chain Year 1 (Discord DAO polls weighted by MRCH holdings), on-chain Year 2 (Soroban contract)
  - Tokens carry a **documented profit-sharing promise** — 30% of net profits to MRCH holders, activates Year 2 when Soroban deploys; backers are told this is the main ownership hook from day one
  - Only Stellar DEX trading is locked until Year 2 legal framework is established
  - MiCA legal framework established Year 1 Q3-Q4 before first distribution — no legal cost at crowdfunding launch
  - Requires Stellar wallet (LOBSTR, free) — Leopoldo guides backers through setup at token distribution time

  **Revised crowdfunding target: €80-120K** (up from €46K — MRCH tiers attract crypto-native backers who understand equity value)

  **MRCH total allocated across all tiers:** ~500K-1.5M tokens (within the 5M Seed/Early Backer pool, leaving remainder for angel investors)

  ---

  #### **Customer Experience:**

  **Wallet Display:**
  ```
  Your Merch Coins:
  └─ 30 Merch Coins (use anywhere on the platform)
  ```

  **Checkout Example (on Sailor Jerry's store):**
  ```
  Order Total: €30
  Available Discounts:
    ✅ 30 Merch Coins (€30 off)
    
  You save €30 total.
  ```

  **Checkout Example (on another artist's store):**
  ```
  Order Total: €25
  Available Discounts:
    ✅ 25 Merch Coins (€25 off)
    
  You save €25 total.
  ```

  **Bulk Order:**
  ```
  Bulk Order: 50 custom tees (€750)
  Available Discounts:
    ✅ 30 Merch Coins (€30 off)
    
  Merch Coins apply to bulk orders too.
  ```

  ---

  #### **Economic Integrity:**
  - **Platform Coins** = Platform absorbs cost (from base margin)
  - **Artist Coins** = Artist absorbs cost (from profit margin)
  - **Clean separation** = No cross-contamination, clear accounting
  - **Both never expire** = Trust signal, long-term engagement

  ---

  #### **Launch Strategy: Non-Tradable with Future Upgrade Path**

  **Phase 1: Launch (Non-Tradable) - Months 1-12**
  - Coins are **non-tradable** between users
  - Only platform and artists can issue/transfer coins
  - Coins redeemable only for direct purchases (no secondary market)
  - Simple, regulatory-compliant, minimal complexity
  - Focus: Prove core business model and user engagement

  **Phase 2: Internal Trading (Future Consideration) - Year 2+**

  **Important:** This is a potential future enhancement, NOT part of MVP or initial launch. Only implement if:
  1. Core business is profitable and stable
  2. User demand for trading is validated
  3. Legal/regulatory review completed
  4. Engineering resources available

  **Design Principles (If Implemented):**
  - **Internal marketplace only** - No external crypto exchanges
  - **Platform-controlled** - All trades monitored and managed by us
  - **Fixed €1 value** - Coins always trade at €1 (no speculation/volatility)
  - **Artist-only issuers** - Only artists and platform can create coins
  - **10% platform fee** - On every secondary trade
  - **Abuse prevention** - Rate limits, fraud detection, account verification

  **Conceptual User Flow (Future):**
  ```
  User A has 50 Sailor Jerry Merch Coins but prefers The Echoes
  → Lists 50 coins on internal marketplace at €1 each = €50
  → User B buys them for €50 (pay via NexaPay)
  → Platform takes 10% fee (€5)
  → User A receives €45 payout
  → User B receives 50 Sailor Jerry coins
  → Both users KYC-verified, trade logged
  ```

  **Technical Architecture Notes (For Future Implementation):**

  **Database Schema Extensions:**
  ```sql
  -- Add trading status field to coins
  ALTER TABLE merch_coin_balances ADD COLUMN tradable BOOLEAN DEFAULT false;

  -- New tables for marketplace (FUTURE - DO NOT BUILD YET)
  CREATE TABLE coin_listings (
    id UUID PRIMARY KEY,
    seller_id UUID REFERENCES users(id),
    coin_type TEXT,  -- 'platform' or 'artist_[artistId]'
    quantity INTEGER,
    price_per_coin DECIMAL(10,2) DEFAULT 1.00,  -- Always €1
    status TEXT CHECK (status IN ('active', 'sold', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE coin_trades (
    id UUID PRIMARY KEY,
    listing_id UUID REFERENCES coin_listings(id),
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    coin_type TEXT,
    quantity INTEGER,
    total_price DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    seller_payout DECIMAL(10,2),
    nexapay_transaction_id TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

  **Business Logic (Future):**
  - Coins issued with `tradable = false` by default
  - Platform can enable trading via admin dashboard (global flag)
  - Artists can opt-in/opt-out of allowing their coins to be traded
  - All trades at fixed €1 per coin (no price discovery/speculation)
  - NexaPay instant USDC settlement for seller payouts (minus 10% platform fee)
  - KYC required for both buyers and sellers (prevent fraud)
  - Transaction limits: Max 1,000 coins per trade, max 5 trades/day per user

  **Why NOT Build This Now:**
  1. **Complexity** - Adds payment flows, KYC, fraud detection, dispute resolution
  2. **Regulatory risk** - May trigger securities laws depending on jurisdiction
  3. **Focus dilution** - Core business is merch sales, not marketplace
  4. **Premature optimization** - No user demand validated yet
  5. **Support burden** - Customer service for trade disputes, failed payments, etc.

  **When to Consider Building:**
  1. Users actively requesting coin transfers in support tickets (>100 requests/month)
  2. Evidence of informal trades happening outside platform (e.g. social media)
  3. Profitable operations with engineering resources to spare
  4. Legal counsel confirms regulatory compliance path
  5. Customer support team scaled to handle marketplace issues

  **Developer Action Items (Now):**
  - ✅ Build coin system as **non-tradable**
  - ✅ Use clean data model that could support trading later (coin_type, issuer fields)
  - ✅ Document this future vision in codebase (link to this section)
  - ❌ Do NOT build marketplace, listing, or trading features
  - ❌ Do NOT expose any trading UI or mention trading in marketing
  - ❌ Do NOT architect for blockchain/external trading

  **Future Migration Path (If Decided to Implement):**
  1. Add `tradable` boolean field to `merch_coin_transactions` table
  2. Create `coin_listings` and `coin_trades` tables
  3. Build internal marketplace UI (seller lists, buyer browses)
  4. Integrate NexaPay instant USDC settlement for seller payouts
  5. Implement KYC verification flow (NexaPay KYC (merchant-level, >$700 threshold) or similar)
  6. Add fraud detection and rate limiting
  7. Legal review and terms update
  8. Soft launch with waitlist (test with power users)
  9. Monitor for abuse and iterate
  10. Full rollout after 3-6 months of stable operation

  ---

  #### **Platform Promotions (Separate System):**
  - Buy 3 Pay 2, seasonal sales, etc. where platform absorbs costs
  - Distinct from Merch Coins (no stacking with coins)
  - Traditional discount codes and promotional campaigns

  ---

  ### Market Context & Economics

  > **Data Sources**: [Market Analysis Report](../09-Reseach/merchandise-market-research.md) | [POD Competition Report](../09-Reseach/pod_competition_report.md)

  #### TAM/SAM/SOM

  | Level | Definition | Size (2025) | Source |
  |-------|------------|-------------|--------|
  | **TAM** | Licensed merchandise globally (sports, fashion, corporate, entertainment) | $351.2 billion | Industry consensus |
  | **SAM** | Entertainment + artist merch including physical music | $13.4 billion | MIDiA Research, Dataintelo |
  | **SOM** | Captureable by major merch operators and platforms | $2-3 billion | Analyst estimates |

  **POD Market Specifics:**
  - Global POD market: **$10.78 billion (2025)** → projected **$57.49 billion by 2033** at **23.6% CAGR** (Grand View Research)
  - EU POD market: **$1.97 billion (2024)** → **$13.69 billion by 2033** at **24.06% CAGR** (Ecomm.Design)
  - Software platforms command **69.6%** of total POD revenue (Mordor Intelligence)

  #### Revenue Model Comparison (Market Data)

  | Model | Artist Retention | Gross Margin | $35 T-Shirt Net | Best For |
  |-------|-----------------|--------------|-----------------|----------|
  | **D2C Webstore** | 60-75% | 60-75% | $24-28.50 | Established artists with audience |
  | **POD (Standard)** | 44-61% | Varies | $17.50 | Entry-level, zero upfront cost |
  | **POD (Bulk 50+)** | 44-61% | Varies | $24.85 | Touring artists, volume orders |
  | **Traditional Retail** | 15-30% | Volume-driven | $10.50 | Mass market, established brands |
  | **Label 360 Deal** | 18-25% | After deductions | $8.75-14.00 | Signed artists (limited control) |

  **Key Insight**: D2C yields a **60-70% income advantage** over signed artists trapped in 360 deals. One t-shirt sale ($35) generates the equivalent revenue of **8,750 Spotify streams**.

  #### Creator Economics Justification for Zero Upfront Cost

  **The Problem (Data-Backed):**
  - **65% of creators earn less than $100/year** from merchandise (Precedence Research)
  - **Only 5% operate full-time** — the barrier is not design difficulty but customer acquisition
  - Fulfillment platforms yield 40-60% margins but require **$300-1,000/month** in advertising
  - Marketplace platforms provide traffic but extract **50-95% of revenue**

  **The Solution:**
  Blackout Merchandise's zero-upfront-cost model eliminates the capital barrier that prevents 95% of creators from monetizing their audience. By combining:
  - **AI-driven design** (reduces design costs by 70%)
  - **In-house production** (captures 40-60% margins vs outsourcing)
  - **D2C infrastructure** (artists retain 60-75% vs 15-30% retail)
  - **Zero inventory risk** (POD for entry, bulk for scale)

  #### Market Timing: Why Now?

  **1. Fyul Merger Window (18-24 months)**
  - Printful + Printify merged November 2024 into Fyul ($1.3-1.5B valuation)
  - Historical precedent: post-merger innovation velocity declines **30-50%** for 12-24 months
  - Printify's 34% Premium price increase (Feb 2026) signals margin pressure and user vulnerability

  **2. Marketplace Collapse (Largest Artist Migration in History)**
  - Redbubble: 50% platform fee + excess markup → creator net earnings compressed to **5-10%**
  - Society6: Fixed royalties at **5-10%** after mass artist purges
  - Zazzle: 35-50% Marketing Royalty Fee → **29% decline** in average royalty per sale
  - These changes are **structural, not cyclical** — the traffic-for-margin model is failing

  **3. AI Differentiation Window (12 months)**
  - Blackout Merchandise's multi-modal AI stack (text + image + voice) is **category-exclusive today**
  - Printify offers 15 free OpenAI generations daily; Gelato has AI mockups; Canva entering POD
  - **Sustainable moat**: workflow integration (print-ready output, color separation, in-house production) + network effects

  **4. EU Regulatory Tailwind**
  - EPR regulations for textiles effective October 2025, full compliance by 2028
  - POD's zero-inventory model reduces manufacturing waste by **30-50%**
  - **80% of European consumers** will pay a **9.7% premium** for sustainable goods
  - Most US-centric platforms are unprepared — creating a compliance moat

  #### EU Beachhead Rationale

  **Why Europe First:**
  1. **Market Size**: $1.97B EU POD market growing at **24.06% CAGR** — faster than North America
  2. **Weaker Incumbent Dominance**: Fyul has less infrastructure penetration in EU vs US
  3. **Sustainability Premium**: European consumers demonstrate highest willingness-to-pay for ethical products
  4. **Regulatory Advantage**: EPR compliance is mandatory — platforms built with sustainability from day one win
  5. **Grant Accessibility**: Portugal 2030 interior incentives recover **50% of equipment costs** (~€56.5K)

  **Growth Trajectory:**
  - Germany: **26.8% CAGR** (fastest in EU)
  - UK: **22.1% CAGR**
  - Portugal: Strategic hub for EU distribution with Castelo Branco facility

  ---

  ### 2.7 AI Store Designer (v0 API Integration)
  - **Conversational Store Customization:** Artists describe their desired aesthetic via voice or text prompts
  - **v0 API Code Generation:** Generate production-ready Next.js components for custom store layouts
  - **Visual Customization:** Colors, typography, layouts, hero sections, about pages, footers
  - **Content Personalization:** Artist-provided text, images, social links, bios
  - **Real-Time Preview:** Instant visual feedback of changes via iframe preview
  - **Iterative Refinement:** "Make it darker", "More punk rock aesthetic", "Like Bandcamp but bolder"
  - **Template System:** Start with preset themes, then customize via AI
  - **Core Functionality Protection:** Product grid, cart, checkout, navigation remain standardized
  - **Theme Versioning:** Save and switch between multiple theme variants
  - **Monetization Ready:** Free tier (3 presets), Pro tier ($20/month for unlimited AI customization)

  ### 2.6 Missing MVP Features (Added to Phase 4-6)

  **Critical features that were missing from the original PRD:**

  #### **A. Admin Dashboard (Phase 4)**
  **Purpose:** Platform management and oversight.

  **Features:**
  1. **Artist Management:**
     - View all artists (approved, pending, suspended)
     - Approve/reject applications
     - View artist analytics (sales, products, revenue)
     - Suspend accounts (with reason)

  2. **Order Management:**
     - View all orders (with filters)
     - Update order status (pending → printing → shipped → delivered)
     - View order details (customer, products, tracking)
     - Handle refunds/returns

  3. **Financial Reporting:**
     - Revenue dashboard (daily, weekly, monthly)
     - Cost breakdown (AI, infrastructure, transaction fees)
     - Profit margins per product/artist
     - Payout tracking (artist payments)

  4. **Inventory Tracking:**
     - Stock levels (blanks, inks, supplies)
     - Reorder alerts (low stock warnings)
     - Supplier management (WATC-Studio, Magna)
     - Usage analytics (consumption rates)

  5. **System Monitoring:**
     - AI cost tracking (per user, per session)
     - API uptime monitoring
     - Error logging and alerting
     - Performance metrics (response times)

  **Tech:** Next.js admin panel, protected routes, role-based access.

  ---

  #### **B. Customer Support System (Phase 4)**
  **Purpose:** Handle customer inquiries and issues.

  **Features:**
  1. **Ticket Management:**
     - Create tickets (email, chat, form)
     - Assign to agents (Cat-Suite or human)
     - Status tracking (open, in-progress, resolved)
     - Priority levels (urgent, normal, low)

  2. **FAQ/Knowledge Base:**
     - Searchable articles
     - Categorized by topic (orders, shipping, returns, design)
     - Video tutorials (embedded)
     - Regular updates based on common issues

  3. **Live Chat (Optional):**
     - Cat-Suite agents handle first tier
     - Escalate to human if needed
     - Chat history and transcripts

  4. **Email Integration:**
     - support@blackoutmerch.example
     - Auto-responses for common queries
     - Ticket creation from email

  **Tech:** Custom ticket system or integrate with existing (e.g., Zendesk, Intercom).

  ---

  #### **C. Analytics & Reporting (Phase 4-5)**
  **Purpose:** Track performance and make data-driven decisions.

  **Artist Dashboard:**
  1. **Sales Overview:**
     - Total orders, revenue, profit
     - Daily/weekly/monthly trends
     - Best-selling products
     - Conversion rates (views → purchases)

  2. **Product Performance:**
     - Views per product
     - Add-to-cart rate
     - Purchase rate
     - Revenue per product

  3. **Customer Insights:**
     - Demographics (age, location)
     - Repeat purchase rate
     - Average order value
     - Customer lifetime value

  4. **AI Usage:**
     - Designs generated
     - AI costs incurred
     - Model usage breakdown
     - Cost per design

  **Platform Analytics:**
  1. **Growth Metrics:**
     - New artists (daily, weekly, monthly)
     - Active artists (DAU, WAU, MAU)
     - Artist retention rate
     - Churn rate

  2. **Financial Metrics:**
     - Gross Merchandise Volume (GMV)
     - Platform revenue
     - Net profit
     - Margin per product category

  3. **Engagement Metrics:**
     - Session duration
     - Designs generated per user
     - Storefront visits
     - Conversion rates

  4. **AI Metrics:**
     - Total AI costs
     - Cost per user
     - Model usage distribution
     - Cost efficiency trends

  **Tech:** Custom analytics dashboard, data visualization (Recharts, Chart.js), scheduled reports.

  ---

  #### **D. Email System (Phase 4)**
  **Purpose:** Automated communication with artists and customers.

  **Transactional Emails:**
  1. **Order Flow:**
     - Order confirmation (immediate)
     - Payment received (if delayed)
     - Production started (24h)
     - Shipped with tracking (when shipped)
     - Delivered confirmation (when delivered)
     - Refund processed (if applicable)

  2. **Account Flow:**
     - Welcome email (signup)
     - Email verification
     - Password reset
     - Account updates

  **Marketing Emails:**
  1. **Onboarding Series:**
     - Day 1: Welcome + getting started guide
     - Day 3: Design tips and best practices
     - Day 7: Success stories from other artists
     - Day 14: Feature spotlight

  2. **Engagement:**
     - Product tips (weekly)
     - Platform updates (monthly)
     - Seasonal campaigns (quarterly)
     - Re-engagement (inactive artists)

**Tech:** Resend or SendGrid integration, email templates, unsubscribe management.

---

#### **E. Campaign Management System (Phase 4b)**

> **Feature added:** February 19, 2026  
> **Documentation:** [`/Documentation/04-TUI/Campaign-Management-MCP-Plan.md`](../04-TUI/Campaign-Management-MCP-Plan.md)

**Purpose:** Automated ad campaign management via MCP servers integrated into MerchStation TUI.

**Platforms:** Meta Ads (Facebook/Instagram), TikTok Ads

**Core Features:**
1. **Real-time Campaign Monitoring:**
   - Fetch campaign metrics via MCP (spend, impressions, clicks, conversions)
   - Store historical data in database for trend analysis
   - Auto-refresh every 15 minutes

2. **CAC/CPC Limit Automation:**
   - Per-campaign CAC (Cost Per Acquisition) limits
   - Per-campaign CPC (Cost Per Click) limits
   - **Immediate auto-pause** when limits exceeded
   - Different limits per campaign type

3. **Bidirectional Control:**
   - Read metrics from Meta/TikTok
   - Edit budgets, pause/resume campaigns from TUI
   - Create new campaigns (link to platform managers)

4. **Daily Reports:**
   - Automated daily summary of all campaigns
   - List of paused campaigns requiring action
   - Performance trends and recommendations

5. **Leopoldo AI Integration:**
   - Real-time alerts when campaigns hit limits
   - Daily campaign summary
   - Optimization recommendations

**TUI Integration:**
- Campaigns tab in MerchStation sidebar
- Campaigns keyboard shortcut: `C`
- Detail view with metrics charts
- Limits editor for CAC/CPC thresholds

**Tech:** MCP servers (meta-ads-mcp, tiktok-ads-mcp), node-cron for automation, Neon database for storage.

---

### 2.7 AI-Powered Production Automation System

  **Universal Halftone Standard for Perfect Brand Consistency:**

  Every design is processed identically with halftoned, color-separated layers **regardless of print method**. Whether printing one shirt on-demand (DTG/DTF) or 50 shirts in bulk (screen printing), the production team uses the same halftoned layers, ensuring perfect visual consistency.

  **Core Innovation:**
  - Fan buys "Skrull" design online → DTG prints using halftoned layers 1-3
  - Artist orders 50 "Skrull" shirts for tour → Screen prints same halftoned layers 1-3
  - Result: **Visually identical products** ✅ Perfect brand consistency

  **System Features:**
  - **Universal Halftone Standard:** All print methods use same halftoned layers
  - **Intelligent Design Analysis:** Computer vision + LLM optimization suggestions
  - **Automated Color Separation (OpenCV/Sharp):** Dedicated backend service uses **OpenCV** and **Sharp** to mathematically separate colors and generate per-color halftones with moiré-prevention angles.
  - **Single Production File:** Master PSD with reference layer + separated layers
  - **Multi-Method Support:** One file works for DTG, DTF, and screen printing
   - **DPI Verification:** Ensure all designs meet ≥300 DPI for quality printing
   - **Size Validation:** Verify dimensions match product specifications
   - **Bleed Area Generation:** Auto-add bleed zones for cut products
   - **Mockup Auto-Update:** Regenerate product mockups after optimizations
   - **FLUX 2 Flex img2img:** Iterative design refinements within same model family

  **Production Workflow (Universal):**
  1. System generates master PSD with halftoned layers (1-3) + reference layer (0)
  2. DTG/DTF orders: Print halftoned layers 1-3 composited by printer
  3. Screen print orders: Print halftoned layers 1-3 as separate film positives
  4. Reference layer: Used for color verification only, never printed

  **ROI:**
  - **Processing Cost:** $0.047 per design (all print methods)
  - **Manual Work Eliminated:** €45 per design (1.5 hours saved)
  - **Cost Reduction:** 99.9%
  - **Brand Consistency:** 100% visual match across all print methods
  - **Production Flexibility:** Seamless switching between print methods

  **Why Halftone for DTG/DTF?**
  - Modern DTG printers can print halftone patterns correctly
  - Halftone dots at 300 DPI / 45 LPI are invisible to naked eye
  - Ensures exact color matching between DTG and screen methods
  - Same colors + same halftone = identical visual result

  ### 2.9 Product Mockup Generation System

  **Cloudinary Dynamic Mockups for Instant, Scalable Previews:**

  We utilize **Cloudinary's Dynamic Transformation** engine to generate photorealistic product mockups on the fly. This replaces complex server-side rendering with a robust, CDN-based solution that scales infinitely.

  **Core Features:**
  - **Instant Generation:** Mockups generated in milliseconds via URL parameters (`f_auto`, `q_auto`).
  - **Realistic Blending:** Uses `e_multiply` and opacity adjustments to blend designs naturally with fabric textures.
  - **Smart Displacement:** Maps designs to the contours of the clothing for 3D realism.
  - **Automatic Optimization:** Delivers the perfect format (AVIF/WebP) and size for every device.
  - **Multi-Position Support:** Front, back, sleeves, internal neckline placements.
  - **Authentic Halftone Display:** Mockups use the actual halftoned layers (not smooth digital versions) to show customers the authentic screen print aesthetic they'll receive.
  - **Cost Efficiency:** Offloads heavy image processing to Cloudinary's optimized infrastructure.

  **Artist Workflow:**
  1. Design finalized with halftone optimization.
  2. System constructs a Cloudinary URL combining the **Product Base Image** and the **Halftoned Design Overlay**.
  3. Artist previews mockup instantly.
  4. Artist approves: "Yes, this matches the vibe I want!"
  5. Mockup published to storefront.

  **Customer Experience:**
  ```
  Product Page:
    [Cloudinary-generated Mockup]
    
    💡 AUTHENTIC SCREEN PRINT AESTHETIC
      This design uses professional halftone screen printing
      techniques for a vintage, hand-crafted look. The subtle
      texture you see is exactly how your product will look!
      
      ✅ What you see = What you get
      [Zoom In] to see the authentic detail
  ```

  **Benefits:**
  - **Zero Server Load:** No need to run heavy image processing servers for mockups.
  - **Global Speed:** Served from Cloudinary's global CDN.
  - **Perfect Expectations:** Customers see the actual print file on the shirt.

  **Artist Workflow:**
  1. Design finalized with halftone optimization
  2. System generates mockup using halftoned layers
  3. Artist previews mockup with authentic screen print look
  4. Artist approves: "Yes, this matches the vibe I want!"
  5. Mockup published to storefront with explanation of halftone aesthetic

  **Customer Experience:**
  ```
  Product Page:
    [Mockup shows halftone design]
    
    💡 AUTHENTIC SCREEN PRINT AESTHETIC
      This design uses professional halftone screen printing
      techniques for a vintage, hand-crafted look. The subtle
      texture you see is exactly how your product will look!
      
      ✅ What you see = What you get
      [Zoom In] to see the authentic detail
  ```

  **Benefits:**
  - No "looks different than mockup" complaints
  - Honest expectations = higher satisfaction
  - Premium aesthetic differentiates from cheap POD competitors
  - Mockup matches physical product perfectly
  - Customers appreciate authentic craftsmanship

  **Note:** See [MOCKUP_ARCHITECTURE.md](./MOCKUP_ARCHITECTURE.md) for complete technical documentation

  ### 2.10 Social Media Card Generation (Cloudinary)

  **Automated Viral Marketing Assets:**
  To drive organic growth, the platform automatically generates high-quality, shareable social media assets for every purchase and new product drop.

  **Core Features:**
  - **"Just Bought" Cards:** When a customer purchases an item, a personalized image is generated overlaying their specific product design onto a "Just Copped" template.
  - **"New Drop" Announcements:** Artists can generate "New Drop" assets for Instagram Stories (9:16) and Feed (1:1) with a single click.
  - **Dynamic Personalization:** Cards include the customer's name (optional), product name, and artist branding.
  - **Optimized Formats:** Automatically resized and formatted for Instagram, TikTok, and Twitter/X.

  **Technical Implementation:**
  - **Cloudinary Layers:** Uses Cloudinary's layering capabilities to composite the product image, template background, and dynamic text overlays.
  - **Zero-Latency Generation:** Assets are created on-the-fly via URL parameters, requiring no backend storage or processing time.


  ---

  ## 3. Non-Functional Requirements

  ### 3.1 Performance
  - API response time: <100ms for cached data
  - LLM response time: <500ms for Mistral Small 4 conversations, <1s for Mistral Large 3 complex instructions, <3s for OpenRouter-routed image generation
  - Context detection accuracy: 98%
  - Artwork generation success rate: >95%
  - Edge function cold start: <500ms

  ### 3.2 Scalability
  - Serverless architecture with automatic scaling via Vercel
  - Support for 10,000+ monthly product sales
  - Unlimited concurrent users (no platform limits)
  - Efficient database indexing for sub-100ms queries
  - CDN distribution for global asset delivery

  ### 3.3 Security
  - End-to-end encryption for user data via Clerk and Neon
  - Row-level security (RLS) for all database tables
  - Secure API key management via environment variables
  - AI prompt injection prevention and validation
  - Design intellectual property protection
  - Regular security audits

  ### 3.4 Reliability
  - 99.9% uptime target via Vercel's infrastructure
  - Multi-model fallback chains for resilience
  - Graceful degradation during service outages
  - Real-time monitoring with error alerting
  - Automated retry logic with exponential backoff

  ### 3.5 Cost Efficiency
  - Base operational costs: ~$300/month (74% reduction from original estimate)
  - Mistral Small 4 conversations: ~$0.0001 per simple interaction
  - Mistral Large 3 complex instructions: ~$0.001 per interaction
  - OpenRouter image generation: ~$0.006–0.008 per generation
  - Self-hosted models for intent classification
  - Optimized caching to reduce redundant API calls

  ---

  ## 4. Exit Strategy (The "Big Picture")

  Investors need to know the destination. While we are building a profitable standalone business, we are positioning Blackout Merchandise as a strategic acquisition target for three distinct buyer categories:

  ### 1. The Technology Acquisition (Target: $50M - $100M)
  **Potential Acquirers:** Printful, Redbubble, Gelato
  - **Why they buy:** They have the volume but lack the **AI Design Agent technology**. Acquiring Blackout Merchandise gives them the "Leopoldo/Francisca" engine to offer AI design to their millions of users.
  - **The Asset:** The "Cat-Suite" Agent Architecture + print-production workflow (color separation, print prep).

  ### 2. The Native Commerce Acquisition (Target: $100M+)
  **Potential Acquirers:** Shopify, Squarespace, Wix
  - **Why they buy:** These platforms want to keep creators inside their ecosystem. Blackout Merchandise becomes their "native merch arm"—allowing any Shopify user to launch a premium print-on-demand line with one click.
  - **The Asset:** The seamless "Store-in-a-Box" experience.

  ### 3. The Vertical Integration Acquisition (Target: $200M+)
  **Potential Acquirers:** Live Nation / Ticketmaster, Universal Music Group
  - **Why they buy:** They control the artists but outsource the merch. Blackout Merchandise allows them to vertically integrate merchandise production for their mid-tier touring artists, capturing the 40% margin they currently lose to third parties.
  - **The Asset:** The "Anchor Tenant" production capacity (VOLT-M) + Ethical Brand Halo.

  ### 4. The "Empire Builder" Path (Founder's Preferred Strategy)
  **Target:** EBITDA > €2M (Year 4-5) | **Mechanism:** Private Equity Recapitalization
  **Potential Partners:** Growth Equity Firms (Summit Partners, TCV) or PE (Thoma Bravo)
  - **Why this path:** Unlike a tech exit that swallows the brand, a Recapitalization allows the founder to sell a partial stake (e.g., 40%) to realize liquid wealth while **retaining control as CEO**.
  - **The Vision:** This aligns with the "Founder-Operator" DNA. It's not about selling out; it's about bringing on a financial partner to turn a profitable regional player into a global industrial juggernaut.

  ---

  ### 3.6 Development Infrastructure & AI Agent Stack

  > **Stack Pivot (Jan 6, 2025):** Switched from Convex to **Neon (Postgres)** + **Upstash (Redis)** + **Drizzle ORM** for better AI integration and ecosystem flexibility. Added **V0 (Vercel)** for rapid frontend generation. Clerk retained for superior Passkey support and pre-built auth components.

  **Production Stack:**

  | Component | Tool | Purpose |
  |-----------|------|---------|
  | **Hosting** | Vercel | Frontend hosting + Edge caching (manual deploys) |
  | **Database** | Neon (Postgres) | Serverless Postgres + pgvector for AI embeddings |
  | **ORM** | Drizzle | Type-safe queries, lightweight, Neon serverless driver |
  | **Auth** | Clerk | Passkeys/Magic Links + Pre-built UI components + 10K free MAUs |
  | **Caching/Sessions** | Upstash (Redis) | Serverless Redis for sessions, rate limiting, AI response cache |
  | **Storage** | Cloudinary | **Public CDN** + Image Transformations (Resizing/Optimization/Mockups) |
  | **Feature Flags** | Upstash Redis | Simple key-value flags with instant updates |
  | **Error Tracking** | Sentry | Root cause analysis + error monitoring |
  | **Payments** | NexaPay | Professional Plan ($249/mo, 14 providers, instant USDC settlement on Polygon). Stripe retained as backup. |
  | **Image Pipeline** | Cloudinary | Mockups, social cards, image transformations |
  | **AI Workflows** | Trigger.dev + Vercel Functions | Background jobs for AI, vector storage in Neon pgvector |
  | **Frontend Gen** | V0 (Vercel) | AI-powered component generation via MCP integration |

  **AI Development MCP Stack (Antigravity):**

  | MCP | Function | Value |
  |-----|----------|-------|
  | **V0 MCP** | Frontend generation | Atomized component creation, iteration, download |
  | **Sentry MCP** | Debug assistance | AI-assisted error tracing and root cause analysis |
  | **GitHub MCP** | Task management | Issue creation, PR management, project tracking |
  | **Neon MCP** | Database queries | Schema exploration, query testing, migrations |
  | **Upstash MCP** | Cache management | Redis debugging, session inspection |
  | **Filesystem MCP** | Documentation | PRD access, planning docs, context continuity |

  **Deployment Strategy:**
  - **Manual Vercel deploys** — Push to main → auto-deploy (no Vercel MCP needed)
  - **Solo builder workflow** — GitHub Issues for task management, Sentry for debugging

  #### Product Image Naming Convention
  
  Standardized naming for catalog product images stored in Cloudinary:
  
  ```
  blackout-merchandise/products/{product_sku}/{type}-{color}.{ext}
  ```
  
  | Type Code | Description | Example |
  |-----------|-------------|---------|
  | `001` or `front` | Front view of product | `001-front-black.jpg` |
  | `002` or `back` | Back view of product | `002-back-black.jpg` |
  | `003` or `detail` | Close-up detail shot | `003-detail-black.jpg` |
  | `004` or `lifestyle` | Model wearing product | `004-lifestyle-black.jpg` |
  | `005` or `swatch` | Fabric/color swatch | `005-swatch-black.jpg` |
  | `006` | Front view alternate color | `001-front-white.jpg` |
  
  **Cloudinary Folder Structure:**
  ```
  blackout-merchandise/
  └── products/
      └── {sku}/
          ├── 001-front-black.jpg
          ├── 002-back-black.jpg
          ├── 001-front-white.jpg
          ├── 002-back-white.jpg
          └── ...
  ```
  
  **Variant-Specific Images:** Append variant SKU for color-specific variants:
  ```
  blackout-merchandise/products/{product_sku}/variants/{variant_sku}.jpg
  ```

  This convention enables AI agents to programmatically construct image URLs and enables automated gallery generation.
  - **Deferred complexity** — Vercel KV and Edge Config added only when metrics justify

  **Rationale:**
  This stack prioritizes simplicity for a solo builder while maintaining enterprise-grade observability. The MCP integrations enable AI-assisted development without introducing deployment complexity. Vercel MCP is intentionally excluded—continuous chat-based deployments are unnecessary for this workflow.

  ---

  ## 4. Acceptance Criteria


  ### Phase 1: Foundation (Weeks 1-4)
  - [ ] Next.js 16+ app with App Router configured
  - [ ] Neon PostgreSQL database with Drizzle ORM schema deployed
  - [ ] Clerk Auth integrated (Passkeys, Magic Links, OAuth)
  - [ ] **Voice + text chat interface functional with Voxtral Transcribe 2**
  - [ ] **Voice transcription working with >95% accuracy**
  - [ ] Mistral Large 3 + Small 4 API integration working
  - [ ] Mistral Large 3 vision analysis responding to **uploaded artwork**
  - [ ] OpenRouter image generation routing working
  - [ ] User profile and store creation flow complete

  ### Phase 2: Artwork Generation (Weeks 5-8)
  - [ ] Design category selection interface built
  - [ ] BFL API image generation integration complete (FLUX 2 Flex / Pro / Max by task complexity)
  - [ ] Mistral Large 3 artwork analysis integration complete
  - [ ] Category presets configured (5+ categories)
  - [ ] Image generation with proper dimensions working
  - [ ] **Voice-powered design refinement working (Voxtral pipeline)**
  - [ ] Iterative refinement conversation flow functional (**voice + text**)
  - [ ] Preview rendering system operational
  - [ ] Design session history persisted in Neon PostgreSQL

  ### Phase 3: Print-Ready Processing (Weeks 9-12)
  - [ ] DPI validation system implemented
  - [ ] Color separation analysis working
  - [ ] Bleed area auto-generation functional
  - [ ] Multi-format export (PNG + PDF/vector) working
  - [ ] Print specifications database built
  - [ ] Product-specific size validation complete
  - [ ] File storage on S3 operational

  ### Phase 4: Store & Commerce (Weeks 13-16)
  - [ ] Product catalog with unlimited listings
  - [ ] NexaPay payment integration complete (Stripe retained as backup)
  - [ ] Order management system functional
  - [ ] **Branded storefront generation (isolated per artist)**
  - [ ] **Artist-only product visibility enforced**
  - [ ] Inventory tracking system operational
  - [ ] Basic analytics dashboard built
  - [ ] Self-supplied product management working



  ### Phase 8: Merch Coins Marketing System (Month 7 Post-Launch)
  **Goal:** Enable artist-driven organic growth through social media campaigns

  **Prerequisites:**
  - 100+ active artists on platform
  - Proven product-market fit
  - Stable payment and order systems

  **Deliverables:**
  - **Monthly coin allocation system** (Free: 100, Pro: 500, Studio: 1,000)
  - **Coin balance tracking** in artist dashboard
  - **Distribution interface** (manual winner selection)
  - **Checkout redemption flow** (customers apply coins)
  - **6-month expiry system** with automatic cleanup
  - **Artist analytics** (coins given, redeemed, ROI tracking)
  - **Guardrails:** Max 50% order discount, minimum €10 order
  - **Platform promotion system** (separate from coins)

  **Technical Implementation:**
  ```typescript
  // Database Schema
  CREATE TABLE merch_coin_balances (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    user_type TEXT CHECK (user_type IN ('artist', 'customer')),
    balance INTEGER DEFAULT 0,
    earned_total INTEGER DEFAULT 0,
    spent_total INTEGER DEFAULT 0,
    expires_soon INTEGER DEFAULT 0  -- coins expiring in 30 days
  );

  CREATE TABLE merch_coin_transactions (
    id UUID PRIMARY KEY,
    from_user_id UUID,  -- NULL for monthly allocations
    to_user_id UUID,
    amount INTEGER,
    transaction_type TEXT,  -- 'allocation', 'giveaway', 'redemption', 'expiry'
    reference_id UUID,  -- order_id, campaign_id, etc.
    description TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP
  );

  CREATE TABLE coin_giveaways (
    id UUID PRIMARY KEY,
    artist_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    coins_per_winner INTEGER,
    num_winners INTEGER,
    total_coins_reserved INTEGER,
    platform TEXT,  -- 'twitter', 'instagram', 'email', etc.
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')),
    ends_at TIMESTAMP,
    created_at TIMESTAMP
  );

  // Monthly Allocation (Cron Job - 1st of month)
  async function allocateMonthlyCoins() {
    const artists = await db.query(`
      SELECT id, role FROM users 
      WHERE user_type = 'creator' AND active = true
    `);
    
    const allocations = {
      'free': 100,
      'pro': 500,
      'studio': 1000
    };
    
    for (const artist of artists) {
      const coins = allocations[artist.tier];
      
      await addCoins({
        toUserId: artist.id,
        amount: coins,
        type: 'monthly_allocation',
        description: `${artist.tier} tier monthly allocation`,
        expiresAt: addMonths(new Date(), 6)
      });
    }
  }

  // Checkout Redemption
  async function applyMerchCoins(orderId: string, coinsToUse: number) {
    const order = await getOrder(orderId);
    const customer = await getCoinBalance(order.customerId);
    const artist = await getArtist(order.artistId);
    
    // Validations
    if (customer.balance < coinsToUse) {
      throw new Error('Insufficient coins');
    }
    
    const coinDiscount = coinsToUse * 1.00; // 1 coin = €1
    const artistMargin = order.totalPrice - order.baseCost;
    
    // Max discount is artist's margin
    if (coinDiscount > artistMargin) {
      throw new Error(`Max discount: €${artistMargin.toFixed(2)}`);
    }
    
    // Max 50% of order value
    if (coinDiscount > order.totalPrice * 0.5) {
      throw new Error('Maximum 50% discount with coins');
    }
    
    // Minimum order value €10
    if (order.totalPrice < 10) {
      throw new Error('Coins can only be used on orders over €10');
    }
    
    // Apply discount
    await updateOrder(orderId, {
      coinDiscount: coinDiscount,
      artistRevenue: artistMargin - coinDiscount,
      customerPaid: order.totalPrice - coinDiscount,
      platformRevenue: order.baseCost  // Unchanged
    });
    
    // Deduct coins from customer
    await deductCoins({
      fromUserId: order.customerId,
      amount: coinsToUse,
      type: 'redemption',
      referenceId: orderId,
      description: `Redeemed on order #${order.orderNumber}`
    });
  }
  ```

  **Success Metrics:**
  - Coin distribution rate: >60% of allocated coins distributed
  - Redemption rate: >40% of distributed coins redeemed
  - Social media reach per coin: >50 impressions
  - New customer acquisition via coins: >20% of coin recipients
  - Artist satisfaction: >85% find coins useful
  - Platform cost: €0 (all discounts from artist margin)

  **Artist Dashboard Features:**
  - **Coin Balance Widget:** "You have 247 coins (€247 discount power)"
  - **Quick Actions:** "Create Giveaway", "Reward Customer", "Send to Email List"
  - **Analytics:** "Coins given this month: 80 | Redeemed: 32 | Pending: 48"
  - **Expiry Alerts:** "50 coins expire in 15 days - use them!"
  - **ROI Tracking:** "Coins brought 12 new customers, €340 revenue"

  **Customer Experience:**
  - Receive coins via email: "Artist X gave you 5 Merch Coins!"
  - See balance in account: "You have 15 Merch Coins (€15 off)"
  - Apply at checkout: "Use 10 coins" → Price updates in real-time
  - Expiry reminders: "5 coins expire Feb 1 - shop now!"

  **Platform Promotions (Separate System):**
  - Buy 3 Pay 2 sales (platform absorbs cost)
  - €10 off first order (customer acquisition)
  - Free shipping over €50 (increase AOV)
  - Seasonal sales (Black Friday, etc.)
  - **Cannot stack with Merch Coins** (customer chooses one discount)

  **Monetization:**
  - Built into tier pricing (Pro/Studio get more coins)
  - Future: Coin top-ups (artists buy extra at €1.10 per coin, you keep €0.10)
  - Future: Sponsored campaigns (brands pay artists to distribute coins)

  **ROI for Artists:**
  ```
  Example: Pro tier artist ($20/month, 500 coins)

  Social Campaign: "RT + tag 3 friends = 5 coins"
  - 200 RTs (massive reach)
  - 40 winners × 5 coins = 200 coins distributed
  - 16 redeem (40% redemption rate)
  - 16 orders × €25 = €400 GMV
  - Artist margin: €10/product = €160 gross
  - Coin cost: 16 × €5 = €80
  - Net revenue: €80
  - Plus: 200 RTs, brand awareness, follower growth
  - ROI: €80 net + intangibles for $20/month = massive win
  ```

  ---


  ### Phase 8: Merch Coins System (Month 7 Post-Launch)
  - [ ] Database schema for coins created
  - [ ] Monthly allocation cron job functional
  - [ ] Artist dashboard coin balance widget
  - [ ] Coin distribution interface (manual winner selection)
  - [ ] Checkout redemption flow working
  - [ ] Discount calculation (artist margin only) validated
  - [ ] 6-month expiry system with cleanup job
  - [ ] Max 50% discount validation
  - [ ] Minimum €10 order validation
  - [ ] Artist analytics dashboard (coins given/redeemed/ROI)
  - [ ] Customer coin balance display
  - [ ] Email notifications (received coins, expiry warnings)
  - [ ] Platform promotion system (separate from coins)
  - [ ] Coin distribution rate >60%
  - [ ] Redemption rate >40%

  ### Phase 7: AI Store Designer (Months 4-6 Post-Launch)
  - [ ] v0 Business Plan account activated
  - [ ] v0 API integration functional (v0-1.5-md model)
  - [ ] 5-7 preset themes hand-crafted and live
  - [ ] Theme generation engine operational
  - [ ] Conversational refinement working ("Make it darker", etc.)
  - [ ] Real-time preview system with iframe rendering
  - [ ] Theme storage and versioning in Neon PostgreSQL
  - [ ] Pro tier billing integration ($20/month)
  - [ ] Quality validation preventing broken themes
  - [ ] Rollback to default theme mechanism
  - [ ] Theme generation success rate >95%
  - [ ] Pro tier conversion rate >30%

  ### Phase 5: Bulk Orders & Optimization (Weeks 17-20)
  - [ ] Bulk order quote generation system
  - [ ] Volume pricing calculator
  - [ ] Rush order handling
  - [ ] Performance monitoring dashboard
  - [ ] Cost tracking and optimization alerts
  - [ ] A/B testing framework
  - [ ] Documentation complete

  ---

  ## 5. Technical Considerations

  ### 5.1 Technology Stack

  **Development Environment:**
  - **Bun:** Primary Package Manager & Local Runner (Instant startup, 10x faster installs)
  - **Node.js:** Production Runtime on Vercel (Stability & compatibility)

  | **Frontend** | Next.js 16 | App Router, Server Components |
  | **Animation** | Recraft.ai | **Layered PNGs (Cutout/Puppet)** + Framer Motion (Micro-interactions) |
  | **Styling** | Tailwind CSS | Utility-first styling with `HeroUI` components |
  - Next.js 16+ (App Router, React Server Components)
  - TypeScript for type safety
  - **Vercel AI Elements (ai-elements) - AI-native component library**
  - HeroUI (base component library — premium React UI with official Figma kit)
  - TailwindCSS for styling
  - Radix UI primitives
  - Zustand or React Context for state management
  - **Zod:** Schema validation for AI outputs & API data (Crucial for AI stability)
  - **Customer Storefronts (MVP):** [Sesto Next.js + Prisma + Tailwind Ecommerce Template](https://www.shadcn.io/template/sesto-dev-next-prisma-tailwind-ecommerce) (Accelerated deployment, owned code)

  **Backend:**
  - Neon (serverless Postgres with pgvector for AI embeddings)
  - Drizzle ORM (type-safe queries, lightweight, Neon serverless driver)
  - Clerk (authentication & authorization with Passkeys)
  - Upstash Redis (caching, sessions, rate limiting)
  - Vercel Functions (serverless compute for API routes)
  - Cloudinary (file uploads & image CDN)
  - **Trigger.dev:** Long-running background jobs (AI generation, Cloudinary processing) to bypass serverless timeouts.

  **AI & ML (Phase 1: Launch - API-Based):**
   - **Mistral Large 3** (via Mistral API) — Complex reasoning, onboarding, creative direction, character roleplay
   - **Mistral Small 4** (via Mistral API) — Fast, cost-optimized FAQ/order tracking (~70% of conversational traffic)
   - **Mistral Large 3** (via Mistral API) — Vision & image analysis: print readiness, resolution check, color count, style detection
   - **Mistral Voxtral Transcribe 2** — Real-time speech-to-text ($0.003/min, 13 languages)
   - **ElevenLabs TTS** — Character voice synthesis with zero-shot cloning
   - **fal.ai** — Reference-guided image generation on Nano Banana 2 (`fal-ai/nano-banana-2`, `fal-ai/nano-banana-2/edit`), Seedream 5.0 Pro fallback, `fal-ai/ideogram/remove-background`
   - **OpenCV (Python/Node)** — Color separation, halftoning, DPI validation (deterministic, $0)
   - **v0 API (Vercel)** — AI-powered component generation for store customization

  **AI & ML (Phase 2: Scale - Self-Hosted Migration at 250+ Artists):**
  - **Self-hosted Voxtral** (Apache 2.0 weights) — Eliminate per-minute STT/TTS costs at scale
  - **Failover:** OpenRouter API remains as high-availability backup for image generation; Mistral API direct for LLM

  **Infrastructure:**
  - Vercel (hosting, edge functions, CDN)
  - Cloudinary (image storage, optimization, mockup generation)
  - NexaPay (primary) + Stripe (backup) for payment processing
  - **Resend:** Transactional email service (Waitlist invites, Order confirmations) + React Email
  - **Railway/Render (optional Sharp microservice for high-volume mockup generation)**

  **Supplier Integrations:**
  - **WATC Studio (Portugal, Barcelos):** Real-time stock checking via API for dynamic delivery estimates. 100% organic cotton, premium luxury blanks.
  - **EDI (Future):** FTP-based automated ordering (Deferred to Post-MVP).


  **Image Processing & Media Management:**
  - **Cloudinary:**
      - **Media Management:** Storage and optimization of all user uploads and generated assets.
      - **Mockup Generation:** Dynamic overlay and transformation for product previews.
      - **Social Media Cards:** Auto-generation of shareable assets (Instagram Stories/Feed) using dynamic layers.
      - **Background Removal:** AI-powered isolation of subjects in generated artwork.
  - **Production Automation (Backend):**
      - **OpenCV (Python/Node):** Advanced color separation, K-Means clustering for spot colors.
      - **Sharp:** High-performance image processing for halftoning and print file generation.
      - **Tesseract OCR:** Font size detection.
      - **ag-psd:** PSD file generation with layers.
      - **PDFKit:** Production placement guides.

  **Monitoring & Analytics:**
  - Vercel Analytics (performance)
  - Sentry (error tracking)
  - PostHog or Mixpanel (product analytics)
  - Custom logging via Sentry and Vercel Analytics

  ### 5.2 AI Infrastructure Economics & Scaling Strategy

  **Launch Strategy: API-First for Speed & Capital Efficiency**

   We're launching with a fully API-based Mistral-native stack (Large 3 + Small 4 + Voxtral) to validate demand fast. Our unit economics show AI costs are extremely manageable during validation phase:

   **Cost Analysis (Year 1):**
   ```
   Usage: 100 artists × 10 designs/month = 1,000 generations + 30,000 messages
   Mistral Small 4 (70% of messages): ~$4.50/month (21,000 msgs @ $0.0001)
   Mistral Large 3 (30% of messages): ~$9.00/month (9,000 msgs @ $0.001)
   Mistral Large 3 (vision/image analysis): ~$5.00/month (1,000 uploads)
   Voxtral STT (5,000 voice mins): ~$15.00/month
   ElevenLabs TTS (5,000 voice mins): ~$25.00/month
   Image Generation (FLUX 2 Flex / Pro / Max via BFL API): ~$15.00/month (1,000 images avg)
   Monthly cost: ~$64.50
   Annual cost: ~$774

  As percentage of revenue:
    At €50K monthly revenue: 0.13% (negligible)
    At €100K monthly revenue: 0.06% (insignificant)
  ```

  **Why Mistral-Native Stack:**
  - ✅ **EU data sovereignty** — All inference stays in Europe (GDPR-native)
  - ✅ **Single provider** — One API key, one bill, one status page
  - ✅ **Ultra-low costs during validation** — ~$65/month at 100 artists
  - ✅ **Proven quality** — Large 3 matches GPT-4o on benchmarks; Small 4 is best-in-class for its size
  - ✅ **No infrastructure overhead** — Zero GPUs to manage until 250+ artists
  - ✅ **Focus on product-market fit** — Not infrastructure management

  **Scaling Trigger: Self-Host Voxtral at 250+ Artists**

  ```
  Break-Even Analysis:

  250+ active artists (~25,000 voice mins/month):
    - Voxtral STT/TTS via API: ~$200/month
    - Self-hosted Voxtral (Apache 2.0): €150/month (GPU rental)
    - Savings: ~$50/month ✅

  500+ active artists (~50,000 voice mins/month):
    - Voxtral STT/TTS via API: ~$400/month
    - Self-hosted Voxtral: €150/month
    - Savings: ~$250/month ✅

  1,000+ active artists (~100,000 voice mins/month):
    - Voxtral STT/TTS via API: ~$800/month
    - Self-hosted Voxtral: €150/month
    - Savings: ~$650/month ✅
  ```

  **Self-Hosted Infrastructure (Phase 2 — Year 2):**
  ```
  Hardware Investment:
    - Hetzner/Gcore GPU Server (NVIDIA A100 or RTX 4090): €150–300/month
    - Voxtral STT + TTS (Apache 2.0 weights): Included
    - Setup & integration: €500 (one-time)
  ```

  ### 5.3 Cloudinary Cost Forecast (Investor Confidence)

  **Thesis:** Cloudinary provides enterprise-grade media infrastructure for a fraction of the cost of building it ourselves. Even at scale, the cost per unit sold is negligible (<$0.05), preserving our high gross margins.

  **Stage 1: Validation (Months 1-6)**
  - **Plan:** Free Forever
  - **Capacity:** 25,000 transformations/month (~2,500 product views)
  - **Monthly Cost:** **$0**
  - **Impact:** Zero burn rate during critical validation phase.

  **Stage 2: Growth (Months 7-12)**
  - **Plan:** Plus
  - **Capacity:** 225,000 credits/month (~225,000 product views or 22,500 sales)
  - **Monthly Cost:** **$89**
  - **Unit Economics:** At 1,000 sales/month, cost is **$0.089 per order**.
  - **Impact:** Supports rapid growth without infrastructure headaches.

  **Stage 3: Scale (Year 2+)**
  - **Plan:** Advanced
  - **Capacity:** 600,000 credits/month (~60,000 sales/month capacity)
  - **Monthly Cost:** **$224**
  - **Unit Economics:** At 5,000 sales/month, cost is **$0.04 per order**.
  - **Impact:** Enterprise performance for the price of a single utility bill.

  **Conclusion:**
  Cloudinary is not a cost center; it is a **capital efficiency multiplier**. It replaces $50k+ in custom engineering and server maintenance for a predictable, scalable monthly fee that disappears into our healthy margins.
  ```
  Ongoing Costs (Portugal):
    - Electricity (24/7): €65/month
    - Cooling/facility: €30/month
    - Maintenance: €55/month
    - Total: €150/month (€1,808/year)

  ROI Timeline:
    - Investment: €5,000 (A6000) + €3,000 (setup) = €8,000
    - Monthly savings at 10K generations: €120
    - Break-even: 67 months (5.6 years)
    
    HOWEVER: Funded by profits (€30-50K/month by Year 2)
    Real cost: Opportunity cost only, no cash flow impact
  ```

  **Image Generation Approach: Hosted APIs Only**

  Image generation runs on hosted APIs; no model is trained or fine-tuned. Designs are produced with reference-guided generation on fal.ai: Nano Banana 2 (`fal-ai/nano-banana-2`, `fal-ai/nano-banana-2/edit`, up to 14 reference images) as primary and Seedream 5.0 Pro as documented fallback, with `fal-ai/ideogram/remove-background` for cutouts and `fal-ai/clarity-upscaler` only for prints beyond native 4K. Styles are "Style Capsules": a prompt template plus curated style reference images, with one anchor image attached to each generation call. A LoRA training plan was tested once in August 2026, failed, and was retired on 2026-08-24. Full detail: [[05-Shared/Image-Generation-Architecture]].

  **Competitive Advantage:**
  - **Year 1:** Launch fast, validate demand, refine Style Capsules and print-prep rules
  - **Year 2:** Migrate voice to self-hosted Voxtral (Apache 2.0 weights, inference only) at 250+ artists
  - **Moat:** Print-production workflow (color separation, print prep, in-house production), not a proprietary model

  **Technical Migration Plan (Month 18-24, voice only):**
  - Acquire NVIDIA A6000 GPU (€5,000 from profits)
  - Install self-hosted Voxtral STT + TTS (Apache 2.0 weights)
  - Set up inference API wrapper
  - Deploy monitoring and logging
  - Keep the hosted APIs as fallback

  ---

  ### 5.3 Architecture Patterns

  **Vercel AI Elements Integration:**
  ```typescript
  // Example: Main chat interface with AI Elements
  import { Conversation, PromptInput, Message, Actions } from 'ai-elements';

  export function ChatInterface() {
    return (
      <Conversation>
        {messages.map((msg) => (
          <Message
            key={msg.id}
            role={msg.role}
            content={msg.content}
            // Custom Voxtral Transcribe 2 voice input integration
            onVoiceInput={handleVoiceTranscription}
          />
        ))}
        <Actions>
          <QuickActionButtons context={currentContext} />
        </Actions>
        <PromptInput
          onSubmit={handleSubmit}
          enableVoice={true} // Voxtral Transcribe 2 integration
        />
      </Conversation>
    );
  }

  // Example: Design artifact display
  import { Artifact, Workflow } from 'ai-elements';

  export function DesignPreview({ design }) {
    return (
      <Artifact
        type="image"
        content={design.url}
        metadata={design.printSpecs}
      >
        <Workflow steps={design.iterations} />
      </Artifact>
    );
  }
  ```

  **Intelligent Model Routing:**
  ```javascript
  // Intent classification (free tier)
  const intent = await classifyIntent(message); // Mistral Small 4 (fast routing)

  // Route to appropriate model
  switch(intent.type) {
    case 'conversation':
    case 'store_management':
      return 'anthropic/claude-4.5-haiku'; // $0.001/interaction
    
    case 'artwork_creation':
    case 'artwork_refinement':
      return 'black-forest-labs/flux-pro'; // $0.06/generation
    
    case 'complex_decision':
      return 'anthropic/claude-4.5-sonnet'; // $0.015/interaction
  }
  ```

  **Design Category Presets:**
  ```typescript
  interface DesignCategory {
    dimensions: string;
    dpi: number;
    style: string;
    colorGuidance: string;
    placement: string;
    format: string;
    printMethod: 'screen' | 'dtg' | 'sublimation';
  }

  const categories: Record<string, DesignCategory> = {
    band_tshirt: {
      dimensions: '4500x5400px',
      dpi: 300,
      style: 'bold, high-contrast, screen-print optimized',
      colorGuidance: 'limited palette (2-4 spot colors)',
      placement: 'centered chest, 12x16 inch printable area',
      format: 'vector-style with clear edges',
      printMethod: 'screen'
    },
    vintage_poster: {
      dimensions: '3000x4000px',
      dpi: 300,
      style: 'distressed, retro, textured',
      colorGuidance: 'sepia tones, limited vintage palette',
      placement: 'full bleed design',
      format: 'layered composition with typography',
      printMethod: 'dtg'
    },
    minimal_logo: {
      dimensions: '2000x2000px',
      dpi: 300,
      style: 'clean, geometric, minimal',
      colorGuidance: '1-2 colors, high contrast',
      placement: 'center-weighted, scalable',
      format: 'icon-style, works 2" to 14"',
      printMethod: 'screen'
    }
  };
  ```

  **Fallback Chain Strategy:**
  ```typescript
  const modelFallbacks = {
    'anthropic/claude-4.5-haiku': [
      'anthropic/claude-3-haiku',
      'meta-llama/llama-3.1-70b-instruct',
      'openai/gpt-4o-mini'
    ],
    'black-forest-labs/flux-pro': [
      'stability-ai/stable-diffusion-3',
      'openai/dall-e-3'
    ],
    'anthropic/claude-4.5-sonnet': [
      'openai/gpt-4o',
      'anthropic/claude-3-opus'
    ]
  };
  ```

  **Conversation State Management:**
  ```typescript
  // Stored in Neon PostgreSQL for persistence
  interface ConversationState {
    userId: string;
    sessionId: string;
    currentIntent: 'conversation' | 'artwork' | 'bulk_order';
    activeModel: string;
    messageHistory: Message[];
    designContext?: {
      category: string;
      iterations: DesignIteration[];
      currentDesignUrl?: string;
      printSpecs: PrintSpecs;
    };
    storeContext?: {
      storeId: string;
      products: string[];
      recentActions: Action[];
    };
  }
  ```

  ### 5.5 Data Models (Drizzle ORM + Neon PostgreSQL)

  **Source of Truth:** `/src/db/schema.ts`

  All tables use `uuid` primary keys (`.defaultRandom()`), `timestamptz` for dates, and JSONB for flexible metadata. Enums are defined as PostgreSQL native enums via Drizzle.

  **Core MVP Tables:**

  **`users`**
  *Single source of truth for all platform users. Clerk handles auth; this table extends Clerk with platform-specific data.*
  - `id`: UUID (PK, auto-generated)
  - `clerk_id`: Text (FK to Clerk — **not** `auth.users`)
  - `email`: Text (not null)
  - `display_name`: Text
  - `role`: Enum (`artist`, `customer`, `admin`) — default `customer`
  - `nexapay_customer_id`: Text (for NexaPay)
  - `nexapay_wallet_id`: Text (for NexaPay instant USDC payouts to artists)
  - `stripe_customer_id`: Text (retained as backup)
  - `stripe_connect_id`: Text (retained as backup)
  - `image_url`: Text (avatar from Clerk)
  - `created_at`, `updated_at`: Timestamp

  **`artist_stores`**
  *Each artist gets one branded storefront with a unique slug.*
  - `id`: UUID (PK)
  - `artist_id`: UUID (FK → `users.id`)
  - `slug`: Text (unique, e.g. `"iron-casket"`)
  - `name`: Text
  - `is_live`: Boolean (default `false` — must be approved before public)
  - `theme_config`: JSONB (colors, fonts, layout preferences)
  - `created_at`, `updated_at`: Timestamp

  **`shop_customizations`**
  *Per-store visual settings (1:1 with `artist_stores`).*
  - `id`: UUID (PK)
  - `store_id`: UUID (FK → `artist_stores.id`, cascade delete)
  - `slider_images`: JSONB (array of Cloudinary URLs)
  - `background_color`, `text_color`: Text
  - `about_text`: Text
  - `social_links`: JSONB ({ twitter, instagram, etc. })

  **`products`**
  *Artist-created products (design + blank + pricing).*
  - `id`: UUID (PK)
  - `store_id`: UUID (FK → `artist_stores.id`)
  - `name`, `description`: Text
  - `base_cost`: Integer (cents — what artist pays)
  - `retail_price`: Integer (cents — what customer pays)
  - `mockup_url`: Text (Cloudinary public URL)
  - `design_file_url`: Text (private Cloudinary URL for production)
  - `is_active`: Boolean

  **`orders` + `order_items`**
  *Customer orders with NexaPay integration (Stripe retained as backup).*
  - `orders`: `store_id`, `customer_id`, `status` (enum: pending → paid → processing → shipped → fulfilled/cancelled), `total_amount` (cents), `nexapay_transaction_id` (primary), `stripe_payment_intent_id` (backup), `shipping_address` (JSONB)
  - `order_items`: `order_id`, `product_id`, `quantity`, `price_at_purchase` (cents)

  **`chat_sessions`**
  *AI conversation persistence (replaces old `design_sessions` + `conversation_logs`).*
  - `id`: UUID (PK)
  - `user_id`: UUID (FK → `users.id`, nullable for anonymous)
  - `messages`: JSONB (array of `{ role, content, model, timestamp, metadata }`)
  - `created_at`, `updated_at`: Timestamp

  **`waitlist`**
  *Pre-launch artist signup with AI interview responses.*
  - `id`: UUID (PK)
  - `email`: Text (unique)
  - `name`, `social_link`: Text
  - `follower_range`: Text (`"1k-5k"`, `"5k-10k"`, etc.)
  - `interview_responses`: JSONB (AI-guided vetting Q&A)
  - `position`: Integer (queue position)
  - `status`: Text (`pending`, `approved`, `rejected`, `notified`)

  **GDPR Compliance Tables:**
  - `consents`: `user_id`, `consent_type` (essential/analytics/marketing), `granted`, `granted_at`, `withdrawn_at`, `ip_address`, `user_agent`
  - `data_subject_requests`: `user_id`, `request_type` (access/deletion/portability), `status`, `requested_at`, `completed_at`
  - `data_breach_logs`: `severity`, `affected_count`, `data_types`, `description`, `notified_at`

  **Product Catalog (Phase 6+ — Single Source of Truth):**
  - `catalog_products`: SKU, name, brand, material, cost/retail pricing (EUR cents), status
  - `product_variants`: SKU (composite: product+color+size), `color_id`, `size_id`, barcode
  - `inventory`: `variant_id`, `quantity_available`, `quantity_reserved`, `reorder_point`
  - `product_images`: Cloudinary URLs per variant, image type (`front`/`back`/`detail`/`swatch`)
  - `pricing_history` + `pricing_schedules`: Audit trail and future price changes

  **Security:**
  - No Supabase RLS. Authorization enforced via **Clerk middleware** (`middleware.ts`) and **Drizzle query patterns** (always filter by `store_id` or `user_id` from Clerk session).
  - Webhook idempotency via `processed_webhook_events` table (NexaPay + Stripe + Clerk webhooks).

  ### 5.4 Next.js API Routes (Serverless Functions)

  **Route Structure:**
  ```
  app/src/app/api/
  ├── chat/
  │   └── route.ts              # Mistral Large 3 / Small 4 conversation handler
  ├── generate-artwork/
  │   └── route.ts              # BFL API image generation (FLUX 2 Flex / Pro / Max)
  ├── analyze-upload/
  │   └── route.ts              # Mistral Large 3 vision: copyright/quality check
  ├── nexapay/
  │   └── webhook/
  │       └── route.ts          # NexaPay webhooks (Stripe retained as backup)
  └── voice/
      └── transcribe/
          └── route.ts          # Deepgram / Voxtral transcription proxy
  ```

  **Key Concept: "The Nervous System" (Triggers & Webhooks)**
  API Routes handle both user-facing requests and backend automation:
  - **On-Demand APIs:** Frontend calls `/api/generate-artwork` when user requests design generation.
  - **Webhook Handlers:** NexaPay sends payment events to `/api/nexapay/webhook` for order processing (Stripe webhooks retained as backup).
  - **Voice Proxy:** `/api/voice/transcribe` proxies Deepgram/Voxtral to protect API keys.

  **Example: Generate Artwork Route**
  ```typescript
  // app/src/app/api/generate-artwork/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { db } from '@/db';
  import { chatSessions } from '@/db/schema';
  import { eq } from 'drizzle-orm';

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  export async function POST(req: NextRequest) {
    const { userId, category, prompt, sessionId } = await req.json();

    // Get category preset
    const preset = DESIGN_CATEGORIES[category];

    // Build enhanced prompt with print specs
    const enhancedPrompt = `
      ${prompt}

      Style: ${preset.style}
      Color guidance: ${preset.colorGuidance}
      Format: ${preset.format}
      Output dimensions: ${preset.dimensions} at ${preset.dpi} DPI
      Print method: ${preset.printMethod}
    `;

    // Route to BFL API (FLUX 2 Flex / Pro / Max by task complexity)
    const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: preset.preferredModel, // 'black-forest-labs/flux-pro' or 'stability-ai/sdxl'
        prompt: enhancedPrompt,
        width: preset.width,
        height: preset.height
      })
    });

    const data = await response.json();
    const imageUrl = data.data[0].url;

    // Store iteration in chat session via Drizzle
    const session = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
    const messages = session[0]?.messages || [];
    messages.push({ role: 'assistant', type: 'image', url: imageUrl, prompt, timestamp: new Date().toISOString() });

    await db.update(chatSessions)
      .set({ messages, updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));

    return NextResponse.json({ imageUrl, specs: preset });
  }
  ```

  ### 5.5 Cloudinary Asset Strategy ("The Vault")

  We strictly separate public marketing assets from high-value production IP using Cloudinary folders and signed URLs.

  | Folder | Access Level | Content Type | Operational Role |
  | :--- | :--- | :--- | :--- |
  | **`blackout-merchandise/stores/`** | **Public (CDN)** | • Mockups (WebP/AVIF)<br>• Artist Avatars<br>• Store Banners | **Marketing Layer.** High-performance delivery via Cloudinary CDN with `f_auto,q_auto` optimization. |
  | **`blackout-merchandise/uploads/`** | **Signed URLs** | • Raw sketches<br>• Initial logo uploads | **Input Layer.** Accessible by the **Artist** (uploader) and **Francisca** (AI vision analysis). |
  | **`blackout-merchandise/production/`** | **Restricted (signed)** | • **300 DPI Print Files**<br>• Color-Separated Files<br>• `.ai` / `.psd` source | **The Core IP.** High security. Only accessible by **Victor (Admin)** and **Production Manager**. |

  ### 5.6 Integration Points
  - **OpenRouter API:** Multi-model AI routing with fallbacks
  - **Neon + Drizzle:** Database operations via serverless PostgreSQL
  - **Clerk:** Authentication, user management, sessions
  - **Cloudinary:** Image storage, optimization, and CDN delivery
  - **Upstash Redis:** Sessions, caching, rate limiting
  - **AWS S3 API:** Final artwork and print file storage
  - **NexaPay API (primary) + Stripe API (backup):** Payment processing and webhooks
  - **Fabric.js (Client-side):** Product mockup generation

  ---

  ## 6. Files/Components Affected

  ### New Files to Create

  **App Structure:**
  ```
  app/
  ├── (auth)/
  │   ├── login/page.tsx
  │   ├── signup/page.tsx
  │   └── callback/page.tsx
  ├── (dashboard)/
  │   ├── layout.tsx
  │   ├── page.tsx                    # Main chat interface
  │   ├── design/page.tsx              # Artwork generation interface
  │   ├── products/page.tsx            # Product management
  │   ├── orders/page.tsx              # Order history
  │   ├── analytics/page.tsx           # Store analytics
  │   └── settings/page.tsx            # Store settings
  ├── (storefront)/
  │   └── [slug]/
  │       ├── page.tsx                 # Public store page
  │       └── [productId]/page.tsx     # Product detail
  ├── api/
  │   ├── chat/route.ts                # Conversation handler
  │   ├── design/generate/route.ts     # Artwork generation proxy
  │   ├── design/refine/route.ts       # Artwork refinement
  │   └── webhook/nexapay/route.ts     # NexaPay webhooks (Stripe retained as backup)
  └── layout.tsx

  components/
  ├── chat/
  │   ├── ChatInterface.tsx            # Main chat using AI Elements <Conversation>
  │   ├── ConversationWrapper.tsx      # Wrapper for <Conversation> component
  │   ├── PromptInputWrapper.tsx       # Custom <PromptInput> with Voxtral
  │   ├── MessageDisplay.tsx           # Custom <Message> components
  │   ├── QuickActions.tsx             # <Actions> component wrapper
  │   └── IntentIndicator.tsx          # Show current model/intent
  ├── design/
  │   ├── CategorySelector.tsx         # Design category picker
  │   ├── DesignArtifact.tsx           # <Artifact> wrapper for design preview
  │   ├── DesignWorkflow.tsx           # <Workflow> component for iterations
  │   ├── IterationHistory.tsx         # Design version history
  │   ├── PrintSpecsPanel.tsx          # Display print specifications
  │   └── ExportOptions.tsx            # Download print files
  ├── products/
  │   ├── ProductCard.tsx
  │   ├── ProductMockup.tsx            # Fabric.js mockup
  │   ├── PricingCalculator.tsx
  │   └── BulkOrderForm.tsx
  └── shared/
      ├── LoadingStates.tsx
      ├── ErrorBoundary.tsx
      └── AuthGuard.tsx

  lib/
  ├── ai/
  │   ├── openrouter.ts                # OpenRouter client
  │   ├── intent-classifier.ts         # Intent detection
  │   ├── model-router.ts              # Model selection logic
  │   ├── fallback-handler.ts          # Fallback chains
  │   └── conversation-manager.ts      # Conversation state
  ├── design/
  │   ├── categories.ts                # Category presets
  │   ├── print-validator.ts           # DPI, color, size checks
  │   ├── file-exporter.ts             # PNG + PDF/vector export
  │   └── mockup-generator.ts          # Fabric.js wrapper
  ├── db/
  │   ├── index.ts                     # Neon serverless connection
  │   ├── schema.ts                    # Drizzle schema (source of truth)
  │   └── types.ts                     # Generated types
  ├── nexapay/
  │   ├── client.ts                    # NexaPay client (Stripe backup retained)
  │   └── webhooks.ts                  # Webhook handlers
  └── utils/
      ├── analytics.ts                 # Event tracking
      ├── cost-tracker.ts              # AI cost monitoring
      └── error-handler.ts             # Centralized error handling
  ```

  **Drizzle Migrations:**
  ```
  drizzle/
  ├── 0000_initial_schema.sql          # Generated by drizzle-kit
  ├── 0001_artist_stores.sql
  ├── 0002_product_catalog.sql
  ├── 0003_gdpr_tables.sql
  └── meta/
      ├── 0000_snapshot.json
      └── _journal.json
  ```

  **Configuration Files:**
  ```
  ├── .env.local                       # Local environment variables
  ├── .env.example                     # Environment template
  ├── next.config.js                   # Next.js configuration
  ├── tailwind.config.js               # TailwindCSS configuration
  ├── tsconfig.json                    # TypeScript configuration
  ├── package.json                     # Dependencies
  └── drizzle.config.ts                # Drizzle ORM configuration
  ```

  ---

  ## 7. Dependencies

  ### Core Services & Costs

  | Service | Plan | Monthly Cost | Purpose |
  |---------|------|--------------|---------|
  | **Vercel** | Pro | $20 | Hosting, edge functions, CDN |
  | **Neon PostgreSQL** | Serverless | $0–$19 | Database (serverless, auto-scaling) |
  | **Mistral API** | Pay-as-you-go | ~$50 | Large 3 + Small 4 + Voxtral |
  | **BFL API** | Pay-as-you-go | ~$45 | FLUX 2-only image generation (Flex / Pro / Max) |
  | **Cloudinary** | Free/Plus | $0–$89 | Image storage, optimization, mockups |
  | **NexaPay** | Professional Plan | $249/mo + 1.5%/tx | Payment processing (14 providers, instant USDC settlement) |
  | **Sentry** | Developer | $0-26 | Error tracking |
  | **Production Automation** | Computed | ~$15-50 | AI processing (300-1000 designs/month) |
  | **Total Base** | | **~$270-331** | **Excluding transaction fees** |

  ### AI Model Costs (10K Active Users, 30K Images/Month)

  | Model | Use Case | Cost | Monthly Volume | Monthly Cost |
  |-------|----------|------|----------------|--------------|
  | **Mistral Small 4** | FAQ, order tracking, simple queries (70%) | ~$0.15/1M input, ~$0.60/1M output | 21M tokens | **~$13.50** |
  | **Mistral Large 3** | Complex reasoning, onboarding, design (30%) | ~€2/1M input, ~€6/1M output | 9M tokens | **~$9.00** |
  | **Voxtral STT + TTS** | Voice transcription + synthesis | $0.003/min STT, ~$0.005/min TTS | 5,000 mins | **~$40.00** |
  | **FLUX 2 Flex** (BFL API) | Drafts, iterations, sketches (70%) | ~$0.008/image | 21,000 images | **~$168** |
  | **FLUX 2 Pro** (BFL API) | Final mockups, catalog (20%) | ~$0.020/image | 6,000 images | **~$120** |
  | **FLUX 2 Max** (BFL API) | Premium / hero releases (10%) | ~$0.050/image | 3,000 images | **~$150** |
  | **Total AI (10K users)** | | | | **~$517.50** |

  **Cost Reduction vs Original Plan:**
  - Original (v3.0 — GLM-4.7-Flash + Flux 2 Flex): €22,850/month
  - v3.1 (Ollama + U-Net + Flux 1 Dev): €1,800/month
  - v3.2 (Mistral Native + BFL API): ~$518/month
  - **Savings vs v3.0: €22,581/month (99% reduction)** ✅
  - **Savings vs v3.1: €1,531/month (85% reduction)** ✅

  **Scaling Economics:**
  | Users | Mistral Small 4 | Mistral Large 3 | Voxtral | Image Gen | Total |
  |-------|-----------------|-----------------|---------|-----------|-------|
  | 10 artists (300 images/month) | ~$1.35 | ~$2.40 | ~$5.00 | ~$4.50 | **~$13.25** |
  | 50 artists (1,500 images/month) | ~$6.75 | ~$12.00 | ~$25.00 | ~$22.50 | **~$66.25** |
  | 100 artists (3,000 images/month) | ~$13.50 | ~$24.00 | ~$50.00 | ~$45.00 | **~$132.50** |
  | 1,000 artists (30,000 images/month) | ~$135 | ~$240 | ~$500 | ~$450 | **~$1,325** |
  | 5,000 artists (150,000 images/month) | ~$675 | ~$1,200 | €150* | ~$2,250 | **~$4,275** |

  **Note:** 
  - *At 5,000+ artists, self-host Voxtral (Apache 2.0) to eliminate voice costs (~€150/month GPU vs ~$500 API)
  - **Image generation stays API-only.** At $0.015/image weighted average, costs remain <1% of revenue even at scale. Self-hosting FLUX would require GPU cluster + DevOps overhead that exceeds savings until 200K+ images/month.
  - Mistral API processes all data in Europe (GDPR-native)
  - BFL API direct for FLUX 2; OpenRouter available as unified fallback
  - No model training or fine-tuning; styles come from reference-guided generation (Style Capsules)

  ### Production Automation Costs (Per Design)

  | Process | Tool | Cost | Time |
  |---------|------|------|------|
  | Design generation | BFL API (FLUX 2 Flex / Pro / Max by complexity) | $0.015 avg | 3-4s |
  | Optimization analysis | Mistral Large 3 (complex designs) | ~$0.001 | 1s |
  | Artwork analysis | Mistral Large 3 (uploaded image critique) | ~$0.010 | <1s |
  | **Color separation** | **OpenCV (K-Means + halftoning)** | **$0** | **<3s** |
  | Halftone generation (per layer) | OpenCV/Python (deterministic) | $0.000 | 3s |
  | PSD export with layers | ag-psd (free) | $0.000 | 2s |
  | PDF placement guide | PDFKit (free) | $0.000 | 1s |
  | Mockup regeneration (5 variants) | Sharp (free) | $0.000 | 5s |
  | Storage (mockups + assets) | Cloudinary | $0 | instant (Free tier: 25GB) |
  | **Total per design (base)** | | **$0.015** | **16s** |
  | **With 1 user refinement** | | **$0.021** | **20s** |

  **Cost Savings vs Manual Production:**
  - Manual color separation + prep: €45/design (1.5 hours)
  - Automated (OpenRouter + OpenCV halftoning): $0.02–0.04/design (16 seconds)
  - **Savings: 99.97% cost reduction + 99.7% time reduction** ✅
  
  **Note:** Signature style comes from Style Capsules (prompt template + curated reference images) on hosted models, not from a fine-tuned model
  - **Savings: 99.9% cost reduction + 99.5% time reduction**

  ### NPM Dependencies

  **Core:**
  ```json
  {
    "dependencies": {
      "next": "^14.0.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "typescript": "^5.3.0",
      "ai": "^4.0.0",
      "ai-elements": "latest",
      "@vercel/ai-sdk": "^4.0.0",
      "node-cron": "^3.0.0",
      
      
      "nexapay": "latest",  // NexaPay primary gateway
      "stripe": "^14.0.0",   // Retained as backup
      "fabric": "^5.3.0",
      "zustand": "^4.4.0",
      "tailwindcss": "^3.4.0",
      "@radix-ui/react-*": "latest",
      "class-variance-authority": "^0.7.0",
      "clsx": "^2.0.0",
      "lucide-react": "^0.294.0"
    },
    "devDependencies": {
      "@types/node": "^20.10.0",
      "@types/react": "^18.2.0",
      "eslint": "^8.55.0",
      "prettier": "^3.1.0",
      
    }
  }
  ```

  ---

  ## 8. Security Considerations

  ### Data Protection
  - All API keys stored in environment variables (never committed)
  - Row-level security enforced via Clerk auth middleware and Drizzle query patterns
  - User data encrypted at rest and in transit
  - Secure file uploads with content-type validation
  - Rate limiting on edge functions

  ### AI Security
  - Prompt injection detection and sanitization
  - Input validation before LLM calls
  - Output validation after LLM responses
  - Conversation history length limits
  - Cost caps per user to prevent abuse

  ### Payment Security
  - PCI DSS compliance via NexaPay (Stripe retained as backup)
  - No direct handling of card data
  - Webhook signature verification
  - Idempotency keys for all transactions
  - Fraud detection via NexaPay (Stripe Radar as backup)

  ### Intellectual Property
  - Design upload screening for obvious copyright violations
  - User terms accepting responsibility for their designs
  - DMCA takedown process
  - Watermarking during preview phase (optional)
  - License agreement acceptance before print

  ### Authentication & Authorization
  - Clerk Auth with email verification, passkeys, and OAuth
  - OAuth providers (Google, GitHub) optional
  - JWT token management
  - Refresh token rotation
  - Session timeout after 7 days of inactivity

  ---

  ## 9. Testing Requirements

  ### Unit Testing
  - AI routing logic (model selection, fallbacks)
  - Intent classification accuracy
  - Print validation functions (DPI, colors, dimensions)
  - Pricing calculations (base, volume, rush)
  - Category preset configurations
  - Conversation state management

  ### Integration Testing
  - BFL API calls for FLUX 2 generation (Flex / Pro / Max by complexity)
  - Drizzle ORM CRUD operations
  - NexaPay payment flows (Stripe backup)
  - Edge function invocations
  - File uploads to S3
  - Real-time updates via Upstash Redis (future)

  ### End-to-End Testing
  - Complete store setup flow
  - Artwork generation with multiple refinements
  - Product creation with generated design
  - Storefront purchase flow
  - Bulk order quote request
  - Payment and order fulfillment

  ### Performance Testing
  - Edge function cold start times
  - Database query performance (<100ms target)
  - Image generation latency
  - Concurrent user load testing
  - CDN cache effectiveness

### AI Quality Testing
   - Intent classification accuracy (>95% target)
   - Conversation coherence over multiple turns
   - Design category preset effectiveness
   - Print specification accuracy
   - Fallback chain reliability

### Browser Automation Testing (agent-browser)
   - **Automated E2E Testing** - Full user journey automation using Vercel's agent-browser CLI
   - **Cross-Browser Testing** - Verify functionality across Chrome, Safari, Firefox, Edge
   - **Network Resilience** - Simulate Slow 3G/4G connections, verify graceful degradation
   - **Console Error Detection** - Zero JavaScript errors policy with automated detection
   - **Accessibility Testing** - Keyboard navigation, screen reader compatibility, ARIA validation
   - **NexaPay Webhook Testing** - Payment flow simulation, failure scenarios, idempotency validation (Stripe backup)
   - **Deployment Smoke Tests** - Post-deploy verification of critical functionality

**Implementation Note:** All browser automation runs in **separate worker services** (CI/CD, background workers) with zero impact on production site performance. See **`Documentation/AGENT_BROWSER_INTEGRATION.md`** for comprehensive implementation plan, timeline, and immediate action items.

---

  ## 10. Documentation Needs

  ### Developer Documentation
  - **Architecture Overview** - System design, data flow, component interactions
  - **API Reference** - All edge functions with request/response examples
  - **Database Schema** - Complete ERD with RLS policies
  - **Model Integration Guide** - How to add/modify AI models and fallbacks
  - **Deployment Guide** - Vercel + Neon + Clerk setup and configuration
  - **Local Development Setup** - Environment setup, running locally, testing

  ### Creator Documentation
  - **Getting Started** - Platform onboarding, first store setup
  - **Design Guide** - How to use AI artwork generation and refinement
  - **Category Reference** - All design categories with examples
  - **Conversation Commands** - Natural language patterns that work well
  - **Bulk Order Guide** - How to request and manage bulk orders
  - **Pricing & Margins** - Understanding costs and profit calculations
  - **Best Practices** - Tips for success, design quality, marketing

  ### Business Documentation
  - **Product Roadmap** - Feature timeline and strategic priorities
  - **Cost Analysis** - Detailed operational cost breakdown
   - **Model Strategy** - Why Mistral Large 3/Small 4 + Voxtral + BFL API (FLUX 2-only image generation)
  - **Scaling Plan** - How costs and performance scale with users
  - **Compliance Guide** - Legal, IP, and regulatory considerations

  ### User Support
  - **FAQ** - Common questions for creators and customers
  - **Troubleshooting** - Solutions for common issues
  - **Video Tutorials** - Walkthrough of key features
  - **API Changelog** - Updates to APIs and breaking changes

  ---

  ## 11. Development Roadmap

  ### Phase 1: MVP Foundation (Weeks 1-4)
  **Goal:** Build core infrastructure with **voice-enabled** conversational interface

  **Deliverables:**
  - Next.js 16 app with TypeScript configured
  - Neon PostgreSQL project with Drizzle ORM schema
  - Clerk Auth (passkeys, magic links, OAuth)
  - **Vercel AI Elements integration (ai-elements + HeroUI)**
  - **Voice + text chat interface using `<Conversation>` + `<PromptInput>` components**
  - **Mistral Voxtral Transcribe 2 integration for voice transcription**
   - OpenRouter integration with Mistral Small 4 for image generation routing
   - Intent classification with Mistral Small 4
   - User profile and store creation
   - Basic product catalog (manual upload)
   - **`<Actions>` component for quick action buttons**

   **Success Metrics:**
   - Auth flow working end-to-end
   - **Voice transcription accuracy >95%**
   - Mistral Small 4 responding accurately to **voice and text** commands
   - Store creation via **voice or text** conversation functional
   - Database queries <100ms

   ### Phase 2: AI Artwork Generation with Voice (Weeks 5-8)
   **Goal:** Implement reference-guided image generation with **voice-powered design refinement**

  **Deliverables:**
  - Design category selector UI
  - Visual style gallery (Style Capsules)
  - Category preset configurations (5+ categories)
   - Reference-guided generation via fal.ai (Nano Banana 2, Seedream 5.0 Pro fallback)
  - **Voice-powered design refinement** ("Make it darker", "Add more distortion")
  - **`<Artifact>` component for design preview display**
  - **`<Workflow>` component for design iteration tracking**
  - Design session management (Neon PostgreSQL via Drizzle)
  - Iterative refinement conversation flow (**voice + text**)
  - Session history and versioning with `<Message>` components
  - S3 integration for image storage
  - **Custom smart search** based on user interaction clusters

  **Success Metrics:**
  - 95% successful artwork generation rate
  - <5s average generation time
  - **Voice design commands work seamlessly**
  - Users can refine designs through **voice or text** conversation
  - Print-quality images (300 DPI) generated

  ### Phase 3: Print-Ready Validation & Mockup System (Weeks 9-12)
  **Goal:** Ensure all designs meet print production standards and generate realistic product mockups

  **Deliverables:**
  - DPI validation system
  - Color separation analysis (spot color detection)
  - Dimension validation for product types
  - Bleed area auto-generation
  - Multi-format export (PNG + PDF/vector)
  - Print specifications database
  - **Fabric.js interactive mockup editor (client-side preview)**
  - **Sharp server-side mockup generation (Vercel Functions)**
  - **Mockup template library (5+ product types, 3+ angles)**
  - **Real-time position adjustment interface**
  - **Cloudinary integration for mockup caching and image optimization**
  - Print preview interface

  **Success Metrics:**
  - 100% of designs validated before production
  - Accurate color count detection
  - Print-ready files exported correctly
  - **Mockup generation success rate >98%**
  - **Mockup generation time <3s per image**
  - **Client preview renders <500ms**

  ### Phase 4: Store & Commerce (Weeks 13-16)
  **Goal:** Enable product sales with **branded storefronts**

  **Deliverables:**
  - Product catalog with generated designs
  - NexaPay payment integration (Stripe retained as backup)
  - **Branded storefront generation (each artist gets isolated store with custom slug)**
  - **AI Elements components reused for customer-facing AI assistant**
  - **`<Suggestion>` components for product recommendations**
  - **`<Task>` components for order tracking**
  - **Artist-specific product display (no cross-store visibility)**
  - Shopping cart and checkout flow
  - Order management system
  - Inventory tracking
  - Email notifications (order confirmations)
  - Basic analytics dashboard

  **Success Metrics:**
  - End-to-end purchase flow working
  - Payment processing successful
  - Order tracking functional
  - **Each branded storefront loads <1s**
  - **Artists can only see/manage their own products**

  ### Phase 5: Bulk Orders & Polish (Weeks 17-20)
  **Goal:** Add bulk ordering and optimize performance

  **Deliverables:**
  - Bulk order quote calculator
  - Color-based pricing logic
  - Volume discount tiers
  - Rush order handling (+25% surcharge)
  - Performance monitoring dashboard
  - AI cost tracking and alerts
  - A/B testing framework
  - Comprehensive documentation

  **Success Metrics:**
  - Automated bulk quotes generated
  - Cost tracking within targets
  - System monitoring operational
  - Documentation complete



  ### Phase 8: Merch Coins Marketing System (Month 7 Post-Launch)
  **Goal:** Enable artist-driven organic growth through social media campaigns

  **Prerequisites:**
  - 100+ active artists on platform
  - Proven product-market fit
  - Stable payment and order systems

  **Deliverables:**
  - **Monthly coin allocation system** (Free: 100, Pro: 500, Studio: 1,000)
  - **Coin balance tracking** in artist dashboard
  - **Distribution interface** (manual winner selection)
  - **Checkout redemption flow** (customers apply coins)
  - **6-month expiry system** with automatic cleanup
  - **Artist analytics** (coins given, redeemed, ROI tracking)
  - **Guardrails:** Max 50% order discount, minimum €10 order
  - **Platform promotion system** (separate from coins)

  **Technical Implementation:**
  ```typescript
  // Database Schema
  CREATE TABLE merch_coin_balances (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    user_type TEXT CHECK (user_type IN ('artist', 'customer')),
    balance INTEGER DEFAULT 0,
    earned_total INTEGER DEFAULT 0,
    spent_total INTEGER DEFAULT 0,
    expires_soon INTEGER DEFAULT 0  -- coins expiring in 30 days
  );

  CREATE TABLE merch_coin_transactions (
    id UUID PRIMARY KEY,
    from_user_id UUID,  -- NULL for monthly allocations
    to_user_id UUID,
    amount INTEGER,
    transaction_type TEXT,  -- 'allocation', 'giveaway', 'redemption', 'expiry'
    reference_id UUID,  -- order_id, campaign_id, etc.
    description TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP
  );

  CREATE TABLE coin_giveaways (
    id UUID PRIMARY KEY,
    artist_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    coins_per_winner INTEGER,
    num_winners INTEGER,
    total_coins_reserved INTEGER,
    platform TEXT,  -- 'twitter', 'instagram', 'email', etc.
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')),
    ends_at TIMESTAMP,
    created_at TIMESTAMP
  );

  // Monthly Allocation (Cron Job - 1st of month)
  async function allocateMonthlyCoins() {
    const artists = await db.query(`
      SELECT id, role FROM users 
      WHERE user_type = 'creator' AND active = true
    `);
    
    const allocations = {
      'free': 100,
      'pro': 500,
      'studio': 1000
    };
    
    for (const artist of artists) {
      const coins = allocations[artist.tier];
      
      await addCoins({
        toUserId: artist.id,
        amount: coins,
        type: 'monthly_allocation',
        description: `${artist.tier} tier monthly allocation`,
        expiresAt: addMonths(new Date(), 6)
      });
    }
  }

  // Checkout Redemption
  async function applyMerchCoins(orderId: string, coinsToUse: number) {
    const order = await getOrder(orderId);
    const customer = await getCoinBalance(order.customerId);
    const artist = await getArtist(order.artistId);
    
    // Validations
    if (customer.balance < coinsToUse) {
      throw new Error('Insufficient coins');
    }
    
    const coinDiscount = coinsToUse * 1.00; // 1 coin = €1
    const artistMargin = order.totalPrice - order.baseCost;
    
    // Max discount is artist's margin
    if (coinDiscount > artistMargin) {
      throw new Error(`Max discount: €${artistMargin.toFixed(2)}`);
    }
    
    // Max 50% of order value
    if (coinDiscount > order.totalPrice * 0.5) {
      throw new Error('Maximum 50% discount with coins');
    }
    
    // Minimum order value €10
    if (order.totalPrice < 10) {
      throw new Error('Coins can only be used on orders over €10');
    }
    
    // Apply discount
    await updateOrder(orderId, {
      coinDiscount: coinDiscount,
      artistRevenue: artistMargin - coinDiscount,
      customerPaid: order.totalPrice - coinDiscount,
      platformRevenue: order.baseCost  // Unchanged
    });
    
    // Deduct coins from customer
    await deductCoins({
      fromUserId: order.customerId,
      amount: coinsToUse,
      type: 'redemption',
      referenceId: orderId,
      description: `Redeemed on order #${order.orderNumber}`
    });
  }
  ```

  **Success Metrics:**
  - Coin distribution rate: >60% of allocated coins distributed
  - Redemption rate: >40% of distributed coins redeemed
  - Social media reach per coin: >50 impressions
  - New customer acquisition via coins: >20% of coin recipients
  - Artist satisfaction: >85% find coins useful
  - Platform cost: €0 (all discounts from artist margin)

  **Artist Dashboard Features:**
  - **Coin Balance Widget:** "You have 247 coins (€247 discount power)"
  - **Quick Actions:** "Create Giveaway", "Reward Customer", "Send to Email List"
  - **Analytics:** "Coins given this month: 80 | Redeemed: 32 | Pending: 48"
  - **Expiry Alerts:** "50 coins expire in 15 days - use them!"
  - **ROI Tracking:** "Coins brought 12 new customers, €340 revenue"

  **Customer Experience:**
  - Receive coins via email: "Artist X gave you 5 Merch Coins!"
  - See balance in account: "You have 15 Merch Coins (€15 off)"
  - Apply at checkout: "Use 10 coins" → Price updates in real-time
  - Expiry reminders: "5 coins expire Feb 1 - shop now!"

  **Platform Promotions (Separate System):**
  - Buy 3 Pay 2 sales (platform absorbs cost)
  - €10 off first order (customer acquisition)
  - Free shipping over €50 (increase AOV)
  - Seasonal sales (Black Friday, etc.)
  - **Cannot stack with Merch Coins** (customer chooses one discount)

  **Monetization:**
  - Built into tier pricing (Pro/Studio get more coins)
  - Future: Coin top-ups (artists buy extra at €1.10 per coin, you keep €0.10)
  - Future: Sponsored campaigns (brands pay artists to distribute coins)

  **ROI for Artists:**
  ```
  Example: Pro tier artist ($20/month, 500 coins)

  Social Campaign: "RT + tag 3 friends = 5 coins"
  - 200 RTs (massive reach)
  - 40 winners × 5 coins = 200 coins distributed
  - 16 redeem (40% redemption rate)
  - 16 orders × €25 = €400 GMV
  - Artist margin: €10/product = €160 gross
  - Coin cost: 16 × €5 = €80
  - Net revenue: €80
  - Plus: 200 RTs, brand awareness, follower growth
  - ROI: €80 net + intangibles for $20/month = massive win
  ```

  ---

  ### Phase 7: AI Store Designer (Months 4-6 Post-Launch)
  **Goal:** Enable artists to fully customize their storefront visuals via conversational AI

  **Prerequisites:**
  - 100+ active artists on platform
  - Product-market fit validated
  - Stable core features

  **Deliverables:**
  - **v0 API integration** (Business Plan: $100/month)
  - **Theme generation engine** using v0-1.5-md model
  - **Preset theme library** (5-7 hand-crafted starting points)
  - **Conversational theme builder** ("Make my store look like a vintage record shop")
  - **Real-time preview system** with iframe rendering
  - **Theme storage and versioning** in Neon PostgreSQL
  - **Content injection system** (artist text/images into generated components)
  - **Pro tier billing** ($20/month for unlimited AI customization)
  - **Quality validation** for generated components
  - **Rollback mechanism** (restore to default theme)

  **Technical Implementation:**
  ```typescript
  // v0 API Integration Example
  async function generateStoreTheme(artistId: string, prompt: string) {
    // Build context-aware prompt
    const fullPrompt = `
      ${prompt}
      
      Requirements:
      - Next.js 16 + TypeScript + Tailwind CSS
      - Must integrate with existing product grid
      - Mobile-first responsive design
      - Accessibility compliant (WCAG 2.1 AA)
      - Generate: hero section, about section, footer
      - Keep navigation and checkout unchanged
      
      Artist: ${artist.name}
      Genre: ${artist.genre}
      Current brand colors: ${artist.colors || 'suggest new palette'}
    `;
    
    // Call v0 API
    const response = await fetch('https://api.v0.dev/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.V0_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'v0-1.5-md', // Medium model ($3/1M in, $15/1M out)
        prompt: fullPrompt,
        temperature: 0.7
      })
    });
    
    const { components, preview_url } = await response.json();
    
    // Validate and store
    await validateTheme(components);
    await saveTheme(artistId, { components, preview_url, prompt });
    
    return { previewUrl: preview_url };
  }
  ```

  **Success Metrics:**
  - Theme generation success rate: >95%
  - Average generation time: <60 seconds
  - Artist satisfaction with themes: >85%
  - Pro tier conversion rate: >30% of active artists
  - Theme customization adoption: >50% of artists use feature
  - v0 API cost per generation: <$0.04 (well below $20/month revenue)

  **Monetization:**
  - **Free Tier:** 3 preset themes, basic color/font customization
  - **Pro Tier ($20/month):** Unlimited v0 generations, full conversational customization, theme variants, A/B testing
  - **Studio Tier ($50/month):** Everything + priority generation, custom CSS injection, performance analytics

  **ROI Calculation:**
  - v0 API cost per theme: ~$0.035
  - Monthly cost for 1,000 artists generating themes: ~$35
  - Revenue from 30% Pro conversion (300 artists): $6,000/month
  - **Profit margin: 99.4%**

  ---
  ### Phase 6: Advanced Features (Post-Launch)
  **Goal:** Enhance platform with PWA and multi-language support

  **Future Enhancements:**
  - **Progressive Web App (PWA) for mobile installation**
    - AI Elements components are already mobile-first and touch-optimized
    - Seamless transition to PWA with existing UI
  - **Multi-language support (voice + text in 10+ languages)**
  - Advanced search refinements with ML
  - Creator community features
  - Design marketplace
  - Mobile app (React Native - likely unnecessary due to PWA quality)
  - Advanced analytics with ML insights
  - Decentralized fulfillment network

  ---

  ### Phase 9: Social Commerce Integration Hub (Month 10+ Post-Launch)
  **Goal:** Enable artists to syndicate their Blackout Merchandise product catalog to Discord, Meta (Instagram/Facebook Shop), TikTok Shop, and Twitch with a few clicks from their dashboard.

  > **Full Specification:** See `Documentation/Dev/SOCIAL_COMMERCE_HUB.md`

  **Prerequisites:**
  - Stable commerce and order systems (Phase 4+ complete)
  - Artist dashboard functional
  - Inventory tracking operational

  **Strategic Vision:**
  Blackout Merchandise becomes the **Social Commerce Operating System** — the single source of truth for creator merchandise, automatically pushing products to 5+ platforms while aggregating orders back into a unified system.

  **Deliverables:**

  **1. Unified Catalog Sync Engine**
  - Central `platformSync` schema per product (tracks sync status per platform)
  - Platform adapter interfaces for each target platform
  - Transform-once, push-everywhere architecture
  - Cross-platform inventory synchronization (prevents overselling)

  **2. Discord Integration (Bot + Activity)**

  > **Full Community Strategy:** See `Documentation/05-Community-Ownership/DISCORD_STRATEGY.md` — covers pre-launch community building, artist networking flywheel, role system, Cat-Suite presence, and the three-stage bot rollout.

  - **Discord Bot:** Slash commands (`/merch drop`, `/merch shop`, `/merch leaderboard`, `/merch collab @artist`)
  - **Embedded Activity:** Interactive storefront in voice/text channels via Discord Embedded App SDK
  - **Cat-Suite Presence:** Leopoldo greets users in Activity; Francisca and Antonia active in community channels
  - **OAuth Flow:** Artists connect Discord server from `/dashboard/integrations`
  - **Revenue Strategy:** Always default to off-site checkout (redirect to Blackout Merchandise direct) — Discord IAP takes 15-30% vs 0% on direct. Embedded Activity is a discovery tool, not a checkout surface.
  - **Monetization Note:** Discord takes 15-30% platform fee + payment processing fees on in-app purchases

  **Three-Stage Rollout:**
  | Stage | When | Focus |
  |-------|------|-------|
  | A — Manual | Pre-launch now | Weekly "Top Drops" digest, leaderboard posts, character posting in Cat-Suite channels |
  | B — Bot MVP | Post-beta | `/merch drop`, `/merch shop`, `/merch leaderboard`, `/merch collab` |
  | C — Embedded Activity | Phase 9 | Full interactive storefront inside Discord via Embedded App SDK |

  **3. Meta Commerce (Instagram + Facebook Shop)**
  - **Catalog Feed Sync:** Products synced to Meta Catalog via Graph API
  - **Sync Frequency:** Full sync every 24h, delta sync every 15min (Meta requirement)
  - **Order Ingestion:** Webhook handler for Meta checkout orders
  - **Product Tagging:** Auto-enabled once catalog synced (for posts/Reels)
  - **Permissions:** `catalog_management`, `commerce_manage_accounts`

  **4. TikTok Shop Integration**
  - **Partner Portal:** Blackout Merchandise registered as TikTok Shop Partner (US + Global)
  - **Products API:** Create/update products via TikTok Open API
  - **Order Sync:** Bidirectional order ingestion and fulfillment status updates
  - **EU Compliance (Dec 2024):** Manufacturer + Responsible Person fields for EU sellers
  - **Rate Limit:** 50 requests/second/store

  **5. Twitch Extension (Engagement Channel)**
  - **Panel Extension:** Persistent merch showcase below stream
  - **Overlay Extension:** "Now Selling" pop-up triggered by streamer
  - **External Link CTA:** "Get It" button redirects to Blackout Merchandise e-shop
  - **Commerce Limitation:** Twitch prohibits external payments in Extensions — used for engagement/redirect only

  **6. Dashboard UX ("Connect Channels")**
  - `/dashboard/integrations` page with platform cards
  - OAuth connect flow per platform
  - Real-time sync status monitoring with error alerts
  - Platform fee transparency (estimated artist net per platform)

  **7. Order Aggregation System**
  - All platform orders flow into unified `orders` table with `source` field
  - Cross-platform inventory sync on order creation
  - Fulfillment status broadcast to all connected platforms

  **Technical Implementation (Drizzle Schema):**
  ```typescript
  // Platform integration tables (Drizzle + Neon)
  import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
  
  export const discordIntegrations = pgTable('discord_integrations', {
    storeId: v.id("artistStores"),
    guildId: v.string(),
    channelId: v.optional(v.string()),
    botToken: v.string(),
    applicationId: v.string(),
    isActive: v.boolean(),
  });

  export const metaIntegrations = defineTable({
    storeId: v.id("artistStores"),
    businessManagerId: v.string(),
    catalogId: v.string(),
    pageId: v.string(),
    instagramAccountId: v.optional(v.string()),
    accessToken: v.string(),
    tokenExpiry: v.number(),
    checkoutOption: v.union(v.literal("onsite"), v.literal("offsite")),
  });

  export const tiktokIntegrations = defineTable({
    storeId: v.id("artistStores"),
    shopId: v.string(),
    sellerId: v.string(),
    region: v.union(v.literal("US"), v.literal("UK"), v.literal("EU")),
    accessToken: v.string(),
    refreshToken: v.string(),
    isAffiliateEnabled: v.boolean(),
  });

  // Product sync status
  export const products = defineTable({
    // ... existing fields ...
    platformSync: v.optional(v.object({
      discord: v.optional(v.object({
        skuId: v.string(),
        status: v.union(v.literal("synced"), v.literal("pending"), v.literal("error")),
      })),
      meta: v.optional(v.object({
        productId: v.string(),
        status: v.union(v.literal("synced"), v.literal("pending"), v.literal("error")),
      })),
      tiktok: v.optional(v.object({
        productId: v.string(),
        status: v.union(v.literal("synced"), v.literal("pending"), v.literal("error")),
      })),
    })),
  });
  ```

  **Pricing Model (Artist Revenue Protection):**
  - Blackout Merchandise uses **fixed base costs** (tees €15, hoodies €25+)
  - Artists set their own retail price and keep the spread
  - Platform fees are deducted from **artist net**, never from Blackout Merchandise base cost
  - **Strategy:** Always prefer off-site checkout (redirect to Blackout Merchandise e-shop) to maximize artist margins

  **Platform Fee Impact Example (€35 Tee):**
  | Platform | Fee | Artist Net |
  |----------|-----|------------|
  | Blackout Merchandise Direct | 0% | €20 |
  | TikTok Shop (~5%) | €1.75 | €18.25 |
  | Meta Checkout (~5%) | €1.75 | €18.25 |
  | Discord IAP (15-30%) | €3-6 | €14-17 |

  **Timeline (17 Weeks Post-Launch):**
  | Sub-Phase | Duration | Focus |
  |-----------|----------|-------|
  | 9.0 Foundation | Week 1-2 | Schema, adapters, integration tables |
  | 9.1 Discord | Week 3-5 | Bot + Activity MVP |
  | 9.2 Meta | Week 6-8 | Catalog sync, order webhook |
  | 9.3 TikTok | Week 9-11 | Products API, order sync |
  | 9.4 Twitch | Week 12-13 | Panel/Overlay extension |
  | 9.5 Dashboard | Week 14-15 | Connect Channels UI |
  | 9.6 Order Aggregation | Week 16-17 | Unified ingestion, inventory sync |

  **Success Metrics:**
  - Platform connection rate: >30% of active artists connect at least one platform
  - Catalog sync success rate: >98%
  - Cross-platform order attribution: Accurate tracking of order source
  - Inventory sync accuracy: Zero oversells due to sync delays
  - Artist satisfaction: >85% find integration valuable

  ---

  ## 12. Logical Dependency Chain

  ### Critical Path (Must Build in Order)

  **1. Foundation Layer** *(Week 1-2)*
  - Neon PostgreSQL setup + Drizzle schema
  - Next.js app with TypeScript
  - Environment configuration
  - Basic auth flow
  → *Required for everything else*

   **2. AI Integration Layer** *(Week 2-3)*
   - OpenRouter API integration
   - Mistral Small 4 conversation handling
   - Intent classification
   → *Required for conversational interface*

   **3. Basic Conversation UI** *(Week 3-4)*
   - Chat interface component
   - Message history
   - Store creation flow
   → *First usable feature, demonstrates value*

   **4. Design Generation System** *(Week 5-7)*
   - Category presets
   - Reference-guided generation via fal.ai (Nano Banana 2)
   - Visual style gallery (Style Capsules)
   - Design session management
   → *Core differentiator, parallel to commerce*

  **5. Print Validation** *(Week 8-9)*
  - DPI/color/size checks
  - File export system
  → *Required before production*

  **6. Commerce Infrastructure** *(Week 10-13)*
  - Product catalog
  - NexaPay integration (Stripe retained as backup)
  - Storefront generation
  → *Enables revenue*

  **7. Order Management** *(Week 14-15)*
  - Order processing
  - Inventory tracking
  - **Supplier Stock Sync (WATC Studio API)**

  → *Required for fulfillment*

  **8. Bulk Orders** *(Week 16-18)*
  - Quote calculator
  - Volume pricing
  → *Additional revenue stream*

  **9. Optimization** *(Week 19-20)*
  - Monitoring
  - Cost tracking
  - Performance tuning
  → *Ensures sustainability*

  ### Parallelizable Work
  - **UI Components** can be built alongside backend (Week 1-20)
  - **Documentation** can be written continuously (Week 1-20)
  - **Design mockup system** independent of AI (Week 8-10)
  - **Analytics dashboard** can be built after data collection starts (Week 14-16)

  ### Pacing Strategy
  - **Weeks 1-4:** Foundation + basic conversation (get to working demo fast)
  - **Weeks 5-8:** AI artwork (core value proposition)
  - **Weeks 9-12:** Print validation (production readiness)
  - **Weeks 13-16:** Commerce (revenue generation)
  - **Weeks 17-20:** Bulk + optimization (scale and efficiency)

  Each milestone delivers incremental value while building toward complete platform.

  ---

  ## 13. Risks and Mitigations

  ### Technical Risks

  **Risk: OpenRouter/Model API Downtime**
  - **Impact:** Platform functionality degraded
  - **Likelihood:** Medium
  - **Mitigation:** 
    - Multi-tier fallback chains for each model type
    - Graceful degradation (manual input fallback)
    - Status page monitoring for OpenRouter
    - Cache recent responses for retry logic
    - Alternative: Direct API integration with Anthropic as backup

   **Risk: Generated Output Quality Inconsistency**
  - **Impact:** Generated designs not print-ready
  - **Likelihood:** Medium (hosted models, quality depends on prompts and reference images)
  - **Mitigation:**
    - Comprehensive validation layer before presenting to user
    - Fallback to Seedream 5.0 Pro if Nano Banana 2 output fails
    - Improve Style Capsule reference images and prompts from customer feedback
    - Option to upload own artwork as fallback
    - Human review queue for edge cases
    - Collect feedback to tune prompts over time
    - Budget for alternative models (base FLUX 2 Flex) as fallback

  **Risk: Vercel/Neon Service Limits**
  - **Impact:** Performance degradation at scale
  - **Likelihood:** Low (generous limits on Pro plans)
  - **Mitigation:**
    - Monitor usage dashboards weekly
    - Optimize queries and edge functions proactively
    - Implement caching aggressively
    - Plan upgrade path if approaching limits
    - Consider enterprise plans for predictable scaling

  **Risk: Print Validation False Positives/Negatives**
  - **Impact:** Designs rejected incorrectly or bad designs approved
  - **Likelihood:** Medium (complex computer vision problem)
  - **Mitigation:**
    - Human review option for rejected designs
    - Confidence scoring on validations
    - Continuous improvement with real print outcomes
    - Override mechanism for experienced creators
    - Partner with print experts for ground truth data

  ### 12.1 Riskiest Assumptions Matrix

  | Assumption | Risk Level | How We Test (Validation) | Kill Criteria (Red Flag) | Pivot Option |
  | :--- | :--- | :--- | :--- | :--- |
  | **1. UX Intuitiveness**<br>(Proactive UI > Passive Dashboard) | **Low**<br>(Mitigated) | **Design is Guided, not Open-Ended.** The AI leads with options (cards, buttons) rather than waiting for text. Users just "react" rather than "initiate." Validation: Monitor click-through rate on proactive suggestions. | Users stop engaging when AI asks open-ended questions. | **Reinforce Shortcuts:** Increase prominence of visual menu for common tasks. |
  | **2. Value Proposition**<br>(Premium Quality @ Standard Price) | **Medium** | **Price Parity, Quality Superiority.** We sell for €30 (standard venue price), but give a €50 quality shirt. Risk is artists lowering price to €20 and eroding margin. Validation: Monitor average retail price set by artists. | Average artist markup drops below 20% (indicating they feel forced to race-to-the-bottom). | **Education & Niche Focus:** Double down on "Buy Less, Buy Better" messaging. Disqualify budget-focused artists early. We do NOT compromise on quality to compete on price. |
  | **3. Expansion Scalability**<br>(Quality relies on Systems, not Heroes) | **Low** | **Expert is Support, NOT Lead.** Expansion relies on the "Blackout Merchandise Playbook" and a hired Ops Manager, not Expert's daily presence. Validation: Document 100% of SOPs by Month 12. | Brazil hub fails quality audits despite following SOPs. | **Founder Deployment:** Victor relocates to Brazil for 3 months to retrain/restructure personally. |
  | **4. AI Reliability & Failure Value**<br>(Failures improve prompts and rules) | **Low**<br>(Mitigated) | **The "Frustration Protocol":** Repeated user edits trigger auto-handoff to Human Designer (Brazil Agency). Every manual fix is reviewed to improve prompts, Style Capsule references and print-prep rules (no model training). | Human intervention rate exceeds 30% (unsustainable agency cost). | **Scale Human Layer:** If AI struggles, we simply treat the "Human Desk" as a core feature (charging a small fee for "Pro Design Support") while prompts and references improve. |
  | **5. Portugal Logistics**<br>(Shipping Competitiveness from PT) | **Low** | **Contract Leverage:** We don't pay consumer rates. Contracts with DHL/DPD provide competitive flat rates across EU Zones. Network effects mean costs *decrease* as we scale. Validation: Compare DPD Zone 1 rate vs Printful Local. | Shipping costs exceed competitor total landed cost by >20%. | **Dynamic Carrier Aggregation:** Integrate multi-carrier API (Packlink/SendCloud) to algorithmically select the cheapest route per package if single-contract rates fail. |

  **Key Definitions:**
  - **Kill Criteria:** The specific metric that tells us "This hypothesis is wrong, stop now."
  - **Pivot Option:** The pre-planned "Plan B" so we don't panic if the assumption fails.

  ### 12.2 Business Risks

  **Risk: AI Costs Exceed Projections**
  - **Impact:** Negative unit economics, unprofitable platform
  - **Likelihood:** Medium
  - **Mitigation:**
    - Real-time cost tracking per user/session
    - Automatic alerts at 80% of budget
    - Rate limiting per user (e.g., 10 designs/day)
    - Tiered pricing model if costs remain high
    - Continuous optimization of prompts to reduce tokens

  **Risk: Low Creator Adoption**
  - **Impact:** Insufficient revenue to sustain operations
  - **Likelihood:** Medium (new platform, unproven market fit)
  - **Mitigation:**
    - Early beta program with target creators
    - Aggressive user feedback loops
    - Flexible pivot capability (architecture supports changes)
    - Partnership with creator communities (Bandcamp, etc.)
    - Content marketing and creator success stories

  **Risk: Print Quality Issues Damage Reputation**
  - **Impact:** Negative reviews, churn, refunds
  - **Likelihood:** Medium (quality control at scale is hard)
  - **Mitigation:**
    - Rigorous QA process for every order
    - Sample approval process for first orders
    - Generous refund/reprint policy
    - Creator guidelines for design quality
    - Regular supplier audits and quality checks

  **Risk: Intellectual Property Disputes**
  - **Impact:** Legal liability, DMCA takedowns, platform reputation
  - **Likelihood:** Medium (user-generated content always risky)
  - **Mitigation:**
    - Clear ToS assigning liability to creators
    - Basic design screening (reverse image search)
    - DMCA compliance process
    - Legal insurance coverage
    - Quick takedown mechanism for reported violations

  ### MVP Scoping Risks

  **Risk: Over-Engineering Early Features**
  - **Impact:** Delayed launch, wasted resources
  - **Likelihood:** High (developer tendency)
  - **Mitigation:**
    - Strict "MVP only" discipline
    - Timeboxed sprints with hard deadlines
    - Accept technical debt in non-critical paths
    - Regular "ship it" checkpoints
    - Prioritization framework (must-have vs. nice-to-have)

  **Risk: Underestimating Design System Complexity**
  - **Impact:** Poor artwork quality, user frustration
  - **Likelihood:** Medium
  - **Mitigation:**
    - Start with 3 proven categories (expand later)
    - Extensive testing with real creators
    - Iterate based on feedback, not assumptions
    - Option to upload own artwork bypasses complexity
    - Partner with designers for prompt engineering

  **Risk: Scope Creep from User Feedback**
  - **Impact:** Never shipping, feature bloat
  - **Likelihood:** High
  - **Mitigation:**
    - "Phase 2" parking lot for all new ideas
    - Strict feature freeze 2 weeks before launch
    - Product owner with veto power
    - Regular roadmap reviews (monthly)
    - Measure feature usage before building more

  ### Resource Risks

  **Risk: Solo Developer Bandwidth**
  - **Impact:** Slower development, burnout
  - **Likelihood:** High
  - **Mitigation:**
    - Ruthless prioritization (cut features, not quality)
    - Outsource non-core work (UI design, documentation)
    - Use pre-built components (HeroUI, Radix)
    - Automate testing and deployment
    - Realistic timeline with buffer (20 weeks, not 12)

  **Risk: Unexpected Technical Challenges**
  - **Impact:** Timeline delays, frustration
  - **Likelihood:** High (always happens)
  - **Mitigation:**
    - 30% time buffer in estimates
    - Weekly risk assessment and replanning
    - Simplify features when blocked (MVP mindset)
    - Community support (Discord, forums, consultants)
    - Document challenges for future learning

  ---

  ## 14. Success Metrics & KPIs

  ### Financial Metrics (Target: Month 6 Post-Launch)
  - Monthly operational costs: $250-400 (excluding transaction fees)
  - Monthly revenue: $10,000+ (from 1,000+ products sold)
  - Gross margin: >90% (after production costs, before fixed costs)
  - AI cost per user session: <$0.10
  - Customer acquisition cost (CAC): <$50
  - Lifetime value (LTV): >$500
  - LTV/CAC ratio: >10:1

  ### User Experience Metrics
  - **Conversation Quality:**
    - Intent classification accuracy: >95%
    - Conversation success rate: >90% (user achieves goal)
    - Average messages to complete task: <8
    - Model fallback rate: <5%

  - **Design Generation:**
    - First-time generation success: >95%
    - Average refinements per design: 2-3
    - User satisfaction with final design: >85%
    - Time to final design: <10 minutes

  - **Platform Usability:**
    - Store setup completion rate: >80%
    - Time to first product listed: <20 minutes
    - Storefront visit to purchase: >5%
    - Repeat purchase rate: >25%

  ### Technical Performance Metrics
  - **Latency:**
    - API response time (cached): <100ms
    - Mistral Small 4 conversation response: <500ms
    - Mistral Large 3 complex instruction response: <1s
    - FLUX 2 Pro generation: <4s, FLUX 2 Flex: <3s
    - Mistral Small 4 response: <500ms
    - Page load time: <1s
    - Edge function cold start: <500ms

  - **Reliability:**
    - System uptime: >99.9%
    - API error rate: <0.5%
    - Database query success: >99.5%
    - Payment processing success: >99%

  - **Efficiency:**
    - Database queries per page: <10
    - Cache hit rate: >80%
    - CDN cache hit rate: >90%
    - Vercel function invocations: <1M/month

  ### Business Growth Metrics
  - **Creator Metrics:**
    - Monthly new creator signups: Track trend
    - Creator activation rate (1+ product): >60%
    - Average products per active store: >8
    - Monthly active creators: >50 (Month 6)

  - **Sales Metrics:**
    - Total products listed: >500 (Month 6)
    - Monthly gross merchandise volume (GMV): >$50K (Month 6)
    - Average order value: >$40
    - Bulk order conversion: Track and optimize

  - **Engagement Metrics:**
    - Daily active users (DAU): Track trend
    - Weekly active users (WAU): Track trend
    - Average session duration: >5 minutes
    - Designs generated per user per week: >2

  ### AI Cost Efficiency Metrics (v3.1 - Updated)
    - **Model Usage:**
      - % requests to Mistral Small 4 (simple queries): ~70%
      - % requests to FLUX 2 Flex (API): ~70%
      - % requests to Mistral Large 3 (vision/image analysis): ~5%
      - % requests to OpenCV (halftoning): ~100% (deterministic, $0)

    - **Cost Tracking:**
      - AI cost per simple conversation: ~$0.0001 (Mistral Small 4)
      - AI cost per design generation: ~$0.02–0.04 (OpenRouter + Mistral Large 3 vision)
      - Total AI costs per user per month: <$1
      - AI cost as % of revenue: <2% (at scale)
      
    - **Cost Comparison:**
      - **MVP (100 artists):** €550/month (vs €1,800 old) = **69% savings**
      - **Scale (1,000 artists):** €1,350/month (vs €1,800 old) = **25% savings**
      - **Year 2 (self-hosted):** €300/month (vs €1,800 old) = **83% savings**

  ---

  ## 14. Production Contingency Plans

  ### 14.1 Scenario: Viral PoD Spike (Single Unit Orders)
  **Trigger:** 1,000+ individual orders received in 24h (Exceeds daily internal capacity of ~300-500 units).

  **Metric Reality Check:**
  - **Constraint:** Brother GTXpro B (~75s/print avg, high-speed mode) = ~540 units/10h shift.
  - **Backup:** TexPro Series 2 (~4 min/print) = ~150 units/10h shift.
  - **Total Internal Capacity:** ~300-500 units/day (realistic operational capacity).
  - **Bottleneck:** Finishing/packing (not printing speed).

  **Response Strategy (72h Shipping Turnaround):**
  - **Day 1 (The Spike):**
    - Instant implementation of **"Dynamic Shipping Windows"**: New orders automatically update to "Ships in 5-7 days" once the 72h capacity bucket (1,800 units) is full.
    - **Activate Extended Shifts:** Run 14-16h shifts to push daily output to ~850 units.
  - **Day 2 (The Equipment Scaling):**
    - **Purchase Order Trigger:** If volume sustains >800/day for 48h, order a **Second Brother GTXpro B**.
    - **Benefit:** 2-day delivery time to Portugal. Cashflow from the spike covers the down payment/purchase immediately.
  - **Day 3 (The Overflow):**
    - While waiting for the new machine, route overflow to **Barcelos Partner Network** (only for "Standard" designs).

  ### 14.2 Scenario: Viral Bulk "Drop" (The 5,000 Unit Pre-Order)
  **Trigger:** A major influencer drops a collection, selling 5,000 units in 48h.

  **Metric Reality Check:**
  - **Main Engine:** Anatol VOLT-M = 2,500 prints/day (conservative).
  - **Secondary Engine:** Semi-Auto Press = 500 prints/day.
  - **Total Internal Capacity:** ~3,000 prints/day.
  - **The Bottleneck:** *Not* printing. The bottlenecks are **Stock Availability** and **Finishing/Packing**.

  **Response Strategy:**
  - **Inventory Logistics:**
    - **WATC Studio Direct Supply:** We leverage direct relationship with **WATC Studio (Barcelos, Portugal)** to verify real-time stock availability via API, then coordinate express local shipping to restock up to 5,000 units in **48 hours** (domestic supply chain advantage).
  - **Algorithmic Expectation Management (The "Francisca" Rule):**

    - Instead of fixed promises, the system dynamically adjusts the "Ships In" window based on real-time SKU velocity:
      - **>100 units sold/24h:** +1 Day Shipping Turnaround
      - **>500 units sold/24h:** +2 Days Shipping Turnaround
      - **>1,000 units sold/24h:** +3 Days Shipping Turnaround
    - *Result:* Customers get transparent, realistic timelines immediately, reducing support tickets.
  - **Production Sprint:**
    - 5,000 units = **2 days of printing** at full capacity. This fits perfectly within the adjusted 5-7 day window even with 48h blank delivery time.
  - **The Real Bottleneck (Packing):**
    - **Hire Temporary Staff:** Activate a pre-vetted pool of local packers (students/part-time) to handle folding/tagging/shipping.

  ### 14.3 Scenario: Critical Equipment Breakdown
  **Trigger:** Main automatic press (Anatol VOLT-M) suffers catastrophic part failure (e.g., servo driver board) needing 2 weeks for replacement.   

  **Contingency Plan (Redundancy Layers):**
  - **Layer 1: The "Blackout" Backup (Internal):**
    - Switch production to the **existing Semi-Automatic 8-Color Press** (from Blackout Merchandise assets).
    - *Impact:* Throughput drops from ~500/hr to ~100/hr.
    - *Action:* Prioritize "Rush" and VIP orders.
  - **Layer 2: Digital Pivot (Internal):**
    - Shift applicable designs (full color/gradients) to **Brother GTXpro B (DTG/DTF)**.
    - *Note:* Notify customers of "Free Digital Upgrade" (often perceived as premium for detail, though slower for bulk).
  - **Layer 3: Local Offload (External):**
    - Activate the "Neighbor Network." In Barcelos, we are surrounded by industrial printers.
    - *Protocol:* Victor personally oversees QC at partner facility to maintain the "Blackout Merchandise Standard."

  **Prevention Strategy:**
  - **Spare Parts Kit:** Hold critical spares (relays, sensors, print heads) on-site (Value: ~€2k investment).
  - **SLA:** Purchase "Gold Support" from equipment vendor for 48h part dispatch.

  ### 14.4 The "Neighbor Network" Vetting Standard (Quality Assurance)
  To ensure outsourced orders (Scenario 1 & 2) are indistinguishable from in-house production:

  1.  **The "Magna Mandate":** Partners must agree to use **Magna Colours HB** (Water-based) inks. If they don't stock it, *we supply the ink kits* for our jobs. Zero tolerance for Plastisol substitution.
  2.  **The "First Pull" Protocol:** For any overflow batch >100 units, a Blackout Merchandise Quality Manager (or Victor) must physically visit the partner facility to sign off on the first printed unit (registration, cure, hand feel) before the run proceeds.
  3.  **Blind Logistics:** We supply the blanks and the shipping labels. The partner functions solely as a labor unit; they never interact with shipping software or branding.
  4.  **The "Ghost" Audit:** Twice a year, we run a test "Ghost" order (fake customer) to verify their unmonitored quality and pack presentation.

  ### 14.5 Operational Excellence: The "Palmprint" Standard
  To guarantee the Anatol VOLT-M operates at theoretical limits from Day 1, we have budgeted for **Tony Palmer (@palmprint)**—the global reference for automatic press optimization—to conduct a 3-day on-site certification in Barcelos.

  **Value to Investors:**
  - **De-Risking:** Removes the "learning curve" of new equipment. We don't guess; we execute best practices immediately.
  - **Maximized ROI:** Ensures the expensive machinery hits its 500-800 unit/hour target, rather than idling at 50% efficiency due to operator skill gaps.
  - **Predictive Maintenance:** Training includes specific protocols to prevent the mechanical failures listed in Scenario 14.3.

  ---

  ## 8.5 Exit Strategy

  > **Primary Goal:** Deliver strong returns for investors through strategic acquisition or sustainable profitability.

  ### 8.5.1 Primary Exit Path (3-5 Years)

  **Target: Acquisition by Fyul/Gelato** — €15-25M

  **Rationale:**
  - Fyul merger shows consolidation appetite in POD sector
  - Needs premium differentiation to compete with dominant player
  - In-house production capability (they lack)
  - Print-production workflow IP (color separation, print prep)

  **Trigger Events:**
  - 100+ active artists, €100K MRR
  - Established waitlist (500+ qualified)
  - Production SOPs documented and replicable
  - Verified unit economics (60%+ gross margins at scale)

  ### 8.5.2 Secondary Exit Path (4-6 Years)

  **Target: Acquisition by Creative Tool Company** — €12-30M

  **Potential Acquirers:**

  | Acquirer | Probability | Valuation Range | Strategic Fit |
  |-----------|--------------|------------------|----------------|
  | **Canva** | MEDIUM | €12-25M | Affinity acquisition shows physical expansion interest; €2B revenue, needs commerce layer |
  | **Adobe** | LOW-MEDIUM | €15-30M | Creative ecosystem gap; could add physical fulfillment to Creative Cloud |
  | **Figma** | MEDIUM | €8-18M | Design platform with creator community; natural extension to commerce |
  | **Vercel** | LOW | €5-12M | Infrastructure play; wants creator monetization stack |

  **Rationale:**
  - AI-first platform aligns with creative tool trend
  - Physical fulfillment extends design tool offering
  - Creator economy data valuable to design platforms

  ### 8.5.3 Alternative: Strategic Investment

  **Target: Strategic Minority Investment** — €3-5M for 10-20% equity

  **Potential Investors:**
  - European creator economy funds (e.g., Partech, Speedinvest)
  - Climate/impact investors (ethical positioning focus)
  - AI-focused VCs (multi-agent systems)

  **Rationale:**
  - Later-stage capital without full exit
  - Maintains founder control
  - Funds production scale without dilution

  ### 8.5.4 Independence Option

  **Target: Profitable Bootstrap** — No exit

  **Requirements:**
  - Sustained 60%+ gross margins
  - €120K+ MRR by Year 4
  - Production team operational without founder
  - Positive cash flow for 18+ months

  **Advantages:**
  - Full control over company direction
  - No investor dilution
  - Long-term founder lifestyle business

  ### 8.5.5 Comparable Exits (Market Context)

  | Acquired | Year | Valuation | Strategic Insight |
  |---------|------|-----------|------------------|
  | **Printful** | 2021 | $1B+ | $130M raise at 8-year mark, established POD dominance |
  | **Gelato** | Active | Undisclosed | Named Fast Company's "Most Innovative 2025" for AI |
  | **Redbubble/Spring** | 2013-2016 | $30-50M | Public marketplaces, platform model exit |
  | **Canva** | 2024 | €Several hundred million | Strategic creative tool acquisition path |
  | **Shopify** | 2022 (Deliverr) | Undisclosed | Platform expansion via acquisition |

  **Our Positioning:**
  - Premium B2C AI platform with production asset
  - Ethical-first positioning aligns with ESG investing trends
  - Founder credibility (9-year craft + triple-threat skillset)
  - €113K production infrastructure de-risks platform failure

  **Valuation Outlook:**
  - At 100 artists + €50K MRR: €2-3M pre-money (conservative)
  - At 300 artists + €120K MRR: €5-8M pre-money (growth trajectory)
  - At profitability (Year 4-5): €8-15M pre-money (established business)

  ---

  ---

  ## 15. Future Expansion Opportunities

  ### Near-Term (Months 7-12)

  **Progressive Web App:**
  - PWA implementation for mobile installation
  - Offline capabilities for browsing
  - Push notifications for orders
  - Home screen installation

  **Multi-Language Support:**
  - Voice + text in 10+ languages (Spanish, Portuguese, French, German, etc.)
  - Localized UI and content
  - Multi-language voice commands
  - Translation for storefronts

  **Enhanced Personalization:**
  - Advanced ML-based design recommendations
  - Predictive artist/band suggestions
  - Genre-based clustering improvements
  - Creator performance insights

  ### Mid-Term (Year 2)

  **Merch Coins Enhancements (Post Phase 8):**
  - **Customer Loyalty Program:** Customers earn 10% back in coins on purchases
  - **Coin Top-Ups:** Artists can purchase additional coins (€1.10 per coin)
  - **Automated Giveaway Tools:** Twitter/Instagram API integration for auto-winner selection
  - **Artist Collaboration Pools:** Multiple artists combine coins for joint campaigns
  - **Sponsored Campaigns:** Brands pay to distribute coins to specific artist demographics
  - **Public Giveaway Pages:** Embeddable contest pages with email capture
  - **Leaderboards:** "Top coin givers this month" for artist recognition
  - **QR Codes:** Print QR codes for in-person coin distribution (concerts, events)
  - **Advanced Analytics:** Track social reach, conversion rates, customer LTV from coins

  **AI Store Designer Enhancements (Post Phase 7):**
  - **"Design Like" feature** - "Make my store look like Spotify"
  - **Genre-based auto-themes** - AI detects music genre, suggests matching aesthetics
  - **Seasonal theme switching** - Halloween, Christmas, summer variants
  - **Theme marketplace** - Artists sell their custom themes (30% platform fee)
  - **A/B testing** - Test multiple themes, auto-select highest converting
  - **Competitor analysis** - Paste competitor URL, AI generates similar but unique theme
  - **Advanced customization** - Custom CSS injection for power users
  - **Component library** - Mix and match AI-generated components

  **Decentralized Fulfillment:**
  - Partner network of local print shops
  - Regional inventory distribution
  - Faster shipping, lower costs
  - Support for touring artists

  **Creator Marketplace:**
  - Design element sharing/selling
  - Template marketplace
  - Collaborative designs
  - Revenue sharing for designers

  **Platform Integrations:**
  - Bandcamp seamless merch drops
  - SoundCloud store embeds
  - Patreon exclusive offerings
  - Shopify import/export

  **Advanced AI Features:**
  - Style transfer for existing designs
  - AI-powered design optimization for prints
  - Predictive inventory recommendations
  - Automated marketing copy generation

  ### Long-Term (Year 3+)

  **International Expansion:**
  - Multi-language AI conversations (10+ languages)
  - Regional fulfillment centers
  - Local payment methods
  - Currency localization

  **Community Features:**
  - Creator forums and knowledge base
  - Mentorship program
  - Design contests and showcases
  - Collaborative stores

  **White-Label Enterprise Platform:**

  **Vision:** "Shopify of ethical merchandise" - enable labels, agencies, and event companies to manage multiple artists under their own brand.

  **Target Customers:**
  - **Record Labels** (10-50 artist rosters) - Consistent merch strategy across talent
  - **Artist Management Companies** - Centralized tour merch coordination
  - **Festival/Event Organizers** - Multi-artist merchandise at venues
  - **Streetwear/Fashion Brands** - Limited drops with ethical sourcing credentials
  - **Corporate Brands** - Employee merchandise programs with sustainability focus

  **Monetization Tiers:**

  1. **White-Label SaaS** (€2,000-5,000/month)
    - Custom domain (merch.recordlabel.com)
    - Agency/label branding (remove Blackout Merchandise logos)
    - Centralized admin dashboard for roster management
    - Bulk ordering interface for tours
    - Custom API access
    - Dedicated account manager

  2. **Full-Service Managed** (€10,000+/month + rev share)
    - Everything in Tier 1 +
    - Dedicated design team for artist consultations
    - Tour logistics coordination
    - Inventory management and forecasting
    - White-glove onboarding for new roster artists
    - Priority production (rush orders included)

  3. **Partnership/Licensing Model**
    - Client runs own branded platform
    - License tech + provide fulfillment
    - Revenue split: 30% platform / 70% partner
    - Full customization of UI/UX

  **Core Features:**
  - **Multi-tenant architecture** with isolated databases per client
  - **Agency Admin Dashboard:**
    - Roster management (add/remove artists)
    - Consolidated analytics across all artists
    - Bulk order module (tour merch for entire roster)
    - Inventory forecasting and planning
    - Revenue reports (per artist + aggregate)
    - Quality control queue
  - **Artist-facing tools:** Same AI design capabilities, branded for agency
  - **Revenue sharing:** Auto-calculated splits (artist 60%, label 20%, platform 20%)
  - **SSO integration** for agency employee access

  **TAM Expansion:**
  - Individual artists: 200M creators globally = $50B market
  - B2B white-label: 10K+ labels/agencies/events = $5B adjacent market
  - **Total addressable market: $55B+**

  **Roadmap:**
  - **Phase 1 (Month 12-18):** Validate demand via waitlist surveys and label interviews
  - **Phase 2 (Month 18-24):** Pilot program with 1-2 indie labels, manual setup
  - **Phase 3 (Month 24-30):** Build self-service white-label onboarding and multi-tenant architecture
  - **Phase 4 (Year 3+):** Enterprise sales team targeting major labels, festivals, corporate brands

  **Prerequisites:**
  - 100+ individual artists proven and satisfied
  - 200-500 orders/week fulfillment capacity
  - Dedicated support infrastructure for enterprise clients

  **Success Metrics:**
  - 5+ white-label clients by end of Year 3
  - €100K+ MRR from enterprise tier alone
  - 30+ artists per white-label client average
  - <10% enterprise client churn annually

  **Sustainability Initiative:**
  - Carbon-neutral shipping options
  - Recycling program for old merch
  - Sustainability dashboard for creators
  - Eco-certification program

  ---

  ## 4. Data Architecture & Logging Logic (The "Brain" Strategy)

  ### 4.1 Interaction Logging Strategy
  Interactions with the Cat-Suite (Leopoldo, Francisca, Antônia) are logged so prompts, Style Capsules and agent behaviour can be reviewed and improved. Logs are not used to train or fine-tune models; all models are used through hosted APIs.

  **The Loop:**
  1. **Interaction:** User chats with AI.
  2. **Logging:** Raw interaction stored in `ai_interactions`.
  3. **Evaluation:**
    - **Implicit:** User accepts the suggestion (e.g., "Add to Cart") -> Positive Signal.
    - **Explicit:** "This isn't what I meant" / Retry -> Negative Signal.
  4. **Review:** Negative signals are reviewed to adjust prompts, reference images and agent instructions.

  ### 4.2 Database Schema (Drizzle ORM + Neon PostgreSQL)

  We use a structured logging schema so conversations can be reviewed and debugged.

  **`chat_sessions`**
  *Context isolation per user. All AI conversations stored as JSONB messages array.*
  - `id`: UUID (PK)
  - `user_id`: UUID (FK → `users.id`)
  - `messages`: JSONB (Array of `{ role, content, model, timestamp, metadata }`)
    - `metadata` includes: token usage, latency, model_id, tools_called, image_gen_params
  - `created_at`, `updated_at`: Timestamp

  **`users`**
  *User profiles synced from Clerk.*
  - `id`: UUID (PK)
  - `clerk_id`: Text (FK to Clerk — **not** `auth.users`)
  - `email`, `display_name`, `image_url`: Text
  - `role`: Enum (`artist`, `customer`, `admin`)
  - `nexapay_customer_id`, `nexapay_wallet_id`: Text (NexaPay primary)
  - `stripe_customer_id`, `stripe_connect_id`: Text (retained as backup)
  - `created_at`, `updated_at`: Timestamp

  ### 4.3 Async Logging Workflow

  To ensure **zero latency** for the user, logging happens in the background within the API route.

  1. **Client Side:** User sends message.
  2. **Next.js API Route (`/api/chat`):**
     - Call LLM (Mistral Small 4 or Large 3 based on complexity).
     - Stream response to User (User sees text immediately).
     - **Background:** After stream completes, update `chat_sessions.messages` via Drizzle with full metadata.
  3. **No separate edge functions needed** — everything runs in the same Vercel serverless context.

  ---

  ## 16. Defensibility & Moats (The "Anti-Copy" Strategy)

  **The Scenario:** A major incumbent (Printful/Printify) launches an AI Design tool in 6 months.
  **The Defense:** Why Blackout Merchandise wins.

  ### 16.1 The Curation Moat: Curation > Volume
  **Them:** Generic text-to-image output that regresses to the "average."
  **Us:** **Style Capsules**: prompt templates plus curated style reference images, with one anchor image attached to each generation call on hosted models.
  - **Taste is Hard to Copy:** Curating the reference library and the print-prep rules takes printing experience, not more compute.
  - **Result:** We don't output "designs"; we output "cool."

  ### 16.2 The Emotional Moat: "Leopoldo" vs. "The Dashboard"
  **Them:** A utility tool. Cold, efficient, silent.
  **Us:** A **Relationship**.
  - Users bond with Leopoldo & Francisca. The "Cat-Suite" has personality, humor, and opinions.
  - **Switching Cost:** Leaving Blackout Merchandise feels like "firing your manager," not just canceling a subscription.
  - **Narrative:** "We are the Anti-Corporate Merch Partner."

  ### 16.3 The Vertical Integrity Moat: "Printers who Code"
  **Them:** Tech companies aggregating 3rd party print shops. They have *zero* control over the actual press operator's mood that day.
  **Us:** We own the **Anatol Volt-M**.
  - We control the ink chemistry (Magna Colours).
  - We control the "First Pull."
  - We offer "Retail Folding & Tagging" as standard.
  - **Result:** Our unboxing experience feels like a *Brand*, theirs feels like a *Package*.

  ### 16.4 The Ethical Moat: Native Sustainability
  **Them:** "Greenwashing." They offer organic tees but use standard chemistries because their supply chain is too huge to pivot.
  **Us:** **Native Sustainability.**
  - Water-based inks (Magna) are standard.
  - Genetic exclusion of outliers (we don't sell cheap/unethical blanks).
  - **Trust:** Gen Z creators verify this. They can visit our shop in Barcelos.

  ### 16.5 The "18-Month Lead" Thesis
  We don't need to be the *only* AI tool forever. We just need to be the **Best AI for Musicians/Creators** for 18 months. By the time they copy the "Tech," we will have locked in the "Trust" and the "Workflow."

  ---

  ## 17. Appendix

   ### A. Model Comparison & Selection Rationale

   **Why Mistral Large 3 (via Mistral API) — Primary LLM for All Cat-Suite Agents:**
   - **Cost:** ~€2/1M input, ~€6/1M output tokens
   - **Speed:** <1s response time, streaming support
   - **Quality:** Matches GPT-4o on reasoning benchmarks; strongest instruction-following for multi-turn character adherence
   - **Context:** 128K window — enough for full conversation history + product catalog context
   - **Multi-language:** Native Portuguese, Spanish, German, English, French
   - **Privacy:** EU data residency (Paris data centers) — GDPR-native, no data leaves Europe
   - **Why not GLM-4.7/MiMo:** Non-EU providers create GDPR compliance risk; Mistral is the only top-tier LLM provider headquartered in Europe
   - **Use Cases:** Leopoldo onboarding, Francisca creative direction, complex Antonia escalations, all agent handoffs

   **Why Mistral Small 4 (via Mistral API) — Cost-Optimized Tier for Simple Queries:**
   - **Cost:** ~$0.15/1M input, ~$0.60/1M output tokens (90% cheaper than Large 3)
   - **Speed:** <500ms response time — faster than any self-hosted alternative at this scale
   - **Quality:** Best-in-class for its parameter count; handles FAQ, order tracking, status checks with 98%+ accuracy
   - **Privacy:** Same EU data residency as Large 3
   - **Why not Llama 3.1 8B via Ollama:** At our scale, Small 4 API is cheaper than €300/month GPU rental + maintenance overhead
   - **Escalation strategy:** Small 4 handles ~70% of traffic → auto-escalates to Large 3 on sentiment/complexity threshold
   - **Use Cases:** "Where is my order?", "Track shipment #1234", "Show my store stats", simple routing

   **Why Mistral Large 3 (via Mistral API) — Vision & Image Analysis:**
   - **Cost:** ~€0.005 per image analysis
   - **Speed:** <1s for 1080p image analysis
   - **Quality:** Native multimodal model from Mistral — no external vision API needed
   - **Privacy:** Same EU data residency; artist artwork never leaves European infrastructure
   - **Capabilities:** Resolution check, color count estimation, bleed safety, style analysis, background removal assessment
   - **Why not external vision APIs (Claude Vision, GPT-4V):** Non-EU inference, higher cost (~$0.01+/image), no GDPR-native guarantee
   - **Use Cases:** Francisca's first pass on any uploaded image — "Darling, this logo is 72 DPI. For a 12-inch chest print, we need 3600px wide."

   **Why Mistral Voxtral Transcribe 2 + TTS — Full EU Voice Pipeline:**
   - **STT Cost:** $0.003/min (10x cheaper than competitors)
   - **TTS Cost:** ~$0.005/min estimated (competitive with ElevenLabs)
   - **Speed:** STT <200ms latency, TTS ~90ms latency
   - **Quality:** STT supports 13 languages (including Portuguese); TTS beats ElevenLabs Flash v2.5 (68.4% win rate)
   - **Voice Cloning:** 30-second reference sample per Cat-Suite character
   - **Open Weights:** Apache 2.0 — self-hostable at scale (migration path at 250+ artists)
   - **Why not Whisper + ElevenLabs:** Whisper is OpenAI (US, non-EU); ElevenLabs is expensive and lacks EU data guarantee

   **Why BFL API for Image Generation:**
   - **Purpose:** Francisca routes all creative tasks to FLUX 2 family via single provider
   - **Smart Routing:**
     - Drafts / iterations / sketches → FLUX 2 Flex (~$0.008/image)
     - Final mockups / catalog → FLUX 2 Pro (~$0.020/image)
     - Premium / hero releases → FLUX 2 Max (~$0.050/image)
     - Image edits / variations → FLUX 2 Flex img2img (~$0.008/image)
   - **Why single provider:** Consistent visual DNA, one integration, one license, operational simplicity
   - **Cost:** No subscription fee; pay per generation only
   - **Future:** API-only indefinitely — costs stay <1% of revenue, no GPU infrastructure

   **Why OpenCV for Color Separation + Halftoning:**
   - **Cost:** $0 (deterministic, rule-based)
   - **Speed:** <3s per design
   - **Quality:** K-Means clustering for spot colors, Moiré-prevention angles, Pantone matching
   - **Why not a learned model:** Deterministic OpenCV is production-ready, predictable and free; no model training is planned for color separation

   **Future Negotiation Path (Year 2+):**
   - At 5,000+ artists, approach Black Forest Labs for enterprise commercial license
   - Potential cost: $50K-100K upfront for unlimited self-hosted use
   - ROI: At 150,000 images/month, API costs $900/month = $10,800/year
   - Break-even: 5-10 years (not viable until massive scale)
   - **Decision:** Replicate API remains cost-effective even at 5,000+ artists

  ### B. Confidential: The "Cat-Suite" Personality Engine
  > **Note:** The full System Directives for Leopoldo, Francisca, and Antônia are stored in the confidential IP file: `CAT_SUITE_PROMPTS.md`.
  > This ensures public-facing documents do not expose the proprietary prompt engineering that drives the "Emotional Moat."

  ### C. Detailed Cost Projections

  **Monthly Operational Costs (Conservative Estimate):**

  | Category | Component | Monthly Cost | Notes |
  |----------|-----------|--------------|-------|
  | **Infrastructure** | Vercel Pro | $20 | Hosting, edge functions, bandwidth |
  | | Neon Pro | $25 | 8GB PostgreSQL, 100GB bandwidth |
  | | Cloudinary | $25 | ~100GB storage + transformations |
  | | Sentry | $26 | Error tracking (can start free) |
  | | **Subtotal** | **$96** | |
  | **AI Services** | **Mistral Small 4** (simple queries, 70%) | **~$13.50** | 21M tokens @ ~$0.15/1M in, ~$0.60/1M out |
  | | **Mistral Large 3** (complex reasoning, 30%) | **~$9.00** | 9M tokens @ ~€2/1M input |
  | | **Mistral Large 3** (artwork analysis) | **~$5.00** | 1,000 uploads @ ~€0.005 |
  | | **Voxtral STT + TTS** (voice pipeline) | **~$40.00** | 5,000 mins combined |
  | | **BFL API Image Gen** (FLUX 2 Flex / Pro / Max) | **~$438** | 30K images @ ~$0.0146 avg |
  | | **Subtotal (10K active users)** | **~$517.50** | **98% cost reduction vs v3.0** |
  | **Transaction Fees** | NexaPay | $249/mo + 1.5% | Per transaction (variable). Stripe retained as backup. |
  | **Total Base** | | **~$364** | **Excluding transaction fees** |

  **At Scale (1,000 Active Creators, 10K Products Sold/Month):**
  - Revenue: $85,000/month (assuming $8.50 avg profit per product)
  - Operational costs: ~$500/month ($268 AI + $96 infrastructure + $136 buffer)
  - Transaction fees (NexaPay): ~$1,500/month (on $85K GMV)
  - Total costs: ~$3,000/month
  - **Net profit: ~$82,000/month (96.5% margin)**

  **Year 2 Self-Hosted (Portugal Facility):**
  - Mistral API (LLM): ~$65/month (unchanged — stays on API for quality)
  - Voxtral STT + TTS: €150/month (self-hosted GPU, Apache 2.0 weights)
  - OpenRouter Image Gen: ~$210/month (unchanged — best model per task)
  - Total AI costs: ~$425/month (~€395)
  - **Additional savings: ~$40/month vs API-only Voxtral**

  ### D. Technical Specifications

  **Image Generation Specs:**
  ```typescript
  interface PrintSpecs {
    dimensions: {
      width: number;   // pixels
      height: number;  // pixels
    };
    dpi: 300;          // fixed for print quality
    format: 'PNG' | 'PDF' | 'SVG';
    colorSpace: 'RGB' | 'CMYK';
    bleed: {
      top: number;     // mm
      right: number;   // mm
      bottom: number;  // mm
      left: number;    // mm
    };
    printMethod: 'screen' | 'dtg' | 'sublimation';
    maxColors?: number; // for screen printing
  }
  ```

  **Category Presets (Full Specification):**
  ```typescript
  const DESIGN_CATEGORIES = {
    band_tshirt: {
      name: 'Band T-Shirt',
      dimensions: { width: 4500, height: 5400 },
      dpi: 300,
      printArea: { width: 12, height: 16 }, // inches
      style: 'bold, high-contrast, screen-print optimized',
      colorGuidance: 'limited palette (2-4 spot colors), avoid gradients',
      placement: 'centered chest',
      format: 'PNG' as const,
      colorSpace: 'RGB' as const,
      bleed: { top: 3, right: 3, bottom: 3, left: 3 },
      printMethod: 'screen' as const,
      maxColors: 4
    },
    vintage_poster: {
      name: 'Vintage Poster',
      dimensions: { width: 3000, height: 4000 },
      dpi: 300,
      printArea: { width: 10, height: 13.33 },
      style: 'distressed, retro, textured, halftone effects',
      colorGuidance: 'sepia tones, limited vintage palette, aged look',
      placement: 'full bleed design',
      format: 'PNG' as const,
      colorSpace: 'CMYK' as const,
      bleed: { top: 5, right: 5, bottom: 5, left: 5 },
      printMethod: 'dtg' as const
    },
    minimal_logo: {
      name: 'Minimal Logo',
      dimensions: { width: 2000, height: 2000 },
      dpi: 300,
      printArea: { width: 6.67, height: 6.67 },
      style: 'clean, geometric, minimal, modern',
      colorGuidance: '1-2 solid colors, high contrast, no gradients',
      placement: 'center-weighted, scalable design',
      format: 'SVG' as const,
      colorSpace: 'RGB' as const,
      bleed: { top: 0, right: 0, bottom: 0, left: 0 },
      printMethod: 'screen' as const,
      maxColors: 2
    },
    // Additional categories to be added...
   };
  
  ---
  
  **Document Version:** 3.2  
  **Last Updated:** May 8, 2026  
  **Architecture:** Next.js 16 + Neon (PostgreSQL) + Drizzle ORM  
  **Status:** Phase 3.5 - App Enhancement (In Progress)
  **Next Steps:** Complete OpenRouter integration, wire real AI chat to frontend

  ---
  
  ## 📋 UPDATE SUMMARY (v3.0 → v3.1)

  ### **A. AI Stack Changes (v3.2 — Mistral Native, May 2026)**
  | Component | Old (v3.1) | New (v3.2) | Impact |
  |-----------|------------|------------|--------|
  | **Primary LLM** | MiMo-V2-Flash (Chinese, non-EU) | **Mistral Large 3** (Paris, GDPR-native) | **EU data sovereignty + character quality** |
  | **Cost-Optimized LLM** | MiMo-V2-Flash (all traffic) | **Mistral Small 4** (70% traffic) | **90% cheaper for simple queries** |
  | **Vision / Image Analysis** | None (manual or external) | **Mistral Large 3** (native multimodal) | **Native artwork analysis, GDPR-compliant** |
  | **Voice STT/TTS** | Voxtral (unchanged) | **Voxtral** (unchanged) | **Still $0.003/min, Apache 2.0** |
  | **Image Generation** | FLUX.1 [dev] self-hosted | **BFL API** (FLUX 2 Flex / Pro / Max by complexity) | **Single-provider simplicity, consistent premium quality** |
  | **MVP AI Stack** | 4 models | **6 models** (but simpler ops) | **Single provider for 4/6 (Mistral)** |

  **MVP AI Stack (Mistral-Native):**
  1. **Mistral Large 3** — Complex reasoning, onboarding, creative direction, character roleplay
  2. **Mistral Small 4** — Fast FAQ, order tracking, simple queries (~70% of traffic, 90% cheaper)
  3. **Mistral Large 3** — Vision & artwork analysis: resolution, color count, bleed safety, style detection
  4. **Mistral Voxtral Transcribe 2** — Real-time speech-to-text ($0.003/min)
  5. **ElevenLabs TTS** — Character voice synthesis with zero-shot cloning
  5. **BFL API** — FLUX 2-only image generation (Flex / Pro / Max by complexity)

  **Removed from MVP:**
  - MiMo-V2-Flash — Replaced by Mistral Small 4 (faster, EU-native, better character support)
  - GLM-4.7 family — Fully deprecated, non-EU
  - Llama 3.1 8B via Ollama — Not needed; Mistral Small 4 is cheaper than self-hosting at this scale
  - FLUX.1 [dev] self-hosted — Replaced by BFL API FLUX 2-only routing (no GPU infra to manage)
  - Attention U-Net — Deferred; OpenCV color separation sufficient for MVP
  - Real-ESRGAN — Cloudinary upscaling sufficient for MVP

  ---

  ### **B. Production Capacity Update**
  | Metric | Old (v3.0) | New (v3.1) | Basis |
  |--------|------------|------------|-------|
  | **Daily Capacity** | 500-800 units/day (theoretical max) | **300-500 units/day** (realistic operational) | Real-world constraints |
  | **Bottleneck** | Printing speed | **Finishing/packing** | Staffing requirements |
  | **Buffer** | 2-3 days | **5-7 days** | Realistic shipping estimates |

  **Updated Contingency Plans:**
  - **Viral Spike (1,000+ orders):** Dynamic shipping windows (5-7 days)
  - **Bulk Drop (5,000 units):** Stanley Stella express shipping + temporary staff
  - **Equipment Failure:** Semi-auto press backup + local partner network

  ---

  ### **C. Artist Adoption Confidence**
  | Metric | Old (v3.0) | New (v3.1) | Confidence |
  |--------|------------|------------|------------|
  | **Month 6 Target** | 60-150 artists | **100+ artists** | **100% feasible** |
  | **Basis** | Market research | **Existing interest** | Pre-validated demand |
  | **Retention Rate** | 40% (conservative) | **75%** (realistic) | Based on quality focus |

  **Evidence:**
  - Existing network of interested artists
  - Strong value proposition (premium quality, zero upfront cost)
  - Founder's 9-year reputation in metal/punk scene

  ---

  ### **D. Founder Dependency Mitigation**
  **Added Section:** Founder Dependency & Delegation Strategy (Section 1.6.1)

  **Key Measures:**
  1. **SOP Documentation:** Complete library of production processes
  2. **AI Assistant:** Production-guidance assistant built on hosted LLM APIs
  3. **Brazilian Agency:** Outsourced design work (human-in-the-loop)
  4. **Production Manager:** Hire by Month 7-8 (not Month 12)
  5. **Quality Validation:** Print-file review by the production team before printing

  ---

  ### **E. Pricing Strategy**
  **No Changes** - Premium quality is the moat.

  **Justification:**
  - **€15 base cost** is competitive for premium organic 220gsm
  - **Printful premium** is €19 for similar quality
  - **Local shops** require €400+ upfront for bulk orders
  - **Our advantage:** Zero upfront cost + premium quality + AI design

  **Quality Differentiators:**
  - 220gsm organic cotton (vs 150gsm standard)
  - A2 print size (vs A3 standard)
  - Magna Colours HB inks (eco-friendly, premium feel)
  - Pantone precision (exact color matching)

  ---

  ### **F. Merch Coins Simplification**
  **Updated Section:** Merch Coins System (Section 2.8)

  **Changes:**
  - ✅ **Single coin type** (Platform Merch Coins only)
  - ✅ **No artist-branded coins** (avoid complexity)
  - ✅ **No trading/marketplace** (avoid legal complications)
  - ✅ **No KYC required** (simple redemption only)
  - ✅ **No lawyer review needed** (promotional discounts, not securities)

  **Simplified Model:**
  - **Platform coins only** (€1 = 1 coin)
  - **Non-tradable** (cannot transfer between users)
  - **Redeemable at checkout** (simple discount)
  - **Never expire** (lifetime value)
  - **Artist controls distribution** (giveaways, rewards)

  ---

  ### **G. Technical Architecture Updates (v3.2)**
  **Updated Section:** AI Stack & Architecture (Sections 2.2, 2.6, 1.10, 5.1, 5.2)

  **Changes:**
  - ✅ **Remove MiMo-V2-Flash** → Mistral Large 3 + Small 4 (EU-native, GDPR-compliant)
  - ✅ **Remove GLM-4.7 family** → Fully deprecated (non-EU)
  - ✅ **Remove Llama 3.1 8B / Ollama** → Not needed; Mistral Small 4 is cheaper than self-hosting
  - ✅ **FLUX 2-only image generation** → Single-provider simplicity via BFL API (Flex / Pro / Max by complexity)
  - ✅ **API-only strategy** → No self-hosting; costs remain <1% of revenue at all projected scales
  - ✅ **Consistent premium aesthetic** → All output shares FLUX 2 visual DNA
  - ✅ **Mistral Large 3 multimodal** → Native image analysis for print readiness (GDPR-compliant)
  - ✅ **Align PRD with Drizzle-only** architecture (remove Convex references)
  - ✅ **Align PRD with Clerk** auth (remove Supabase Auth references)
  - ✅ **Align PRD with Neon** database (remove Supabase DB references)

  **MVP AI Stack (v3.2):**
  1. **Mistral Large 3** — Complex reasoning, onboarding, creative direction, vision & artwork analysis (native multimodal)
  2. **Mistral Small 4** — Fast FAQ, order tracking, simple queries (~70% traffic)
  3. **Mistral Voxtral Transcribe 2** — Real-time speech-to-text
  4. **ElevenLabs TTS** — Character voice synthesis
  5. **FLUX 2 Flex** (BFL API) — Drafts, iterations, sketches (~70% of generations)
  6. **FLUX 2 Pro** (BFL API) — Final mockups, catalog images (~20% of generations)
  7. **FLUX 2 Max** (BFL API) — Premium hero releases (~10% of generations)
  8. **OpenCV** — Color separation + halftoning (deterministic, $0)

  **Production AI Stack (Future):**
  - Self-host Voxtral (Apache 2.0) at 250+ artists to eliminate voice costs
  - **Image generation remains API-only** — costs stay <1% of revenue, no GPU infrastructure to manage

  ---

  ### **H. Financial Projections Update**
  **Updated Section:** Cost Analysis & Projections (Section 2.3)

  **AI Cost Reduction:**
  - **Old (v3.0):** ~$1,980/month at scale (GLM + Flux 2 Flex)
  - **New (v3.1):** ~$400/month at scale (MiMo + self-hosted Flux)
  - **New (v3.2):** ~$133/month at scale (Mistral Large 3 + Small 4 + Voxtral + BFL API with FLUX 2-only image stack)
  - **Savings vs v3.0:** 95% reduction
  - **Savings vs v3.1:** 74% reduction

  **Updated Projections:**
  | Metric | Old (v3.0) | New (v3.1) | Change |
  |--------|------------|------------|--------|
  | **AI Cost/Design** | $0.17-0.22 | **$0.03-0.05** | **-80%** |
  | **Month 6 Profit** | €2,000 | **€3,000** | +50% |
  | **Month 12 Profit** | €10,000 | **€12,000** | +20% |
  | **Year 1 Total** | €17,000 | **€22,000** | +29% |

  ---

  ### **I. Production Capacity & Staffing**
  **Updated Section:** Production Operations (Section 2.6)

  **Changes:**
  - ✅ **Realistic capacity:** 300-500 units/day (not 500-800)
  - ✅ **Hire production manager:** Month 7-8 (not Month 12)
  - ✅ **Brazilian agency:** Outsourced design work from Day 1
  - ✅ **SOP library:** Complete documentation for delegation

  **Staffing Timeline:**
  - **Months 1-6:** Founder solo (production + platform)
  - **Month 7:** Hire Production Manager (Portugal local)
  - **Month 8:** Brazilian agency for design support
  - **Month 10:** Customer Success Manager
  - **Month 12:** Marketing Lead

  ---

  ### **J. Missing MVP Features Added**
  **Updated Section:** Functional Requirements (Section 3)

  **Added to Phase 4-6:**

  #### **A. Admin Dashboard**
  - Artist management (approve, suspend, view analytics)
  - Order management (view, update status, fulfill)
  - Financial reporting (revenue, costs, margins)
  - Inventory tracking (stock levels, reorder alerts)
  - System monitoring (AI costs, uptime, errors)

  #### **B. Customer Support System**
  - Ticket management (create, assign, resolve)
  - FAQ/knowledge base (searchable, categorized)
  - Live chat (optional, via Cat-Suite agents)
  - Email integration (support@blackoutmerch.example)

  #### **C. Analytics & Reporting**
  - **Artist Dashboard:**
    - Sales overview (orders, revenue, profit)
    - Product performance (best sellers, conversion)
    - Customer insights (demographics, location)
    - AI usage (designs generated, costs)
  - **Platform Analytics:**
    - Growth metrics (new artists, active users)
    - Financial metrics (GMV, revenue, profit)
    - Retention metrics (artist churn, repeat buyers)
    - AI metrics (cost per user, model usage)

  #### **D. Email System**
  - **Transactional:**
    - Order confirmation
    - Shipping notification
    - Delivery confirmation
    - Refund/return updates
  - **Marketing:**
    - Welcome series (new artists)
    - Product tips (best practices)
    - Platform updates (new features)
    - Re-engagement (inactive artists)

  ---

  ## 20. Community Ownership & Tokenization Vision

  > **Status:** Year 1 groundwork required (SCF registration + Instaward) — Token launch Year 2-3
  > **Blockchain:** Stellar Network | **Token:** MRCH (Stellar Asset / SAC) | **Contracts:** Soroban
  > **Reference:** Full detailed document: `Documentation/05-Community-Ownership/TOKENIZATION_VISION.md`

  ### 20.1 Vision & Philosophy

  We practice what we preach. Our equal wage model extends beyond compensation to **ownership structure**. Just as we reject ego-driven salary hierarchies, we reject traditional equity concentration.

  **Core Principle:** 30% of Blackout Merchandise will be owned by the people building, using, and supporting it—artists, employees, customers, and community. This isn't a marketing gimmick. It's hardcoded into our cap table and, ultimately, into blockchain smart contracts.

  > *"We're not just ethical about what we print on. We're ethical about who owns us. Our employees, artists, and community hold real equity—not just promises. If you know, you know."*

  ### 20.2 Why Tokenization Aligns with Our Brand

  | Traditional Company | Tokenized Blackout Merchandise |
  |---------------------|----------------------|
  | Founder: 60-70%, Employees: 0.5-2% each | Founder: 60%+, Community: 30%, balanced distribution |
  | Cap table is secret | Ownership visible on blockchain |
  | Profit sharing requires trust | Smart contracts enforce automatic distribution |
  | Employees wait years for liquidity | Tokens tradeable after vesting on secondary market |
  | Artists are "users" | Artists are **co-owners** |

  **This directly reinforces:**
  - Our equal wage philosophy (everyone earns €1,400/month regardless of title)
  - Our 30% profit-sharing pool (now automated via tokens)
  - Our "Direct-to-Artist" model (artists have skin in the game)
  - Our "Ethical First" positioning (radical transparency)
  - Our "If you know, you know" brand voice (crypto-native audience gets it immediately)

  ### 20.3 The Phased Implementation Approach

  #### Phase 1: Foundation (Year 1) — Crowdfunding with Live Founding MRCH Tokens

  **What We Do Now:**
  - Launch crowdfunding campaign (revised target: €80-120K with MRCH founding tiers)
  - Offer traditional rewards for lower tiers; real MRCH tokens for top-tier backers
  - **Issue MRCH Founding Tokens on Stellar Mainnet at campaign launch** — ~1 afternoon of work, ~$5 in XLM, no development required
  - Tokens issued with `AUTH_REQUIRED_FLAG`: every recipient manually KYC-approved before tokens are sent, no open-market trading at launch
  - Tokens carry **active governance rights from day one** — off-chain Year 1 (community DAO polls, weighted by MRCH holdings), on-chain Year 2 (Soroban contract)
  - Tokens carry a **documented profit-sharing promise** — 30% of profits to MRCH holders, activates Year 2 when Soroban deploys; this promise costs nothing legally
  - Only Stellar DEX trading is locked until Year 2 legal framework is established
  - **No lawyer needed before launch** — legal opinion and MiCA whitepaper commissioned Year 1 Q3-Q4, funded by Instaward, timed before first actual distribution
  - **Register on SCF** (communityfund.stellar.org) and begin community verification
  - **Apply for SCF Instaward** — initial grant funds the MiCA legal consultation

  **Crowdfunding Message:**
  > *"Founding Owners — You don't just back us. You own us. Right now. We're issuing real MRCH founding tokens on the Stellar blockchain to top-tier backers at campaign close. No promises. No IOUs. Real tokens in your Stellar wallet, visible on stellarexpert.io. When Blackout Merchandise profits, 30% goes to MRCH holders — automatically, every quarter, in euros. And from day one, your tokens vote on how this platform evolves. This founding cohort closes when the campaign ends."*

  **This creates:**
  - Real on-chain tokens from day one — backers check their wallet, not a spreadsheet
  - Founding cohort urgency — this allocation closes permanently when the campaign ends
  - Stronger SCF Instaward application immediately: "MRCH is already live on Stellar Mainnet with X verified holders"
  - Zero legal cost at launch — promising future profit-sharing costs nothing legally; only the first actual distribution triggers MiCA compliance (Year 2)
  - Differentiation unlike any crowdfunding campaign in the European creator economy space

  #### Phase 2: Growth (Year 1-2) — Stellar Community Fund Grants

  **Strategy: Non-Dilutive Infrastructure via SCF**

  Instead of trading equity for blockchain infrastructure, the **Stellar Community Fund (SCF)** funds the entire layer through grants — zero equity given.

  | Grant | Amount | Timeline | Deliverable |
  |-------|--------|----------|-------------|
  | SCF Instaward | ~$10-25K XLM | Year 1 Q1-Q2 | Community verification; funds MiCA legal opinion (Year 1 Q3-Q4) |
  | SCF Build Award | Up to $150K XLM | Year 1-2 | Soroban contracts: profit-distribution + DAO governance + vesting (token already live from crowdfunding — stronger application) |
  | SCF Matching Fund | Up to $500K USD | Year 2+ | Matches committed lead investor's check |
  | SCF Marketing Grant | Up to $500K USD | Year 3 | Creator economy growth campaign |

  **Why SDF Approves This:**
  - Real-world equity-backed token issuance (RWA) is SDF's stated strategic priority
  - Creator economy is underrepresented in their portfolio (currently DeFi-heavy)
  - We have a real business with live artists — not a whitepaper
  - Artist co-ownership maps directly to Stellar's financial inclusion mission
  - $0.0007/transaction: quarterly distributions to 500+ artists cost under $1 in total fees
  - EU/Portugal base aligns with MiCA regulatory framework, which SDF actively supports

  **Grant probability: 65-75%** for Build Award; higher for Instaward and Marketing Grant.

  #### Phase 3: Scale (Year 2-3) — MRCH Token Launch on Stellar

  **What Gets Built:**
  - 30M MRCH tokens = 30% equity pool, issued as Stellar Asset (SAC — no smart contract needed for issuance)
  - Quarterly profit distributions via Soroban contract, paid in **EURC** (Circle's Euro stablecoin — no XLM volatility exposure)
  - Artist DAO governance via Soroban contract (1 MRCH = 1 vote)
  - Vesting enforced on-chain per pool type (employee cliff, artist milestone unlocks)
  - Secondary market via **Stellar DEX** — built-in, permissionless, no exchange partnership required
  - Free Soroban security audit provided by SDF through SCF Build Award

  **Token Distribution:**
  | Pool | % | Tokens | Purpose |
  |------|---|--------|---------|
  | Seed/Early Backers | 5% | 5M | Crowdfunding + angels |
  | Artist Ownership | 12% | 12M | Performance-based rewards |
  | Employee/Contributor | 8% | 8M | Team equity + vesting |
  | Community/Customer | 3% | 3M | Loyalty, referrals |
  | Strategic Reserve | 2% | 2M | Partnerships, advisors |

  ### 20.4 Funding Structure (The New Math)

  | Source | Amount | Equity |
  |--------|--------|--------|
  | SDF Grants (XLM/USD via SCF) | ~$150-300K | 0% |
  | SCF Matching Fund (conditional) | Up to $500K USD | 0% |
  | Traditional investor | €300K | 16-18% |
  | Crowdfunding | €100K | 0% (rewards only) |
  | Founder | — | 60%+ |

  **Key Insight:** SDF grants replace the equity-for-infrastructure deal. We get blockchain infrastructure at zero equity cost. Combined with crowdfunding as traditional rewards, the founder keeps 82%+ equity while raising €300K+ and accessing up to $800K in non-dilutive grant capital.

  ### 20.5 Why This Works

  | Benefit | Explanation |
  |---------|-------------|
  | **Zero equity for infrastructure** | SDF grants cover legal, audit, and contract development |
  | **Better UX for artists** | Profit distributions in EURC (stable €), not volatile crypto |
  | **Open secondary market** | Stellar DEX is built-in — no proprietary marketplace lock-in |
  | **Creates loyalty** | Early backers hold real founding tokens — visible on-chain, not a promise |
  | **Differentiates** | No competitor offers equity-backed tokens on a payments-grade blockchain |
  | **Keeps optionality** | Stellar tooling is open-source — no single partner dependency |
  | **Adds value later** | MRCH becomes meaningful when the company has real profits to distribute |

  ### 20.6 Implementation Roadmap

  | Timeline | Milestone |
  |----------|-----------|
  | **Year 1 (Q1)** | Issue MRCH Founding Tokens at crowdfunding launch; SCF registration + Instaward application |
  | **Year 1 (Q2-Q3)** | SCF Build Award application — cite live token + verified founding holders as proof of concept |
  | **Year 1 (Q3-Q4)** | MiCA legal opinion + whitepaper (funded by Instaward, timed before first distribution) |
  | **Year 2 (Q1)** | Soroban contracts audited + deployed; rights activated; SCF Matching Fund on investor close |
  | **Year 2 (Q2-Q3)** | Artist DAO live; first quarterly EURC distributions; Stellar DEX trading unlocked |
  | **Year 3** | SCF Marketing Grant; 300+ artists with MRCH; active secondary market |
  | **Year 3+** | 500-1000+ token holders; full liquidity |

  ### 20.7 Risk Mitigation

  | Risk | Mitigation |
  |------|------------|
  | Regulatory changes | Promising future profit-sharing costs nothing legally — only the first actual distribution triggers MiCA compliance (Year 2); MiCA legal opinion + whitepaper commissioned Year 1 Q3-Q4, funded by Instaward, before first distribution |
  | Smart contract bugs | Free Soroban security audit from SDF via Build Award; professional audit before mainnet |
  | Token price volatility | Distributions in EURC (stable €) — artists receive euros, not speculative crypto |
  | Execution distraction | SDF technical support + SCF program resources cover infrastructure guidance |

  ### 20.8 Summary

  **MRCH Founding Tokens launch at crowdfunding with active governance and a documented profit-sharing promise.** The strategy:

  1. **Crowdfunding launch:** Issue MRCH on Stellar Mainnet (~$5, 1 afternoon). Top-tier backers receive real founding tokens with active DAO governance rights and an explicit promise of 30% quarterly profit distributions starting Year 2. Zero legal cost — promising future distributions is legally free; only the first actual distribution triggers MiCA compliance.
  2. **Year 1 Q3-Q4:** MiCA legal opinion funded by Instaward, timed before first distribution. SCF Build Award funds Soroban automation layer. Off-chain DAO governance runs throughout Year 1 (Discord with MRCH-weighted voting).
  3. **Year 2:** Soroban contracts deploy — profit-sharing activates, Stellar DEX trading unlocks. All three were promised from day one; Year 2 is when the on-chain infrastructure catches up.

  This approach:
  - Zero equity given for blockchain infrastructure (grants replace the equity-for-infra deal)
  - Creates real differentiation at crowdfunding — backers own equity in a company that promises and will pay them profits
  - Profit-sharing is the main hook from day one — legally free to promise, and it's a genuine commitment
  - Keeps 82%+ founder equity vs. ~74-78% under the previous path
  - Non-dilutive grant stack: up to $800K+ potential across SCF programs

  **The vision is bold but pragmatic: Build a company our community actually owns — and tell them so from day one.**

  ---

  ### 20.9 Immediate Actions, Key Principles & Cross-References

  #### At Crowdfunding Launch — Do These (Zero Cost, ~1 Afternoon)

  - [ ] Issue MRCH on Stellar Mainnet with `AUTH_REQUIRED_FLAG` — ~$5 in XLM, 4 transactions
  - [ ] Set up distribution account (holds uncirculated MRCH supply)
  - [ ] Lock issuer account (`masterWeight: 0`) — supply is permanently capped at 30M
  - [ ] Register at communityfund.stellar.org — begin SCF community verification
  - [ ] Apply for SCF Instaward — cite live founding token as proof of concept

  #### Year 1 Q3-Q4 — Before First Distribution (Funded by Instaward)

  - [ ] Commission MiCA legal opinion on MRCH token classification
  - [ ] Draft crypto-asset whitepaper (TOKENIZATION_VISION.md is already most of it)
  - [ ] Join Stellar Developer Discord — introduce Blackout Merchandise in `#projects` channel
  - [ ] Find Portugal/EU Stellar Ambassador — accelerates Build Award processing
  - [ ] SCF Build Award application — with live token + verified founding holder count

  #### MiCA Is Our Grant Superpower

  Every SCF application leads with:
  > *"Blackout Merchandise is the first MiCA-compliant, equity-backed creator economy RWA on Stellar — a real company, real artists, real euros distributed on-chain."*

  This positions us as a reference case for SDF's EU institutional roadmap, not just another grant applicant. Portugal/EU jurisdiction + EURC distributions + Stellar native compliance controls (freeze/clawback) = a project SDF needs to exist.

  #### EURC: Artists See Euros, Not Crypto

  All profit distributions are paid in **EURC** (Circle's Euro stablecoin, MiCA-registered). Artists see `€16.00 received` in LOBSTR — not `12.3 XLM`. The blockchain is invisible. The euros are real. This principle must be maintained in all artist-facing copy, onboarding flows, and Cat-Suite scripts.

  #### Cat-Suite MRCH Onboarding (Year 2-3)

  Leopoldo handles all artist token onboarding entirely through natural Cat-Suite conversation. No external crypto knowledge required. Artists are guided from "what is MRCH?" through LOBSTR wallet setup to their first EURC distribution without ever leaving the platform. Full scripts: `Documentation/05-Community-Ownership/MRCH_ARTIST_ONBOARDING.md`

  #### MerchCoins vs. MRCH — Not The Same System

  | | MerchCoins | MRCH Tokens |
  |--|--|--|
  | Layer | Off-chain (database) | On-chain (Stellar) |
  | Purpose | Loyalty discount (€1/coin) | Equity ownership |
  | Blockchain | None | Stellar Mainnet |
  | PRD section | 2.8 | 20 |

  Full comparison: `Documentation/05-Community-Ownership/MERCHANTCOINS_VS_MRCH.md`

  ---

  **For complete details, see:** `Documentation/05-Community-Ownership/TOKENIZATION_VISION.md`

  ---

  **Document End**


  ## 8.5 Exit Strategy

  > **Primary Goal:** Deliver strong returns for investors through strategic acquisition or sustainable profitability.

  ### 8.5.1 Primary Exit Path (3-5 Years)

  **Target: Acquisition by Fyul/Gelato** — €15-25M

  **Rationale:**
  - Fyul merger shows consolidation appetite in POD sector
  - Needs premium differentiation to compete with dominant player
  - In-house production capability (they lack)
  - Print-production workflow IP (color separation, print prep)

  **Trigger Events:**
  - 100+ active artists, €100K MRR
  - Established waitlist (500+ qualified)
  - Production SOPs documented and replicable
  - Verified unit economics (60%+ gross margins at scale)

  ### 8.5.2 Secondary Exit Path (4-6 Years)

  **Target: Acquisition by Creative Tool Company** — €12-30M

  **Potential Acquirers:**

  | Acquirer | Probability | Valuation Range | Strategic Fit |
  |-----------|--------------|------------------|----------------|
  | **Canva** | MEDIUM | €12-25M | Affinity acquisition shows physical expansion interest; €2B revenue, needs commerce layer |
  | **Adobe** | LOW-MEDIUM | €15-30M | Creative ecosystem gap; could add physical fulfillment to Creative Cloud |
  | **Figma** | MEDIUM | €8-18M | Design platform with creator community; natural extension to commerce |
  | **Vercel** | LOW | €5-12M | Infrastructure play; wants creator monetization stack |

  **Rationale:**
  - AI-first platform aligns with creative tool trend
  - Physical fulfillment extends design tool offering
  - Creator economy data valuable to design platforms

  ### 8.5.3 Alternative: Strategic Investment

  **Target: Strategic Minority Investment** — €3-5M for 10-20% equity

  **Potential Investors:**
  - European creator economy funds (e.g., Partech, Speedinvest)
  - Climate/impact investors (ethical positioning focus)
  - AI-focused VCs (multi-agent systems)

  **Rationale:**
  - Later-stage capital without full exit
  - Maintains founder control
  - Funds production scale without dilution

  ### 8.5.4 Independence Option

  **Target: Profitable Bootstrap** — No exit

  **Requirements:**
  - Sustained 60%+ gross margins
  - €120K+ MRR by Year 4
  - Production team operational without founder
  - Positive cash flow for 18+ months

  **Advantages:**
  - Full control over company direction
  - No investor dilution
  - Long-term founder lifestyle business

  ### 8.5.5 Comparable Exits (Market Context)

  | Acquired | Year | Valuation | Strategic Insight |
  |---------|------|-----------|------------------|
  | **Printful** | 2021 | $1B+ | $130M raise at 8-year mark, established POD dominance |
  | **Gelato** | Active | Undisclosed | Named Fast Company's "Most Innovative 2025" for AI |
  | **Redbubble/Spring** | 2013-2016 | $30-50M | Public marketplaces, platform model exit |
  | **Canva** | 2024 | €Several hundred million | Strategic creative tool acquisition path |
  | **Shopify** | 2022 (Deliverr) | Undisclosed | Platform expansion via acquisition |

  **Our Positioning:**
  - Premium B2C AI platform with production asset
  - Ethical-first positioning aligns with ESG investing trends
  - Founder credibility (9-year craft + triple-threat skillset)
  - €113K production infrastructure de-risks platform failure

  **Valuation Outlook:**
  - At 100 artists + €50K MRR: €2-3M pre-money (conservative)
  - At 300 artists + €120K MRR: €5-8M pre-money (growth trajectory)
  - At profitability (Year 4-5): €8-15M pre-money (established business)

  ---

  ---


→ See [[02-Architecture/Payment-Gateway]] for full payment architecture
