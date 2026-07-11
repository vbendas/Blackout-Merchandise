# User Journeys


  ### 1. The Bulk Power-User: "Maria the Metal Manager"
  **Profile:** Manager for "Iron Casket" (Touring Metal Band).
  **Need:** 300 t-shirts for the European tour starting in 10 days. Complex 6-color back print.
  **Pain Point:** Local shops are too slow; big platforms don't do complex screen prints well.

  **The Journey:**
  1.  **Entry:** Maria lands on the site. Key presses "Space" to talk to **Leopoldo**.
  2.  **Negotiation:**
      *   *Maria:* "I need 300 tees, heavyweight black, 6-color print. Delivered to Berlin by the 14th."
      *   *Leopoldo:* "A serious deadline! For 300 units, I can unlock the 'Touring Tier' pricing—€12.50/unit. But we must approve art *today* to hit the Berlin truck. Francisca?"
  3.  **Production Check:**
      *   *Maria uploads the intricate skull artwork.*
      *   *Francisca:* "Gorgeous linework. But those dark greys will vanish on a black tee. Shall we do a 'Discharge Print' so it feels soft, not plastic? I've adjusted the contrast here." *(Shows adjusted mockup).*
      *   *Maria:* "Perfect. Do it."
  4. **The Close:**
      *   *Leopoldo:* "Order locked. €3,750 total. You save €400 vs standard rates. Ready to confirm?"
      *   *Maria:* "Do it."
      *   *Leopoldo presents a 'Pay w/ Apple Pay' card.*
      *   *Maria double-clicks her side button. FaceID scans. Done.*
  5.  **Outcome:** Maria sleeps easy. She gets a notification from **Antônia** 7 days later: "The skulls are printed. They look terrifying. Tracking ID #9921."

  ### 2. The First-Timer: "Alex the Visual Artist"
  **Profile:** Digital illustrator, 5k Instagram followers.
  **Need:** Wants to sell merch but has €0 budget and doesn't know how to prepare files for print.
  **Pain Point:** Overwhelmed by Spreadshirt's dashboard.

  **The Journey:**
  1.  **Entry:** Alex sees a TikTok about "Merch From." Taps link.
  2.  **Visual Setup (No Auth Yet):**
      *   Alex uses the **Visual Editor** to pick a dark "Industrial" theme and drop in his logo. It takes 5 minutes to make the shop look cool.
  3.  **Merch Creation (AI Managed):**
      *   *Alex:* "I have this drawing of a sad robot."
      *   *Francisca (AI):* "Oh, he is darling! For a drawing like this, a Totebag is classic. Let me generate a high-res mockup for you."
      *   *Alex:* "The tote looks empty."
      *   *Francisca:* "Shall we add your signature or a phrase below it? Perhaps 'Disconnected' in a typewriter font?"
  4.  **Launch (Invisible Auth):**
      *   *Alex uploads his own 'Intro Banner' image to the visual editor.*
      *   *Leopoldo (AI):* "Product added. To go live, just confirm you are human."
      *   *Prompt:* "Create Account with FaceID?" → Alex scans face. **Account Created.**
      *   *Leopoldo:* "The store is live, my friend. Here is a 'Launch Video' for your Story."
  5.  **Outcome:** Alex sells 12 totes in the first week. He didn't spend a dime. He gets a ping from **Antônia (AI)**: "You made €84 this week! I've sent it to your Revolut. Buy yourself a treat."

  ### 3. The Switcher: "The Echoes" (Indie Band)
  **Profile:** Indie Rock band, 25k monthly listeners.
  **Need:** Better margins. Currently using Redbubble but only making €2 per shirt.
  **Pain Point:** Fans complain the Redbubble shirts feel "cheap."

  **The Journey:**
  1.  **Entry:** They import their Redbubble designs into Merch From.
  2.  **The Upgrade:**
      *   *Leopoldo:* "I see you sell these for €25 but only keep €3. Criminal! Here, we use Organic Cotton blanks. You sell for €30 (fans will pay for quality), and you keep €14. That is 4x your profit."
      *   *Band:* "But is the quality actually better?"
      *   *Francisca:* "Redbubble uses standard DTG restricted to A3 size on thin promo tees. We use **Premium DTG** with high-gamut inks on 220gsm heavyweight cotton—and we print **Oversized A2**. Look at the difference in scale and saturation."
  3.  **Logistics:**
      *   *Band:* "What about returns?"
      *   *Antônia:* "If a fan is unhappy, they talk to me. I handle refunds. You just play music."
  4.  **Outcome:** The Echoes switch. They launch a "Premium Fan Club" drop. They make more profit in 1 month than 1 year on Redbubble.

  ### Why These Perspectives Matter
  *   **Maria** proves we can handle **Volume & Ops**.
  *   **Alex** proves we solve the **"Zero to One"** creative hurdle.
  *   **The Echoes** prove our **Unit Economics** win against incumbents.

  ---

  ---



## 1.12 Waiting List Application (The "Voice Interview")

To create exclusivity and gather rich intent data, we replace the standard "Sign Up Form" with a **Voice-to-Voice Interview** with Leopoldo.

### The Strategy: "The Velvet Rope"
*   **Goal:** Filter for passion/quality and "wow" the user immediately with our tech.
*   **Mechanism:** MiniMax Speech 2.6 Real-Time Voice API.
*   **Cost Control:** Used *only* for this 60-second interview. Post-interview, the app reverts to standard Text/STT.

### The Flow
1.  **Entry:** User clicks "Apply for Access" on Landing Page.
2.  **Setup:** "Leopoldo wants to meet you. Enable mic." (Fallback: "Prefer to type?" toggle).
3.  **The Interview:** Leopoldo asks 3 key questions:
    *   *Experience:* "Have you sold merch before, or is this your first drop?"
    *   *Scale:* "How big is your audience right now?" (**Sentinel Trigger**)
    *   *Vibe:* "Describe your art style in three words."
4.  **The Sentinel Check (VIP Intercept):**
    *   **Logic:** If user mentions >10k followers or "Touring", the AI **interrupts the script**.
    *   **VIP Branch:** "Wow, 50k is serious. Listen, I can fast-track you to the Beta right now... but I need a favor. Would you record a quick 'I'm joining Merch From' shoutout for us?"
    *   **Result:** We capture a testimonial *before* they even use the product.
5.  **Completion:** "I've filed your application. Stay tuned."

### Data Architecture: "The Shadow Transcript"
   We do not analyze audio in real-time (expensive). We process **Text Transcript** post-call.
    *   **Capture:** MiniMax Speech streams text -> Client buffers -> Saves to `waiting_list_interviews` table.
   *   **Extraction (Async):** An LLM "Extractor Agent" reads transcript and tags user:
     *   `WHALE` (>50k, Touring) -> Alert Founder.
     *   `ICP` (Visual Artist, Ethical) -> Auto-Invite.
     *   `NOISE` (Low effort) -> Nurture List.
   
   ---
   
   ---
   
   ## 1.13 Customer Validation Evidence
   
   > **Framework Document:** See [./03-Evaluations/Customer-Validation-Framework.md](./03-Evaluations/Customer-Validation-Framework.md) for detailed interview plans, survey templates, and validation criteria.
   > **Status:** Framework only - Interviews to be conducted during waitlist + crowdfunding phases (Feb-Apr 2026)
   
   ### Interview Framework (Q1-Q2 2026)
   
   #### Planned Interviews by Persona
   
   | Persona | Target | Timing | Goal |
   |----------|---------|--------|-------|
   | **Existing POD Artist** | 5-10 artists | Feb 2026 | Deep pain point validation |
   | **Touring Band** | 3-5 bands | Mar 2026 | Premium pricing + speed validation |
   | **Digital Artist (First-Time)** | 5-10 artists | Feb 2026 | Barrier to entry analysis |
   | **Ethical Brand** | 3-5 brands | Apr 2026 | Premium willing to pay |
   
   #### Quote Collection Structure
   
   When interviews are conducted, add to PRD with this format:
   
   ```
   ### Artist Pain Points
   - "The biggest problem with Printful is..." — [Artist Name], Existing POD Artist
   - "We lost money on merch because..." — [Artist Name], Touring Band
   - "What stops me from selling is..." — [Artist Name], Digital Artist
   
   ### Pricing Validation
   - "I'd switch to Merch From if margins were..." — [Artist Name], Pricing sensitivity
   - "My fans would pay more for..." — [Artist Name], Quality premium
   
   ### Feature Prioritization
   - "AI would help me most with..." — [Artist Name], Feature ranking
   ```
   
   ### Waitlist Survey Framework
   
   Automated follow-up to voice interview submissions:
   
   1. "What's your biggest merch challenge right now?"
   2. "How much are you currently making per sale?"
   3. "On a scale of 1-10, how important is ethical production?"
   4. "What platform do you use now?"
   5. "Would you try a demo in February?"
   
   **Data Capture:** Store in `waiting_list_surveys` table for analysis and investor materials.
   
   ### Validation Criteria for Product-Market Fit
   
   | Signal | Threshold | Action |
   |---------|-----------|--------|
   | **Pain Score ≥ 7** | 7+ out of 10 on survey | Prioritize for beta access |
   | **Willingness to Pay Premium** | ≥10% margin + €2-3 base cost premium | Strong ICP fit |
   | **Ethical Priority ≥ 8** | 8+ out of 10 on survey | Target for marketing materials |
   | **Demo Interest = Yes** | Explicit yes to trial | Invite to immediate beta |
   | **Touring Band Need** | <7 day turnaround required | Fast-track production SOP |
   | **AI Design Ranked #1-2** | AI assistance in top 2 priorities | Validate core value prop |
   
   ### Investor Presentation Quotes (Target Collection)
   
   When quotes are collected, these become investor materials:
   
   #### Margins
   > "I make €2 per €25 shirt on Redbubble. That's criminal. Merch From offered me €14 for the same sale." — Existing POD Artist
   
   #### Quality
   > "Fans constantly tell me my Redbubble shirts feel cheap. I'd pay €5 more for premium quality." — Touring Band
   
   #### Speed
   > "I'm on tour. I need merch in 3 days, not 14. Printful can't deliver that." — Touring Band
   
   #### AI Value
   > "I have great ideas but don't know how to prepare files for print. AI would solve everything." — Digital Artist
   
   #### Ethical Alignment
   > "My customers ask about sustainability. I'd pay 20% more for certified ethical production." — Ethical Brand
   
   ---
   
   ---

