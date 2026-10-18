# Blackout Merchandise Community Ownership & Tokenization Vision

> **Document Status:** Active Strategy — Year 1 groundwork required
> **Target Phase:** Year 1-3 (SCF grants start Year 1)
> **Last Updated:** May 3, 2026
> **Reference:** PRD.md Section 20
> **Blockchain:** Stellar Network (Mainnet)
> **Smart Contracts:** Soroban (Rust)
> **Token:** MRCH (Stellar Asset / SAC)

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [The Phased Approach](#2-the-phased-approach)
3. [Funding Structure](#3-funding-structure)
4. [Token Economics](#4-token-economics)
5. [Stellar Partnership & SCF Grant Strategy](#5-stellar-partnership--scf-grant-strategy)
6. [MRCH Token Technical Architecture](#6-mrch-token-technical-architecture)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Risk Mitigation](#8-risk-mitigation)
9. [Brand Amplification](#9-brand-amplification)

---

## 1. Vision & Philosophy

### Core Principle

We practice what we preach. Our equal wage model extends beyond compensation to **ownership structure**. Just as we reject ego-driven salary hierarchies, we reject traditional equity concentration.

**30% of Blackout Merchandise will be owned by the people building, using, and supporting it — artists, employees, customers, and community.**

This isn't a marketing gimmick. It's hardcoded into our cap table and, ultimately, into Soroban smart contracts on the **Stellar network**.

> *"We're not just ethical about what we print on. We're ethical about who owns us. Our employees, artists, and community hold real equity — not just promises. If you know, you know."*

### Why Tokenization Aligns with Our Brand

| Traditional Company | Tokenized Blackout Merchandise |
|---------------------|----------------------|
| Founder: 60-70%, Employees: 0.5-2% each | Founder: 60%+, Community: 30%, balanced distribution |
| Cap table is secret | Ownership visible on Stellar blockchain |
| Profit sharing requires trust | Soroban smart contracts enforce automatic distribution |
| Employees wait years for liquidity | Tokens tradeable on Stellar DEX after vesting |
| Artists are "users" | Artists are **co-owners** |

**This directly reinforces:**
- Our equal wage philosophy (everyone earns €1,400/month regardless of title)
- Our 30% profit-sharing pool (now automated via Soroban contracts)
- Our "Direct-to-Artist" model (artists have skin in the game)
- Our "Ethical First" positioning (radical transparency)
- Our "If you know, you know" brand voice (crypto-native audience gets it immediately)

---

## 2. The Phased Approach

### Phase 1: Foundation (Year 1) — Crowdfunding with Live Founding MRCH Tokens

**What We Do Now:**
- Launch crowdfunding campaign (revised target: €80-120K with MRCH founding tiers)
- Offer traditional rewards for lower tiers (€25); real MRCH Founding Tokens for top-tier backers (€99+)
- **Issue MRCH Founding Tokens on Stellar Mainnet at campaign launch** — ~1 afternoon, ~$5 in XLM, zero development required
- Tokens issued with `AUTH_REQUIRED_FLAG` — every recipient manually KYC-approved, no open-market trading at launch
- Tokens carry **active governance rights from day one** — off-chain Year 1 (Discord DAO, MRCH-weighted polls), on-chain Year 2 (Soroban)
- Tokens carry a **documented profit-sharing promise** — 30% of net profits to MRCH holders, activates Year 2; promising this costs nothing legally, and it is the main ownership hook at crowdfunding
- **No lawyer needed before launch** — legal opinion and MiCA whitepaper commissioned Year 1 Q3-Q4, funded by Instaward, timed strictly before the first actual distribution
- **Register on SCF** and begin community verification
- **Apply for SCF Instaward** — funds the MiCA legal consultation

**Crowdfunding Message:**

> **"Founding Owners"**
>
> You don't just back us. You own us. Right now.
>
> We're issuing real MRCH founding tokens on the Stellar blockchain to top-tier backers at campaign close. No promises. No IOUs. Real tokens in your Stellar wallet, visible on stellarexpert.io.
>
> When Blackout Merchandise profits, **30% goes to MRCH holders — automatically, every quarter, in euros.** From day one, your tokens vote on how this platform evolves. This founding cohort closes when the campaign ends — permanently.

**What This Creates:**
- Real on-chain tokens from day one — backers check their wallet, not a spreadsheet
- Founding cohort urgency — this allocation closes permanently when the campaign ends
- Profit-sharing is the main hook — backers know from day one they will receive 30% of quarterly profits; this is a real, documented commitment, legally free to promise at launch
- Active governance from day one — off-chain Discord DAO in Year 1, on-chain Soroban in Year 2
- Zero legal cost at launch — promising future distributions is legally free; MiCA compliance kicks in Year 2 before first actual payout
- Differentiation unlike any crowdfunding campaign in the European creator economy space
- SCF relationship established with a live token and real governance, not just a whitepaper

**Capital from This Phase:** €80-120K (revised with MRCH tiers) + ~$10-25K SCF Instaward

---

### Phase 2: Growth (Year 1-2) — Stellar Community Fund Build Award

**Strategy: Non-Dilutive Infrastructure via SCF**

Instead of trading equity for blockchain infrastructure, we use the **Stellar Community Fund (SCF)** to fund the entire layer through grants — zero equity given.

| Grant | Amount | Timeline | Deliverable |
|-------|--------|----------|-------------|
| SCF Instaward | ~$10-25K XLM | Year 1 Q1-Q2 | Community verification; funds MiCA legal opinion (Year 1 Q3-Q4) |
| SCF Build Award | Up to $150K XLM | Year 1-2 | Soroban contracts: profit-distribution + DAO + vesting (token already live — far stronger application) |
| SCF Matching Fund | Up to $500K USD | Year 2+ | Matches committed lead investor's check |
| SCF Marketing Grant | Up to $500K USD | Year 3 | Creator economy growth campaign |

**Why SDF Approves This:**
- Real-world equity-backed token issuance (RWA) is SDF's stated strategic expansion priority
- Creator economy represents 200M+ TAM — underrepresented in their current portfolio (DeFi-heavy)
- We have a real business with live artists and production infrastructure, not a whitepaper
- Artist co-ownership maps directly to Stellar's financial inclusion mission
- EU/Portugal base aligns with MiCA regulatory framework, which SDF actively supports
- $0.0007 per transaction — quarterly profit distributions to 500+ artists cost under $1 total in fees

**Grant probability assessment: 65-75%** for Build Award; higher for Instaward and Marketing Grant.

**Capital from This Phase:** ~$150-300K in non-dilutive SCF grants

---

### Phase 3: Scale (Year 2-3) — MRCH Token Launch

**What Gets Built:**
- 30M MRCH tokens = 30% tokenized equity pool, issued as Stellar Asset (SAC — no custom contract needed for issuance itself)
- Quarterly profit distributions via Soroban contract, paid in **EURC** (Circle's Euro stablecoin on Stellar — no XLM volatility exposure for artists)
- Artist DAO for community governance via Soroban governance contract (1 MRCH = 1 vote)
- Vesting schedules enforced on-chain per pool type (employee cliff, artist milestones)
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

---

## 3. Funding Structure

### The New Math

| Source | Amount | Equity | Notes |
|--------|--------|--------|-------|
| SDF Grants (XLM/USD via SCF) | ~$150-300K | 0% | Non-dilutive: Build Award + Instaward |
| SCF Matching Fund (conditional) | Up to $500K USD | 0% | Matches committed lead investor |
| Traditional investor | €300K | 16-18% | Angel/VC round |
| Crowdfunding | €100K | 0% | Traditional rewards |
| **Total Potential** | **€600K+** | **16-18%** | |

### Comparison: Previous Path vs. Stellar Path

| Aspect | Chiliz Path (Previous) | Stellar Path (Current) |
|--------|------------------------|------------------------|
| Infrastructure cost | Covered by Chiliz | Covered by SDF grants |
| Equity given for infrastructure | 6-8% | **0%** |
| Total equity to all investors | 22-26% | **16-18%** |
| Blockchain fee per transaction | ~$0.001-$0.01 | **$0.0007** |
| Secondary market | Socios.com (sports focus) | **Stellar DEX (open, global)** |
| Legal/compliance | Assetera (Chiliz subsidiary) | EU custodian + MiCA framework |
| Profit distribution currency | CHZ (volatile) | **EURC (Euro stablecoin)** |
| Founder keeps | ~74-78% | **82%+** |

### Why This is Better

1. **Less dilution** — 16-18% vs. 22-26% total (saves ~6-8% equity)
2. **Infrastructure free** — SDF grants cover legal consultation, security audit, and contract development
3. **Better UX for artists** — Receive EURC (stable €), not speculative CHZ tokens
4. **Open market** — Stellar DEX vs. closed Socios.com ecosystem
5. **Credibility** — "Stellar-powered" carries institutional weight in EU fintech/RWA space

> **Note on the Chiliz relationship:** Selling an AI system to Chiliz/Socios.com remains a powerful **founder credential** — proof of corporate AI sales ability. This is preserved in all investor pitches and the founder biography. What changed is the infrastructure partner for MRCH tokens: Stellar replaces Chiliz Chain.

---

## 4. Token Economics

### The MRCH Token

**Name:** MRCH
**Network:** Stellar Mainnet
**Type:** Stellar Asset (SAC — Stellar Asset Contract, built into protocol)
**Total Supply:** 30,000,000 (hard-capped — represents 30% company equity)
**Distribution currency:** EURC for profit payouts; MRCH for ownership rights

### Fixed Supply Model

The 30% pool is **hard-capped**:
- Total supply: 30,000,000 MRCH tokens = 30% equity (never changes)
- No arbitrary inflation or dilution
- Future funding rounds dilute the 70%, not the 30%
- Transparent, auditable, enforced on-chain
- Issuer account locked at launch (Stellar `setOptions masterWeight: 0`) — no new minting ever possible

### Token Distribution

| Pool | % of Company | Tokens | Purpose | Release Schedule |
|------|--------------|--------|---------|-----------------|
| **Seed/Early Backers** | 5% | 5,000,000 | Crowdfunding + angels | Immediate (Year 1) |
| **Artist Ownership** | 12% | 12,000,000 | Performance-based rewards | Continuous Years 1-5 |
| **Employee/Contributor** | 8% | 8,000,000 | Team equity + vesting | 4-year vest, 1-year cliff |
| **Community/Customer** | 3% | 3,000,000 | Loyalty, referrals | Continuous |
| **Strategic Reserve** | 2% | 2,000,000 | Partnerships, advisors | As needed |

**Remaining 70%:** Traditional equity (founder 60%+, investors 16-18%)

### Artist Ownership Example

| Milestone | Tokens Earned | Equity Value |
|-----------|---------------|--------------|
| Onboarding bonus | 5,000 | 0.017% |
| €5K lifetime sales | +5,000 | +0.017% |
| €15K lifetime sales | +10,000 | +0.033% |
| €50K lifetime sales | +30,000 | +0.10% |
| **Total at €50K sales** | **50,000** | **0.167%** |

At €10M valuation: €16,700 value
At €20M exit: €33,400 value

### Profit Distribution Example (paid in EURC)

**Quarterly net profit:** €32,000
**30% profit pool:** €9,600
**Profit per MRCH token:** €0.00032

| Holder | Tokens | Quarterly EURC | Annual EURC |
|--------|--------|----------------|-------------|
| Top artist | 50,000 | €16 | €64 |
| Employee | 150,000 | €48 | €192 |
| Early backer | 10,000 | €3.20 | €12.80 |

Distributions triggered automatically by Soroban contract, paid directly to each holder's Stellar wallet in EURC. No manual processing. No trust required. Total fee for 500 distributions: under $1.

### Why Artists Receive EURC, Not XLM

This is the most important UX decision in the entire MRCH architecture.

Artists are not crypto investors. They are designers, musicians, and creators. When their quarterly distribution arrives, they should see this in their LOBSTR wallet:

> **€16.00 received — your Q1 profit share from Blackout Merchandise.**

Not this:

> *12.3 XLM (≈ €11.40 at today's rate) received.*

**EURC (Circle's Euro Stablecoin on Stellar):**
- 1 EURC = 1 Euro, always. No volatility, no speculation, no exchange step required.
- Circle's EURC is MiCA-registered in the EU — fully compliant for artist payouts across all 27 EU member states.
- Artists see a Euro symbol in LOBSTR, not a crypto logo or token ticker.
- They can spend it, save it, or off-ramp it via any Stellar anchor (MoneyGram available directly in LOBSTR) without ever touching an exchange.
- Total distribution cost: Soroban contract sends 500 EURC payments for under $1 in total Stellar network fees.

**This is the bridge between blockchain infrastructure and artist experience.** The blockchain is invisible. The euros are real.

This principle must be maintained in all artist-facing communications:
- ✅ "You received €16 in your wallet"
- ❌ "You received 12.3 XLM"
- ✅ "Quarterly profit distributions paid in euros"
- ❌ "Quarterly XLM distributions"

Artists never need to know the word XLM to benefit from MRCH ownership.

---

## 5. Stellar Partnership & SCF Grant Strategy

### Why Stellar is the Right Chain for MRCH

| Factor | Assessment |
|--------|------------|
| **Payments-first architecture** | Built for distributing money to many wallets cheaply and reliably |
| **$0.0007 per transaction** | 500 artists receiving quarterly EURC = under $1 in total fees |
| **Stellar Asset Contract (SAC)** | Issue MRCH token with zero smart contract code — built into the Stellar protocol |
| **Soroban** | Production-ready Rust smart contracts for profit distribution + governance + vesting |
| **Built-in DEX** | Secondary market for MRCH comes free — no exchange partnership needed |
| **MiCA alignment** | Native compliance tools (freeze, clawback, authorization flags) map to EU requirements |
| **SDF Grants** | Up to $800K+ potential across SCF programs — non-dilutive |
| **Free security audit** | SCF provides free Soroban audits for Build Award recipients |
| **$33.9B real-world payments** | Proven at institutional scale (first U.S. registered blockchain money market fund runs on Stellar) |

### SCF Application Strategy

**Instaward (Year 1 Q1-Q2) — Fast-track, community-vote process:**

Apply through a Stellar Ambassador Chapter. Frame as:
> *"MRCH Tokenomics Prototype — First equity-backed creator economy token on Stellar. Funding legal consultation (MiCA classification) and testnet prototype demonstrating profit-distribution contract."*

**Prerequisite:** Register on communityfund.stellar.org and engage with the community before applying (required for verification status).

**Build Award (Year 1-2) — Up to $150K XLM, main infrastructure grant:**

Deliverables to propose:
1. MRCH token issued on Stellar Mainnet (SAC — Stellar Asset Contract)
2. Soroban profit-distribution contract (quarterly EURC payouts, proportional to MRCH holdings)
3. Soroban governance contract (Artist DAO — 1-token-1-vote on platform proposals)
4. Soroban vesting contract (employee cliff schedule + artist milestone unlocks)
5. Artist-facing wallet integration (LOBSTR mobile + Freighter browser extension)

**Grant narrative:**
> *"Blackout Merchandise is tokenizing 30% of a real merchandise company for 500+ European artists — the first equity-backed creator economy RWA on Stellar. Artists receive quarterly profit distributions in EURC directly to their Stellar wallets. No speculation, no volatility. Real euros for real ownership."*

Includes free Soroban security audit — eliminates a key implementation risk and saves €10-30K.

**Matching Fund (Year 2) — Up to $500K USD:**

Triggered once a qualified lead investor commits to the €300K round. SDF matches their check up to $500K, potentially doubling the raise without dilution.

**Marketing Grant (Year 3) — Up to $500K USD/XLM:**

Apply post-MRCH-launch once tokens are live and artists are actively holding them. Frame around creator economy adoption: artists onboarded, tokens distributed, quarterly EURC distributions sent, DAO votes completed.

### SCF Application Timeline

| Quarter | Action |
|---------|--------|
| Year 1 Q1 | Register on communityfund.stellar.org; engage with community |
| Year 1 Q1-Q2 | Submit Instaward application with prototype narrative |
| Year 1 Q2-Q3 | Build MRCH testnet prototype; gather artist proof points |
| Year 1 Q3-Q4 | Submit Build Award application with testnet demo |
| Year 2 Q1 | Close lead investor → trigger Matching Fund |
| Year 3 Q1 | Submit Marketing Grant application (live product, active metrics) |

---

### MiCA: Our SCF Competitive Advantage

The EU's Markets in Crypto-Assets (MiCA) regulation came into full effect in December 2025. Most crypto projects treat MiCA as a compliance burden. We should treat it as a **grant-application superpower**.

**Why MiCA strengthens every SCF application:**

SDF is actively building MiCA compliance tooling into Stellar because they need showcase EU projects that prove the tooling works at production scale. A Portuguese startup with:
- An equity-backed token with clear MiCA asset classification
- EURC distributions (MiCA-registered stablecoin from Circle)
- Native freeze/clawback/authorization compliance controls (built into Stellar protocol)
- EU legal jurisdiction (Portugal — directly under MiCA scope)

...is exactly the reference case SDF needs to demonstrate their EU institutional roadmap. We are not asking SDF to fund a crypto experiment. We are asking them to fund **the first MiCA-compliant, equity-backed creator economy RWA on Stellar** — a proof of concept for their institutional growth strategy.

**In every SCF application, lead with this sentence:**
> *"Blackout Merchandise is the first MiCA-compliant equity-backed creator token on Stellar — a real company, real artists, real euros distributed on-chain."*

**MiCA classification for MRCH:**
Under MiCA, MRCH tokens most likely classify as utility tokens (granting platform access, governance rights, and profit-sharing entitlements). This is a favorable classification — not a security, not e-money. Formal legal opinion should be obtained during Year 1 Q1-Q2 funded by the Instaward grant, then cited in the Build Award application as evidence of regulatory readiness. This single step turns a potential risk into a demonstrated advantage.

**The full MiCA-to-Stellar compliance map:**

| MiCA Requirement | Stellar Implementation |
|------------------|------------------------|
| Asset whitepaper (litepaper) | TOKENIZATION_VISION.md + legal opinion |
| Issuer identity disclosure | Stellar anchor + issuer public key |
| Right to freeze for compliance | Native Stellar clawback flag |
| AML/KYC for token holders | Trustline authorization required flag |
| Secondary market oversight | Stellar DEX on-chain audit trail |
| Stablecoin for distributions | EURC (Circle, MiCA-registered) |

---

### At Crowdfunding Launch: Token Issuance Checklist (~1 afternoon, ~$5)

- [ ] **Create issuer keypair** — this address permanently identifies MRCH on Stellar
- [ ] **Create distribution keypair** — holds the uncirculated supply
- [ ] **Fund both accounts** — ~2 XLM each via any Stellar on-ramp (LOBSTR, Ramp, etc.)
- [ ] **Set issuer flags**: `AUTH_REQUIRED_FLAG` + `AUTH_REVOCABLE_FLAG` + `AUTH_CLAWBACK_ENABLED_FLAG`
- [ ] **Distribution account creates trustline** to MRCH/issuer address
- [ ] **Issuer sends 30,000,000 MRCH** to distribution account
- [ ] **Lock issuer** — `setOptions masterWeight: 0` (supply permanently capped)
- [ ] **Register at communityfund.stellar.org** — begin SCF community verification
- [ ] **Apply for SCF Instaward** — cite live Mainnet token with verified founding holders

### Year 1 Q3-Q4: Legal Checklist (Before First Distribution, Funded by Instaward)

- [ ] **Commission MiCA legal opinion** — confirm token classification (utility token with deferred financial rights)
- [ ] **Draft crypto-asset whitepaper** — TOKENIZATION_VISION.md is already most of the required content
- [ ] **File with CMVM** (Portugal's MiCA regulator) if required at offering scale
- [ ] **Join Stellar Developer Discord** — introduce Blackout Merchandise in `#projects` channel
- [ ] **Find Portugal/EU Stellar Ambassador** — accelerates Build Award processing
- [ ] **Submit SCF Build Award application** — with live token + verified founding holder count

The Build Award application lands after the token is live and has real holders. "We want to build a token someday" loses to "MRCH is live on Stellar with 150 founding holders across 9 countries — now we need the Soroban automation layer."

---

## 6. MRCH Token Technical Architecture

### Contract Stack (Stellar + Soroban)

```
MRCH Token (Stellar Asset — SAC)
├── Issuer Account (locked at launch via setOptions masterWeight: 0)
├── Distribution Account (holds uncirculated supply)
└── Trustlines (each artist/employee/backer establishes trustline to hold MRCH)

Soroban Contracts:
├── ProfitDistributor
│   ├── Trigger: quarterly by admin multisig
│   ├── Input: total EURC amount to distribute
│   ├── Logic: proportional split across all MRCH holders
│   └── Output: EURC payment to each holder's Stellar wallet
│
├── GovernanceDAO
│   ├── Proposals: text + parameter-change actions
│   ├── Voting: 1 MRCH = 1 vote, 7-day window
│   ├── Quorum: 10% of circulating supply required
│   └── Execution: automatic on-chain if quorum + majority passed
│
└── VestingVault
    ├── Employee pool: 1-year cliff, 4-year linear unlock
    ├── Artist pool: milestone-based unlock (€5K / €15K / €50K lifetime sales)
    └── Backer pool: immediate unlock at MRCH mainnet launch
```

### Compliance Controls (Stellar Protocol-Native)

Stellar assets have built-in compliance flags that map directly to MiCA requirements:
- **Authorization Required** — issuer must approve each trustline before holder can receive MRCH
- **Clawback Enabled** — issuer can recover tokens in case of legal order or fraud
- **Freeze** — issuer can freeze a specific account's MRCH holdings
- These are set at token issuance and require no custom smart contract code

### Wallet UX for Artists

- **LOBSTR** (mobile, beginner-friendly Stellar wallet) — recommended for artists
- **Freighter** (browser extension, Stellar-native) — for desktop power users
- Artists receive EURC quarterly in their Stellar wallet — no exchange required, no crypto volatility
- MRCH token visible alongside EURC balance in any Stellar wallet app

### Secondary Market

Stellar DEX is built directly into the protocol. However, DEX trading is **intentionally locked at launch**:

- `AUTH_REQUIRED_FLAG` is set at issuance — the issuer controls who holds tokens and at what authorization level
- At crowdfunding launch, founding holders receive limited authorization (hold only, no trading)
- Full authorization (enables DEX trading) is granted only after Soroban contracts deploy and MiCA legal framework is established — Year 2
- Once trading is unlocked: any holder can list MRCH/USDC or MRCH/XLM pairs permissionlessly
- No exchange partnership required, no custodial risk
- All trades on-chain and auditable

**Why lock at launch:** Prevents speculative price volatility during crowdfunding, maintains clean legal status while rights are inert, and avoids the narrative distraction of a micro-cap market forming before the platform has revenue.

---

## 7. Implementation Roadmap

### Year 1 (Months 1-12)

| Quarter | Milestone |
|---------|-----------|
| Q1 | Issue MRCH Founding Tokens on Stellar Mainnet at crowdfunding launch; SCF registration + Instaward application |
| Q2 | Close Instaward funding; draft all 4 Soroban contracts; MVP platform launch |
| Q3 | MiCA legal opinion commissioned; SCF Build Award application (cite live token + founding holders) |
| Q4 | Legal whitepaper complete; Build Award decision; all Soroban contracts tested on testnet |

**Status by Year 1 End:**
- 500K-1.5M MRCH Founding Tokens distributed to verified crowdfunding backers (real, on-chain)
- MiCA legal framework established — ready for rights activation
- SCF Build Award approved or in advanced review
- All Soroban contracts ready to deploy to mainnet

### Year 2 (Months 13-24)

| Quarter | Milestone |
|---------|-----------|
| Q1 | Free Soroban audit via SCF; contracts deployed to Stellar Mainnet; SCF Matching Fund triggered |
| Q2-Q3 | Artist DAO launch; first quarterly EURC profit distributions sent to MRCH holders |
| Q4 | 100+ artists with MRCH tokens; Stellar DEX listings live |

**Status by Year 2 End:**
- 3-5M MRCH tokens distributed
- 200-300 token holders
- Governance DAO active with first votes completed
- First quarterly EURC distributions sent
- Active Stellar DEX pairs live

### Year 3 (Months 25-36)

| Quarter | Milestone |
|---------|-----------|
| Q1 | SCF Marketing Grant application (metrics-driven) |
| Q2-Q3 | Series A if needed; international expansion |
| Q4 | 300+ artists with MRCH; marketing grant deployed for creator economy growth |

**Status by Year 3 End:**
- 10-15M MRCH tokens distributed
- 500-1000+ token holders
- Active secondary market on Stellar DEX
- Meaningful quarterly EURC profit distributions
- SCF Marketing Grant funding creator acquisition

---

## 8. Risk Mitigation

### Regulatory Risks

| Risk | Mitigation |
|------|------------|
| Securities law changes | Stellar's MiCA-compatible compliance tools (freeze/clawback/authorization); partner with EU-licensed custodian for KYC/AML |
| Token classified as security | Equity-backed structure with proper disclosures; legal consultation funded by Instaward |

**Probability:** Low — EU MiCA framework stabilizing; Stellar actively builds MiCA-aligned compliance tooling
**Impact:** Medium (administrative, but MRCH backed by real equity regardless of regulatory category)

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Soroban contract bugs | Free security audit from SDF via Build Award; professional pre-mainnet audit |
| Loss of funds | Multi-sig on issuer/distribution accounts; Stellar protocol-level protections |
| Wallet UX friction for artists | LOBSTR (consumer-grade app) + Cat-Suite agent onboarding guide |

**Probability:** Very Low — battle-tested Stellar infrastructure; free audit eliminates primary risk
**Impact:** High (but fully mitigated by audit + multi-sig)

### Market Risks

| Risk | Mitigation |
|------|------------|
| XLM price volatility on grants | Grant XLM converted to EURC at receipt; all distributions already denominated in EURC |
| MRCH secondary market illiquidity | Stellar DEX provides permissionless listings; organic liquidity as holder base grows |

**Probability:** Medium (crypto markets volatile by nature)
**Impact:** Low — artists receive stable EURC, not volatile tokens, for their profit share

### Execution Risks

| Risk | Mitigation |
|------|------------|
| Distraction from core business | SCF Build Award funds development; Soroban has mature documentation and examples |
| Complexity overload | Phased: Instaward → testnet → Build Award → mainnet; each phase has a defined gate |

**Probability:** Low
**Impact:** Medium (opportunity cost only)

---

## 9. Brand Amplification

### Marketing Narratives

**"We're Not Like Other Platforms"**
> "Printful and Redbubble are corporations extracting value from creators. We're a **community-owned collective** where creators literally own the platform. Check our MRCH token distribution on the Stellar blockchain — it's all public. We practice what we preach."

**"If You Know, You Know"**
> "If you understand why decentralized ownership matters, you get why Blackout Merchandise is different. We're not asking you to trust us — our ownership structure is **enforced by immutable Soroban code**. Zero trust required. Verify, don't trust."

**"Aligned Incentives"**
> "Every artist who joins doesn't just get better margins — they get **ownership**. Every employee doesn't just get equal wages — they get equal equity. When we win, everyone wins. Literally. Check the smart contract on the Stellar blockchain."

### Content Strategy

1. **Transparency Reports** — Quarterly on-chain data published with Stellar Expert explorer links
2. **Behind-the-Scenes** — DAO voting process, artist proposal videos, first EURC distribution receipts
3. **Educational** — "What is MRCH? How artists earn ownership" explainers built into Cat-Suite agent flows
4. **Social Proof** — Early backer stories, first quarterly distribution screenshots

### Media Angles

- Tech: "Print-on-Demand Startup Tokenizes 30% Equity for Creator Community on Stellar"
- Crypto: "Stellar's First Creator Economy RWA: Blackout Merchandise Distributes Real Equity to 500+ European Artists"
- Business: "How One Founder is Disrupting Merch with Stellar-Powered Community Ownership"
- EU/Fintech: "MiCA-Compliant Artist Equity Token Launches on Stellar in Portugal — Quarterly EURC Payouts"

---

## Summary

This vision outlines a bold approach to community ownership that:

1. **Starts immediately** — SCF registration and Instaward application in Year 1 Q1
2. **Zero equity for infrastructure** — SDF grants replace any equity-for-infrastructure deal
3. **Better UX** — Artists receive EURC (stable euros), not volatile crypto
4. **Creates real value** — 30% community ownership, on-chain, auditable, immutable
5. **Keeps founder control** — 82%+ equity vs. 74-78% under the previous path
6. **Non-dilutive grant stack** — up to $800K+ potential across SCF programs

**The vision is bold but pragmatic: Build a company our community actually owns — on the most payments-suitable blockchain on the planet.**

> **Note on MerchCoins vs. MRCH Tokens:** These are two distinct systems. MerchCoins are the in-app loyalty/reward currency (off-chain, internal to the platform — see PRD Roadmap). MRCH tokens are the on-chain equity layer issued on Stellar. They are not connected and serve different purposes. Do not architect MerchCoins for blockchain/external trading.

---

## Document Information

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Status | Active Strategy — Year 1 actions required |
| Target Phase | Year 1-3 |
| Owner | Victor Teixeira Bendas |
| Reference | PRD.md Section 20 |
| Blockchain | Stellar Network (Mainnet) |
| Smart Contracts | Soroban (Rust) |
| Token Name | MRCH |
| Token Type | Stellar Asset (SAC) |

---

*v1.0 used Chiliz Chain as blockchain partner. Pivoted to Stellar in May 2026 for superior payment architecture ($0.0007/tx), non-dilutive SCF grants (vs. 6-8% equity), EURC profit distributions (vs. volatile CHZ), and better MiCA compliance tooling. Chiliz remains a valuable founder credential (AI system sale to Socios.com) but is no longer the infrastructure partner.*
