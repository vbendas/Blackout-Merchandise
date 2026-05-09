# Production Automation


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

  Investors need to know the destination. While we are building a profitable standalone business, we are positioning Merch From as a strategic acquisition target for three distinct buyer categories:

  ### 1. The Technology Acquisition (Target: $50M - $100M)
  **Potential Acquirers:** Printful, Redbubble, Gelato
  - **Why they buy:** They have the volume but lack the **AI Design Agent technology**. Acquiring Merch From gives them the "Leopoldo/Francisca" engine to offer AI design to their millions of users.
  - **The Asset:** The "Cat-Suite" Agent Architecture + Expert-Trained Dataset.

  ### 2. The Native Commerce Acquisition (Target: $100M+)
  **Potential Acquirers:** Shopify, Squarespace, Wix
  - **Why they buy:** These platforms want to keep creators inside their ecosystem. Merch From becomes their "native merch arm"—allowing any Shopify user to launch a premium print-on-demand line with one click.
  - **The Asset:** The seamless "Store-in-a-Box" experience.

  ### 3. The Vertical Integration Acquisition (Target: $200M+)
  **Potential Acquirers:** Live Nation / Ticketmaster, Universal Music Group
  - **Why they buy:** They control the artists but outsource the merch. Merch From allows them to vertically integrate merchandise production for their mid-tier touring artists, capturing the 40% margin they currently lose to third parties.
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
  | **Payments** | Stripe | **Express Checkout** (Apple/Google Pay) + Connect (Payouts) |
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
  merch-from/products/{product_sku}/{type}-{color}.{ext}
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
  merch-from/
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
  merch-from/products/{product_sku}/variants/{variant_sku}.jpg
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
  - [ ] Stripe payment integration complete
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

  ### Phase 6: Dataset Collection System (Month 7 Post-Launch)
  **Goal:** Build world's highest-quality screen printing dataset with Expert Curator Panel

  - [ ] Database schema for design quality scoring created
  - [ ] Database schema for refinement preferences created
  - [ ] Expert scoring interface built (1-5 rubric for 4 categories)
  - [ ] Automated metadata capture (color count, dimensions, complexity)
  - [ ] Design session logging with full conversation history
  - [ ] Refinement tracking (before/after images + instructions)
  - [ ] User acceptance tracking (which refinements were approved)
  - [ ] Production validation workflow (score printed results)
  - [ ] Dataset export functionality (ML training format)
  - [ ] Dataset readiness dashboard (count, avg quality, coverage)
  - [ ] Expert Panel scoring workflow (50-100 designs/month per expert)
  - [ ] Dataset quality metrics >4.0 average score (multi-expert validation)
  - [ ] Milestone tracking: 100 designs (Month 7) → 5,000 (Month 18) - world's best dataset
  - [ ] Panel methodology documentation (for future scaling)
  - [ ] Production correlation tracking (design scores vs. actual print quality)

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
   - **Mistral Voxtral TTS** — Character voice synthesis with zero-shot cloning
   - **BFL API** — Direct FLUX 2 Flex / Pro / Max image generation (OpenRouter available as unified fallback)
   - **OpenCV (Python/Node)** — Color separation, halftoning, DPI validation (deterministic, $0)
   - **v0 API (Vercel)** — AI-powered component generation for store customization

  **AI & ML (Phase 2: Scale - Self-Hosted Migration at 250+ Artists):**
  - **Self-hosted Voxtral** (Apache 2.0 weights) — Eliminate per-minute STT/TTS costs at scale
  - **Custom LoRA fine-tuning** (via Replicate / Modal) — Train on Expert-scored designs for proprietary aesthetic
  - **Failover:** OpenRouter API remains as high-availability backup for image generation; Mistral API direct for LLM

  **Infrastructure:**
  - Vercel (hosting, edge functions, CDN)
  - Cloudinary (image storage, optimization, mockup generation)
  - Stripe (payment processing)
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
   Voxtral TTS (5,000 voice mins): ~$25.00/month
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

  **Proprietary Dataset Strategy: Building Competitive Moat**

  While using APIs during Year 1, we're simultaneously building a high-quality proprietary dataset:

  **Dataset Collection Process (Expert Curator Panel):**
  1. **Every design generated** = dataset entry with metadata
  2. **Artist feedback loops** = scored refinements ("make it more vintage" = preference data)
  3. **World-class expert scoring** = Panel of 3 masters (Expert A, Expert B, Expert C) with 70+ years combined expertise
  4. **Multi-perspective validation** = Each expert brings specialized knowledge (process printing, traditional techniques, quality mastery)
  5. **Remote contract model** = Cost-effective, no relocation, scalable

  **Quality Scoring Rubric (1-5 Scale):**
  - **Print-readiness:** Color separation potential, halftone compatibility
  - **Design execution:** Prompt adherence, aesthetic quality
  - **Technical specs:** DPI, dimensions, bleed areas
  - **Production efficiency:** Screen count optimization, registration complexity

  **Dataset Growth Projections (Expert Panel Curation):**
  ```
  Month 7 (Launch): 100 designs (panel scoring begins)
  Month 12: 1,200 designs (expert-scored, multi-validated)
  Month 18: 5,000 designs (ready for fine-tuning)
  Month 24: 10,000+ designs (world-class screen print dataset)
  ```

  **Competitive Advantage:**
  - **Year 1:** Launch fast, validate demand, gather data
  - **Year 2:** Migrate to self-hosted Voxtral + custom LoRAs trained on 5,000+ real user designs
  - **Year 3:** Own the only screen-print-optimized AI model in the market
  - **Exit Value:** Proprietary dataset + fine-tuned model = defensible IP moat

  **Investor Pitch Positioning:**

  > "We're launching with proven Mistral APIs to achieve profitability fast—AI costs are just $0.02–0.04 per design, completely negligible. But we're not stopping there. From Day 1, we're building a proprietary dataset of expert-scored screen printing designs. By Year 2, when we hit 250+ artists, we'll migrate to self-hosted Voxtral (Apache 2.0) and custom LoRAs fine-tuned on 5,000+ real-world designs. That's when our margin expansion accelerates—competitors stay locked into expensive APIs while our voice costs drop to near-zero. We're building both a profitable business AND a defensible AI moat."

  **Why This Strategy Wins:**
  - ✅ **Capital efficiency** - No premature infrastructure investment
  - ✅ **De-risked execution** - Validate business before building deep tech
  - ✅ **Margin expansion story** - Clear path to 80% AI cost reduction
  - ✅ **Defensible moat** - Proprietary dataset = competitive advantage
  - ✅ **Investor confidence** - Shows strategic thinking beyond launch

  **Technical Migration Plan (Month 18-24):**

  **Phase 1: Infrastructure Setup (Month 18)**
  - Acquire NVIDIA A6000 GPU (€5,000 from profits)
  - Install self-hosted Voxtral STT + TTS (Apache 2.0 weights)
  - Set up inference API wrapper
  - Deploy monitoring and logging

   **Phase 2: Fine-Tuning (Month 19-20)**
   - Export 5,000-image dataset with scores
   - Fine-tune FLUX 2 with custom LoRAs via BFL API infrastructure
   - Train 4 initial style LoRAs (American Traditional, Vintage Band, Skull Art, Minimalist Logo)
   - Deploy LoRA visual gallery for customer style selection

   **Phase 3: Monthly LoRA Retraining (Month 7+)**
   - Retrain LoRAs monthly with customer-approved designs (3/3 ratings)
   - Version each LoRA cohort (v1, v2, v3...)
   - A/B test new versions vs. existing versions
   - Keep all versions until Month 7, then replace with latest

   **Phase 4: Scale Optimization (Month 12+)**
   - Evaluate self-hosted Voxtral (Apache 2.0) for voice cost elimination
   - Maintain Replicate API as fallback
   - Continue monthly LoRA retraining
  - Begin continuous fine-tuning on new data

   **Fallback Strategy:**
   If fine-tuned LoRA quality is insufficient:
   - Fall back to base FLUX 2 Flex if fine-tuned model underperforms
   - Continue collecting customer feedback for retraining
   - License custom LoRA dataset to other platforms (revenue stream)
  - Publish research paper (brand authority)
  - Revisit in Year 3 with larger dataset

  ---

  ### 5.3 ML Training Infrastructure: Google Colab Strategy

  **Cost-Efficient ML Training Without Capital Investment**

  We're using Google Colab for ML model training - the same infrastructure used by leading AI companies for experimentation and model development. This approach eliminates €5,000+ in hardware costs while maintaining professional-grade training capabilities.

  **Google Colab Overview:**
  - **Free GPU Access:** Tesla T4 (15GB VRAM) for model training
  - **Free TPU Access:** Even faster training for computer vision models
  - **Zero Setup:** Browser-based Jupyter notebooks, instant access
  - **Industry Standard:** Used by Google, startups, and researchers worldwide

  **Cost Comparison (2-Year Period):**
  ```
  Self-Hosted ML Infrastructure:
    NVIDIA RTX 4090 GPU:           €2,000
    High-end workstation:          €3,000
    Electricity (24 months):       €1,200
    Maintenance & upgrades:        €800
    ────────────────────────────
    Total 2-Year Cost:             €7,000

  Google Colab Approach:
    Months 1-6 (Free Tier):        €0
    Months 7-24 (Colab Pro):       €180 (€10/month × 18)
    ────────────────────────────
    Total 2-Year Cost:             €180
    
    ✅ SAVINGS: €6,820 (97% cost reduction)
  ```

  **Training Workflow:**
  ```python
  # Weekly ML Training Cycle (Google Colab)

  1. Expert Panel Scores Designs (Monday-Thursday):
    - 80-100 new expert-scored separations weekly
    - Data automatically synced to Google Drive

  2. Model Training Session (Friday):
    - Open Colab notebook with free GPU
    - Load Expert Panel's latest scores from Drive
    - Train model on 100+ new data points
    - Validate improvements with A/B test set
    - Export trained model (2-3 hours)
    
  3. Deployment (Friday afternoon):
    - Download trained model from Colab
    - Deploy to staging environment
    - Run automated validation tests
    - Schedule production deployment

  Total Weekly Cost: €0 (Free Tier) or €2.50 (Pro Tier)
  ```

  **Colab Free Tier Capabilities (Months 1-6):**
  - **GPU Time:** ~15 hours/week
  - **Session Length:** 12 hours maximum
  - **RAM:** 12GB (sufficient for image datasets)
  - **Storage:** Google Drive integration (unlimited with Drive storage)
  - **Perfect For:** Weekly training with <5,000 images

  **Colab Pro Upgrade (€10/month, Months 7+):**
  - **GPU Time:** ~45 hours/week (3x more)
  - **Better GPUs:** Tesla V100, occasional A100 access
  - **Session Length:** 24 hours (2x longer)
  - **RAM:** Up to 32GB (2.5x more)
  - **Background Execution:** Keeps running when browser closed
  - **Priority Access:** Faster resource allocation

  **When to Upgrade to Colab Pro:**
  - Dataset exceeds 5,000 scored designs (Month 6-7)
  - Training frequency increases to 2-3x weekly
  - Experimenting with multiple model architectures
  - Need longer uninterrupted training sessions

  **ROI Analysis:**
  ```
  €10/month Colab Pro Investment:
    - Eliminates €5,000 hardware purchase
    - No electricity costs (€50/month saved)
    - No maintenance/upgrades needed
    - Professional GPU access on-demand
    - Instant scaling when needed
    
  Net Monthly Savings vs Self-Hosted: €40+
  Annual Savings: €480+
  ```

  **Technical Implementation:**
  ```typescript
  // Automated data sync to Google Drive
  interface CoLabTrainingPipeline {
    // Step 1: Export Expert Panel scores from Neon PostgreSQL
    exportScores: () => Promise<void>;
    
    // Step 2: Sync to Google Drive (automated)
    syncToGoogleDrive: () => Promise<void>;
    
    // Step 3: Colab training (manual trigger)
    // User opens Colab notebook, runs training cells
    
    // Step 4: Download trained model
    downloadModel: () => Promise<Buffer>;
    
    // Step 5: Deploy to production
    deployModel: (modelBuffer: Buffer) => Promise<void>;
  }

  // Google Drive Structure
  /My Drive/merch_from_ml/
    ├── datasets/
    │   ├── designs/              # Design images
    │   ├── expert_scores.csv     # Expert scores (auto-synced)
    │   └── validation_set/       # Holdout test set
    ├── models/
    │   ├── checkpoints/          # Training checkpoints
    │   └── production/           # Final deployed models
    ├── notebooks/
    │   ├── training.ipynb        # Main training notebook
    │   ├── evaluation.ipynb     # Model evaluation
    │   └── ab_testing.ipynb      # A/B test framework
    └── results/
        └── experiments/          # Training logs, metrics
  ```

  **Scaling Path:**
  ```
  Months 1-6: Colab Free Tier
    - Training 1x per week
    - Dataset: 500-3,000 images
    - Cost: €0/month
    - GPU hours: Sufficient

  Months 7-18: Colab Pro
    - Training 2-3x per week
    - Dataset: 3,000-10,000 images
    - Cost: €10/month
    - GPU hours: Abundant
    - Better GPUs (V100)

  Months 19-24: Evaluate Self-Hosting
    - Only if training daily
    - Dataset: 10,000+ images
    - Continuous model updates needed
    - Break-even: ~5 hours GPU/day

  Realistic: Colab Pro sufficient for 18-24 months
  ```

  **Investor Advantages:**
  - ✅ **Capital Efficiency:** €6,820 saved over 2 years (deployed to growth)
  - ✅ **Professional Infrastructure:** Same tools as Google/DeepMind
  - ✅ **Instant Scaling:** Upgrade to Pro in 1 click when needed
  - ✅ **Zero Maintenance:** No hardware management overhead
  - ✅ **Risk Mitigation:** No sunk costs if pivot needed
  - ✅ **Proven Technology:** Industry-standard ML development platform

  **Why This Approach is Strategic:**

  Most startups waste €5,000-10,000 on premature ML infrastructure that sits idle 95% of the time. We're following best practices from successful AI companies:

  1. **Start with managed services** (Colab Free)
  2. **Scale with proven demand** (Colab Pro at Month 7)
  3. **Self-host only at true scale** (if ever needed)

  This strategy demonstrates:
  - **Financial discipline** - Not burning investor capital on unnecessary hardware
  - **Technical competence** - Using industry-standard tools correctly
  - **Strategic thinking** - Right tool for each growth phase
  - **Capital efficiency** - €6,820 saved goes to marketing, inventory, growth

  **Future Evaluation Criteria for Self-Hosting:**
  - Training >20 hours/week consistently
  - Dataset >50,000 images
  - Colab Pro costs exceed €150/month
  - Need for 24/7 continuous training
  - Multiple models training simultaneously

  **Bottom Line:** Google Colab gives us enterprise-grade ML training infrastructure for €0-10/month instead of €7,000+ in capital expenditure. This is exactly how successful AI companies bootstrap their ML operations.

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

  ### 5.4 Dataset Collection Schema (For Future Fine-Tuning)

  **Design Quality Scoring Table:**
  ```sql
  CREATE TABLE design_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_session_id UUID REFERENCES chat_sessions(id),
    iteration_number INTEGER,
    image_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    
    -- Expert Scoring (1-5 scale)
    print_readiness_score INTEGER CHECK (print_readiness_score BETWEEN 1 AND 5),
    design_execution_score INTEGER CHECK (design_execution_score BETWEEN 1 AND 5),
    technical_specs_score INTEGER CHECK (technical_specs_score BETWEEN 1 AND 5),
    production_efficiency_score INTEGER CHECK (production_efficiency_score BETWEEN 1 AND 5),
    overall_score DECIMAL(3,2), -- Average of above scores
    
    -- Technical Metadata
    color_count INTEGER,
    estimated_screens INTEGER,
    halftone_complexity TEXT CHECK (halftone_complexity IN ('simple', 'moderate', 'complex')),
    registration_difficulty TEXT CHECK (registration_difficulty IN ('easy', 'medium', 'hard')),
    
    -- Scoring Context
    scorer_id UUID REFERENCES users(id),
    scorer_expertise_years INTEGER,
    scoring_notes TEXT,
    
    -- Production Validation (if printed)
    was_printed BOOLEAN DEFAULT false,
    print_quality_actual INTEGER CHECK (print_quality_actual BETWEEN 1 AND 5),
    print_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX idx_quality_overall ON design_quality_scores(overall_score DESC);
  CREATE INDEX idx_quality_printed ON design_quality_scores(was_printed, print_quality_actual);
  ```

  **Dataset Export View (For Fine-Tuning):**
  ```sql
  CREATE VIEW ml_training_dataset AS
  SELECT 
    dqs.id,
    dqs.image_url,
    dqs.prompt,
    dqs.overall_score,
    dqs.print_readiness_score,
    dqs.color_count,
    dqs.estimated_screens,
    ds.category,
    ds.conversation_history,
    CASE 
      WHEN dqs.overall_score >= 4.5 THEN 'excellent'
      WHEN dqs.overall_score >= 3.5 THEN 'good'
      WHEN dqs.overall_score >= 2.5 THEN 'acceptable'
      ELSE 'needs_improvement'
    END AS quality_label
  FROM design_quality_scores dqs
  JOIN chat_sessions cs ON dqs.chat_session_id = cs.id
  WHERE dqs.overall_score IS NOT NULL
  ORDER BY dqs.created_at DESC;
  ```

  **Refinement Preference Data (For LoRA Fine-Tuning):**
  ```sql
  CREATE TABLE design_refinement_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_session_id UUID REFERENCES chat_sessions(id),
    before_image_url TEXT NOT NULL,
    after_image_url TEXT NOT NULL,
    refinement_instruction TEXT NOT NULL, -- "make it more vintage", etc.
    user_accepted BOOLEAN, -- Did user accept the refinement?
    preference_strength INTEGER CHECK (preference_strength BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- This captures real user preferences for fine-tuning
  CREATE INDEX idx_accepted_refinements ON design_refinement_preferences(user_accepted, preference_strength DESC);
  ```

  **Admin Dashboard Queries:**
  ```sql
  -- Dataset readiness check
  SELECT 
    COUNT(*) as total_scored_designs,
    AVG(overall_score) as avg_quality,
    COUNT(*) FILTER (WHERE overall_score >= 4.0) as excellent_designs,
    COUNT(*) FILTER (WHERE was_printed = true) as validated_prints
  FROM design_quality_scores;

  -- Fine-tuning readiness threshold: 5,000+ scored designs with avg quality > 3.5
  ```

  ---

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
  - `stripe_customer_id`: Text (for Stripe Checkout)
  - `stripe_connect_id`: Text (for Stripe Connect payouts to artists)
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
  *Customer orders with Stripe integration.*
  - `orders`: `store_id`, `customer_id`, `status` (enum: pending → paid → processing → shipped → fulfilled/cancelled), `total_amount` (cents), `stripe_payment_intent_id`, `shipping_address` (JSONB)
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
  - Webhook idempotency via `processed_webhook_events` table (Stripe + Clerk webhooks).

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
  ├── stripe/
  │   └── webhook/
  │       └── route.ts          # Payment processing webhooks
  └── voice/
      └── transcribe/
          └── route.ts          # Deepgram / Voxtral transcription proxy
  ```

  **Key Concept: "The Nervous System" (Triggers & Webhooks)**
  API Routes handle both user-facing requests and backend automation:
  - **On-Demand APIs:** Frontend calls `/api/generate-artwork` when user requests design generation.
  - **Webhook Handlers:** Stripe sends payment events to `/api/stripe/webhook` for order processing.
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
  | **`merch-from/stores/`** | **Public (CDN)** | • Mockups (WebP/AVIF)<br>• Artist Avatars<br>• Store Banners | **Marketing Layer.** High-performance delivery via Cloudinary CDN with `f_auto,q_auto` optimization. |
  | **`merch-from/uploads/`** | **Signed URLs** | • Raw sketches<br>• Initial logo uploads | **Input Layer.** Accessible by the **Artist** (uploader) and **Francisca** (AI vision analysis). |
  | **`merch-from/production/`** | **Restricted (signed)** | • **300 DPI Print Files**<br>• Color-Separated Files<br>• `.ai` / `.psd` source | **The Core IP.** High security. Only accessible by **Victor (Admin)** and **Production Manager**. |

  ### 5.6 Integration Points
  - **OpenRouter API:** Multi-model AI routing with fallbacks
  - **Neon + Drizzle:** Database operations via serverless PostgreSQL
  - **Clerk:** Authentication, user management, sessions
  - **Cloudinary:** Image storage, optimization, and CDN delivery
  - **Upstash Redis:** Sessions, caching, rate limiting
  - **AWS S3 API:** Final artwork and print file storage
  - **Stripe API:** Payment processing and webhooks
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
  │   └── webhook/stripe/route.ts      # Stripe webhooks
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
  ├── stripe/
  │   ├── client.ts                    # Stripe client
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
  | **Stripe** | Standard | 2.9% + $0.30/tx | Payment processing |
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
  - Custom LoRA fine-tuning on FLUX 2 via BFL infrastructure for proprietary aesthetic

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
  
  **Note:** FLUX 2 fine-tuned with custom LoRAs via BFL API ensures MerchFrom signature style (proprietary aesthetic moat)
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
      
      
      "stripe": "^14.0.0",
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
  - PCI DSS compliance via Stripe
  - No direct handling of card data
  - Webhook signature verification
  - Idempotency keys for all transactions
  - Fraud detection via Stripe Radar

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
  - Stripe payment flows
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
   - **Stripe Webhook Testing** - Payment flow simulation, failure scenarios, idempotency validation
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
   **Goal:** Implement FLUX 2 fine-tuned integration with **voice-powered design refinement**

  **Deliverables:**
  - Design category selector UI
  - LoRA visual style gallery (4 initial styles)
  - Category preset configurations (5+ categories)
   - FLUX 2 fine-tuned with custom LoRAs via BFL API infrastructure
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
  - Stripe payment integration
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
  **Goal:** Enable artists to syndicate their MerchFrom product catalog to Discord, Meta (Instagram/Facebook Shop), TikTok Shop, and Twitch with a few clicks from their dashboard.

  > **Full Specification:** See `Documentation/Dev/SOCIAL_COMMERCE_HUB.md`

  **Prerequisites:**
  - Stable commerce and order systems (Phase 4+ complete)
  - Artist dashboard functional
  - Inventory tracking operational

  **Strategic Vision:**
  MerchFrom becomes the **Social Commerce Operating System** — the single source of truth for creator merchandise, automatically pushing products to 5+ platforms while aggregating orders back into a unified system.

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
  - **Revenue Strategy:** Always default to off-site checkout (redirect to MerchFrom direct) — Discord IAP takes 15-30% vs 0% on direct. Embedded Activity is a discovery tool, not a checkout surface.
  - **Monetization Note:** Discord takes 15-30% + 6% Stripe on in-app purchases

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
  - **Partner Portal:** MerchFrom registered as TikTok Shop Partner (US + Global)
  - **Products API:** Create/update products via TikTok Open API
  - **Order Sync:** Bidirectional order ingestion and fulfillment status updates
  - **EU Compliance (Dec 2024):** Manufacturer + Responsible Person fields for EU sellers
  - **Rate Limit:** 50 requests/second/store

  **5. Twitch Extension (Engagement Channel)**
  - **Panel Extension:** Persistent merch showcase below stream
  - **Overlay Extension:** "Now Selling" pop-up triggered by streamer
  - **External Link CTA:** "Get It" button redirects to MerchFrom e-shop
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
  - MerchFrom uses **fixed base costs** (tees €15, hoodies €25+)
  - Artists set their own retail price and keep the spread
  - Platform fees are deducted from **artist net**, never from MerchFrom base cost
  - **Strategy:** Always prefer off-site checkout (redirect to MerchFrom e-shop) to maximize artist margins

  **Platform Fee Impact Example (€35 Tee):**
  | Platform | Fee | Artist Net |
  |----------|-----|------------|
  | MerchFrom Direct | 0% | €20 |
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
   - FLUX 2 fine-tuned integration (custom LoRAs via BFL)
   - LoRA visual style gallery
   - Design session management
   → *Core differentiator, parallel to commerce*

  **5. Print Validation** *(Week 8-9)*
  - DPI/color/size checks
  - File export system
  → *Required before production*

  **6. Commerce Infrastructure** *(Week 10-13)*
  - Product catalog
  - Stripe integration
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

   **Risk: FLUX 2 Fine-Tuned Output Quality Inconsistency**
  - **Impact:** Generated designs not print-ready
  - **Likelihood:** Low (fine-tuned on Expert's expert designs)
  - **Mitigation:**
    - Comprehensive validation layer before presenting to user
    - Fallback to base FLUX 2 Flex if LoRA fails
    - Monthly LoRA retraining with customer-approved designs
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
  | **3. Expansion Scalability**<br>(Quality relies on Systems, not Heroes) | **Low** | **Expert is Support, NOT Lead.** Expansion relies on the "Merch From Playbook" and a hired Ops Manager, not Expert's daily presence. Validation: Document 100% of SOPs by Month 12. | Brazil hub fails quality audits despite following SOPs. | **Founder Deployment:** Victor relocates to Brazil for 3 months to retrain/restructure personally. |
  | **4. AI Reliability & Failure Value**<br>(Failures become Training Assets) | **Low**<br>(Mitigated) | **The "Frustration Protocol":** Repeated user edits trigger auto-handoff to Human Designer (Brazil Agency). Critical Twist: Every manual fix is instantly tagged for the training dataset, turning today's failure into tomorrow's capability. | Human intervention rate exceeds 30% (unsustainable agency cost). | **Scale Human Layer:** If AI struggles, we simply treat the "Human Desk" as a core feature (charging a small fee for "Pro Design Support") while the model catches up. |
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
  - **Constraint:** Brother GTX Pro (90s/print avg) = ~450 units/10h shift.
  - **Backup:** TexPro Series 2 (~4 min/print) = ~150 units/10h shift.
  - **Total Internal Capacity:** ~300-500 units/day (realistic operational capacity).
  - **Bottleneck:** Finishing/packing (not printing speed).

  **Response Strategy (72h Shipping Turnaround):**
  - **Day 1 (The Spike):**
    - Instant implementation of **"Dynamic Shipping Windows"**: New orders automatically update to "Ships in 5-7 days" once the 72h capacity bucket (1,800 units) is full.
    - **Activate Extended Shifts:** Run 14-16h shifts to push daily output to ~850 units.
  - **Day 2 (The Equipment Scaling):**
    - **Purchase Order Trigger:** If volume sustains >800/day for 48h, order a **Second Brother GTX Pro**.
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
    - Shift applicable designs (full color/gradients) to **Brother GTX Pro (DTG)** and **DTF**.
    - *Note:* Notify customers of "Free Digital Upgrade" (often perceived as premium for detail, though slower for bulk).
  - **Layer 3: Local Offload (External):**
    - Activate the "Neighbor Network." In Barcelos, we are surrounded by industrial printers.
    - *Protocol:* Victor personally oversees QC at partner facility to maintain the "Merch From Standard."

  **Prevention Strategy:**
  - **Spare Parts Kit:** Hold critical spares (relays, sensors, print heads) on-site (Value: ~€2k investment).
  - **SLA:** Purchase "Gold Support" from equipment vendor for 48h part dispatch.

  ### 14.4 The "Neighbor Network" Vetting Standard (Quality Assurance)
  To ensure outsourced orders (Scenario 1 & 2) are indistinguishable from in-house production:

  1.  **The "Magna Mandate":** Partners must agree to use **Magna Colours HB** (Water-based) inks. If they don't stock it, *we supply the ink kits* for our jobs. Zero tolerance for Plastisol substitution.
  2.  **The "First Pull" Protocol:** For any overflow batch >100 units, a Merch From Quality Manager (or Victor) must physically visit the partner facility to sign off on the first printed unit (registration, cure, hand feel) before the run proceeds.
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
  - Expert dataset IP (unique moat not replicable by acquisition)

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
    - Agency/label branding (remove Merch From logos)
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

