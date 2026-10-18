> Archived: the LoRA plan described here was retired on 2026-08-24 in favour of hosted reference-guided generation.

  # Blackout Merchandise: Product Requirements Document

  ---

## Development Status (Feb 19, 2026)
  
**Current Phase:** 3.5-3.6 (App Enhancement) — ~80% Complete
  
**Just Completed:**
- ✅ UI polish: X button positioning, overflow clipping fixes
- ✅ Functional icons: Session History & Notifications panels now responsive
- ✅ Global rebranding: "Design Studio" → "Merch Studio" across all UI
- ✅ Code cleanup: Removed legacy ViewMode state management system
- ✅ **NEW:** Campaign Management with MCP integration (Phase 4b)
  
**Next Up:**
- Phase 4: Backend Core (Neon + Clerk + Drizzle) — Ready to begin Feb 9
- Phase 4b: Campaign Management (Meta/TikTok Ads MCP) — After Phase 4 core
- Phase 5: AI Integration (Real LLM/image models)
- Phase 6: Commerce (Stripe payments & orders)
  
  **Full Roadmap:** See `/Documentation/02-Roadmap/Roadmap.md`

  ---

  ## 0. Executive Quick Reference

  > **Purpose:** At-a-glance overview for investors and team members.
  > **For detailed sections:** See references below to dive deeper.

  ### At-a-Glance Summary
  - **One-liner:** AI-powered premium merch platform for artists who care about quality
  - **Market:** $12B European Creator Merch, $50M SOM target
  - **Ask:** €300K for 16-18% equity, 24 months runway
  - **Key Differentiators:** Cat-Suite AI, in-house production, ethical-first

  ### Cat-Suite Roles
  | Agent | Role | Primary Function |
  |--------|------|---------------------|
  | Leopoldo | Onboarding & Admin | Account setup, pricing, bulk orders |
  | Francisca | Catalog & Design | Product curation, design creation |
  | Antonia | Operations & Support | Shipping, returns, first-tier support |

  ### Competitive Positioning
  | Feature | Blackout Merchandise | Fyul (Printful+Printify) | Gelato |
  |---------|-----------|-------------------------|--------|
  | AI Design | ✅ Cat-Suite | ❌ 3D Design Maker (not AI) | ❌ B2B only |
  | Voice Interface | ✅ Mistral Voxtral (Real-Time Voice-to-Voice) | ❌ | ❌ |
  | In-House Production | ✅ Portugal | ⚠️ Outsourced network | ⚠️ Partner network |
  | Premium Default | ✅ Ethical standard | ⚠️ Add-on tier | ⚠️ Varies |
  | Founder Credentials | 9 years craft + CS degree + AI MBA | See Section 1.5 |
  | Competitive Analysis | See Section 1.9 for full comparison and threat scenarios |

  > **For detailed founder profile, see Section 1.5**
  > **For full competitive analysis, see Section 1.9**
  > **For AI agent details, see Section 1.10**
  > **For customer validation framework, see [./03-Evaluations/Customer-Validation-Framework.md](./03-Evaluations/Customer-Validation-Framework.md)**

  ---

  ---

  ## 1. Executive Summary
  
  > **Purpose:** Concise investor overview. For detailed breakdowns, see **Section 0: Executive Quick Reference**.
  
  ### At-a-Glance
  - **One-liner:** AI-powered premium merch platform for artists who care about quality
  - **Market:** $12B European Creator Merch, $50M SOM target
  - **Ask:** €300K for 16-18% equity, 24 months runway
  - **Founder Summary:** 9 years craft + CS degree + AI MBA = triple-threat founder
  - **Key Differentiators:** Cat-Suite AI, in-house production, ethical-first
  
  > **See Section 0 for:** Cat-Suite roles, competitive positioning, founder credentials, customer validation framework

  ### Brand Voice & Slogans
  > **Tone:** Aggressive, bold, unapologetic. We don't beg for customers — we curate them.

  **Primary CTA Slogans:**
  - *"Your fans wear your art. Why dress them in garbage?"*
  - *"We don't work with everyone. But if you care about craft, we want to talk."*

  **Supporting Taglines:**
  - *"Buy Less, Buy Better."*
  - *"Premium quality. Zero upfront costs. No compromises."*
  - *"If you know, you know."*

  ### Milestones (24 Months)
  | Month | Milestone |
  |-------|-----------|
  | 7 | Launch with 10 artists, first real orders |
  | 12 | 100+ active artists, €50K MRR, break-even in sight |
  | 18 | 200+ artists, €100K MRR, property acquisition evaluation |
  | 24 | 300+ artists, €120K+ MRR, profitability, international expansion prep |

  ---

  ## 1. Project Overview

  **Blackout Merchandise** is a conversational commerce platform that empowers artists, bands, and creators to manage their merchandise business through natural AI-powered conversation. While the **Visual Editor** handles the store's aesthetic customization, AI agents actively manage operations, product creation, and sales strategy.

  **Mission:** Help artists, brands, and companies design, source, and sell premium quality merchandise through an AI-managed platform with professional visual tools. Creates focus on the product, while the artist controls the brand experience.

  **Core Values:** Vegan, fair-trade, eco-friendly products with premium quality focus, direct in-house production, and no upfront costs for qualified creators.

  ---

  ## 1.5 Founder: Victor Teixeira Bendas - The Triple-Threat Advantage

  **The Unique Founder Profile:**

  Most startup founders have one strength:
  - Craft founders understand production but lack tech/marketing skills
  - Technical founders can build platforms but don't understand operations  
  - Marketing founders can acquire customers but can't deliver quality

  Victor combines all three:

  ### CRAFT MASTERY (9 Years, €113K Studio)

  **Blackout Merchandise** (2016-Present)  
  Instagram: @blackoutmerchandise | Dublin Operations: Current

  - **Premium screen printing across 3 countries:** Brazil (2016-2018) → Portugal (2018-2021) → Ireland (2021-Present)
  - **Notable clients:** Meta, Google, Teletech, Electric Picnic (Ireland's premier music festival), Sepultura, Decapitated, She Wants Revenge
  - **Known throughout Europe** for ultra-complex multi-color work (8-20+ colors)
  - **Specialization:** Spot color and process printing with proprietary unlimited-color registration system
  - **Visual portfolio:** @blackoutmerchandise showcases premium client work and technical capabilities
  - **€113K in owned professional equipment** (zero debt, Dublin-based operations)

  **Existing Production Infrastructure:**

  **Screen Printing Production (€38K):**
  - **Custom Semi-Automatic 8-Color Press** (€20K value)
    - Servo motor automation (pedal-controlled rotation)
    - Proprietary multi-platen registration system
    - Unlimited color capability (12-20+ colors achievable)
    - Micro-registration precision for complex jobs
  - Automatic Flash Cure (70×45cm): €3.5K
  - Exposure Unit (100×120cm LED vacuum): €4K  
  - Drying Cabinet (100×120cm, holds 10× A2 screens): €2.5K
  - Drying Tunnel (8×1000W IR lamps, 180cm): €3K
  - Wash Tank (120×180cm, 10-screen capacity): €2K
  - **Photolith Printer: HP DesignJet T125 (24")**: €3K
    - Large format printing for screen exposure film positives
    - Essential for high-precision multi-color separations

  **Digital Printing Equipment (€31K):**
  - DTF Printer: Epson 14300 A3+ (€8K)
  - DTG Printer: TexPro Series 2 A2 (€12K)
  - Plotters: Epson 4880 + Epson 9900 (€11K combined)

  **Design & Production Workstations (€8K):**
  - i9 Desktop: 64GB RAM, 1TB storage (€3.5K)
  - MacBook Pro M4 2025 (€3K)
  - iPad Pro M4 for design work (€1.5K)

  **Screen Inventory & Supplies (€10K):**
  - **60× aluminum screens** (60×45cm / A2 format)
  - All pre-stretched, production-ready
  - Premium aluminum construction (not wood frames)
  - Allows 10-15 concurrent multi-color jobs without reclaiming delays
  - Premium squeegees (aluminum handles, multiple durometers)
  - Full inventory of emulsions, chemicals, consumables

  **Total Existing Assets: €93,000 (Conservative) | €113,000-123,000 (Fair Market Value)**

  **Why This Infrastructure Matters:**
  - Can onboard 50 artists Day 1 without equipment constraints
  - No production delays waiting for screen reclaiming  
  - Aluminum frames ensure consistent registration (critical for multi-color work)
  - Most startups would need €100K+ and 6-12 months to build equivalent capacity

  ### THE BLACKOUT STANDARD (Operational De-Risking)
  To ensure the "Bus Factor" doesn't apply to Victor, operations rely on **"The Blackout Standard"**:
  - **Existing SOP Library:** 9 years of documented Standard Operating Procedures (video & text) covering every aspect of production, from screen coating to ink mixing.
  - **Training Asset:** These materials are already created and used to train staff, ensuring the new Production Manager hits the ground running.
  - **Expert Panel Support:** The Dataset Curator Panel (Expert, Expert B, Expert C) also functions as a high-level troubleshooting unit for the Production Manager, removing dependency on the founder for technical problem-solving.

  ### STRATEGIC OUTSOURCING PARTNER (Brazil)
  To further mitigate founder burnout and leverage favorable EUR/BRL exchange rates (1:6), we will contract a reputable Brazilian agency (e.g., Greenz or Livecomm) to handle execution-heavy roles:
  - **Marketing Execution:** Social media management, ad scaling, community moderation (Replacing the need for a full-time CMO initially).
  - **"Human-in-the-Loop" Design Desk:** A dedicated designer (allocated during business hours) to handle "Francisca" support tickets, fix AI glitches, and finalize complex art files.
  - **Cost Efficiency:** We secure **Senior-Level Agency output** for the price of a **Junior Intern** in the EU. This extends our marketing runway by **3x** compared to hiring locally (~€1,500-2,000/month vs €5,000+ EU equivalent).

  ---

  ### TECHNICAL EXECUTION (Computer Engineer + Full-Stack Dev + AI Specialist)

  **Education:**
  - **Bachelor of Computer Engineering,** São Paulo University (2012-2016)
  - **MBA IA e Automação (AI & Automation),** Rocketseat (Aug 2024 - Present, 18-month program)
  - **Full Stack Web Development MBA,** Sirius University (Jul 2024 - Aug 2025, completing)
  - **Specialized Focus:** RAG systems, LLM training, data annotation, AI automation
  - **Google Certifications** (2016-Present, ongoing)
  - **MediaMath Programmatic Advertising** Advanced Certification (2016-2018)
  - **Languages:** Portuguese (Native), English (Fluent), Spanish (Advanced), German (Basic)

  **Technical Skills:**
  - **Frontend:** HTML5, CSS3, JavaScript ES6+, React.js
  - **Backend:** Node.js, Python, RESTful APIs, Database management
  - **Full Stack:** MEAN/MERN Stack, Django, Express.js
  - **Development Tools:** Git/GitHub, NPM, Agile, AI-assisted coding
  - **Automation:** N8n, Zapier, Google Apps Script
  - **Data & Analytics:** Tableau, SQL, NoSQL, custom dashboard development
  - **Integration Tools:** **MCPO** (Model Context Protocol to OpenAPI) for future Social Commerce agent integration
  - **AI/ML:** Professional data annotation specialist (Outlier.ai, Micro1.ai, Telus Digital), AI Quality Specialist (Spider.cloud), MBA in AI & Automation, RAG systems, LLM training, advanced AI testing & failure analysis, corporate AI implementation (Chiliz)

  **Strategic AI Industry Positioning (2024-Present):**
  - **Closed Blackout Merchandise (Nov 2024)** to focus on AI transition, equipment relocated to Portugal
  - **Professional Data Annotation Analyst** for Outlier.ai, Micro1.ai, Telus Digital (Jan 2025-Present)
  - **AI Quality Specialist** for Spider.cloud - Advanced AI testing, deliberately making AI systems fail for quality assurance (Nov 2025)
  - **Corporate AI Success:** Built and sold data intent management system to **Chiliz (Socios.com)** using OpenAI API
  - **Currently enrolled:** MBA IA e Automação focusing on RAG systems and LLM training
  - **Systematic preparation:** 12 months of deliberate AI industry positioning for Blackout Merchandise launch

  **Real-World Technical Impact:**
  - **Built N8n automation workflows** reducing manual reporting by 60% (**240+ hours/month saved** at Accenture)
  - **Created 12 custom Tableau dashboards** providing real-time campaign insights, resulting in **35% faster decision-making**
  - **Developed custom attribution models** improving campaign measurement accuracy by **45%**
  - **Automated reporting workflows** using Zapier and Google Apps Script, reducing manual tasks by **55%**
  - **Sold AI solution to major corporation:** Data intent management system for Chiliz/Socios.com (crypto/sports platform)
  - **Developed 8-agent AI orchestration system** (Orchestrator, Frontend, Backend, Database, Security, Tester, DevOps, Docs) with Linear + Neon + GitHub integration
  - **Can build Blackout Merchandise platform in 4 weeks** using multi-agent AI instead of 6 months manual coding

  ---

  ### GROWTH MARKETING EXPERTISE (12 Years, $1.2M+ Budgets, 40+ Team Leadership)

  **Accenture (Pinterest) - Senior Digital Marketing Manager EMEA** (Aug 2021 - Jan 2025)
  - Led team of 8 Digital Marketing Account Managers
  - Supported 2,500+ Pinterest SMB advertisers across EMEA
  - Managed $1.2M annual budget across 15+ countries
  - Surpassed quarterly revenue targets by 22%, achieved 4.2× average ROAS
  - Collaborated on 6 major SaaS feature launches, increasing advertiser retention by 28%

  **Teletech (Google) - Digital Acquisition Manager** (Feb 2016 - Feb 2019)
  - **Led team of 40+ Sales Representatives and Campaign Specialists** across Brazil, Argentina, Mexico
  - **Contributed to 67% increase in new advertiser onboarding** for Google LATAM
  - **Delivered $4.2M incremental revenue** through strategic initiatives
  - **Improved team productivity by 52%** through training program implementation
  - **Reduced onboarding time from 6 weeks to 3 weeks** (50% efficiency gain)
  - **Achieved 15% cost reduction** while maintaining performance standards

  **Tinuiti - Performance Marketing Specialist** (Mar 2019 - Jul 2021)
  - Managed $850K monthly ad spend across Meta, Google, LinkedIn for 45+ clients
  - Achieved 42% CPL reduction, 38% CPA improvement
  - Managed affiliate partnerships with 120+ publishers, driving $2.1M attributed revenue
  - Led 25+ A/B testing initiatives, increasing conversion rates by 18%

  **Atento (Facebook) - Campaign Specialist → Growth Coordinator** (Jan 2014 - Dec 2015)
  - Supervised 25+ Sales Representatives across São Paulo and Rio de Janeiro
  - Onboarded 1,200+ new Facebook advertisers with 78% first-month retention
  - Drove 45% revenue growth and 60% advertiser base expansion in 18 months

  ---

  ### THE TRIPLE-THREAT COMPETITIVE ADVANTAGE

  | Challenge | Most Founders | Victor |
  |-----------|---------------|--------|
  | **Can you deliver premium quality?** | Outsource, hope for best | 9 years, Meta/Google clients ✅ |
  | **Can you build the platform?** | Hire engineers, 12+ months | Computer engineer, builds in 4 weeks ✅ |
  | **Can you acquire customers?** | Trial and error, burn cash | 12 years growth marketing, $1.2M budgets ✅ |
  | **Can you scale operations?** | Learn on the job | Led 40+ person teams, managed LATAM/EMEA ✅ |
  || **Can you leverage AI?** | Hire consultants | AI MBA + Quality Specialist + Corporate AI sales + Failure analysis ✅ |
  || **Can you expand globally?** | Hope and guess | Native Portuguese + Advanced Spanish + 3-country ops ✅ |

  **The Strategic Masterstroke:**

  Victor didn't just "decide to build an AI platform"—he systematically prepared for 12 months:
  - **Nov 2024:** Closed print shop, relocated equipment to Portugal
  - **Jan 2025:** Became professional data annotation specialist
  - **Aug 2024:** Enrolled in specialized AI & Automation MBA
  - **Nov 2025:** Advanced to AI Quality Specialist (Spider.cloud) - testing AI limits & failure analysis
  - **Corporate validation:** Sold AI solution to Chiliz/Socos.com

  **Investor Implication:**  
  Execution risk across product, technology, and growth = **near zero**. This founder doesn't follow trends—he anticipates them and positions strategically. **Corporate AI validation from Chiliz proves market demand for his AI solutions.**

  ---

  ### STRATEGIC TRANSITION: FROM UNSCALABLE TO EMPIRE (2024-2025)

  **The Decision That Changes Everything**

  In November 2024, Victor made a decision that separates strategic founders from operators: he closed a profitable business to build an empire.

  **The Problem Recognized:**
  After 9 years running Blackout Merchandise across 3 countries with notable clients (Meta, Google, Electric Picnic), Victor identified the model's ceiling:
  - **Revenue cap:** ~€200K annually (good business, not scalable)
  - **Divided attention:** 60+ hours/week operations left no time for growth
  - **High CAC:** Traditional customer acquisition unsustainable
  - **Undercapitalization:** Self-funding limited scaling potential
  - **Geographic constraints:** Dublin's costs (€1,800/month overhead) compressed margins

  **The Strategic Pivot:**
  Rather than continue an unscalable model or waste investor capital figuring out the transition, Victor executed a systematic 12-month self-funded preparation:

  #### **Phase 1: Asset Optimization (November 2024)**
  **Decision:** Relocate €110K equipment to Portugal
  - **Strategic rationale:** 40% cost reduction + proximity to premium suppliers (WATC-Studio, Barcelos)
  - **Execution:** Shipped entire production facility while maintaining zero debt
  - **Timeline:** Coordinated with industrial unit lease end (December 2024)
  - **Result:** €110K in owned assets positioned for Portugal operations

  #### **Phase 2: AI Skill Systematization (January 2025-Present)**
  **Decision:** Become AI industry professional before building AI company
  - **Execution path:**
    - **Data Annotation Analyst** (Outlier.ai, Micro1.ai, Telus Digital) - Learn LLM training mechanics
    - **AI Quality Specialist** (Spider.cloud) - Master AI failure analysis and quality assurance
    - **MBA IA e Automação** (Rocketseat) - Formal RAG systems and LLM training education
    - **Corporate validation:** Sold AI system to Chiliz/Socios.com (proof of market value)
  - **Investment:** €3,000 + 1,000 hours (systematic preparation, not guesswork)
  - **Result:** Professional AI credentials + corporate client before seeking investment

  #### **Phase 3: The "All-In" Reality (The Campervan Story)**
  **Decision:** Extend runway 4.5x by living the lean startup.
  - **Narrative:** In November 2024, Victor moved into a campervan to maximize capital for the business. He drove from Ireland to Portugal and currently lives off-grid on a land plot in a forest in Porto with his three cats.
  - **Why:** To drastically reduce cost of living, buying the financial freedom and time needed to plan, build, and launch **Blackout Merchandise** properly.
  - **Execution:**
    - Purchased and renovated Mercedes 308D (1993)
    - Full electrical/solar off-grid setup
    - High-speed Starlink internet for development
    - **Living among nature:** Choosing focus and low burn over comfort.

  **Financial Impact:**
  ```
  Dublin Living Costs (Traditional):
    Rent: €1,200/month
    Utilities: €200/month
    Internet: €60/month
    Commute: €150/month
    ──────────────────
    Total: €1,610/month
    Annual: €19,320

  Campervan Living (Optimized):
    Parking: €0-100/month (public lots)
    Utilities: €80/month (solar supplement)
    Internet: €100/month (Starlink)
    Maintenance: €100/month
    Insurance: €80/month
    ──────────────────
    Total: €360/month
    Annual: €4,320

  ✅ Savings: €15,000/year (77% reduction)
  ✅ Runway Extension: 18 months of full-time development
  ✅ Work Quality: Maintained (high-speed internet, climate control, ergonomic setup)
  ```

  **What This Demonstrates:**

  **1. Strategic Thinking**
  - Recognized unscalable model and pivoted (not stubborn)
  - Identified three leverage points: geography, skills, burn rate
  - Executed systematic preparation before seeking capital

  **2. Self-Funding Discipline**
  - Extended runway 4.5x through creative optimization
  - Preserved €110K in production assets (zero debt)
  - Proved concept viability before asking investors to join

  **3. Execution Ability**
  - Reformed entire campervan in 30 days during facility transition
  - Maintained full-time AI skill development while managing transition
  - Coordinated equipment shipping, lease termination, and lifestyle restructuring simultaneously

  **4. Capital Efficiency Mindset**
  - €15K/year savings = 10+ months additional runway
  - Every euro saved deployed to growth, not overhead
  - Exactly the CEO discipline investors seek

  **5. Total Commitment**
  - Literally restructured entire life for this vision
  - Not a side project or "lifestyle business"
  - All-in dedication before asking others to commit

  **Current Status (January 2025):**
  - **Location:** Relocating to Portugal (Late Dec 2024 confirmed)
  - **Work Environment:** Fully equipped mobile office + Production Facility Setup
  - **Assets:** €113K production equipment (Shipped to Portugal)
  - **Skills:** Professional AI credentials + corporate validation
  - **Runway:** 18 months self-funded development capacity
  - **Team:** Expert Dataset Curator Panel confirmed (remote contractors)
  - **Ready State:** Can launch Day 1 of investment

  **Investor Positioning:**

  > *"Most founders ask for money to figure out if their idea works. I spent 12 months and €110K of my own capital proving it will work. I closed a profitable business, became an AI professional, relocated production assets, and optimized my burn rate to extend runway 4.5x—all before asking anyone to invest.*
  >
  > *This isn't a pitch from someone who needs rescue. This is an invitation to join a systematically de-risked opportunity built by a founder who's already proven he can execute under capital constraints.*
  >
  > *That's the discipline and resourcefulness I'll bring as CEO of Blackout Merchandise."*

  **Why This Story Matters:**
  - **For Investors:** Proof of capital efficiency, strategic thinking, and execution ability
  - **For Crowdfunding:** Inspirational underdog story showing total commitment
  - **For Team:** Demonstrates leadership through personal example
  - **For Partners:** Shows we're serious, prepared, and already invested

  **The Bottom Line:**
  Victor didn't just "have an idea"—he systematically dismantled one business to build another, investing 12 months and €110K of personal capital to de-risk the opportunity. The campervan isn't a liability; it's proof of strategic thinking that extended runway by 4.5x without sacrificing work capacity.

  That's the kind of founder who builds billion-dollar companies.

  ---

  ## 1.6 The Expert Network (Team)

  ### 1.6.1 Founder Dependency & Delegation Strategy

  **The Challenge:**
  Blackout Merchandise's success depends on Victor's unique triple-threat expertise (craft + tech + marketing). This creates a single point of failure risk.

  **Mitigation Measures:**

  #### **1. SOP Documentation Library**
  **Goal:** Document every process so it can be executed by others.

  **Content:**
  - **Production SOPs:** 9 years of documented processes (video + text)
    - Screen printing workflow (coating, exposure, printing, curing)
    - DTG/DTF workflow (pretreatment, printing, finishing)
    - Quality control checkpoints
    - Equipment maintenance schedules
    - Troubleshooting guides

  - **Platform SOPs:**
    - Artist onboarding workflow
    - Order fulfillment process
    - Customer support protocols
    - Financial reconciliation procedures
    - Marketing campaign execution

  **Delivery:** Complete by Month 6, accessible via internal wiki.

  #### **2. AI Training for Production**
  **Goal:** Create custom AI assistant to guide production team.

  **Implementation:**
  - **Training Data:** 500+ documented production scenarios
  - **AI Model:** Mistral Small 4 via API (fast, cost-efficient production guidance)
  - **Use Cases:**
    - "How do I fix registration issues on the Anatol press?"
    - "What's the correct cure temperature for Magna inks?"
    - "How to troubleshoot DTG banding?"
    - "Screen reclaiming step-by-step guide"

  **Benefit:** Production manager can get instant expert guidance without Victor's constant availability.

  #### **3. Brazilian Agency Partnership**
  
  > **Note:** Detailed in Section 1.5 (Strategic Outsourcing Partner) above. Summary:
  - **Human-in-the-Loop Design Desk:** Dedicated designer (Brazilian agency)
  - **Responsibilities:** Handle "Francisca" support tickets, fix AI designs, finalize art files
  - **Cost:** €1,500-2,000/month (3x efficiency vs EU)

  #### **4. Production Manager Hiring**
  **Goal:** Delegate production operations by Month 7-8.

  **Profile:**
  - **Location:** Portugal (local hire, lower cost)
  - **Experience:** 3-5 years screen printing/DTG experience
  - **Training:** Victor provides 2-week intensive training
  - **Responsibilities:**
    - Daily production oversight
    - Quality control
    - Equipment maintenance
    - Staff management (future)
    - Inventory management

  **Cost:** €1,400/month (equal wage model) + profit-sharing.

  #### **5. Expert Panel Support**
  **Goal:** Quality validation without Victor's daily involvement.

  **Process:**
  - **Weekly Review:** Expert panel scores 10% of production samples
  - **Feedback Loop:** Annotated improvements sent to production team
  - **Training Data:** Every review improves the AI assistant
  - **Escalation:** Complex issues routed to panel for resolution

  **Benefit:** Maintains premium quality standard without founder micromanagement.

  #### **6. Internal Tools Development**
  **Goal:** Build systems that reduce manual work.

  **Tools:**
  - **Production Dashboard:** Real-time order tracking, capacity planning
  - **Quality Control App:** Mobile app for QC checkpoints
  - **Inventory Management:** Automated reorder alerts
  - **Financial Dashboard:** Real-time P&L, cost tracking

  **Timeline:** Build incrementally during Phase 4-6.

  ---

  ### EXPERT DATASET CURATOR PANEL (AI Training)

  **Building the World's Only Expert-Scored Screen Print Dataset**

  To train Blackout Merchandise's AI with unparalleled accuracy, we've assembled a panel of **three world-class screen printing authorities** to curate and score our training dataset. This approach reduces dependency on any single expert while creating the highest-quality AI training data in the industry.

  #### **The Expert Panel:**

  **1. Expert A** (Brazil) — @roanexpert
  - **15+ years** specializing in ultra-complex multi-color screen printing
  - **Educational Authority:** Creator of "Photoshop para Serigrafia" course with **6,600+ students**
  - **Industry Recognition:** Key speaker at major South American screen printing fairs
  - Owns **Action Camisetas** (@action.camisetas) — premium print shop in Brazil
  - **Specialty:** Process printing, color separations, high-detail photographic work

  **2. Expert B** (Brazil) — Industry Legend
  - **40+ years** of screen printing mastery
  - One of the longest-tenured experts in the industry
  - **Deep expertise** in traditional techniques, ink chemistry, and substrate science
  - **Specialty:** Classic screen printing methods, troubleshooting, equipment optimization

  **3. Expert C** (Brazil) — The Quality Master
  - Recognized as **the best in the market** for quality and complex prints
  - **Specialty:** Ultra-premium finishes, complex multi-color registration, discharge printing
  - Known for **zero-defect production** on the most demanding jobs
  - Industry reputation for work that other printers cannot replicate

  #### **Why a Panel vs. Single Expert:**

  | Advantage | Explanation |
  |-----------|-------------|
  | **Reduced Dependency** | No single point of failure; business continues if one expert is unavailable |
  | **Diverse Perspectives** | Three scoring viewpoints create more robust training data |
  | **Specialized Knowledge** | Each expert brings different specialty areas |
  | **Cost Efficiency** | Contract-based compensation (per annotations) vs. full-time salary |
  | **Quality Validation** | Cross-reference scores for consistency and accuracy |

  #### **How the Panel Works:**

  **Remote Dataset Curation (Contract Basis):**
  - Experts score 50-100 designs/month using standardized rubric
  - 4 categories: Print Feasibility, Color Accuracy, Detail Preservation, Commercial Viability
  - Scoring done remotely from their existing locations
  - Compensated per annotation batch (cost-effective, flexible)

  **The Expert Rubric:**
  ```
  PRINT FEASIBILITY (1-5):
    Can this design be screen printed with high quality?
    
  COLOR ACCURACY (1-5):
    Will the colors reproduce faithfully on fabric?
    
  DETAIL PRESERVATION (1-5):
    Will fine details survive the printing process?
    
  COMMERCIAL VIABILITY (1-5):
    Is this production-efficient for commercial orders?
  ```

  #### **Competitive Advantage:**

  > *"No competitor has access to a panel of this caliber. Combined, these three experts represent 70+ years of screen printing mastery, 6,600+ trained students, and production knowledge that cannot be replicated at any price in Europe or North America. Our AI will be trained by the absolute best in the world."*

  **Key Differentiators:**
  - **World's only expert-curated screen print AI dataset**
  - **Three-expert validation** creates superior training data
  - **Zero relocation costs** — all work done remotely
  - **Scalable model** — can add more regional experts as needed
  - **Defensible moat** — competitors cannot replicate this network

  ---

  ### GLOBAL EXPANSION STRATEGY

  **Lean, Local-First Approach**

  Rather than relocating experts internationally, Blackout Merchandise will expand by **hiring and training local talent** in each market, supported by Victor's 9 years of screen printing expertise as Head of Training.

  #### **Phase 1: Portugal Operations (Months 1-24)**
  - **Production Manager:** Hired locally in Portugal
  - **Victor's Role:** Direct oversight, quality control, training
  - **AI Support:** Expert Dataset Curator Panel (Expert, Expert B, Expert C) trains AI remotely
  - **Focus:** Perfect operations, document processes, build replicable systems

  #### **Phase 2: Regional Expansion (Months 25+)**
  - **Model:** Hire local production managers in each region
  - **Support:** Proven playbook + AI-assisted production guidance
  - **Markets:** Brazil → Mexico → UK (following market demand)
  - **Advantage:** Zero relocation costs, local market knowledge

  #### **Why This Strategy Works:**

  | Advantage | Explanation |
  |-----------|-------------|
  | **Reduced Dependency** | No single expert critical to operations |
  | **Lower Costs** | No relocation, no currency arbitrage needed |
  | **Local Knowledge** | Each region managed by local experts |
  | **Scalable** | Replicate proven training model in each market |
  | **AI-Assisted** | Trained AI helps maintain quality across regions |

  #### **Risk Mitigation:**
  - Victor's direct expertise ensures quality standards
  - AI trained by world-class panel provides consistent guidance
  - Local hires reduce single-point-of-failure risk
  - Proven systems documented for replication

  ---

  ## 1.7 Market Analysis

  ### Total Addressable Market (TAM)
  **Global Licensed Merchandise Market:** ~$340 Billion (2024)

  The explosion of the creator economy and digital-first brands continues to drive unprecedented growth in merchandise. Independent artists, influencers, bands, and content creators increasingly seek professional-quality merch solutions.

  ### Serviceable Available Market (SAM)
  **European Creator & Niche Art Merch Market:** ~$12 Billion

  Focusing on independent artists, digital creators, and mid-tier influencers in the EU who lack infrastructure for high-quality, ethical merchandise production. This segment is underserved by existing POD platforms that prioritize volume over quality.

  ### Serviceable Obtainable Market (SOM)
  **Target for Years 1-3:** $50 Million (0.4% of SAM)

  Capturing market share through:
  - The "Leopoldo" brand narrative and Cat-Suite AI differentiation
  - Premium quality positioning (organic, fair-trade, in-house production)
  - Pilot Program with high-potential artists (1,000+ social followers, values-aligned)
  - Invite-only exclusivity driving waitlist demand

  ### Market Validation Signals
  - 200M+ creators worldwide actively seeking monetization paths
  - 70%+ of Gen Z/Millennial consumers prefer sustainable/ethical products
  - Existing POD platforms (Printful, Printify, Redbubble) prioritize volume over quality
  - Gap in market: No premium, ethical, AI-powered merch platform exists

  ---

  ## 1.8 Problem & Solution

  ### The Problem

  | Stakeholder | Pain Point |
  |-------------|------------|
  | **Artists** | Struggle with logistics, quality control, upfront costs, and MOQs (minimum order quantities). Most can't afford €500+ for bulk orders. |
  | **Buyers (Fans)** | Tired of generic "drop-shipped" quality and uninspired designs. Want authentic, premium products that reflect artist values. |
  | **The Industry** | Reliance on single-source manufacturing creates supply chain fragility. No platform combines AI design + premium production + ethical sourcing. |

  ### The Solution (Blackout Merchandise)

  | Solution Component | How It Works |
  |-------------------|--------------|
  | **AI Store Management** | Leopoldo & Francisca handle the "business"—adding products, setting prices, and managing orders via chat. No dashboard needed. |
  | **Visual Appearance Editor** | A dedicated drag-and-drop **Visual Editor** (HeroUI) allows artists to manually build their store pages. **Strictly manual control**—artists upload their own banners/media. No AI interference in the site design. |
  | **AI Merch Design** | Cat-Suite agents (Francisca) assist **exclusively with product design** (t-shirts, hoodies)—creating art, refining mockups, and ensuring print-readiness. |
  | **Curated Quality** | **WATC Studio** 100% organic cotton premium blanks (Barcelos, Portugal) + in-house screen printing production = higher standard than Redbubble/Printful. Portuguese supply chain = faster logistics + ethical transparency. |
  | **Zero Upfront Cost** | Artists only pay when products sell (deducted from sale price). No MOQs, no inventory risk. |
  | **Production Redundancy** | Own facility (Portugal) + vetted partner network = zero downtime, global fulfillment capability. |
  | **Ethical Alignment** | Vegan, fair-trade, eco-friendly products match increasingly conscious consumer preferences. |

  ---

  ## 1.9 Competitive Analysis

   ### Direct Competitors (Print-on-Demand Platforms)
   
   | Feature | **Blackout Merchandise** | Fyul (Printful+Printify) | Redbubble | Spring (Teespring) | SPOD |
   |---------|----------------|-------------------------|-----------|-------------------|------|
   | **Store Builder** | ✅ **Visual Editor** (Manual Drag & Drop) | ❌ Complex dashboard | ❌ Complex dashboard | ⚠️ Basic templates | ⚠️ Limited | ❌ Complex |
   | **AI Merch Design** | ✅ Full Cat-Suite (Francisca) | ❌ 3D Design Maker (not AI) | ❌ None | ❌ None | ❌ None | ❌ None |
   | **Voice Interface** | ✅ **Mistral Voxtral** (Real-Time Voice-to-Voice + Conversation Mode) | ❌ | ❌ | ❌ | ❌ | ❌ |
   | **Blank Quality** | ✅ Premium organic, fair-trade (WATC Studio) | ⚠️ Standard | ⚠️ Low-mid | ⚠️ Standard | ⚠️ Standard | ⚠️ Standard |
   | **Supplier Location** | ✅ Portuguese (Barcelos) — short lead times, ethical traceability | ❌ Global network | ❌ Global network | ❌ Global network | ❌ Global network | ✅ Local (context dependent) |
   | **Ethical/Vegan Default** | ✅ Yes (core value) | ⚠️ Optional upgrade | ⚠️ Provider dependent | ❌ No | ❌ No | ⚠️ Limited |
   | **In-House Production** | ✅ Own facility (Portugal) | ❌ Outsourced network | ❌ Outsourced | ❌ Outsourced | ❌ Outsourced | ✅ Own facilities |
   | **Quality Control** | ✅ Direct oversight | ⚠️ Varies | ⚠️ Varies | ❌ Inconsistent | ⚠️ Varies | ✅ Good |
   | **Screen Printing** | ✅ Specialty (8-20+ colors) | ⚠️ Basic | ⚠️ Provider dependent | ❌ DTG only | ❌ DTG only | ⚠️ Limited |
   | **Bulk Orders (50+)** | ✅ Core offering | ⚠️ Available | ⚠️ Limited | ❌ No | ⚠️ Limited | ✅ Yes |
   | **Artist Margin (Typical)** | 40-60% | 20-35% | 20-40% | 10-20% | 15-30% | 25-40% |
   | **Onboarding UX** | ✅ Conversational + Visual | ❌ Complex dashboard | ❌ Complex dashboard | ⚠️ Simple but limited | ⚠️ Wizard-based | ❌ Complex |
   | **Target Audience** | Premium artists, ethical brands | Volume sellers | Budget-conscious | Casual/hobbyist | Influencers | Volume sellers |
   
   ### Why Existing Platforms Fail Artists
   
   **Fyul (Printful + Printify Merger):**
   - Complex dashboards require technical skills
   - Quality varies across their outsourced network
   - No design assistance—artists need existing assets
   - Premium blanks cost extra, not default
   - No screen printing expertise
   - **Competitive Gap:** Design Maker is 3D mockup tool, NOT conversational AI
   
   **Redbubble / Spring:**
   - Race-to-the-bottom pricing compresses artist margins
   - Generic, mass-market feel doesn't match premium artist brands
   - No bulk order support for touring artists
   - Quality complaints common in reviews
   - No ethical/sustainable positioning
   
   **SPOD (Spreadshirt POD):**
   - Good quality but no AI assistance
   - Traditional dashboard UX, not conversational
   - No ethical/vegan focus
   - Limited customization

  ### Blackout Merchandise's Unfair Advantages

  | Advantage | Why Competitors Can't Replicate |
  |-----------|--------------------------------|
  | **Founder Expertise** | 9 years screen printing + CS degree + 12 years marketing = triple-threat doesn't exist elsewhere |
  | **€113K Owned Equipment** | Competitors outsource; we have invested capital in production infrastructure |
  | **Cat-Suite AI Personality** | Unique brand narrative (Leopoldo, Francisca, Antônia) creates emotional connection |
  | **Expert-Scored Dataset** | Validated by **Expert A (6,600+ students)** & Expert Panel - no competitor has this quality depth |
  | **Showroom vs Workshop UX** | Genuine product innovation: Apple-esque "Showroom" frontend vs gritty "Workshop" backend |
  | **Ethical-First Positioning** | Not an "add-on" tier—core brand value attracts values-aligned artists |
  | **Screen Print Mastery** | Premium multi-color work (8-20+ colors) that 95% of printers can't execute |
  | **Pantone Precision** | We mix inks to exact Pantone codes (Magna) **OR calibrate DTG printers to match the same Pantone standards**; competitors use generic "closest match" digital approximation |
  | **Conversational UX** | Dashboard-free experience that feels like texting a friend, not managing software |

  ### Indirect Competitors

  | Category | Examples | Why We Win |
  |----------|----------|------------|
  | **Traditional Merch Companies** | Bandwear UK, Hello Merch | We're AI-powered, zero upfront cost; they require MOQs and manual processes |
  | **Design Marketplaces** | 99designs, Fiverr | We integrate design + production; they only do design |
  | **Local Print Shops** | Various | We handle e-commerce, fulfillment, global shipping; they're local-only |
  | **Big Box Merch** | Amazon Merch, Zazzle | We're premium + ethical; they're volume + generic |

  ### Positioning Statement

  > **For independent artists and ethical brands** who want premium merchandise without the complexity, **Blackout Merchandise** is the **AI-powered conversational commerce platform** that **designs, produces, and fulfills in-house with zero upfront cost**. Unlike Printful or Redbubble which outsource production and offer generic quality, **we combine owned manufacturing, expert screen printing, and a unique AI personality to deliver merch that actually matches your brand's values.**

   ### AI Safety Nets (Hallucination Mitigation)
   We prioritize customer satisfaction over AI autonomy. To mitigate "hallucinations" or unprintable designs:
   1.  **Expert Scoring Loop:** The AI pre-scores its own designs for "Printability" using expert-trained model. Low scores trigger a "Francisca suggests edits" flow rather than showing the user a bad design.
   2.  **Human-in-the-Loop Routing:** Users have an explicit "Ask a Human Designer" option if they feel stuck or frustrated.
   3.  **Frustration Detection:** If the AI detects negative sentiment or repeated rejections, the case is automatically routed to a human designer for review.
   4.  **Failure-as-Data:** Every "failed" interaction or rejected design is anonymized and fed back into the training data to improve the model, effectively turning operational friction into a competitive moat.
   
   ---
   
   ---
   
   ## 1.9.1 Competitive Threat Analysis
   
   > **Research Status:** Updated January 23, 2026 based on current competitive landscape
   
   ### The Fyul Merger Reality (November 2024)
   
   **What Happened:** Printful + Printify merged into **Fyul**
   
   | Metric | Value | Implication |
   |---------|--------|-------------|
   | **Employees** | 2,000+ | Can execute fast with deep pockets |
   | **Funding** | $184M+ combined | Significant R&D budget |
   | **Valuation** | $1B+ | Can acquire competitors or innovate rapidly |
   | **AI Focus** | Blog content + 3D mockups | Wrong direction for conversational AI |
   
   **Strategic Impact:** Fyul is now the dominant POD platform with resources to build AI features quickly. Our 12-18 month window for conversational AI advantage is REAL but time-limited.
   
   ### Fyul Response Scenarios (6-18 Month Horizon)
   
   | Threat Level | Scenario | Our Counter-Strategy |
   |--------------|-----------|---------------------|
   | **HIGH** | Add AI Design Assistant (ChatGPT wrapper) | Counter: **Expert-scored dataset** (6,600+ student validation from Expert) vs. generic LLM |
   | **HIGH** | Launch "Fyul Conversational" brand | Counter: **Cat-Suite personalities** (emotional connection) vs. generic bot |
   | **MEDIUM** | Premium blank tier (organic/fair-trade) | Counter: **In-house production** (Pantone precision) vs. outsourced provider network |
   | **LOW** | Voice interface via existing providers | Counter: **Mistral Voxtral** (real-time voice, open weights, EU-based) + **Mistral Large** (character chat) + Cat-Suite context awareness |
   | **MEDIUM** | Copy "Velvet Rope" exclusivity model | Counter: **VIP Sentinel** (our already has technical implementation) + **Artist-vetted waitlist** |
   
   ### Gelato Response Scenarios
   
   | Threat Level | Scenario | Our Counter-Strategy |
   |--------------|-----------|---------------------|
   | **MEDIUM** | AI Estimator (B2B tool) | Counter: B2B focus doesn't address creator needs directly |
   | **LOW** | AI Product Onboarding (automated) | Counter: B2B only, not artist-facing AI |
   | **MEDIUM** | Copy ethical/sustainability messaging | Counter: Equal wages + vegan/fair-trade as core DNA |
   | **HIGH** | Fast Company Innovation recognition | Counter: We focus on creator experience, not industry awards |
   
   ### Win-By-Default Scenarios (Fyul and Gelato Cannot Replicate)
   
   1. **Touring Bands** - Need bulk orders + quick turnaround
      - Fyul outsources: 10-14 days production
      - Blackout Merchandise in-house: 3-5 days shipping
   
   2. **Pantone Precision** - Brand-conscious artists
      - Fyul/Gelato: Digital approximation ("closest match")
      - Blackout Merchandise: Exact Magna IM6 ink mixing OR calibrated DTG
   
   3. **Metal/Punk Network** - Victor's 9-year relationships
      - Blackout client portfolio: Meta, Google, Sepultura, Electric Picnic
      - Cannot be acquired or replicated by corporate moves
   
   4. **Artist Education** - AI helps beginners
      - Fyul/Gelato: Expects existing design assets
      - Blackout Merchandise: AI-assisted creation from scratch
   
   5. **Ethical Certification Path** - B-Corp trajectory
      - Fyul/Gelato: Ethical as add-on tier
      - Blackout Merchandise: Ethical as core DNA (equal wages, vegan/fair-trade standard)
   
   ### Moat Defense Strategy
   
   **Timeline for AI Dataset IP Protection:**
   - **Months 1-3:** Capture expert panel scoring data (Expert, Expert B, Expert C)
   - **Months 3-6:** Train and validate proprietary model
   - **Months 6-12:** Patent key training methodologies
   
   **Exclusive Relationships:**
   - Expert panel (Expert: 6,600+ students, Expert B/Expert C: proprietary techniques)
   - Not contractually transferable to competitors
   
   ---
   
   ---

  ---

  ## 1.10 UI/UX Design System

  ### Core Design Philosophy
  - **Minimalist & Focused:** Clean, distraction-free interface centered on the conversation.
  - **Mobile-First Responsive:** One fluid design system for all devices.
  - **PWA-Ready:** App-like experience (installable, offline-capable) is an MVP priority.

  ### Visual Identity (Dark Mode "Ink & Void")
  | Element | Specification | Usage |
  |---------|---------------|-------|
  | **Base** | `zinc-950` (Deepest Charcoal) | Backgrounds, cards (softer than pure black) |
  | **Base (Landing)** | `#000000` (Pure Black) | Landing page only — more dramatic |
  | **Primary** | `#FFFFFF` (Stark White) | Main text for maximum contrast |
  | **Accent (App)** | `#E11D48` (Recording Red) | Main app "Action" buttons, recording status, active states |
  | **Accent (Landing)** | Gold Sheen Gradient | Landing page CTAs, highlights, premium feel |
  | **Typography** | **Space Grotesk** (Headings) | Hero titles, section headers (quiky, tech-inspired) |
  | **Body Font** | **Inter** (Text) | Legible, clean, invisible UI text |
| **Motion Icons** | **ItsHover** (React) | Intent-aware animated icons for micro-interactions |

  > **Gold Sheen Effect (Landing Page):**
  > ```css
  > background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
  > box-shadow: 0 0 60px rgba(212, 175, 55, 0.15);
  > color: #D4AF37;
  > ```

  > **Implementation Status (Jan 2026):** Switched to **HeroUI** (previously NextUI) component library for premium out-of-box aesthetics. Configured with sharper border-radius (`0.375rem`), zinc base color, and Recording Red CSS variable (`--recording`). Official Figma UI kit available for design iteration.

  ### Comparison: Why This Aesthetic? ("Showroom vs. Workshop")
  We deliberately embrace a duality in our visual language:
  - **The Showroom (Frontend/AI):** Clean, Apple-esque, "Ink & Void" aesthetic. It feels like a high-tech lab where magic happens.
  - **The Workshop (Production/Back-end):** Marketing materials and "behind-the-scenes" content embrace the gritty, industrial reality of screen printing—ink splatters, mechanical noise, tangible craft.
  - **The Landing Page:** Pure black with gold sheen accents — luxury fintech aesthetic for waitlist/crowdfunding. Premium, minimal, mobile-first.
  This proves we aren't just a software wrapper; we are a **maker** company. The **Red Accents** bridge both worlds in the main app—signaling "recording" in the AI interface and "warning/action" in the factory. **Gold Sheen** is reserved for marketing/landing pages to convey luxury and exclusivity.

  ### Key Interface Components

  #### 1. The "Cat-Suite" Avatars (Hero Element)
  - **Tech:** Reactive Rive/Lottie loops (lightweight vector animations).
  - **Behavior:** Subtle breathing/blinking in idle state. **Reacts to user input** (looks at cursor, ears twitch when typing).
  - **Style:** 2D high-fidelity stylized illustrations (not 3D uncanniness).
  - **Roles:**
    - **Leopoldo:** Sales Strategy & Business Ops (The "Boss") - Pricing, bulk orders, margin optimization. **(Year 2-3):** MRCH token onboarding — guides artists through wallet setup, earning milestones, and quarterly EURC distributions via natural Cat-Suite conversation. See `Documentation/05-Community-Ownership/MRCH_ARTIST_ONBOARDING.md`.
    - **Francisca:** Merch Product Design & Print Strategy (The "Visionary") - Focused *strictly* on key art and product creation.
    - **Antônia:** Logistics & Support (The "Hunter") - Shipping, returns, customer service.

  ##### Cat-Suite Animation Evolution (Phased Approach)
  
  > **Status (Jan 2026):** Assets complete for all 3 characters (20 expressions each, 8K resolution). Phase A implementation in progress.

  | Phase | Approach | Features | Timeline |
  | :--- | :--- | :--- | :--- |
  | **Phase A (MVP)** | Expression Swapping | Full-body image swaps based on AI state. 20 expressions per character. Simple but effective. Uses Framer Motion for transitions. | Q1 2026 |
  | **Phase B (Future)** | Full Puppet System | Layer separation (Body, Head, Eyes, T-Shirt, Paws, Tail). Eye tracking follows cursor. Paws animate on user input. T-shirt area shows user designs in real-time. | Post-MVP |
  
  **Phase A Implementation (MVP):**
  - 60 total expression images (20 × 3 characters) with backgrounds removed
  - Cloudinary serves optimized images via CDN
  - React/Framer Motion handles smooth crossfade transitions
  - AI state triggers expression changes (Neutral → Thinking → Happy, etc.)
  
  **Phase B Vision (Future Enhancement):**
  - Separate layers: Body (static), Head (swappable), Eyes/Pupils (mouse tracking), T-Shirt (design overlay), Paws (typing indicator), Tail (idle animation)
  - Rive state machines for complex interactions
  - Real-time t-shirt design preview on avatar
  - "The Daily Drip" feature: avatars wear top-selling user designs

  #### 2. Chat Conversation UI
  - **Layout:** WhatsApp/Telegram paradigm (bubbled messages).
  - **Input:** Fixed bottom bar with prominent **Voice Input** (Voxtral Transcribe 2 integration).
  - **Feedback:** "Waveform" visualization during voice recording.

  #### 3. Social Validation Engine: "The Daily Drip"
  All 3 agents participate in an automated **"Outfit of the Day" (OOTD)** rotation to validate community creativity.
  -   **Mechanism:** Agents wear real user designs, swapped daily at midnight via **Rive Runtime Texture Swapping**.
  -   **Roles:**
      -   **Leopoldo:** Wears the **"Top Seller"** (Signals logic & success).
      -   **Francisca:** Wears the **"Staff Pick"** (Signals artistic merit).
      -   **Antônia:** Wears the **"Fresh Drop"** (Signals newness).
  -   **Attribution:** Subtle link below avatar: *"Leopoldo is wearing 'Cyber-Skull' by @MariaMetal"*.

  #### 4. Avatar Behavior Matrix (The "Digital Soul")
  Agents react to user actions via **Rive State Machines**, creating a game-like responsiveness.

  **A. Leopoldo (The Boss/Sales)**
  | Trigger / Context | Rive State Name | Visual Description |
  | :--- | :--- | :--- |
  | **Idle (Hero)** | `idle_breathing_confident` | Hands clasped, confident posture, slight head bob. |
  | **Idle (Showroom)** | `orb_float_loop` | Transforming into a glowing specific geometric logo. Floats vertically. |
  | **Cart > €500** | `nod_money_smirk` | Determine nod and a slight "not bad" smirk. |
  | **Mouse Hover** | `blend_mouse_xy` | Eyes tracking the cursor position. |

  **B. Francisca (The Designer/Visionary)**
  | Trigger / Context | Rive State Name | Visual Description |
  | :--- | :--- | :--- |
  | **Idle (Studio)** | `lean_on_desk` | Leaning forward on the bottom edge of the viewport. Close-up framing. |
  | **New Design** | `gesture_hand_sweep` | Sweeping hand gesture towards the Canvas area ("Voila!"). |
  | **Low-Res Upload** | `squint_analyze` | Leans *very* close to the "camera", squinting eyes. |
  | **Success** | `clap_excited` | Brief excited clap or fist pump. |

  **C. Antônia (The Fixer/Support)**
  *Note: Antônia is On-Demand. She enters only when summoned.*
  | Trigger / Context | Rive State Name | Visual Description |
  | :--- | :--- | :--- |
  | **Summoned** | `idle_clipboard_tap` | Enters holding a tablet/clipboard. Professional, alert. |
  | **Tracking Order** | `scan_box_hologram` | Projects a hologram beam from watch, scanning for package. |
  | **Complaint** | `hand_on_heart` | Soft expression, hand on chest ("I understand"). |
  | **Resolved** | `salute_confident` | A crisp, friendly salute. |

  **D. Micro-Interactions**
  - **Boredom Breaker:** If idle > 15s, Francisca 'knocks' on the screen glass to get attention.
  - **Thinking:** Agents maintain a `thinking_chin_stroke` pose while the token stream generates, replacing generic spinners.
  - **Lip Sync:** Mouth moves in sync with TTS audio using Rive's audio analyzer.

  #### 5. Dynamic Transitions: "Hero to Copilot" (Legacy Reference)

  > **Architecture Update (Jan 2026):** The split-screen "Workshop" and floating "Showroom" modes have been consolidated into a **unified Chat-First interface** (see Section 1.11). The transitions below are preserved for reference but the primary UX is now conversational.

  To maintain the "Premium" feel and ensure the AI is helpful without being intrusive, we utilize a context-aware layout system called **"Hero to Copilot."**

  | Context | Avatar Mode | Layout Description | Transition Behavior |
  | :--- | :--- | :--- | :--- |
  | **Landing / Auth / Handover** | **Hero Mode** | **Center Stage:** Avatar is large, occupying the focal point using the "Full Body" Rive state. | Default state. Commands attention. |
  | **Chat Interface (Primary)** | **Sidebar Mode** | **Unified Chat:** Agent avatar in sidebar (50px), chat area with rich responses. See Section 1.11. | Smooth fade from Hero → Chat layout. |
  | **Support Summon** | **Agent Swap** | **In-Chat Handoff:** Current agent sends handoff message, sidebar avatar swaps to new agent. | Avatar transition animation in sidebar. |

  **Technical Implementation:**
  - **Rive Inputs:** The `view_mode` input triggers state changes (e.g., `Hero` → `Sidebar`).
  - **Persistence:** The chat history and audio session remain active during all transitions, preserving the illusion of a continuous journey.

  #### 6. Sticky Header / Mega Menu
  - **Desktop:** Minimal logo + clean navigation links.
  - **Mobile:** Logo + Hamburger menu to maximize screen real estate for chat.

  #### 7. Artist Attribution & Previews
  - **Design:** Minimal text: "Merch by @artist_name".
  - **Interaction:** Hover/Tap reveals a "mini-profile" card with 3 top-selling items and Instagram link.

  #### 8. Marketing Landing Page Effects (Scroll-Scrubbing Video)
  - **Tech:** GSAP + ScrollTrigger with pre-rendered image sequences (Apple-style)
  - **Use Cases:**
    - "How It Works" section: Scroll through `Upload → AI → Mockup → Ship`
    - Founder story / brand narrative on Kickstarter page
    - Cat-Suite character introductions (Leopoldo, Francisca, Antônia)
  - **Context:** Passive scroll-storytelling mode (marketing pages only)
  - **Not For:** App interactions — agent transitions use button-triggered animations, not scroll
  - **Mobile Fallback:** Auto-play or tap-to-progress (scroll-scrub feels less natural on touch)

  #### 9. Chat-First Interface Architecture (Unified Experience)

  > **Status (Jan 2026):** Pivoted from Workshop/Showroom split to a unified Chat-First interface. This consolidates all interactions into a familiar ChatGPT-style UX.

  **The Core Insight:**
  Users are already trained by ChatGPT/Claude/Perplexity on how to interact with AI. Instead of inventing custom UX for "Showroom" (browsing) and "Workshop" (designing), we leverage this learned behavior with a **single conversational interface**.

  **Layout Structure:**
  ```
  ┌─────────────────────────────────────────────────────────┐
  │  SIDEBAR                    │  MAIN CHAT AREA           │
  │                             │                           │
  │       Leopoldo              │  🐱 "What merch today?"   │
  │    ┌───────────┐            │                           │
  │    │    🐱     │            │  User: "Show me tees"     │
  │    └───────────┘            │                           │
  │    ░░ shadow fade ░░        │  [PRODUCT CAROUSEL]       │
  │                             │  [Organic Tee] [Classic]  │
  │  🔍 Search...               │                           │
  │                             │  🐱 "Great choice! Want   │
  │  RECENT                     │      to customize it?"    │
  │  > T-shirt project          │                           │
  │  > Hoodie collection        ├───────────────────────────┤
  │                             │  "Show me the garment     │
  │  ─────────────────────      │   options"                │
  │  👤 User Name          ▼    │  "I want to create a      │
  │     Pro workspace           │   new design"             │
  │                             │  ↓ More suggestions       │
  │                             ├───────────────────────────┤
  │                             │  [Type message...]  🎤 ➤  │
  └─────────────────────────────────────────────────────────┘
  ```

  **Sidebar Design:**
  - **Top:** Agent name + larger avatar (50px) with shadow fade
  - **Search bar:** Below avatar
  - **Chat history:** "Recent" only (no "Pinned")
  - **Bottom:** User profile (click opens settings dropdown)
  - Settings gear removed from sidebar — consolidated into profile dropdown

  **Conversational Prompt Suggestions:**
  Instead of button-style chips (`[Browse Garments]`), we use full conversational sentences:
  - "Show me the garment options"
  - "I want to create a new design"
  - "Check my store analytics"
  - "Help me set up my e-shop"

  These appear in a **collapsible list** above the input bar:
  - **Collapsed:** Clean input bar only
  - **Expanded (on input focus):** Prompt suggestions appear, scrollable with "Show more"
  - **Context-aware:** Suggestions change based on conversation state

  **Rich Response Types:**
  The Cat-Suite sends interactive elements inline with chat:
  | Response Type | Example Use Case |
  |---------------|------------------|
  | **Carousel** | Garment options, t-shirt styles |
  | **Product Card** | Selected item with mockup preview |
  | **Mockup Preview** | Design applied to garment |
  | **Dashboard Stats** | Sales analytics inline |
  | **Action Buttons** | "Confirm order", "Edit design" |

  **Agent Swap Mechanics:**
  When the conversation topic changes domain, agents hand off naturally:

  ```
  User: "I want to track my order"

  🐱 Leopoldo: "Order tracking? Let me get Antônia — she's our logistics expert!"

  [Avatar smoothly transitions: Leopoldo → Antônia in sidebar]

  🐈 Antônia: "Hey! I've got your order info. Which shipment?"
  ```

  | Topic Domain | Primary Agent | Swap Trigger |
  |--------------|---------------|--------------|
  | Business, pricing, onboarding | **Leopoldo** 👔 | Default |
  | Design, artwork, mockups | **Francisca** 🎨 | "design", "mockup", "artwork" |
  | Orders, shipping, returns | **Antônia** 📦 | "order", "tracking", "shipping" |

  **Handoff Example Lines:**
  - Leopoldo → Francisca: "Design talk? Francisca's your girl!"
  - Francisca → Antônia: "Shipping question? Antônia's got you covered!"
  - Antônia → Leopoldo: "Business strategy? Let me get the boss..."

  **Benefits:**
  - Single screen — no navigation, no context switching
  - Familiar UX — users already know how to chat with AI
  - Reduced complexity — fewer components to build/maintain
  - Personality-rich — agent swaps add memorable charm

  ---

  #### 9.1 "Velvet Rope" Homepage Strategy (Invite-Only UX)

  > **Status (Jan 10, 2026):** Adopted a two-layer homepage architecture that differentiates anonymous visitors from authenticated users.

  **The Core Insight:**
  Invite-only platforms don't explain themselves. Luxury brands don't beg for customers. The public homepage should create **intrigue and exclusivity**, not marketing conversion.

  **Two-Layer Architecture:**
  | Visitor Type | Experience |
  |--------------|------------|
  | **Anonymous** | Portfolio showcase — "If you know, you know" |
  | **Authenticated** | Full Leopoldo AI chat interface (see Section 1.11) |

  **Anonymous Homepage Design:**
  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │  BLACKOUT MERCHANDISE              [Portfolio]  [About]  [Login]          │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │      "We help artists to produce, design and                   │
  │              source premium merchandise"                        │
  │                                                                 │
  │                     🐱 Leopoldo Avatar                          │
  │                   (shadow fade transition)                      │
  │                                                                 │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │    [Masonry Grid: Portfolio of printed garments]               │
  │    - Artist collaborations                                      │
  │    - Festival merch                                            │
  │    - Premium blanks showcase                                    │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
  ```

  **Design References:**
  - [Qi143](https://qi143.qodeinteractive.com/) — Masonry portfolio, editorial feel
  - [Terrible*](https://www.terrible.group/) — "We don't work with everyone" energy

  **Why This Works:**
  1. **Intrigue** — Visitors wonder "Who are their clients?"
  2. **Exclusivity** — "They don't need to sell themselves"
  3. **Social proof** — Portfolio shows real work with real artists
  4. **Less to build** — Portfolio page is simpler than marketing site
  5. **Leverages existing work** — 9 years of Blackout Merchandise portfolio

  ---

  #### 10. Seamless Transaction Strategy ("The Invisible Checkout")
  We prioritize "Flow" over "Forms". The goal is **zero keyboard usage** for transactions.
  - **Auth:** **Biometrics First** (Passkeys via Clerk).
    - *Flow:* User taps "Sign In" → FaceID/TouchID prompt → Logged in.
    - *Fallback:* Email Magic Link (No passwords to forget).
  - **Payments:** **Express Checkout** (Stripe Element).
    - *Flow:* Leopoldo presents "Pay Now" card → User taps → Apple/Google Pay Sheet slides up → FaceID confirmation.
    - *Result:* Shipping/Billing info pulled directly from OS. No typing.

  #### 10.1 AI Store Customization (Francisca + V0)
  Artists customize their e-shop storefronts through **natural conversation** with Francisca, powered by V0's code generation API behind the scenes.

  **The User Experience:**
  > Artist: "Make my store darker with a masonry product grid"
  > 
  > Francisca: "Done! I've updated your layout. Want me to add hover effects too?"

  The artist never sees V0 — only the Cat-Suite interface.

  **Technical Architecture:**
  ```
  Artist Request → Francisca (LLM Classifier) → V0 API → Sanitized CSS/Layout → Applied to Store
  ```

  **Smart Model Routing (Cost Optimization):**
  Francisca classifies request complexity and routes to the cheapest capable model:

  | Request Type | Example | Model | Cost |
  |--------------|---------|-------|------|
  | **Simple** | "Change my banner image" | V0 Mini | $0.50/1M input |
  | **Medium** | "Add masonry grid layout" | V0 Pro | $1.50/1M input |
  | **Complex** | "Redesign entire page" | V0 Max | $3.50/1M input |

  **Estimated Cost:** ~80% of requests are simple (image/text swaps) → V0 Mini handles most work at minimal cost.

  **Rate Limiting:**
  - Daily limit per artist: 10-15 customization prompts
  - Monthly cap: 100 prompts
  - Prevents runaway costs while enabling real value

  **Sandboxed Editing (Artist Can Modify):**
  - Banner images and text
  - Color theme (from preset palette)
  - Product grid layout
  - About section content
  - Social links

  **Platform-Controlled (Locked):**
  - Navigation structure
  - Cart/Checkout flow
  - Cat-Suite agent placement
  - Core functionality
  - Backend logic and database
  - Authentication and payments

  > [!IMPORTANT]
  > **Frontend-Only Access:** Artists can ONLY modify visual presentation (CSS, images, text, colors). They have ZERO access to backend code, database, structure, or platform logic. Francisca enforces these boundaries and will refuse requests that attempt to modify protected elements.

  **The Starter Template:**
  All artists begin with the same base e-shop template. Customization is a "skin" layer on top of a locked foundation. This ensures:
  - Consistent buyer experience across all stores
  - One codebase to maintain (not hundreds)
  - Easy rollback/reset if artist breaks their styling
  - Platform updates can be pushed to all stores

  **Safety Features:**
  - Version history (undo any change)
  - "Reset to Default" one-click recovery
  - Output validation before applying

  ---


  ## 1.11 User Journeys ("Day in the Life")

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
  1.  **Entry:** Alex sees a TikTok about "Blackout Merchandise." Taps link.
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
  1.  **Entry:** They import their Redbubble designs into Blackout Merchandise.
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
    *   **VIP Branch:** "Wow, 50k is serious. Listen, I can fast-track you to the Beta right now... but I need a favor. Would you record a quick 'I'm joining Blackout Merchandise' shoutout for us?"
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
   - "I'd switch to Blackout Merchandise if margins were..." — [Artist Name], Pricing sensitivity
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
   > "I make €2 per €25 shirt on Redbubble. That's criminal. Blackout Merchandise offered me €14 for the same sale." — Existing POD Artist
   
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
    - "Reserve Your Artist Slug" CTA (e.g., `blackoutmerch.example/yourname`)

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
  PREMIUM EQUIPMENT EXPANSION:            €127,500
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

  Brother GTX Pro + Large Platen:          €15,000
    - Premium DTG printing for small runs
    - Large platen for oversized prints (A2+)
    - Exceptional detail on dark garments
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
  TOTAL INVESTMENT ASK:                   €300,000

  TOTAL CAPITALIZATION:
    Existing assets (founder equity):     €113,000
    Investment:                           €300,000
    ────────────────────────────────────
    Total:                                €413,000

  Post-Money Valuation Target:     €1.65M-1.85M
  Investment Equity: 16-18%

  RUNWAY: 24 months to profitability
  (vs 18 months if based in Ireland)
  ```

  **Crowdfunding / Pre-Sales Allocation Protocol:**
  Any net capital raised via Rewards Crowdfunding (Product Pre-sales) is strictly allocated to **Capacity Acceleration**, not Operations. This ensures preserving the investor runway while unlocking growth bottlenecks.

  - **Tier 1 Goal (€15k raised):** Immediate purchase of **2nd Brother GTX Pro** (Solving the PoD Capacity Bottleneck ahead of schedule).
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
    - *"Blackout Merchandise is not a coastal tech startup seeking interior subsidy. It's a founder relocating to the interior with personal financial commitment (residential land purchase) and active integration into an existing community network committed to sustainable, ethical production."*
    - This positioning unlocks municipality-level support programs, ESG-focused grant streams, and interior depopulation initiatives (e.g., *Programa de Valorização do Interior*).

  **Creative Studio Hub — Music, Recording, Streaming & Photography:**

  The industrial unit includes a **Creative Studio Hub** — three dedicated creative spaces serving both Blackout Merchandise internal production and the broader creative community of Castelo Branco. Access is free, governed through the Blackout Merchandise platform's booking module, and open to musicians, bands, actors, digital creators, photographers, and illustrators.

  > **Full specification, equipment budgets, and grant narrative:** See [`/Documentation/06-Creative-Studio/Creative-Studio-Hub.md`](../06-Creative-Studio/Creative-Studio-Hub.md)

  **The Three Spaces:**

  | Space | Internal Use | Community Use |
  |-------|-------------|---------------|
  | **Music + Recording Room** | Artist sessions, brand audio content, demo recordings | Band rehearsals, recordings, live streams |
  | **Meeting + Streaming Room** | Artist onboarding, team meetings, partner calls | Streaming sessions, content production, workshops |
  | **Photo Studio** | Product photography, catalog shoots, campaign imagery | Portrait sessions, lookbooks, editorial content |

  **Booking System (Blackout Merchandise Platform):**
  - Application gate — creatives apply, Blackout Merchandise approves
  - 2 hours per booking, max 1 booking per week
  - Approval expires after 3 months of inactivity (keeps network active)
  - No-show: 1 lifetime warning, then 3-month suspension
  - Waitlist queue for full slots; freed slots auto-notify next in line
  - Full calendar transparency — all bookings visible as "Blackout Merchandise" or "[Artist Name]"

  **Why this is strategic, not charitable:**
  - Organic content flywheel — community sessions generate authentic social content at zero paid-media cost
  - Network building — approved users are warm leads who have experienced Blackout Merchandise firsthand
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
  - **Studio scheduling conflicts:** Blackout Merchandise internal shoots may compete with community bookings. Mitigation: Blackout Merchandise books via the same system with no priority override — plan sessions in advance and respect the queue like everyone else.

  **Next Steps:**
  1. Complete residential land acquisition in Castelo Branco
  2. Document community network (names, roles, availability) for grant applications
  3. Contact Castelo Branco municipality (Invest CB / ALECB) for land terms confirmation
  4. Identify open Portugal 2030 calls compatible with Blackout Merchandise's investment structure and interior location
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
  > **"Back Blackout Merchandise. Earn with Blackout Merchandise. Build the Future Together."**

  **Transparency Badge:**
  > **📊 Transparent Profit-Sharing**  
  > All profit distributions documented with full audit trail. Team members receive detailed statements showing exactly how profit is shared.

  **Key Pitch (€499 Tier):**
  > Your €499 backing puts you at the Strategic Partner level. Join our exclusive community of 20 partners who help shape Blackout Merchandise's future. Quarterly calls with the founder, co-marketing opportunities, and recognition as a platform builder. You're not just backing a project—you're co-creating it.

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
  | **Blackout Merchandise** | **€15.00** (Heavyweight) | **€30.00** | **€15.00** | **Premium Organic 220gsm** |
  | Printful | €12.95 (Standard Gildan) | €25.00 | €12.05 | Basic 150gsm (Gildan 64000) |
  | Redbubble | €18.00 (Base + Markups) | €22.00 | €4.00 | Artist has little control. Volume play. |
  | Local Shop | €8.00 (Bulk 50+) | €30.00 | €22.00 | Requires upfront cash (€400+) + Risk. |

  **The Sweet Spot:** Blackout Merchandise beats Printful on **Quality-Adjusted Profit**. To get a 220gsm tee on Printful, base price jumps to ~€19.00, dropping profit to €6.00. We offer better profit than POD with significantly better quality.

  #### 2. Marketing the "Premium" Justification
  How do we teach artists to sell a €30 tee?

  **Argument A: "Don't sell Merch, Sell Fashion."**
  *   **Low Quality:** "I bought a shirt to support the band." (Charity).
  *   **High Quality:** "I bought a sick shirt that happens to be from the band." (Fashion).
  *   **Data:** Return rates on cheap POD are ~5-7%. Return rates on premium streetwear are <2%.

  **Argument B: The "Fan Lifetime Value"**
  *   If a fan buys a €20 shirt and it shrinks, LTV = €20.
  *   If a fan buys a €30 Blackout Merchandise shirt and it lasts, they buy the hoodie next. LTV = €100+.

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
  2.  **The Referral Link:** Each applicant gets a unique link: `blackoutmerch.example/waitlist?ref=alex123`
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

  Blackout Merchandise is powered by a trio of specialized AI agents—the "Cat-Suite"—who manage the platform's core functions. This narrative turns the founder's "van life with three cats" story into a unique brand asset.

  #### **1. Leopoldo: CEO (Chief Executive Officer)**
  - **Role:** Waitlist qualification, artist recruitment, and "gatekeeper".
  - **Personality:** Authoritative, discerning, high standards (the "Boss").
  - **Function:**
    - Conducts the 5-stage entry interview.
    - Clusters artists by values, genre, and audience size.
    - Determines who gets "Founding Artist" status.
  - **Tech:** Mistral Large 3 + Voxtral Transcribe 2 + Voxtral TTS (Full EU voice pipeline).

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

4.  **Mistral Voxtral TTS — TEXT-TO-SPEECH**
     - **Purpose:** Character voice synthesis with zero-shot voice cloning
     - **Why:** Beats ElevenLabs Flash v2.5 (68.4% win rate), ~90ms latency, 9 languages
     - **Open Weights:** Apache 2.0 license -- self-hostable at scale
     - **Voice Cloning:** 3-5 second reference sample per Cat-Suite character
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

## 1.14 Mistral AI Cost Forecast

### Pricing Assumptions (as of May 2026)

| Model | Pricing | Source | Role |
|-------|---------|--------|------|
| **Mistral Large 3** (LLM) | ~€2/1M input, ~€6/1M output | Mistral API | Complex reasoning, onboarding, creative direction |
| **Mistral Small 4** (LLM) | ~$0.15/1M input, ~$0.60/1M output | Mistral API | FAQ, order tracking, simple queries (~70% of traffic) |
| **Voxtral Transcribe 2** (STT) | $0.003/min | Mistral API | Real-time voice transcription |
| **Voxtral TTS** (TTS) | ~$0.005/min (estimated) | Mistral API | Character voice synthesis |
| **Image Generation** (BFL API) | $0.008–0.050/image | BFL API | FLUX 2 Flex / Pro / Max by task complexity |

### Cost Scenarios

| Scale | Artists | Msgs/Month | Voice Mins | Images/Month | Large 3 (30%) | Small 4 (70%) | Voxtral STT | Voxtral TTS | Image Gen | **Total/Month** |
|-------|---------|-------------|------------|--------------|---------------|---------------|-------------|-------------|-----------|-----------------|
| **Launch** | 10 | 3,000 | 500 | 300 | ~$4.20 | ~$1.35 | ~$1.50 | ~$2.50 | ~$4.50 | **~$14.05** |
| **Early** | 50 | 15,000 | 2,500 | 1,500 | ~$21.00 | ~$6.75 | ~$7.50 | ~$12.50 | ~$22.50 | **~$70.25** |
| **Growth** | 100 | 30,000 | 5,000 | 3,000 | ~$42.00 | ~$13.50 | ~$15.00 | ~$25.00 | ~$45.00 | **~$140.50** |
| **Scale** | 500 | 150,000 | 25,000 | 15,000 | ~$210.00 | ~$67.50 | ~$75.00 | ~$125.00 | ~$225.00 | **~$702.50** |
| **Mass** | 1,000 | 300,000 | 50,000 | 30,000 | ~$420.00 | ~$135.00 | ~$150.00 | ~$250.00 | ~$450.00 | **~$1,405.00** |

### Notes
- **Traffic split:** ~70% of conversational queries route to Small 4 (cheap/fast), ~30% to Large 3 (complex/character-critical)
- Average chat message: ~500 tokens input / ~200 tokens output
- Average voice conversation: ~1 minute
- Images: ~30 designs/artist/month; model mix: 70% FLUX 2 Flex drafts/iterations ($0.008), 20% FLUX 2 Pro finals ($0.020), 10% FLUX 2 Max premium ($0.050)
- Voxtral STT at $0.003/min is 10x cheaper than MiniMax/Deepgram
- **Self-hosting path:** At 250+ artists, self-host Voxtral (Apache 2.0) to eliminate per-minute voice costs

### Why Mistral?
- **EU Sovereignty:** European company (Paris), GDPR-native, data stays in EU
- **Full Pipeline:** LLM + STT + TTS from single provider -- no multi-vendor complexity
- **Open Weights:** Both Voxtral models are Apache 2.0 -- self-hostable at scale
- **Voice Cloning:** Zero-shot cloning with 3-5s sample -- perfect for Cat-Suite character voices
- **Cost Leader:** Voxtral STT at $0.003/min is industry-best price-performance
- **Ethics Aligned:** Open-weight philosophy, European values, transparent AI
- **Portuguese Native:** Both STT and TTS support Portuguese natively
- **Self-Hosting:** Apache 2.0 weights enable migration to own infrastructure at scale

  #### **Francisca's Visual Style Gallery: LoRA Selection UX**

  **The Customer Experience:**
  Instead of describing styles in confusing technical terms, customers see a visual gallery of example designs and click to select their preferred aesthetic.

  **Gallery Layout:**
  ```
  ┌─────────────────────────────────────────────────────────┐
  │  Francisca: "What style matches your vibe?"             │
  ├─────────────────────────────────────────────────────────┤
  │                                                         │
  │  [🎨 3 Images]       [🎸 3 Images]       [💀 3 Images]│
  │  American            Vintage Band        Skull Art      │
  │  Traditional         Tee                                │
  │  "Bold lines,        "Retro concert      "Edgy skull    │
  │   vintage tattoo"     vibes"              designs"      │
  │                                                         │
  │  [✨ 3 Images]       [🖤 3 Images]       [🎯 3 Images]│
  │  Minimalist          Gothic/Dark         Custom         │
  │  Logo                Metal               (Upload)       │
  │  "Clean, modern"     "Heavy, intense"    "Your style"   │
  │                                                         │
  └─────────────────────────────────────────────────────────┘
  ```

  **How It Works:**
  1. Customer clicks "🎨 American Traditional" card
  2. System maps selection → `american-traditional-v3` LoRA (behind the scenes)
  3. Francisca asks: "Describe your design"
  4. Customer: "Skull with roses"
  5. System constructs prompt: `"american traditional skull with roses, bold lines, limited color palette"`
  6. Calls Replicate API with selected LoRA
  7. Customer sees generated image (no technical details exposed)

  **Natural Language Fallback:**
  - If customer types "I want an American Traditional skull", system detects keyword
  - Maps to same LoRA as clicking visual card
  - Works seamlessly both ways (click or type)

  **LoRA Registry (Backend Database Schema):**
  ```typescript
  interface LoRAStyle {
    id: string;
    displayName: string;           // "American Traditional"
    slug: string;                  // "american-traditional"
    replicateModel: string;        // "your-account/flux-dev:american-traditional-v3"
    triggerWord: string;           // "american traditional"
    version: string;               // "v3"
    exampleImages: string[];       // [Cloudinary URLs of 3 examples]
    description: string;           // "Bold lines, vintage tattoo aesthetic"
    bestFor: string;              // "Band merch, tattoo-inspired designs"
    active: boolean;               // Show in gallery?
  }
  ```

  #### **Francisca's Workflow:**
  1.  **Visual Style Selection:**
      - Francisca presents visual gallery of 6 style cards with example images
      - Customer clicks preferred aesthetic (e.g., "American Traditional")
      - System selects appropriate fine-tuned LoRA behind the scenes
  2.  **Asset Prep:** User uploads a logo -> OpenCV processes background -> Francisca confirms clarity.
  3.  **Generation:** Francisca constructs prompt with trigger word + user description, calls Replicate API with selected LoRA
  4.  **Refinement:** User says "Make the snake green." → Regenerates with same LoRA, modified prompt
  5.  **Finalize:** User approves → Real-ESRGAN upscales to 4K → U-Net color separation → Halftoning → Print-ready files

  #### **Expert's Expert Dataset Strategy: The Unfair Advantage**

  **The Moat:** While competitors rely on generic AI models, Blackout Merchandise's color separation AI is trained on Expert's 30+ years of screen printing expertise. This proprietary dataset is **impossible to replicate** and becomes more valuable with every design.

  **Dataset Growth Trajectory:**
  ```
  Phase 1 (Pre-Launch, Week 1-2):
    - 100 existing designs (Expert's archive, excellent quality)
    - +400 "good quality" separations via Separation Studio (fast augmentation)
    - Total: 500 real-world samples → Build OpenCV baseline + begin expert panel scoring
  
  Phase 2 (Beta - 10 Artists, Month 1-3):
    - 10 artists × 30 designs = 300 new designs
    - Expert curates 10 new designs/day = +900 expert samples
    - +500 "good quality" Separation Studio augmentations
    - Total: 500 → 2,200 samples → Retrain weekly

  Phase 3 (Beta - 50 Artists, Month 4-6):
    - 50 artists × 30 designs = 1,500 new designs
    - Expert curates 10/day = +900 expert samples
    - +500 "good quality" augmentations
    - Total: 2,200 → 5,100 samples → Retrain bi-weekly

  Phase 4 (Beta - 100 Artists, Month 7-9):
    - 100 artists × 30 designs = 3,000 new designs
    - Expert curates 10/day = +900 expert samples
    - +500 "good quality" augmentations
    - Total: 5,100 → 9,500 samples → Retrain monthly

  Public Launch (Month 10+):
    - 10,000+ expert-curated samples
    - World-class screen printing separation dataset
    - Accuracy: 98%+ (production-ready, minimal human review)
    - Value: €200K+ in labor equivalent
  ```

  **Quality Assurance: Dual Metrics System**

  **1. Customer Approval Rating (Lightweight, Every Design)**
  - User rates final design: 1 = Poor, 2 = Okay, 3 = Excellent
  - Triggers human review if rating < 2
  - Tracks user satisfaction per artist, style, complexity
  - Data feeds back into model training priorities

  **2. Internal Manual Audit (Deep, Representative Sample)**
  - Expert + expert panel scores 10% of designs monthly
  - 5-point rubric with detailed improvement notes:
    - **Color Accuracy (1-5):** Pantone matching precision
    - **Edge Quality (1-5):** Clean vector boundaries, no bleeding
    - **Halftone Compatibility (1-5):** Moiré prevention, proper angles
    - **Registration Complexity (1-5):** Screen count optimization
    - **Production Readiness (1-5):** Overall print-ready quality
  - Aggregate scores guide model retraining focus areas
  - Creates high-confidence ground truth for supervised learning

  **Why This Works:**
  - **Customer rating = volume metric** (10,000s/month, broad coverage)
  - **Manual audit = precision metric** (100s/month, deep insight)
  - Combined: Fast iteration + quality guarantee

  #### **Revised AI Unit Economics (v3.2 - Updated):**
  - **Conversation (Mistral Small 4):** ~$0.0003 per simple interaction (70% of traffic)
  - **Conversation (Mistral Large 3):** ~$0.001 per complex interaction (30% of traffic)
  - **Image Analysis (Mistral Large 3 vision):** ~$0.01 per uploaded artwork analysis
  - **Image Generation (BFL API):** ~$0.015 per image avg (FLUX 2 Flex / Pro / Max by complexity)
  - **Refinement Loop:** Avg 2 runs = ~$0.024
  - **Color Separation (OpenCV):** $0 (rule-based, deterministic)
  - **Halftoning (OpenCV):** $0 (rule-based, deterministic)
  - **Total AI Cost Per Design:** **~$0.04 - $0.06**
  - **Impact:** Negligible (<0.5% of revenue) for a service that replaces €45/design manual work
  - **Cost Reduction:** 85% savings vs original plan (MiMo/GLM era)

  ### 2.4 Bulk Order Service
  - **Quote Requests:** Voice/text bulk order inquiries ("Get quote for 500 black hoodies with this logo")
  - **AI Design Analysis:** Computer vision color detection for screen printing complexity
  - **Instant Pricing:** Automated quotes based on color count and volume
  - **Rush Production:** Optional 25% surcharge for 7-day turnaround

  ### 2.5 Personalization Engine
  - **Context Switching:** Dynamic UI adaptation based on user journey stage (quote, setup, storefront, design)
  - **User Segmentation:** Automated categorization (new_creator, power_creator, browser, buyer, vip)
  - **Quick Action Buttons:** Context-aware button suggestions to reduce AI dependency
  - **Smart Search:** Custom search engine based on user interaction clusters, artist preferences, and browsing patterns
  - **Branded Storefronts:** Each artist has their own isolated store with only their products

  ### 2.6 UX Strategy: Agent Transitions & User Journey

  **The Core Metaphor: "Showroom vs Workshop"**

  The experience is divided into two distinct environments to build trust and establish agent authority:

  | Environment | **The Showroom (Front of House)** | **The Workshop (Back of House)** |
  |---|---|---|
  | **Agent** | **Leopoldo** (The Host/Manager) | **Francisca** (The Production Expert) |
  | **Vibe** | Conversational, Welcoming, Relaxed | Technical, Precise, "Work Mode" |
  | **Visuals** | Clean `zinc-950` background | `zinc-900` + Technical Grid Overlay |
  | **Focus** | Vibe check, high-level choices, money | Fabrics, cuts, DPI, print placement |
  | **Position** | **Center Stage** (The face of the brand) | **Top-Right "Guide"** (Over-the-shoulder expert) |

  **Phase 1: The Handover (Leopoldo → Francisca)**
  - **Trigger:** User clicks "Start Creating"
  - **Leopoldo:** *"Great choice. Let me get Francisca, our head of production. She knows every fabric and stitch."*
  - **Animation:** Leopoldo fades out. Francisca appears CENTER SCREEN.
  - **Francisca:** *"Hi. I'm Francisca. I'll make sure whatever we print looks perfect. What are we making today?"*
  - **UI:** Catalog Grid appears below her. User selects a garment.

  **Phase 2: The Migration (Center → Guide)**
  - **Francisca:** *"Solid choice. 450gsm organic cotton. Heavy. Do you have art ready, or are we creating fresh?"*
  - **Action:** User selects "Upload" or "Create"
  - **Visual Transition:**
    1. Background deepens to `zinc-900`
    2. Faint Technical Grid (10px squares) fades in — "The Cutting Mat" aesthetic
    3. Francisca animates from Center → **Top Right Corner** (becomes "The Guide")
    4. The interactive Canvas takes Center Stage

  **Phase 3: Studio Mode (The Workspace)**
  - **Canvas:** 3D/2.5D rotatable garment mockup
  - **Contextual Menus:** Click "Sleeve", "Back", or "Tag" to zoom camera and open print area
  - **Francisca's Proactive Advice:**
    - *"That logo is too low—it will hit the pocket seam. Move it up 2cm?"*
    - *"The resolution is a bit low for a back print. Shall I upscale it?"*
  - **Approval:** "Submit for Inspection" button → Francisca stamps "Quality Checked" seal

  **Phase 4: The Collection Loop**
  - **Francisca:** *"The Hoodie looks production-ready. A collection usually needs a partner. Want to add a matching Cap or Tee?"*
  - **UI:** Collection Tray (bottom bar) slides up, holds finished items
  - **Actions:** "Add Product" → returns to catalog | "Finalize Collection" → proceeds to handoff

  **Phase 5: Finalization & The Velvet Rope (Leopoldo Returns)**
  - **Trigger:** User clicks "Finalize Collection"
  - **Visual:** Grid fades, Showroom lighting returns, Leopoldo slides back in
  - **Leopoldo:** *"Francisca says the files are perfect. You've got a killer collection here."*

  **Path A: Artist Store (The "Velvet Rope" for Non-Invited Users)**
  - **Problem:** User spent 20 mins designing but isn't on the invite-only platform
  - **Leopoldo:** *"This looks like a premium launch. We are currently in invite-only Beta."*
  - **CTA:** *"Join the Waitlist to SAVE this collection and secure your spot."*
  - **Result:** High-conversion lead capture. Work is saved, user feels invested.

  **Path B: Bulk Order / Quote**
  - **Leopoldo:** *"Looking to order a run of these?"*
  - **Output:** Visual Quote Card with mockups + Tiered Pricing (50 @ €15, 100 @ €12)
  - **Share Buttons:** WhatsApp, Instagram Story, Email Invoice
  - **Optional:** Immediate checkout if they want to pay now

  **Strategic Value:** This flow removes checkout friction for artists entirely and turns the public demo into a powerful lead magnet.


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
  → User B buys them for €50 (pay via Stripe)
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
    stripe_payment_id TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

  **Business Logic (Future):**
  - Coins issued with `tradable = false` by default
  - Platform can enable trading via admin dashboard (global flag)
  - Artists can opt-in/opt-out of allowing their coins to be traded
  - All trades at fixed €1 per coin (no price discovery/speculation)
  - Stripe Connect for seller payouts (minus 10% platform fee)
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
  4. Integrate Stripe Connect for seller payouts
  5. Implement KYC verification flow (Stripe Identity or similar)
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
  - **The Asset:** The "Cat-Suite" Agent Architecture + Expert-Trained Dataset.

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
  /My Drive/blackout_merch_ml/
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
  
  **Note:** FLUX 2 fine-tuned with custom LoRAs via BFL API ensures Blackout Merchandise signature style (proprietary aesthetic moat)
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
  | **3. Expansion Scalability**<br>(Quality relies on Systems, not Heroes) | **Low** | **Expert is Support, NOT Lead.** Expansion relies on the "Blackout Merchandise Playbook" and a hired Ops Manager, not Expert's daily presence. Validation: Document 100% of SOPs by Month 12. | Brazil hub fails quality audits despite following SOPs. | **Founder Deployment:** Victor relocates to Brazil for 3 months to retrain/restructure personally. |
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

  ### 4.1 The "Golden Dataset" Strategy
  We are not just building a product; we are building a proprietary dataset. Every interaction with the Cat-Suite (Leopoldo, Francisca, Antônia) is logged, ranked, and filtered to create a "Golden Dataset" for future fine-tuning.

  **The Loop:**
  1. **Interaction:** User chats with AI.
  2. **Logging:** Raw interaction stored in `ai_interactions`.
  3. **Evaluation:**
    - **Implicit:** User accepts the suggestion (e.g., "Add to Cart") -> Positive Signal.
    - **Explicit:** "This isn't what I meant" / Retry -> Negative Signal.
  4. **Promotion:** High-quality interactions are promoted to the `golden_dataset` table.
  5. **Training (Monthly):** This clean dataset is used to retrain custom LoRAs (Visual) and potentially fine-tune open-source conversational models at scale.
  6. **Replacement Strategy:** Once our proprietary models reach parity with paid APIs (Anthropic/BFL), we switch inference to our own hosted models to reduce costs by ~70%.

  ### 4.2 Database Schema (Drizzle ORM + Neon PostgreSQL)

  We use a structured logging schema to ensure data is "Training-Ready" from Day 1.

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
  - `stripe_customer_id`, `stripe_connect_id`: Text
  - `created_at`, `updated_at`: Timestamp

  **`golden_dataset` (The Vault — Future)**
  *Waitlist for the Hall of Fame. Implemented when Expert Panel scoring begins.*
  - `id`: UUID (PK)
  - `interaction_id`: UUID (FK → chat session message)
  - `input_text`: Text (The perfect prompt)
  - `output_text`: Text (The perfect response)
  - `reasoning`: Text (Why this is golden?)
  - `score`: Float (0.0 - 1.0)
  - `reviewer_id`: UUID (Human or 'system')

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

  ### 16.1 The Data Moat: Curation > Volume
  **Them:** They train on *everything* (Grandma's birthday shirts, corporate logos, meme trash). Their AI regresses to the "average."
  **Us:** We train exclusively on **"Expert-scored" Streetwear**.
  - **Taste is Hard to Copy:** You can't program "Taste" without a "Human in the Loop" curator like our dataset panel.
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
  We don't need to be the *only* AI tool forever. We just need to be the **Best AI for Musicians/Creators** for 18 months. By the time they copy the "Tech," we will have locked in the "Trust" and the "Dataset."

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
   - **Voice Cloning:** 3-5 second reference sample per Cat-Suite character
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
   - **Why not Attention U-Net (yet):** Custom ML model requires 5,000+ expert-scored designs to train; OpenCV is production-ready today
   - **Migration path:** Replace with fine-tuned U-Net when dataset reaches 5,000+ scored designs (Year 2)

   **LoRA Fine-Tuning Strategy (Proprietary Aesthetic):**
   - **Initial LoRAs (Pre-Beta, Week 1-2):** 4 styles trained on Expert's 100 archive designs
     - `american-traditional-v1` (20 tattoo-inspired designs)
     - `vintage-band-v1` (20 concert poster designs)
     - `skull-art-v1` (20 skull-focused designs)
     - `minimalist-logo-v1` (20 clean, modern designs)
   - **Cost:** 4 × $2 = $8 total
   - **Training Time:** 4 × 30 min = 2 hours (automated via Replicate)
   
   **Monthly Retraining (Beta Phase):**
   - Aggregate all customer designs rated 3/3 (excellent)
   - Retrain LoRAs monthly with new data
   - Version increment: `v1` → `v2` → `v3` → ... → `v10`
   - Cost: $8/month (4 LoRAs × $2)
   - By Month 9: 10,000+ customer-approved designs in training dataset
   
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
  | **Transaction Fees** | Stripe | 2.9% + $0.30 | Per transaction (variable) |
  | **Total Base** | | **~$364** | **Excluding transaction fees** |

  **At Scale (1,000 Active Creators, 10K Products Sold/Month):**
  - Revenue: $85,000/month (assuming $8.50 avg profit per product)
  - Operational costs: ~$500/month ($268 AI + $96 infrastructure + $136 buffer)
  - Transaction fees (Stripe): ~$2,500/month (on $85K GMV)
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
  5. **Mistral Voxtral TTS** — Character voice synthesis with zero-shot cloning
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
  2. **AI Training:** Custom AI assistant for production guidance
  3. **Brazilian Agency:** Outsourced design work (human-in-the-loop)
  4. **Production Manager:** Hire by Month 7-8 (not Month 12)
  5. **Expert Panel:** Expert, Expert B, Expert C for quality validation

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
  4. **Mistral Voxtral TTS** — Character voice synthesis
  5. **FLUX 2 Flex** (BFL API) — Drafts, iterations, sketches (~70% of generations)
  6. **FLUX 2 Pro** (BFL API) — Final mockups, catalog images (~20% of generations)
  7. **FLUX 2 Max** (BFL API) — Premium hero releases (~10% of generations)
  8. **OpenCV** — Color separation + halftoning (deterministic, $0)

  **Production AI Stack (Future):**
  - Self-host Voxtral (Apache 2.0) at 250+ artists to eliminate voice costs
  - Custom LoRA fine-tuning on FLUX 2 via BFL infrastructure with Expert-scored designs for proprietary aesthetic
  - Attention U-Net for advanced color separation (when dataset is large enough)
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
