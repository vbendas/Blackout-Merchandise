# MRCH Artist Onboarding Guide

> **Purpose:** Complete guide for onboarding artists to MRCH tokens — what they are, how to earn them, how to set up a wallet, and how to receive profit distributions.
> **Audience:** Internal team reference + Cat-Suite agent scripts (Leopoldo)
> **Implementation:** Year 2-3 (post-token launch on Stellar Mainnet)
> **References:** TOKENIZATION_VISION.md, PRD.md Section 20

---

## Table of Contents

1. [What is MRCH? (Plain Language)](#1-what-is-mrch-plain-language)
2. [How Artists Earn MRCH](#2-how-artists-earn-mrch)
3. [Setting Up a Stellar Wallet (LOBSTR)](#3-setting-up-a-stellar-wallet-lobstr)
4. [Receiving Quarterly Profit Distributions](#4-receiving-quarterly-profit-distributions)
5. [Cat-Suite Onboarding Scripts (Leopoldo)](#5-cat-suite-onboarding-scripts-leopoldo)
6. [FAQ](#6-faq)

---

## 1. What is MRCH? (Plain Language)

MRCH is how artists become co-owners of Blackout Merchandise.

Every time you hit a sales milestone on Blackout Merchandise, you earn MRCH tokens. These tokens represent a real ownership stake in the company — not a discount, not a points balance, but actual equity.

When Blackout Merchandise makes a profit, 30% goes directly to MRCH token holders. Automatically. Every quarter. In euros.

Think of it this way: you don't just *use* Blackout Merchandise — you're building it with us. The more you sell, the more you own. The more the platform earns, the more you get paid.

**Three things MRCH does:**
1. Gives you ownership (a percentage of Blackout Merchandise)
2. Pays you quarterly profit distributions in euros (EURC)
3. Gives you a vote in how the platform evolves (Artist DAO)

**One thing MRCH is not:** a cryptocurrency for speculation. It's equity. Treat it like shares in the company — because that's exactly what it is.

> **Not the same as Merch Coins.** Merch Coins are discount vouchers (€1 off per coin). MRCH tokens are ownership. Completely separate systems. See [MERCHANTCOINS_VS_MRCH.md](./MERCHANTCOINS_VS_MRCH.md).

---

## 2. How Artists Earn MRCH

MRCH tokens are earned through sales milestones — they are not purchased.

| Milestone | MRCH Earned | Cumulative Ownership |
|-----------|-------------|----------------------|
| Account onboarding (store live) | 5,000 | 0.017% |
| €5K lifetime sales | +5,000 | 0.033% |
| €15K lifetime sales | +10,000 | 0.067% |
| €50K lifetime sales | +30,000 | 0.167% |

**What your ownership stake is worth:**

| Scenario | Value of 50,000 MRCH |
|----------|----------------------|
| €10M company valuation | €16,700 |
| €20M exit | €33,400 |
| €50M exit | €83,500 |

Tokens are issued to your Stellar wallet automatically when you hit each milestone. No claiming, no forms — Leopoldo notifies you when they arrive.

**Additional earning paths:**
- Referring other artists who join and sell (Community/Customer pool)
- Contributing to governance proposals that get implemented (Strategic Reserve pool)

---

## 3. Setting Up a Stellar Wallet (LOBSTR)

MRCH tokens live on the Stellar blockchain. To hold them, you need a Stellar wallet. We recommend **LOBSTR** — beginner-friendly, free, available on iOS and Android.

### Step-by-Step Setup

**Step 1: Download LOBSTR**
- iOS: App Store → search "LOBSTR"
- Android: Google Play → search "LOBSTR"

**Step 2: Create your account**
- Open LOBSTR → tap "Create Account"
- Write down your **12-word recovery phrase** on paper — store it somewhere safe and offline
- This phrase is the only way to recover your wallet if you lose access to your phone

**Step 3: Find and save your Stellar address**
- Your address looks like: `GABC1234DEFG5678...`
- Go to your Blackout Merchandise account settings → "Ownership" → paste your Stellar address
- This is where your MRCH tokens and EURC distributions will be sent automatically

**Step 4: Add MRCH as a trusted asset (trustline)**
- In LOBSTR: tap Assets → Add Asset → search "MRCH"
- Select MRCH issued by the official Blackout Merchandise issuer address
- This creates a "trustline" — Stellar requires this before any token can be sent to you
- Leopoldo will walk you through this step inside the platform if needed

**Step 5: Done**
Your wallet is ready. When you hit your first sales milestone, MRCH tokens will arrive automatically within 24 hours.

### Keep Your Recovery Phrase Safe

Your 12-word phrase **is** your wallet. Anyone with this phrase can access and move your funds.

- Write it on paper — do not save it digitally
- Store it somewhere secure offline (not in your phone, not in email)
- Never share it with anyone — including Blackout Merchandise support
- If you lose it and lose your phone, there is no recovery option

---

## 4. Receiving Quarterly Profit Distributions

Every quarter, Blackout Merchandise runs a profit distribution. 30% of net profit goes to all MRCH holders, split proportionally by token holdings.

**How it works:**

1. Blackout Merchandise calculates quarterly net profit
2. 30% is allocated to the MRCH profit pool
3. A Soroban smart contract divides the pool proportionally across all MRCH holders
4. EURC (Euro stablecoin) is sent automatically to every holder's Stellar wallet
5. Leopoldo notifies you: *"Your Q[X] distribution arrived — €[amount] is in your wallet."*

No action required from you. No forms, no claiming. The contract executes automatically.

**What is EURC?**

EURC is a Euro stablecoin issued by Circle (the company behind USDC). 1 EURC = 1 Euro, always. It is MiCA-registered in the EU. You receive real euros — no volatility, no speculation, no exchange required.

Your EURC balance appears alongside your MRCH balance in LOBSTR with a Euro symbol. You can:
- Hold it as savings
- Send it to another person or wallet
- Convert it to cash via MoneyGram (available directly in LOBSTR in most EU countries)

**Distribution schedule:** End of March, June, September, December (quarterly)

**Minimum threshold:** Distributions below €1.00 accumulate to the following quarter

---

## 5. Cat-Suite Onboarding Scripts (Leopoldo)

These are Leopoldo's dialogue scripts for each stage of the MRCH onboarding flow. Developers implementing the Year 2-3 MRCH integration should use these as the baseline chat responses. All scripts are in Leopoldo's voice — direct, knowledgeable, not preachy.

---

### Trigger: Artist's store goes live (first onboarding milestone)

> **Leopoldo:** "Your store is live. Sales can start today. But before you do anything else — I need to tell you something. You don't just *use* Blackout Merchandise. You *own* it. I've just allocated 5,000 MRCH tokens to your account. That's a real ownership stake in this company. Want to understand what that means?"

*[If Yes]:*
> **Leopoldo:** "Good. Short version: MRCH tokens are equity. When Blackout Merchandise profits, token holders get a cut. Automatically. In euros. Every quarter. To receive yours, you need a free Stellar wallet — takes about 3 minutes. Want me to walk you through it?"

*[If No / Later]:*
> **Leopoldo:** "Fair enough. When you're ready, find me in the 'Ownership' tab. Your tokens aren't going anywhere."

---

### Trigger: Artist reaches €5K lifetime sales

> **Leopoldo:** "€5,000 in lifetime sales. That's a real business. I've just sent 5,000 more MRCH tokens to your wallet. You now hold [X total] MRCH — that's [Y]% of Blackout Merchandise. Keep selling. Each milestone, your stake grows."

---

### Trigger: Artist reaches €15K lifetime sales

> **Leopoldo:** "€15,000. You're in the top tier of active artists now. 10,000 more MRCH tokens just landed in your wallet. Total: [X]. At our current trajectory, that stake has real value. The quarterly distributions are starting to add up too — check your EURC balance."

---

### Trigger: Quarterly distribution sent

> **Leopoldo:** "Good news. Your Q[X] [Year] profit distribution just processed. €[amount] in EURC is in your Stellar wallet right now. That's your share of Blackout Merchandise's revenue — automatic, on-chain, no trust required. Open LOBSTR and you'll see it."

---

### Trigger: Artist asks "what are MRCH tokens?"

> **Leopoldo:** "MRCH tokens are ownership in Blackout Merchandise. Not loyalty points — actual equity. 30% of this company is tokenized and distributed to artists, employees, and early supporters. You earn them through sales milestones. When Blackout Merchandise profits, every token holder gets a quarterly payout in euros. It's profit-sharing, enforced by smart contract. No middleman. No trust required. The blockchain just does it."

---

### Trigger: Artist asks "how do I set up a wallet?"

> **Leopoldo:** "Download LOBSTR on your phone — it's the easiest Stellar wallet. Create your account, save your 12-word recovery phrase somewhere offline, then come back and paste your Stellar address in your account settings under 'Ownership'. Your MRCH tokens will arrive within 24 hours. One thing: never share that recovery phrase. Not with anyone. Not with me."

---

### Trigger: Artist asks "can I sell my MRCH tokens?"

> **Leopoldo:** "After your vesting period, yes — MRCH trades on the Stellar DEX. Decentralized exchange, built into the protocol. No sign-up, no intermediary. But think carefully before selling. You're selling equity in a growing company with real quarterly distributions. Most artists hold. The math usually favours keeping it."

---

### Trigger: Artist asks "how is this different from Merch Coins?"

> **Leopoldo:** "Completely different. Merch Coins are a discount — like a voucher, €1 off per coin on any order. MRCH tokens are ownership — a percentage of the actual company. One gives you a cheaper t-shirt. The other gives you a share of the profits. Same name, completely different systems. Don't confuse them."

---

### Trigger: Artist asks about DAO voting

> **Leopoldo:** "Every MRCH token is a vote. When we put a platform decision to the Artist DAO — new product categories, pricing structures, feature priorities — token holders vote. 1 MRCH = 1 vote. 7-day voting window. If a proposal passes quorum, it executes on-chain automatically. Your tokens aren't just profit-sharing — they're a seat at the table."

---

## 6. FAQ

**Q: Do I have to pay for MRCH tokens?**
No. You earn them through sales milestones. They are never for sale.

**Q: Is MRCH a speculative cryptocurrency?**
No. MRCH represents equity in Blackout Merchandise, not a speculative asset. Your profit distributions are paid in EURC (stable euros), so you never need to care about the MRCH market price to benefit from holding it.

**Q: What happens to my MRCH if Blackout Merchandise is acquired?**
MRCH tokens represent real equity. In an acquisition, MRCH holders receive their proportional share of the acquisition price — same as any equity holder.

**Q: Can Blackout Merchandise take my tokens back?**
The token has a clawback capability for legal or compliance reasons (e.g. fraud, court order). Under normal circumstances, your tokens are yours. The vesting contract enforces the unlock schedule, but once unlocked, tokens are fully held by you.

**Q: What if I lose access to my LOBSTR wallet?**
Your 12-word recovery phrase restores your wallet on any device. If you lose the phrase, tokens cannot be recovered by anyone — not Blackout Merchandise, not LOBSTR. This is a fundamental property of the Stellar blockchain. Keep your phrase safe.

**Q: How much is my MRCH worth right now?**
MRCH value = (your token count / 30,000,000) × current company valuation. Leopoldo can give an indicative estimate based on the most recent valuation data. The practical value is in the quarterly EURC distributions you receive while holding.

**Q: How is this different from Merch Coins?**
Completely different systems. Merch Coins are loyalty discount vouchers (off-chain, no blockchain). MRCH tokens are equity (on-chain, Stellar blockchain). See [MERCHANTCOINS_VS_MRCH.md](./MERCHANTCOINS_VS_MRCH.md) for the full side-by-side comparison.

---

## Quick Reference Card (Artist-Facing Summary)

```
MRCH Tokens — Quick Facts

What:     Equity in Blackout Merchandise (real ownership, not a discount)
Earn:     Sales milestones — automatic, no claiming needed
Wallet:   LOBSTR app (free, iOS + Android, 3 min setup)
Payout:   Quarterly, in EURC (euros, stable, direct to wallet)
Vote:     Artist DAO — 1 MRCH = 1 vote on platform decisions
Trade:    Stellar DEX after vesting period

Milestone 1:  5,000 MRCH at store launch
Milestone 2:  +5,000 MRCH at €5K lifetime sales
Milestone 3:  +10,000 MRCH at €15K lifetime sales
Milestone 4:  +30,000 MRCH at €50K lifetime sales

Not the same as Merch Coins (discount vouchers).
Questions? Ask Leopoldo.
```

---

*For technical contract architecture, see TOKENIZATION_VISION.md Section 6. For the MerchCoins vs. MRCH distinction, see MERCHANTCOINS_VS_MRCH.md. For the full tokenomics and SCF grant strategy, see TOKENIZATION_VISION.md.*