---


  ## 1.13 Verification Plan

  ### Manual Verification
  - **End-to-End Testing:** Manual walkthroughs of the "Bulk Power-User" and "First-Timer" journeys.
  - **Visual Inspection:** Verify Dark Mode ("Ink & Void") consistency and "Hero-to-Copilot" transitions.
  - **Cross-Browser:** Validation on Chrome, Safari, and Firefox (Desktop & Mobile).

  ### Automated Verification (DevTools MCP)
  In addition to manual testing, we will use the **Chrome DevTools MCP** to enforce technical quality standards:
  1.  **Accessibility (A11y):** Use `take_snapshot` to validate that all interactive elements have valid `aria-labels`, ensuring the "Ethical" value extends to digital inclusivity.
  2.  **Network Performance:** Use `get_network_request` to assert **Time-to-First-Token (TTFT) < 500ms** for AI streams. "Thinking" animations must trigger immediately.
  3.  **Error-Free Sessions:** Use `list_console_messages` to ensure **Zero Uncaught Exceptions** during critical user journeys.
  4.  **Slow Network UX:** Use `emulate` (Slow 3G) to verify that the app remains functional and loading states are coherent under poor network conditions.

  ---

  ## 2. Go-to-Market Strategy


  ### 2.1 Pre-Launch Validation Campaign (Weeks 1-10)

  **Goal:** Validate market demand and build waitlist before equipment investment

  **Phase 1: Demo Artist Catalog (Weeks 1-4)**
  - Build 1 fully polished demo artist storefront showcasing platform capabilities
  - Create 3-5 AI-generated artwork collections demonstrating design quality
  - Generate 15-20 realistic product mockups (tees, hoodies, tote bags, etc.)
  - Record 90-second platform walkthrough video for marketing
  - Simulate order history showing "€2,400 in sales" for investor credibility

  **Phase 2: Waitlist Landing Page (Week 5)**
  - High-converting pre-launch page with:
    - Hero: *"Your Art. Your Merch Empire. Zero Upfront Costs."*
    - Subhead: *"Premium quality, ethically sourced, AI-designed. For creators who care."*
    - 3-minute explainer video featuring demo store
    - Artist signup form capturing:
      - Name, email, social media handles (Instagram/Spotify/etc.)
      - Genre/niche (music, visual art, streetwear, etc.)
      - Current merch experience (none / DIY / existing vendor)
      - Desired products (poll: tees, hoodies, hats, stickers, etc.)
      - Monthly social reach (followers/streams)
      - Values alignment: "Do you prioritize organic/fair-trade/eco-friendly products?"
    - "Reserve Your Artist Slug" CTA (e.g., `merchfrom.com/yourname`)

  **Phase 3: Traffic Generation (Weeks 6-8)**
  - **Reddit:** Post in r/WeAreTheMusicMakers, r/bandmembers, r/streetwearstartup
  - **Facebook Groups:** Independent musician & artist entrepreneurship communities
  - **Instagram/TikTok:** Partner with 3-5 micro-influencer artists (1k-10k followers) aligned with sustainability values
  - **ProductHunt:** Launch as "AI-powered ethical merch platform for creators"
  - **Cold Outreach:** DM 50 artists/bands with 5k-50k followers who emphasize sustainability/ethics

  **Target Metrics:**
  - 300-500 waitlist signups
  - 60%+ want DTG tees/hoodies
  - 40%+ have 1k+ social followers
  - 30%+ currently sell merch (validated need)
  - 70%+ prioritize ethical/sustainable products

  ### 2.2 Invite-Only Launch Strategy

  **Platform Access Model:**
  - **100% free platform** - No subscription plans, no upfront costs for artists
  - **Invite-only onboarding** for quality control and manageable growth
  - **Transparent revenue model:** Artists set their own retail prices, keep all profit above base cost
  - **Zero financial risk:** Artists only pay when products sell (via deduction from sale price)

  **Pricing Model (Clear & Transparent):**

  ```
  Example: T-Shirt Sale
  ─────────────────────────────────────
  Artist sets retail price:        €30.00
  Customer pays:                   €30.00

  Deductions:
    Stripe payment fee (2.9%):     -€0.87
    Stripe fixed fee:              -€0.30
    Platform base cost:           -€15.00
                                  ────────
  Artist receives:                 €13.83  (46% margin)
  ```

  **Key Principles:**
  - **Artists control pricing:** Set any retail price above base cost
  - **Full transparency:** Base costs clearly displayed for each product type
  - **No hidden fees:** Only deductions are base cost + payment processing
  - **Instant payouts:** Weekly automated transfers to artist bank accounts
  - **No minimums:** Sell 1 item or 1,000, same pricing structure

  **Base Cost Examples (Subject to Market Adjustment):**
  - T-Shirt (DTG, 100% organic cotton): €15
  - Hoodie (DTG, fair-trade blend): €28
  - Tote Bag (organic canvas): €12
  - Hat/Cap (sustainable materials): €18
  - Sticker Pack (eco-friendly vinyl): €5

  **Why Artists Win:**
  - **Premium quality blanks:** 100% organic cotton, fair-trade, eco-friendly materials
  - **In-house printing:** Consistent, professional results with direct quality control
  - **Values alignment:** Vegan, sustainable, ethical production matches artist brand
  - **No inventory risk:** Zero upfront investment, no minimum orders
  - **Strong margins:** Keep 40-60% of retail price as profit
  - **Direct fulfillment control:** Faster turnaround, better customer experience
  - **Brand-aligned quality:** Premium products that reflect artist's values and professionalism

  **Invite Criteria (Initial Phase):**
  - Social media following: 1,000+ engaged followers
  - Existing merchandise interest/sales history
  - Active content creation (music releases, art posts, brand engagement)
  - Professional presentation (quality social profiles, consistent aesthetic)
  - Values alignment with platform (vegan, fair-trade, eco-friendly, premium quality focus)

  **Onboarding Process:**
  1. Waitlist review: Manual screening based on invite criteria
  2. Personalized invite email with custom onboarding link
  3. 1-on-1 kickoff call (15 min) to understand artist goals
  4. Guided store setup with AI assistant
  5. First product design session (live support available)
  6. Store launch with platform marketing support

  **Benefits of Invite-Only Approach:**
  - **Quality control:** Curate high-quality artist roster for brand reputation
  - **Manageable scale:** Onboard artists at pace matching fulfillment capacity
  - **Personal touch:** Build relationships, gather feedback, create advocates
  - **Exclusivity perception:** "Invite-only" increases perceived value and desirability
  - **Iterative improvement:** Fix issues with small cohorts before scaling

  ### 2.3 Investor Pitch Preparation (Weeks 9-10)

  **Investment Need: €300,000**

  **Operations Location: Portugal** (Moving from Ireland to Portugal for cost efficiency and alignment with ethical business model)

  **Use of Funds:**

  ```
  PREMIUM EQUIPMENT EXPANSION:            €132,500
  ────────────────────────────────────────────────

  Anatol VOLT-M Automatic Press:           €70,000
    - 12 heads, 10 colors
    - Fully electric (no compressor needed)
    - 500-800 prints/hour (vs 50-100 manual)
    - Industry-leading registration precision
    - Essential for bulk orders (200-5000 units)
    - Industry-leading registration precision
    - **Strategic Role:** High-volume "Anchor Tenant" orders (festivals, major bands) to ensure capacity utilization.
    - ROI: 12-15 months at 60% capacity

  Anatol Semi-Automatic 8-Color Press (EXISTING):    €0 (Owned)
    - **Strategic Role:** Agility. Handles small batches (50-400 units) and quick turnarounds.
    - 500-800 prints/day capacity
    - Perfect for "Waitlist Drop" releases

  Brother GTXpro B + Large Platen:         €20,000
    - Hybrid DTG/DTF production printer (bulk ink system)
    - 1.8L & 18L bulk ink tanks — ~40-50% lower ink cost vs pouch
    - High-speed mode: ~20% faster throughput (~540 units/10h shift)
    - OEKO-TEX ECO PASSPORT & GOTS Approved inks (ethical brand alignment)
    - Enhanced automated maintenance (reduced clogging, less downtime)
    - Print queue/reservation system for mixed DTG/DTF workflow
    - Large platen for oversized prints (A2+)
    - Exceptional detail on dark garments (1200 × 1200 dpi)
    - **Pantone-Calibrated ICC Profile:** Custom profile developed to match Brother CMYK output with Magna Colours Pantone solid coated standards, ensuring visual consistency across mixed-media collections.

  ECONORED 54 Infrared Dryer:              €15,000
    - Screen printing curing tunnel
    - 54" belt width, variable speed
    - Essential companion for automatic press

  Roland Print+Cut Plotter:                €12,000
    - Sticker production capability
    - Die-cut custom shapes
    - New product category (sticker packs, decals)

  Anatol Rapid Wave Quartz Flash:          €7,000
    - Mid-cure flash unit for multi-color work
    - Quick flash between colors
    - High durability, low maintenance

  PRETREATmaker IV:                        €6,000
    - DTG pretreatment machine
    - Professional-grade consistency
    - Essential for white ink printing

  Powder Machine 4050:                     €2,500
    - DTF powder application
    - Production efficiency
    - Consistent adhesive coating


  EXPERT TRAINING & KNOWLEDGE TRANSFER:        €7,500
  ────────────────────────────────────────────────

  "The Palmprint" Certification (Tony Palmer): €7,500 (Est)
    - **The World's #1 Auto-Press Expert:** Hiring Tony (@palmprint) for 3-day on-site intensive.
    - **Scope:** Complete machine calibration, workflow optimization, and failure prevention training.
    - **Signal:** We aren't just buying the best machine; we are paying the world's best expert to teach us how to run it at 100% efficiency.
    - **Includes:** Cache (€5k) + Travel/Hospitality (€2.5k).

  MAGNA COLOURS HB SERIES & CONSUMABLES:   €15,000
  ────────────────────────────────────────────────

  Magna Colours HB Series Inks:            €8,000
    - GOTS-certified water-based inks
    - Eco-friendly, PVC-free, phthalate-free
    - "Discharge-mocking" effect on dark fabrics
    - Ultra-soft hand feel (premium touch)
    - Full CMYK + specialty color range
    - **MagnaMix Pantone System:** Official IM6 formulation system allows us to mix ANY Pantone color with gram-perfect precision.
      > **Unlock:** This capability allows us to pitch to **Corporate Clients (B2B)** and Tech Startups who require strict brand guideline compliance—opening a high-volume revenue stream alongside creator drops.

    ★ ETHICAL MOAT: Magna Colours HB series allows
      us to achieve discharge-print aesthetics (soft,
      vintage, "printed into the fabric" feel) WITHOUT
      actual discharge chemicals. This gives us:
      - Premium soft-touch finish customers pay more for
      - Eco-friendly production (no harsh chemicals)
      - Safer working environment
      - Marketing story that resonates with ethical buyers
      - Competitive advantage vs harsh plastisol users

  Specialty Inks:                          €2,000
    - Metallics, glow-in-dark, high-density
    - Premium product differentiation

  Emulsions & Screen Chemicals:            €2,000
    - Capillex CP-Tex (high-detail)
    - Degreasers, reclaimers, haze removers

  DTG/DTF Inks & Consumables:              €2,000
    - Brother genuine inks
    - Pretreatment fluid, powder, film

  Misc Production Chemicals:               €1,000
    - Cleaners, adhesives, consumables


  BLANK STOCK INVENTORY:                   €25,000
  ────────────────────────────────────────────────
  - T-shirts (organic cotton): ~1,500 units
  - Hoodies (organic/fair-trade): ~300 units
  - Tote bags (organic canvas): ~500 units
  - Crewnecks, hats, accessories
  - 3-4 month production buffer
  - Premium WATC-Studio blanks (Portugal supplier)


  TEAM (24 months, lean model):            €50,000
  ────────────────────────────────────────────────
  EQUAL WAGE MODEL: €1,400/month (Portugal livable wage)

  Phase 1 (Months 1-6): Founder Solo
    Victor: €1,400/mo × 6 =                €8,400

  Phase 2 (Months 7-24): + Local Production Manager
    Victor + PM: €2,800/mo × 18 =         €50,400
    
    Note: Production Manager hired locally in Portugal
    to reduce costs and dependency. Victor (9 years
    screen printing experience) directly oversees
    production quality and training.

  Total team allocation:                  €50,000*
  (*Adjusted within budget constraints)

  AI Dataset Annotation is contracted separately to
  world-class experts (see Dataset Curator Panel).


  FACILITY SETUP:                          €18,000
  ────────────────────────────────────────────────
  Warehouse deposit (3 months):            €3,600
  First month rent advance:                €1,200
  Electrical work (3-phase):               €4,000
  Ventilation/extraction system:           €3,000
  Flooring & repairs:                      €1,500
  LED lighting (color accuracy):           €1,000
  Workbenches & storage:                   €2,000
  Fire safety & compliance:                €1,200
  Equipment installation:                  €500

  Note: No compressor needed (VOLT-M is fully electric)


  CASH FLOW & OPERATIONS:                  €57,000
  ────────────────────────────────────────────────
  This reserve covers ongoing operational costs:

  Platform infrastructure (24mo):          €7,200
  AI hosting (self-hosted GPU):            €7,200  (vs €480 Recraft)
  Marketing (ads, influencers):           €15,000
  Shipping & packaging supplies:           €8,000
  Utilities (24 months):                   €7,200
  Insurance & compliance:                  €4,000
  Maintenance & repairs:                   €5,000
  Unexpected costs buffer:                 €5,000
  Working capital (small inputs):          €5,600



  ═══════════════════════════════════════════════
  TOTAL INVESTMENT ASK:                   €305,000

  TOTAL CAPITALIZATION:
    Existing assets (founder equity):     €113,000
    Investment:                           €305,000
    ────────────────────────────────────
    Total:                                €418,000

  Post-Money Valuation Target:     €1.65M-1.85M
  Investment Equity: 16-18%

  RUNWAY: 24 months to profitability
  (vs 18 months if based in Ireland)
  ```

  **Crowdfunding / Pre-Sales Allocation Protocol:**
  Any net capital raised via Rewards Crowdfunding (Product Pre-sales) is strictly allocated to **Capacity Acceleration**, not Operations. This ensures preserving the investor runway while unlocking growth bottlenecks.

  - **Tier 1 Goal (€15k raised):** Immediate purchase of **2nd Brother GTXpro B** (Solving the PoD Capacity Bottleneck ahead of schedule).
  - **Tier 2 Goal (€25k raised):** Pre-purchase of 6-month blank inventory buffer (Locking in bulk pricing).

  **Why Portugal:**
  - **40% lower operational costs** vs Ireland
  - **Thriving creative/tech talent pool** (Porto, Lisbon)
  - **EU market access** maintained
  - **Aligns with ethical brand values** (fair wages in local context)
  - **Strong screen printing community** and suppliers
  - **Better work-life balance** for team (cultural fit)
  - **Property acquisition pathway** via Castelo Branco industrial land grant (€0.01/m²)

  **Facility Strategy (Castelo Branco - Own from Day One):**

  **Decision: Castelo Branco over Porto**
  - **Industrial land:** €0.01/m² via Castelo Branco Invest CB municipal program (vs €100-120K in Porto)
  - **Equipment grant:** Up to 50% non-repayable support via Portugal 2030 interior incentives (vs 30% coastal)
  - **Own facility from day one** instead of renting for 2-3 years
  - **De-risk narrative:** "We own our industrial unit and recovered 50% of equipment costs through grants"

  **Financial Impact:**
  | Item | Porto (Original) | Castelo Branco (New) |
  |------|-----------------|---------------------|
  | Industrial land | €100-120K purchase | ~€20 (2,000m² at €0.01/m²) |
  | Monthly rent (Year 1-2) | €1,000-1,200/month | Near-zero (own land) |
  | Equipment grant | None | Up to 50% (~€56,500 on €113K) |
  | Total 24-month land cost | €128,800-148,800 | ~€20 + build-out |
  | Asset ownership | Year 2-3 | Day one |

  **Why Castelo Branco:**
  - ✅ **Own, don't rent** - Building equity from day one, not burning €28,800 in rent
  - ✅ **Grant recovery** - 50% equipment grant = ~€56.5K non-repayable (interior vs 30% coastal)
  - ✅ **De-risk for investors** - Hard assets (facility + equipment) back the investment
  - ✅ **Crowdfunding narrative** - "Own facility, grant-funded, zero rent" is stronger than "renting in Porto"
  - ✅ **E-commerce fit** - Logistics disadvantage minimal for mainly online business (200km vs 50km to Barcelos)
  - ✅ **EU sovereignty alignment** - Interior Portugal + Mistral AI = fully European operation
  - ✅ **Founder commitment** - Victor is purchasing residential land in Castelo Branco, establishing permanent local presence and community integration
  - ✅ **Local hiring pipeline** - Pre-existing network of young people with shared values (sustainability, ethical production, off-grid living) already in region = trainable workforce aligned with company culture

  **Founder Residential Commitment & Community Integration:**
  - **Personal Land Purchase:** Victor is acquiring residential land in Castelo Branco, establishing permanent residence alongside the business facility. This signals institutional commitment to the region and eliminates municipal concerns about capital flight or temporary presence.
  - **Local Community Network:** Victor is embedded in a pre-existing network of young people and local residents in Castelo Branco who share company values (sustainability, ethical production, vegan/fair-trade principles, off-grid living). This network represents:
    - **Immediate hiring pipeline** for production, support, and operations roles
    - **Cultural alignment** that reduces onboarding friction and increases employee retention
    - **Community validation** that the business is authentically rooted in local values, not extractive
  - **Narrative for Grant Applications:** The combination of founder residence, existing community ties, and pre-validated hiring pool strengthens grant positioning significantly:
    - *"MerchFrom is not a coastal tech startup seeking interior subsidy. It's a founder relocating to the interior with personal financial commitment (residential land purchase) and active integration into an existing community network committed to sustainable, ethical production."*
    - This positioning unlocks municipality-level support programs, ESG-focused grant streams, and interior depopulation initiatives (e.g., *Programa de Valorização do Interior*).

  **Creative Studio Hub — Music, Recording, Streaming & Photography:**

  The industrial unit includes a **Creative Studio Hub** — three dedicated creative spaces serving both MerchFrom internal production and the broader creative community of Castelo Branco. Access is free, governed through the MerchFrom platform's booking module, and open to musicians, bands, actors, digital creators, photographers, and illustrators.

  > **Full specification, equipment budgets, and grant narrative:** See [`/Documentation/06-Creative-Studio/Creative-Studio-Hub.md`](../06-Creative-Studio/Creative-Studio-Hub.md)

  **The Three Spaces:**

  | Space | Internal Use | Community Use |
  |-------|-------------|---------------|
  | **Music + Recording Room** | Artist sessions, brand audio content, demo recordings | Band rehearsals, recordings, live streams |
  | **Meeting + Streaming Room** | Artist onboarding, team meetings, partner calls | Streaming sessions, content production, workshops |
  | **Photo Studio** | Product photography, catalog shoots, campaign imagery | Portrait sessions, lookbooks, editorial content |

  **Booking System (MerchFrom Platform):**
  - Application gate — creatives apply, MerchFrom approves
  - 2 hours per booking, max 1 booking per week
  - Approval expires after 3 months of inactivity (keeps network active)
  - No-show: 1 lifetime warning, then 3-month suspension
  - Waitlist queue for full slots; freed slots auto-notify next in line
  - Full calendar transparency — all bookings visible as "MerchFrom" or "[Artist Name]"

  **Why this is strategic, not charitable:**
  - Organic content flywheel — community sessions generate authentic social content at zero paid-media cost
  - Network building — approved users are warm leads who have experienced MerchFrom firsthand
  - Platform engagement — booking through the app creates habit-forming touchpoints beyond merch transactions
  - Relationship moat — a trusted physical creative hub in a community is not replicable by remote competitors
  - Talent pipeline — active community users are natural candidates for future production and operational roles

  **Grant angle:** Reframes the industrial unit from "cheap land grab" to "creative infrastructure investment for the interior." Aligns with *Programa de Valorização do Interior*, ESG grant streams, and municipal depopulation initiatives. Measurable social impact (sessions served, unique users, community content produced) provides auditable outcomes for evaluators.

  **Budget Summary:**

  | Space | Equipment | Construction/Labor | Total |
  |-------|-----------|-------------------|-------|
  | Music + Recording Room | €5,385 | €1,850 | €7,235 |
  | Meeting + Streaming Room | €3,681 | €100 | €3,781 |
  | Photo Studio | €1,728 | €200 | €1,928 |
  | **Grand Total** | **€10,794** | **€2,150** | **€12,944** |

  **Risks & Mitigations:**
  - **Talent pool:** Smaller city (55K). Mitigation: remote-first for tech, pre-existing community network for production/support roles
  - **Supplier distance:** 200km to Barcelos. Mitigation: bulk ordering schedules, local Centro region suppliers, WATC Studio partnership (Barcelos-based)
  - **Grant uncertainty:** Opportunities, not entitlements. Mitigation: confirm with municipality before marketing; founder residential commitment de-risks the "will you stay?" question
  - **Studio scheduling conflicts:** MerchFrom internal shoots may compete with community bookings. Mitigation: MerchFrom books via the same system with no priority override — plan sessions in advance and respect the queue like everyone else.

  **Next Steps:**
  1. Complete residential land acquisition in Castelo Branco
  2. Document community network (names, roles, availability) for grant applications
  3. Contact Castelo Branco municipality (Invest CB / ALECB) for land terms confirmation
  4. Identify open Portugal 2030 calls compatible with Merch From's investment structure and interior location
  5. Do NOT promise Castelo Branco in crowdfunding until municipality confirmation received
  6. Add Creative Studio Hub to grant application narrative as community social program + organic marketing infrastructure
  7. Scope studio build-out costs and include in facility financial model

  **Pitch Deck Contents (13-16 slides):**
  1. **Problem:** Independent artists lack access to premium, ethical merch without minimums or upfront costs
  2. **Solution:** AI-powered conversational commerce with in-house premium fulfillment
  3. **Market:** $50B+ global music/creator merch market, 200M+ creators worldwide, growing ethical consumer segment
  4. **Product Demo:** Live walkthrough of demo artist store + AI design generation
  5. **Business Model:** Transparent base cost + artist-controlled markup (€8-15 platform margin per product)
  6. **Traction:** Waitlist metrics (300-500 signups, demographics, values alignment data)
  7. **Competitive Advantage:** AI design + conversational UI + premium ethical production + no minimums
  8. **Unit Economics:** Gross margin >60%, CAC <€50, LTV >€500, AI costs <0.1% of revenue
  9. **AI Moat Strategy:** Launch with Mistral APIs ($0.02–0.04/design), build proprietary dataset (5,000+ expert-scored designs), migrate to self-hosted Voxtral + custom LoRAs at 250+ artists (cost reduction + defensible IP)
  10. **Go-to-Market:** Invite-only launch, organic creator networks, values-driven positioning
  11. **Roadmap:** 24-month plan with facility ownership + AI infrastructure scaling milestones
  12. **Team:** Founder triple-threat advantage (craft mastery + technical execution + growth marketing) + Expert Dataset Curator Panel (70+ years combined expertise for AI training) + local Production Manager
  13. **Ask:** €300K for equipment + inventory + lean team + 24-month runway
  14. **Future Milestones:** Property acquisition, AI model fine-tuning, international expansion, partnership network

  **Investor-Ready Metrics to Demonstrate:**
  - **Market validation:** "500 artists joined waitlist in 8 weeks with zero paid ads"
  - **Target persona clarity:** "68% musicians, 22% visual artists, avg 3.2k followers"
  - **Values alignment:** "72% prioritize ethical/sustainable products in their brand"
  - **Product-market fit signals:** "73% want DTG apparel, 45% spend €200+/month on merch"
  - **Revenue potential:** "30% conversion at avg €8.50 margin = €1,275 MRR from waitlist"
  - **Engagement:** "38% email open rate, 22% clicked through to demo store"
  - **Quality focus:** "89% frustrated with low-quality options from existing vendors"
  - **AI economics:** "AI costs ~$0.15-0.20 per design—still negligible at <1% of revenue"
  - **Proprietary dataset:** "Building 5,000+ expert-scored designs by Year 2 for 80% AI cost reduction"
  - **World-class expertise:** "Expert Panel: Expert A, Expert B (40+ years), Expert C (quality master)"
  - **Proven track record:** "Combined 70+ years screen printing mastery + 6,600+ trained students"

  **Pitch Presentation Assets:**
  - Polished demo artist storefront (live, production-quality)
  - 3-minute platform demo video
  - Waitlist survey results (data visualization)
  - Financial projections spreadsheet (conservative 3-year model)
  - Sample premium product photos (from existing print shop portfolio)
  - Sustainability/ethical sourcing documentation
  - Founder story video (60 seconds)

  **Alternative Funding Paths:**

  #### 1. Crowdfunding Campaign (Kickstarter/Indiegogo) - Target: €35K-50K

  **Strategy:** Launch crowdfunding BEFORE investor pitch to validate demand, build community, and secure bridge capital for initial setup.

  **Reward Tiers:**

  **Tier 1: Supporter (€25)**
  - **30 Merch Coins** (€30 value—redeemable when platform launches)
    - Use to purchase from any artist's merch store
    - OR use for bulk screen printing orders (direct wholesale orders with us)
    - **Never expire** — use them anytime, forever
  - Exclusive "Founding Supporter" digital badge
  - Monthly newsletter with artist spotlights
  - **Redemption:** Available once first artist stores launch

  **Tier 2: Artist Pioneer (€99 / Early Bird: €79 - First 30)**
  - **100 Merch Coins** (€100 value—never expire)
    - Use for artist merch purchases OR bulk orders with us
  - **Priority onboarding** (skip the waitlist, guaranteed Month 1 access)
  - **1-on-1 store setup consultation** (30-minute call with team)
  - **Featured placement** on platform homepage for first month
  - **"Founding Artist" badge** on their storefront

  **Tier 3: Artist VIP (€249 / Early Bird: €199 - First 15)**
  - **250 Merch Coins** (€250 value—never expire)
    - Use for artist merch purchases OR bulk orders with us
  - Everything in Artist Pioneer tier, PLUS:
  - **1-on-1 design consultation session** with our designer (60 minutes)
    - Create most appealing product images for your store
    - Design eye-catching Instagram posts to promote your shop
  - **Co-marketing campaign** (platform promotes your store launch across all channels)
  - **Lifetime "VIP Artist" status** with dedicated support channel

  **Tier 4: Brand Partnership (€999 / Early Bird: €849 - First 2)** *(Limited to 5 total)*
  - **1,000 Merch Coins** (€1,000 value—never expire)
    - Use for artist merch purchases OR bulk orders with us
  - Everything in VIP tier, PLUS:
  - **Custom storefront design** (fully branded experience beyond templates)
  - **Quarterly strategy sessions** with founder (growth marketing insights)
  - **Early access to new features** (beta testing, input on roadmap)
  - **Named in platform "Founding Partners" page**

  **Tier 5: Sponsor (€2,500)** *(Limited to 3)*
  - **3,000 Merch Coins** (€3,000 value—never expire)
    - Use to purchase from any artist's merch store
    - OR use for bulk screen printing orders (direct wholesale orders with us)
  - **Behind-the-scenes content series** (monthly updates on equipment setup, production)
  - **Executive producer credit** on all platform marketing materials
  - **Invitation to grand opening event** (facility tour, meet artists, networking)

  **Campaign Projections:**

  ```
  CONSERVATIVE (€35K Target):
  ─────────────────────────────────────
  150 × Supporter (€25)            = €3,750
  80 × Artist Pioneer (€99)        = €7,920
  30 × Artist VIP (€249)           = €7,470
  5 × Brand Partnership (€999)     = €4,995
  2 × Sponsor (€2,500)             = €5,000
                                    ────────
                          TOTAL:    €29,135

  STRETCH GOAL (€50K):
  ─────────────────────────────────────
  250 × Supporter (€25)            = €6,250
  150 × Artist Pioneer (€99)       = €14,850
  50 × Artist VIP (€249)           = €12,450
  5 × Brand Partnership (€999)     = €4,995
  3 × Sponsor (€2,500)             = €7,500
                                    ────────
                          TOTAL:    €46,045
  ```

  **Why Merch Coins for All Tiers:**
  - **Unified value proposition:** Every backer gets tangible purchasing power
  - **Lifetime value:** Coins never expire—use them today, next year, or save for perfect artist drop
  - **Ecosystem building:** Supporters buy artist merch = drives artist revenue from day one
  - **Wholesale validation:** Artists using coins for bulk orders = validates business model early
  - **Trust signal:** No expiry tricks, genuinely generous reward structure
  - **Deferred fulfillment:** All redeemable at launch = zero delivery pressure during campaign

  **Why Early Bird Pricing:**
  - Creates urgency at campaign launch (critical first 48-72 hours)
  - Kickstarter algorithm rewards fast starts (30% in 3 days = 5x success rate)
  - Drives FOMO for artist tiers without additional cost to platform

  **Use of Crowdfunding Capital:**
  - Facility rental deposit + first 2 months (Portugal)
  - Equipment retrieval from storage (Ireland → Portugal)
  - Initial inventory purchase (500-1,000 organic blanks)
  - Platform infrastructure setup
  - Bridge capital until investor funds close

  **Strategic Value for Investor Pitch:**
  - **Validates demand:** "Raised €46K from 488 backers in 30 days"
  - **Proof of community:** "250+ artists pre-committed to platform"
  - **De-risks execution:** Already operational before investor capital deployed
  - **Stronger negotiation:** Reduces investor ask from €280K to ~€230K
  - **Real traction:** Converts "idea" into "launched business with customers"

  #### 2. Small Business Loan/Grant (Complementary to Crowdfunding):
  - Portuguese startup grants and microloans (using crowdfunding traction as proof)
  - EU sustainable business funding programs (eco-friendly manufacturing focus)
  - Arts & culture entrepreneurship grants (Porto/Lisbon creative economy initiatives)
  - Green business initiatives (circular economy, ethical production alignment)

  ### 2.4 Equal Wage + Profit-Sharing Model

  **Vision:** Build an equitable business where everyone—including the founder—earns the same base wage, with transparent profit-sharing that rewards collective success.

  #### **Core Principles**

  1. **Equal base wage for all** - Every core team member (including founder) earns €1,400/month (Portugal livable wage)
  2. **Equal profit-sharing** - 30% of monthly profits split equally among all core team members
  3. **Transparent by design** - All distributions via documented SEPA transfers with full audit trail
  4. **No equity for team** - Clean separation: equity = ownership risk, team = fair wage + profit upside
  5. **Discretionary reinvestment** - 70% of profits controlled by board for strategic growth
  6. **Dividend cap** - No dividends distributed until company reaches €50K/month profit (ensures runway protection)

  **Why This Model:**

  **Ethical Alignment:**
  - Walks the talk: If we're printing on ethical blanks, we should run an ethical business
  - No salary hierarchy = no resentment, politics, or favoritism
  - Transparent bank transfers = total accountability
  - Attracts mission-driven talent who care about impact, not just paychecks

  **Strategic Advantage:**
  - **Authentic brand story** - Can't be faked by competitors ("Our founder earns the same as our production assistant")
  - **Portugal cost savings** - €1,400/month is livable in Portugal (vs €2,500+ needed in Ireland)
  - **Attracts impact investors** - ESG funds love equitable compensation models
  - **Team loyalty** - Equal treatment = everyone invested in collective success
  - **Marketing gold** - Artists choosing platforms care about these values

  **Financial Benefits:**
  - Lower burn rate (Portugal wages 40% lower than Ireland)
  - Extended runway (24 months vs 18 months on same investment)
  - Scalable model (hire 10 people at €1,400 each = predictable costs)
  - Profit-sharing only when profitable (no fixed overhead during lean months)

  #### **Profit Calculation Formula**

  ```
  Monthly Net Profit:
    Gross Revenue (all sales)
    - Cost of Goods Sold (blanks, printing, shipping)
    - Operating Expenses (platform costs, salaries, rent)
    = Net Profit

  Profit Distribution:
    30% → Equal split among all core team members
    70% → Discretionary (board controlled)
  ```

  **70% Discretionary Pool Allocation:**
  - **Equipment & inventory** (reinvestment in production)
  - **Growth initiatives** (marketing, new product lines)
  - **Emergency buffer** (equipment repairs, unexpected costs)
  - **Performance bonuses** (exceptional contributions)
  - **Dividends to equity holders** (ONLY after €50K/month profit)

  **Dividend Cap (Protection):**
  > **No dividends distributed to founder or investors until company reaches €50K/month profit consistently for 3 consecutive months.**
  >
  > This ensures:
  > - Runway protection during growth phase
  > - All profits reinvested in scaling operations
  > - Team profit-sharing continues (30% pool)
  > - Founder/investor returns come from equity value, not early cash extraction

  #### **Compensation Structure**

  **All Core Team Members Get:**

  ```
  BASE SALARY (Equal for All):             €1,400/month
  ────────────────────────────────────────────
  - Founder: €1,400/month
  - Production Manager: €1,400/month
  - Customer Success: €1,400/month
  - Marketing Lead: €1,400/month

  No hierarchy. No favoritism. Everyone equal.

  PROFIT-SHARING (30% Pool, Equal Split):
  ────────────────────────────────────────────
  Paid monthly via direct EUR bank transfer
  Only when company is profitable
  Every core team member gets equal share
  ```

  **Example Scenarios:**

  **Month 6 (€2,000 profit, 2 core team: Founder + Production Manager):**
  ```
  30% profit pool: €600
  Each person gets: €300

  Founder total comp: €1,400 base + €300 = €1,700/month
  Production Manager: €1,400 base + €300 = €1,700/month

  70% discretionary (€1,400): Reinvested in inventory
  ```

  **Month 12 (€10,000 profit, 4 core team):**
  ```
  30% profit pool: €3,000
  Each person gets: €750

  Everyone's total comp: €1,400 base + €750 = €2,150/month

  70% discretionary (€7,000):
    - €3,000 → Equipment upgrade
    - €2,000 → Inventory buffer
    - €1,500 → Performance bonus (production manager solved major issue)
    - €500 → Team dinner

  Production Manager that month: €1,400 + €750 + €1,500 bonus = €3,650
  ```

  **Month 18 (€25,000 profit, 4 core team):**
  ```
  30% profit pool: €7,500
  Each person gets: €1,875

  Everyone's total comp: €1,400 base + €1,875 = €3,275/month

  70% discretionary (€17,500):
    - €10,000 → Automatic press payment
    - €5,000 → Marketing campaign
    - €2,500 → Emergency buffer

  NO dividends yet (haven't reached €50K/month threshold)
  ```

  **Month 24 (€60,000 profit, 4 core team - DIVIDEND THRESHOLD REACHED):**
  ```
  30% profit pool: €18,000
  Each person gets: €4,500

  Everyone's total comp: €1,400 base + €4,500 = €5,900/month

  70% discretionary (€42,000):
    - €20,000 → Expansion inventory
    - €10,000 → New equipment
    - €5,000 → Marketing
    - €7,000 → DIVIDENDS (founder 82% = €5,740, investors 18% = €1,260)

  Now dividends can be distributed (hit €50K/month threshold)
  ```

  **Who Gets What:**

  **Core Team (No Equity):**
  - ✅ Equal base salary (€1,400/month)
  - ✅ Equal profit-sharing (30% pool split)
  - ❌ No equity
  - ❌ No dividends
  - Can earn discretionary bonuses (70% pool)

  **Founder (You):**
  - ✅ Equal base salary (€1,400/month) - same as team
  - ✅ Equal profit-sharing (25% of 30% pool if 4-person team)
  - ✅ Equity ownership (81-84% of company)
  - ✅ Dividends from 70% pool (ONLY after €50K/month profit)
  - Big payday comes from equity exit, not salary

  **Investors:**
  - ❌ No salary
  - ❌ No profit-sharing
  - ✅ Equity ownership (16-19% of company)
  - ✅ Dividends from 70% pool (ONLY after €50K/month profit)
  - ✅ UNCAPPED returns via equity exit

  **Why Not Artists?**
  - Artists already earn 40-60% margins on every sale
  - Compensated via platform success (more sales = more income)
  - Clean separation: artists = customers, team = builders

  #### **Crowdfunding Tiers**

  **Note:** Profit-sharing is reserved for core team only. Crowdfunding backers support the mission and receive tangible rewards, recognition, and community access.

  **Tier 1: Early Access Artist (€49)**
  - Priority platform access - be among first to launch
  - Guaranteed spot in first artist cohort
  - Early access to all new features
  - **"Founding Artist" badge** on profile

  **Tier 2: Founding Supporter (€199)**
  - Everything in Tier 1 +
  - **Listed on "Founding Supporters" page** with link to your work
  - **Priority customer support** (faster response times)
  - **Exclusive Discord access** — `#founders-lounge`, `#feature-voting`, `#build-in-public` channels with direct founder access
  - **`🔒 Founding Supporter` role** visible across the entire server
  - **Beta tester privileges** (vote on new features, see decisions before they ship)

  > **Discord Strategy:** See `Documentation/05-Community-Ownership/DISCORD_STRATEGY.md` for full server architecture, role system, and community programs.

  **Tier 3: Strategic Partner (€499)**
  - Everything in Tier 2 +
  - **Quarterly group call with founder** (max 20 participants)
  - **Input on roadmap priorities** (advisory role)
  - **Co-marketing opportunities** (we promote your brand)
  - **Featured placement** in platform marketing materials

  **Tier 4: Founding Patron (€1,999)**
  - Everything in Tier 3 +
  - **1-on-1 quarterly strategy call** with founder (30 min)
  - **VIP platform features** when launched (priority queue, advanced analytics)
  - **Permanent advisory board seat**
  - **Prominent logo placement** on website

  #### **Payout Mechanism**

  **Payment Method: Direct EUR Bank Transfers**

  All profit-sharing distributions are paid via **SEPA bank transfers** directly to team members' EUR bank accounts. This ensures simple, compliant, cost-effective payments with full audit trail.

  **Why Direct Banking:**
  - ✓ Universal access (everyone has bank account)
  - ✓ No learning curve or setup required
  - ✓ Regulatory compliant (standard employment practices)
  - ✓ Instant availability (funds directly in bank account)
  - ✓ Full audit trail (bank statements + business records)
  - ✓ Lower costs (€0.05 per transfer vs €2+ crypto fees)
  - ✓ Standard tax reporting (integrated with payroll)

  **Monthly Distribution Process:**

  1. **Finance admin approval:** Review calculated distribution in dashboard
  2. **Generate SEPA file:** Create batch transfer file with employee bank details
  3. **Upload to business bank:** Process batch transfer via business banking platform
  4. **Execute transfer:** Funds sent to all team members simultaneously
  5. **Generate confirmations:** Automatic payment confirmations and documentation

  **Frequency:** Monthly on the 15th (1-2 business days to receive)

  #### **Technical Implementation**

  **Platform Integration:**

  **Database Schema:**
  ```sql
  CREATE TABLE profit_sharing_contributors (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    category TEXT CHECK (category IN ('core_team')),
    role TEXT, -- 'developer', 'designer', 'operations', 'marketing', 'advisor'
    bank_account_iban TEXT NOT NULL,
    bank_account_name TEXT NOT NULL,
    bank_bic_swift TEXT,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for permanent allocation, set date if temporary
    is_active BOOLEAN DEFAULT true,
    total_earned DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE profit_sharing_distributions (
    id UUID PRIMARY KEY,
    distribution_month DATE NOT NULL,
    net_profit DECIMAL(10,2) NOT NULL,
    pool_percentage INTEGER NOT NULL, -- 15, 20, or 25
    total_pool_amount DECIMAL(10,2) NOT NULL,
    total_recipients INTEGER,
    status TEXT CHECK (status IN ('pending', 'approved', 'processing', 'completed')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    sepa_batch_id TEXT, -- For bank transfer batch reference
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE profit_sharing_payouts (
    id UUID PRIMARY KEY,
    distribution_id UUID REFERENCES profit_sharing_distributions(id),
    contributor_id UUID REFERENCES profit_sharing_contributors(id),
    amount DECIMAL(10,2) NOT NULL,
    payout_method TEXT CHECK (payout_method IN ('bank_transfer')),
    status TEXT CHECK (status IN ('pending', 'sent', 'confirmed', 'failed')),
    transaction_reference TEXT, -- Bank transfer confirmation ID
    sent_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

  **Admin Dashboard Features:**

  1. **Monthly Distribution Calculator:**
    - Input: Net profit for month
    - Auto-calculates pool amount and per-category splits
    - Shows active contributor count in each category
    - Displays per-person payout amounts
    - Generates approval queue

  2. **Approval Workflow:**
    - Finance admin reviews calculated distribution
    - Can adjust pool percentage (15-25%)
    - Can exclude specific contributors (with reason)
    - Approves batch for processing
    - System generates:
      - SEPA XML batch transfer file with bank details + amounts
      - CSV summary for record keeping

  3. **Payout Processing:**
    - **Bank Transfer:** Export SEPA file → Upload to business banking → Execute batch transfer
    - Admin inputs batch confirmation ID back into platform
    - System marks payouts as "sent" and tracks confirmations

  4. **Transparency Dashboard (Internal):**
    - Monthly pool amounts and distributions
    - Bank transfer confirmation records
    - Historical distribution chart
    - Active contributor counts per category

  **Business Banking Setup for Profit-Sharing:**

  **Timeline:** During business entity registration (Month 1-2)

  **Prerequisites:** Portuguese business entity registered, business bank account opened

  **Steps:**
  1. **Configure SEPA Batch Transfers:**
    - Enable batch payment functionality in business banking platform
    - Set up templates for recurring profit-sharing transfers
    - Configure approval workflows for batch payments

  2. **Payroll Integration Setup:**
    - Integrate profit-sharing with existing payroll system
    - Configure tax withholding for bonus payments (if required)
    - Set up automatic reporting for tax authorities

  3. **Documentation & Compliance:**
    - Establish profit-sharing policy documentation
    - Create employee agreement templates
    - Ensure compliance with Portuguese employment law

  4. **Technical Integration:**
    - Connect accounting system to banking API (if available)
    - Set up automated SEPA file generation
    - Configure confirmation tracking and reconciliation

  **Estimated Cost:** €0 (standard banking) + €500-800 for legal compliance review

  **Team Member Onboarding for Profit-Sharing:**

  **One-Time Setup (2 minutes):**
  1. Provide bank account details during employment onboarding
  2. Complete standard employee tax forms (Portuguese requirements)
  3. Sign profit-sharing agreement (part of employment contract)
  4. Confirm bank account with test deposit (if needed)

  **Receiving Monthly Payments:**
  - EUR appears automatically in bank account on 15th of each month
  - Standard bank statement shows transaction details
  - Immediately available (no additional steps required)

  **Tax Reporting:**
  - Profit-sharing treated as performance bonus (standard employment income)
  - Company provides annual tax documentation (equivalent to W-2/1099)
  - Standard income tax applies (handled through normal tax filing)

  **Support:** Standard HR onboarding process (no special technical knowledge required)

  **Implementation Phases:**

  **Phase 1: MVP (Months 1-12)**
  - Manual spreadsheet calculations
  - Admin dashboard for approval workflow
  - SEPA XML file generation and upload
  - Manual batch confirmation tracking
  - Internal transparency dashboard
  - Standard employment onboarding process

  **Phase 2: Semi-Automated (Year 2)**
  - Automated profit calculation from financial data
  - Banking API integration for streamlined transfers
  - Email notifications to team when transfer completed
  - Team member self-service portal (view history, update bank details)
  - Automated reconciliation with bank confirmations

  **Phase 3: Fully Automated (Year 3+)**
  - Real-time profit calculation and distribution
  - Automatic SEPA file generation and submission
  - Integrated payroll and tax reporting system
  - Mobile app dashboard for earnings history

  #### **Legal & Regulatory**

  **Required Actions:**
  - **Lawyer consultation:** €2,000-3,000 to structure as "Performance-Based Contributor Bonus"
  - **Terms & Conditions:** Clear contract stating payouts are discretionary and revocable
  - **Tax documentation:** Issue 1099/equivalent forms for recipients
  - **Right to adjust:** Reserve right to modify percentage annually with 30-day notice

  **Legal Framing:**
  - **NOT** equity, securities, or guaranteed income
  - Discretionary performance-based bonus program
  - Payouts contingent on platform profitability and continued operation
  - Can be paused or adjusted at any time
  - Standard EUR employment income (subject to normal tax withholding)
  - Company handles tax reporting and compliance (standard employment practices)

  #### **Financial Projections**

  **Year 1 Conservative (v3.1 - Updated):**

  | Month | Net Profit | Pool (15%) | Core Team (each) | Notes |
  |-------|------------|------------|------------------|-------|
  | 1-3 | €0 | €0 | €0 | Development |
  | 4-6 | €3,000 | €450 | €56 | 10 artists, 100 products |
  | 7-9 | €6,000 | €900 | €113 | 50 artists, 500 products |
  | 10-12 | €12,000 | €1,800 | €225 | 100 artists, 1,000 products |
  | **Total** | **€21,000** | **€3,150** | **€394** | **vs €17,000 old** |

  **Key Changes:**
  - **Higher artist retention:** 75% (vs 40% old)
  - **Faster growth:** 100 artists by Month 6 (validated)
  - **Better margins:** 85% gross margin (vs 60% old)
  - **Lower AI costs:** €550/month (vs €1,800 old)

  **Year 2 Growth (v3.1 - Updated):**

  | Quarter | Net Profit | Pool (20%) | Core Team (each) | Notes |
  |---------|------------|------------|------------------|-------|
  | Q1 | €15,000 | €3,000 | €375 | 150 artists |
  | Q2 | €25,000 | €5,000 | €625 | 200 artists |
  | Q3 | €35,000 | €7,000 | €875 | 250 artists |
  | Q4 | €50,000 | €10,000 | €1,250 | 300 artists, dividend threshold |

  **Key Changes:**
  - **Higher profitability:** €50K/month by Year 2 end (vs €25K old)
  - **Faster scaling:** 300 artists by Month 24 (vs 200 old)
  - **Dividend threshold:** Reached Month 24 (vs Month 30 old)

  #### **Marketing Messaging**

  **Crowdfunding Headline:**
  > **"Back Merch From. Earn with Merch From. Build the Future Together."**

  **Transparency Badge:**
  > **📊 Transparent Profit-Sharing**  
  > All profit distributions documented with full audit trail. Team members receive detailed statements showing exactly how profit is shared.

  **Key Pitch (€499 Tier):**
  > Your €499 backing puts you at the Strategic Partner level. Join our exclusive community of 20 partners who help shape Merch From's future. Quarterly calls with the founder, co-marketing opportunities, and recognition as a platform builder. You're not just backing a project—you're co-creating it.

  **Why No Profit-Sharing for Backers?**
  > We believe in clean, ethical business. Artists earn from their sales (40-60% margins). Our core team earns from building the platform. Backers support the mission and get incredible access, recognition, and community—not passive income. We're not an MLM; we're building sustainable ethical commerce.

  ---

  ### 2.5 Future Partnership Strategy (Post-Launch Scaling)

  **Vision:** Decentralized fulfillment network for touring artists and international expansion

  **Strategic Rationale:**
  - **Local fulfillment:** Print and ship from nearest location to customer
  - **Touring artist support:** On-demand merch at tour stops without shipping inventory
  - **Tax efficiency:** Avoid import duties and cross-border logistics costs
  - **Fast turnaround:** Same-day or next-day production for urgent tour needs
  - **Quality consistency:** Partner shops must meet platform's premium/ethical standards

  **Partnership Model (Future Implementation):**
  - Vetted print shops in key markets (US, UK, EU, Asia, Latin America)
  - Revenue-share arrangement: 70% to partner shop, 30% to platform
  - Strict quality standards: Organic/fair-trade blanks, color accuracy, print durability
  - Centralized design distribution via platform API
  - Unified customer experience (same pricing, same quality, same branding)
  - Performance monitoring and quality audits

  **Use Cases:**
  - Touring band needs 50 tees for tonight's show in Berlin (local partner prints same-day)
  - Artist with European fanbase ships from EU facility (no customs, faster delivery)
  - Bulk orders split across multiple facilities for faster production

  **Timeline:**
  - **Phase 1 (Months 1-12):** Own fulfillment only, establish quality baseline
  - **Phase 2 (Year 2):** Pilot partnership with 1-2 trusted shops in key markets
  - **Phase 3 (Year 3+):** Expand to 10+ partner locations globally

  **Note:** This is a **scaling strategy**, not an alternative to own operations. Platform maintains direct fulfillment as primary model.

  ### 2.6 Launch Roadmap (Crowdfunding-First Strategy)

#### 2026 Development Timeline

| Phase | Dates | Focus | Deliverables |
|-------|-------|-------|--------------|
| **Phase 0: Planning & Content** | Dec 1-31, 2025 (Completed) | Documentation, campervan prep, content creation | PRD finalized, Instagram-ready van, drive Ireland→Portugal (story content) |
| **Phase 1: MVP Development** | Jan 1 - Feb 28, 2026 | Core platform build (48h/week) | Leopoldo interview, Francisca design studio, mockups, basic store UI |
| **Phase 2: Polish & Landing** | Mar 1 - Mar 15, 2026 | Landing page, demo video | Waitlist page live, 90-sec demo video, scroll-scrub "How It Works" |
| **Phase 3: Waitlist Campaign** | Mar 15 - Mar 31, 2026 | Traffic generation | 500+ waitlist signups, artist testimonials, investor traction data |
| **Phase 4: Crowdfunding Launch** | Apr 1 - Apr 30, 2026 | Kickstarter/Indiegogo campaign | €46K target, founding artist tiers, merch coin perks |

  **Work Capacity:** 8 hours/day × 6 days/week = 48 hours/week (solo builder with AI assistance)

  **Key Milestones:**
  - **Feb 28:** MVP feature-complete (internal testing)
  - **Mar 15:** Landing page + demo video ready
  - **Mar 22:** Waitlist opens for artist signups
  - **Apr 1:** Crowdfunding campaign goes live

  **Content Strategy (December):**
  - Fine-tune campervan for "Instagramable" founder story
  - Document Ireland → Portugal drive with photos/videos
  - Build content library for IG profile and crowdfunding campaign
  - This journey becomes the "founder committed everything" narrative for investors

  ---

  **Phase 1: Pre-Crowdfunding Validation (Weeks 1-8)**

  - **Week 1-4:** Build **demo MVP** (skinny version for crowdfunding video/pitch)
    - 1 fully polished demo artist storefront
    - 15-20 realistic product mockups (AI-generated)
    - **Frontend showcase only** — no backend, no real payment processing
    - **No Merch Coins system yet** — just mention in pitch/video
    - 90-second platform walkthrough video for crowdfunding campaign
    - High-converting waitlist landing page with artist signup form
  - **Week 5-8:** Organic traffic generation
    - Reddit (r/WeAreTheMusicMakers, r/bandmembers, r/streetwearstartup)
    - Facebook Groups (independent musician communities)
    - Instagram/TikTok (partner with 3-5 micro-influencer artists)
    - ProductHunt launch as "AI-powered ethical merch platform"
    - Cold outreach to 50 artists with 5k-50k followers
  - **Target:** 500+ waitlist signups, 70%+ prioritize ethical/sustainable products

  **Note:** Demo MVP is for validation only — not production-ready. Full platform build happens post-investment.

  **Phase 2: Crowdfunding Campaign (Weeks 9-12)**
  - **Week 9:** Finalize Kickstarter/Indiegogo campaign page
    - Professional campaign video (founder story, mission, demo platform walkthrough)
    - Reward tier graphics and descriptions
    - Early Bird pricing strategy for first 48 hours
    - Email sequence for waitlist → backer conversion
  - **Week 10-12:** Live campaign (30 days)
    - Target: €35K minimum, €50K stretch goal
    - Daily social media updates + behind-the-scenes content
    - Artist interviews and testimonials
    - Weekly milestone celebrations
    - Press outreach to ethical business + music media
  - **Success Metric:** €46K raised from 488 backers (250 Supporters, 150 Artists, 50 VIPs, 5 Partners, 3 Sponsors)
  - **Backer Rewards:** Tier confirmations sent, coins redeemable when platform launches (Month 7)

  **Phase 3: Post-Crowdfunding Setup (Months 1-3)**
  - **Month 1:** Facility activation in Portugal
    - Secure industrial unit (deposit + first month from crowdfunding capital)
    - Equipment retrieval from Ireland storage → Portugal
    - Facility improvements (electrical, ventilation, lighting)
    - Equipment installation and testing of existing equipment
  - **Month 2:** Initial inventory + production testing
    - Order initial inventory (500-1,000 organic/fair-trade blanks)
    - Test production runs (DTG, DTF, screen printing)
    - Refine production workflow and quality standards
    - Staff training on equipment
  - **Month 3:** Investor outreach
    - Prepare investor pitch deck with crowdfunding traction data
    - Pitch investors with proof of demand (€46K raised, 150+ artist backers)
    - Secure €230K investment (reduced from €280K due to crowdfunding capital)

  **Phase 4: Post-Investment Build & Expansion (Months 4-6)**
  - **Month 4:** Premium equipment expansion
    - Order Anatol automatic press + 2 new DTG printers (investor capital)
    - Hire Production Manager (€1,400/month)
    - Equipment delivery and installation begins
    
  - **Month 5-6:** **Full platform development + equipment setup**
    - **Complete production-ready platform build:**
      - Conversational UI (AI-powered store management)
      - Real payment processing (Stripe integration)
      - **Merch Coins system (platform + artist coins)** — CRITICAL
      - Artist onboarding workflow
      - Order management + fulfillment tracking
      - Product catalog + mockup generation
      - Email notifications and customer dashboard
    - Install and test new equipment (Anatol press, DTG printers)
    - Establish production standards and quality control
    - Production team training and workflow optimization

  **Phase 5: Launch (Month 7)**
  - **Onboard first 10 artists** (Artist Pioneer + VIP backers from crowdfunding)
  - **Launch first real artist stores** (production-ready, real payment processing)
  - **Credit all backer accounts with Platform Merch Coins**
    - Supporters: 30 coins
    - Artist Pioneers: 100 coins
    - Artist VIPs: 250 coins
    - Brand Partners: 1,000 coins
    - Sponsors: 3,000 coins
  - **Backers can NOW redeem coins** (7 months after crowdfunding ended)
  - Begin fulfilling real orders with operational production facility

  **Phase 6: Scale (Months 8-12)**
  - **Month 8:** Second artist cohort (20 artists)
    - Hire Customer Success Manager (€1,400/month)
    - Processing 50+ orders/week
  - **Month 9:** Third artist cohort (30 artists)
    - Optimize production workflow based on real order data
  - **Month 10:** Growth phase
    - Hire Marketing Lead (€1,400/month)
    - Fourth cohort (40 artists)
    - Open beta or continued invite-only based on capacity
  - **Month 11-12:** Profitability push
    - 100+ active artists on platform
    - Processing 200+ orders/week
    - Break-even or early profitability
    - Evaluate expansion strategy

  **Success Criteria for Scaling:**
  - Fulfillment capacity: Processing 50+ orders/week smoothly
  - Artist satisfaction: >85% would recommend platform
  - Product quality: <5% defect/remake rate
  - Unit economics: Gross margin >60% maintained at scale
  - Platform stability: <1% error rate, >99.5% uptime
  - Inventory turnover: <30 days average (healthy cash flow)

  ---

  ### 2.7 Long-Term Growth Roadmap (Years 2-3)

  **Year 2: Profitability & Expansion**

  **Q1 (Months 13-15):**
  - 150+ active artists on platform
  - €50K+ monthly revenue
  - Net profit: €10-15K/month
  - Begin facility ownership evaluation
  - Initiate Series A planning or mortgage pre-approval

  **Q2 (Months 16-18):**
  - **MILESTONE: Facility Acquisition**
    - **Path A (Self-Financed):** €30K down payment from profits + €90K bank mortgage
    - **Path B (Series A):** Include €120K property in €500K+ Series A raise
    - Purchase 300m² industrial property in Porto
    - Legal transfer, facility improvements, equipment relocation
    - **Marketing narrative:** "We're building for permanence - now operating from our own facility"
  - 200+ active artists
  - €80K+ monthly revenue
  - Net profit: €20-25K/month

  **Q3 (Months 19-21):**
  - Owned facility fully operational
  - Rent savings: €1,200/month redirected to profit
  - Property equity building begins
  - 250+ active artists
  - €100K+ monthly revenue
  - Net profit: €30-35K/month

  **Q4 (Months 22-24):**
  - 300+ active artists
  - €120K+ monthly revenue
  - Net profit: €40-50K/month (dividend threshold reached)
  - Begin international partnership discussions
  - Evaluate geographic expansion (UK, Germany fulfillment hubs)

  ---

  **Year 3: Asset Building & International Expansion**

  **Q1 (Months 25-27):**
  - 400+ active artists
  - €150K+ monthly revenue
  - Net profit: €50-60K/month
  - Property value appreciation: €110-130K (10-20% gain)
  - First international fulfillment partnership (UK pilot)

  **Q2 (Months 28-30):**
  - 500+ active artists
  - €200K+ monthly revenue
  - Net profit: €70-80K/month
  - Property mortgage principal: €75K remaining (if financed)
  - Expand partnership network (Germany, Netherlands)

  **Q3-Q4 (Months 31-36):**
  - 750+ active artists
  - €300K+ monthly revenue
  - Net profit: €100K+/month
  - Owned facility: €120-140K value
  - Evaluate Series B or acquisition offers
  - Consider facility expansion or second location

  ---

  ### 2.8 Facility Ownership: Investor Pitch Narrative

  **Slide: "Built to Last - Our Facility Roadmap"**

  **Visual:** Timeline graphic showing rent phase → ownership milestone → asset value growth

  **Key Message:**
  > "We're not just building a platform - we're building a real, tangible business with hard assets. Year 1-2: We rent to stay agile during validation. Year 2-3: We buy to build equity. Every month forward, rent becomes ownership. Every year forward, property appreciates."

  **Investor Benefits Highlighted:**
  - ✅ **Risk mitigation:** Real estate provides asset backing and partial capital recovery if needed
  - ✅ **Value creation:** Property equity builds alongside operational profits (dual value streams)
  - ✅ **Permanence signal:** Owned facility demonstrates long-term commitment to market
  - ✅ **Exit optionality:** Property can be sold separately or included in acquisition
  - ✅ **Balance sheet strength:** €100-120K asset improves company valuation for Series A
  - ✅ **Competitive moat:** Owned facility = lower operational costs vs competitors

  **Talking Points:**
  1. "We've identified 300m² properties in Porto for €100-120K - these are real, available opportunities."
  2. "By Year 2, we'll convert ~€30K in rent payments into property ownership."
  3. "Portugal industrial real estate has appreciated 10-15% annually - our facility becomes an appreciating asset."
  4. "Ownership gives us full control: custom ventilation, expanded equipment, no landlord constraints."
  5. "This isn't included in our current ask - it's a future milestone funded by profits or Series A, showing disciplined capital allocation."

  **Risk Acknowledgment (Optional - Honest Approach):**
  > "We considered buying property with this seed round but chose operational agility over illiquid real estate. We want to prove the business model first, then build lasting infrastructure from a position of strength. This demonstrates our capital discipline and focus on what matters most: validating demand and achieving profitability."

  **Financial Impact on Exit:**
  ```
  Scenario: €10M acquisition in Year 4

  Without Property Ownership:
    Company Value: €10M
    Investor ROI (18% stake): €1.8M on €280K = 6.4x

  With Property Ownership:
    Operational Value: €10M
    Property Value: €130K (purchased €120K, appreciated 10%)
    Company Value: €10.13M
    Investor ROI (18% stake): €1.82M on €280K = 6.5x
    
    PLUS: Lower operational costs (no rent) = higher margins = stronger valuation
    Realistic impact: 5-10% valuation premium from owned facility
    Adjusted exit value: €10.5-11M
    Investor ROI: €1.89-1.98M = 6.7-7.1x
  ```

  **Bottom Line for Investors:**
  "Facility ownership adds 5-10% to exit valuation while reducing operational risk. It's a smart Year 2 milestone that builds wealth without diluting equity today."

  ---

  ---

  ### 2.3 Pricing Strategy & Artist Education (The Psychology of €30)

  **The Core Question:** Can we justify a €15 base cost when competitors are cheaper?
  **The Thesis:** Yes, because we sell *Profit Dollars*, not *Profit Margins %*.

  #### 1. The "Profit per Transaction" Insight
  Investors (and smart artists) care about how much cash enters their bank, not percentages.

  | Platform | Base Cost (Black Tee) | Rec. Retail Price | **Artist Keeps (Profit)** | Notes |
  | :--- | :--- | :--- | :--- | :--- |
  | **Merch From** | **€15.00** (Heavyweight) | **€30.00** | **€15.00** | **Premium Organic 220gsm** |
  | Printful | €12.95 (Standard Gildan) | €25.00 | €12.05 | Basic 150gsm (Gildan 64000) |
  | Redbubble | €18.00 (Base + Markups) | €22.00 | €4.00 | Artist has little control. Volume play. |
  | Local Shop | €8.00 (Bulk 50+) | €30.00 | €22.00 | Requires upfront cash (€400+) + Risk. |

  **The Sweet Spot:** Merch From beats Printful on **Quality-Adjusted Profit**. To get a 220gsm tee on Printful, base price jumps to ~€19.00, dropping profit to €6.00. We offer better profit than POD with significantly better quality.

  #### 2. Marketing the "Premium" Justification
  How do we teach artists to sell a €30 tee?

  **Argument A: "Don't sell Merch, Sell Fashion."**
  *   **Low Quality:** "I bought a shirt to support the band." (Charity).
  *   **High Quality:** "I bought a sick shirt that happens to be from the band." (Fashion).
  *   **Data:** Return rates on cheap POD are ~5-7%. Return rates on premium streetwear are <2%.

  **Argument B: The "Fan Lifetime Value"**
  *   If a fan buys a €20 shirt and it shrinks, LTV = €20.
  *   If a fan buys a €30 Merch From shirt and it lasts, they buy the hoodie next. LTV = €100+.

  #### 3. New Feature: Use of Funds Transparency Widget
  **"The Transparency Pie Chart"**
  To justify the €30 price point to end-consumers, the storefront offers an optional "Radical Transparency" widget showing:
  *   **€15.00** Artist Profit (Green)
  *   **€5.00** Garment Cost
  *   **€3.00** Production Labor
  *   **€7.00** Ops/Logistics/Platform

  **The "Leopoldo Lock":** Leopoldo actively discourages pricing under €25. *"My friend, do not undervalue your art. This is not a fruit stand."*

  ---

  ### 2.9 Waitlist Growth: The "Bump Up" System

  To drive viral waitlist growth without cash liability, we implement a **gamified referral mechanic** — artists move up the queue by inviting others.

  **The Philosophy:**
  Traditional referral rewards (€100 bonuses) attract money-seekers and create financial liability. "Bump Up" rewards effort with **priority access** — a more valuable and scalable incentive.

  **How It Works:**
  1.  **The Position:** Every waitlist applicant gets a queue number (e.g., "You're #847").
  2.  **The Referral Link:** Each applicant gets a unique link: `merchfrom.com/waitlist?ref=alex123`
  3.  **The Bump:** When someone signs up via your link, BOTH of you move up the queue.
  4.  **The Leaderboard:** Top referrers get fastest access to Beta testing.

  **What Artists Earn:**
  | Referrals | Reward |
  |-----------|--------|
  | 1-2 | Move up ~100 positions |
  | 3-5 | Priority Review status |
  | 6-10 | First access to Beta |
  | 10+ | "Founding Referrer" badge + direct line to Leopoldo |

  **Important Distinction:**
  > [!NOTE]
  > **Priority Review ≠ Guaranteed Access.** Bump Up earns faster consideration, not automatic entry. We still vet for quality and values alignment. An artist at #1 can still be declined if they're not a fit — but they'll be reviewed first.

  **If Declined Despite High Referrals:**
  *   Soft rejection with value: "You'll get access at public launch + 10% permanent margin boost as a Founding Supporter."
  *   Or delayed acceptance: "You're on priority for our next cohort."

  **Strategic Value:**
  *   **Zero cash liability** — no €100 payouts to manage.
  *   **Viral loop** — artists share with their artist networks (quality leads).
  *   **Gamification** — position numbers create urgency and competition.
  *   **Scalable** — works whether waitlist is 100 or 100,000.
  *   **Honest** — we never promise what we can't deliver.

  ---

  ## 3. Functional Requirements

  ### 2.1 The "Cat-Suite" – Multi-Agent Brand Architecture

  Merch From is powered by a trio of specialized AI agents—the "Cat-Suite"—who manage the platform's core functions. This narrative turns the founder's "van life with three cats" story into a unique brand asset.

  #### **1. Leopoldo: CEO (Chief Executive Officer)**
  - **Role:** Waitlist qualification, artist recruitment, and "gatekeeper".
  - **Personality:** Authoritative, discerning, high standards (the "Boss").
  - **Function:**
    - Conducts the 5-stage entry interview.
    - Clusters artists by values, genre, and audience size.
    - Determines who gets "Founding Artist" status.
  - **Tech:** Mistral Large 3 + Voxtral Transcribe 2 + ElevenLabs TTS (Hybrid voice pipeline).

   #### **2. Francisca: CDO (Chief Design Officer)**
   - **Role:** Guided merchandise design and creative direction.
   - **Personality:** Artistic, detail-oriented, encouraging but critical.
   - **Function:**
     - **Proactive Design Guide:** Instead of waiting for open-ended prompts ("What do you want?"), Francisca leads a structured, visual workflow. She presents curated choices (Canvas -> Style -> Vibe) to eliminate "blank canvas paralysis" while maintaining a conversational feel.
     - **Image Analysis:** Analyzes uploaded artwork, logos, and reference images for print readiness (resolution, color count, bleed safety) using Mistral Large 3 vision capabilities.
     - **Image Generation Routing:** Routes all creative tasks to FLUX 2 family via BFL API (Flex for drafts/iterations, Pro for finals, Max for premium). Single-provider simplicity with consistent premium quality. Text rendering handled via prompt engineering and optional vector text overlay.
     - Manages the entire image generation and refinement loop.
     - "I've removed the background from your logo, darling. It looks much better."
    - **Tech:** Mistral Large 3 (reasoning + vision/image analysis) + BFL API (FLUX 2 Flex / Pro / Max) + OpenCV (color separation + halftoning).

  #### **3. Antonia: CS (Head of Customer Support)**
  - **Role:** Order tracking, FAQ automation, and transactional updates.
  - **Personality:** Friendly, responsive, hyper-efficient.
  - **Function:**
    - Handles "Where is my order?" queries.
    - Sends "Order Confirmed" and "Shipped" emails.
    - Escalates complex issues to human support.
  - **Tech:** Mistral Small 4 (fast, cost-efficient FAQ/order queries) + Mistral Large 3 (complex escalations) + RAG (Retrieval-Augmented Generation).

  ### 2.2 Francisca's Design Studio (AI Generation Pipeline)

  We utilize a cutting-edge, multi-model pipeline to ensure professional, print-ready results that outperform standard "text-to-image" generators.

#### **Core AI Stack (v6.0 — Mistral Native, EU Sovereign):**

1.  **Mistral Large 3 (via Mistral API) — PRIMARY LLM**
     - **Purpose:** Complex reasoning, conversation handling, design edits, character roleplay, onboarding flows, pricing negotiation
     - **Why:** European company (Paris), GDPR-native, 128K context, strongest instruction-following for multi-turn character adherence
     - **Cost:** ~€2/1M input tokens, ~€6/1M output tokens
     - **Latency:** <1s response time, streaming support
     - **Use Cases:** Leopoldo onboarding, Francisca creative direction, complex Antonia escalations, all agent handoffs

2.  **Mistral Small 4 (via Mistral API) — COST-OPTIMIZED LLM**
     - **Purpose:** Fast, deterministic queries where character depth is less critical
     - **Why:** 90% cheaper than Large 3 (~$0.15/1M input), sub-500ms latency, same EU data residency
     - **Cost:** ~$0.15/1M input tokens, ~$0.60/1M output tokens
     - **Use Cases:** Antonia order tracking, FAQ answers, status checks, simple routing — ~70% of support traffic
     - **Fallback:** Automatically escalates to Large 3 if sentiment analysis detects frustration or query complexity exceeds threshold

3.  **Mistral Voxtral Transcribe 2 — SPEECH-TO-TEXT**
     - **Purpose:** Real-time voice transcription for conversational agent
     - **Why:** $0.003/min (10x cheaper than competitors), sub-200ms latency, 13 languages including Portuguese
     - **Open Weights:** Apache 2.0 license -- self-hostable at scale
     - **Features:** Speaker diarization, context biasing, word-level timestamps

4.  **ElevenLabs TTS — TEXT-TO-SPEECH**
     - **Purpose:** Character voice synthesis with zero-shot voice cloning
     - **Why:** Beats ElevenLabs Flash v2.5 (68.4% win rate), ~90ms latency, 9 languages
     - **Open Weights:** Apache 2.0 license -- self-hostable at scale
     - **Voice Cloning:** 30-second reference sample per Cat-Suite character
     - **Characters:** Leopoldo (São Paulo accent), Francisca (Porto accent), Antonia (Irish accent)

       | Task Type | Model | Cost | Why |
       |-----------|-------|------|-----|
       | **Draft / iterate / sketch** | FLUX 2 Flex (BFL API) | ~$0.008/image | Fast iteration, on-demand quality |
       | **Final mockup / catalog** | FLUX 2 Pro (BFL API) | ~$0.020/image | Best-in-class fabric texture realism |
       | **Premium / best quality** | FLUX 2 Max (BFL API) | ~$0.050/image | Absolute highest fidelity for hero releases |
       | **Image edit / variation** | FLUX 2 Flex img2img (BFL API) | ~$0.008/image | Iterative refinement, same-model consistency |

     **API-Only Strategy:**
     - **No self-hosting.** All FLUX 2 models consumed via BFL API directly (or OpenRouter as unified fallback)
     - **Single provider:** One integration, one license, one bill — operational simplicity
     - **Consistent aesthetic:** All output shares FLUX 2 visual DNA — premium, cohesive brand feel
     - **Automatic scaling:** Handles viral spikes without provisioning GPUs
     - **Cost at scale:** ~$0.015/image weighted average; still <0.5% of revenue at 10,000+ artists
     - **All generation** runs through Cloudinary for immediate optimization (f_auto, q_auto, WebP/AVIF)

7.  **OpenCV (Python) — COLOR SEPARATION + HALFTONING**
     - **Purpose:** Mathematical color separation and halftone generation
     - **Features:** K-Means clustering for spot colors, Moiré-prevention angles, Pantone matching, DPI validation
     - **Cost:** $0 (deterministic, rule-based)
     - **Workflow:** Design → OpenCV Color Separation → Halftoning → Print-ready files

**Defer to Production (Year 2+):**
- **Real-ESRGAN:** Use Cloudinary upscaling or basic algorithm for MVP
- **Self-hosted Voxtral:** At 250+ artists, migrate STT/TTS to on-premise (Apache 2.0 weights) for zero per-minute voice costs

---

