# MerchCoins vs. MRCH Tokens — A Clear Distinction

> **Purpose:** Prevent internal and external conflation of two completely separate systems.
> **Critical rule:** Never reference MRCH tokens in MerchCoin UX, and never reference MerchCoins in MRCH token documentation. They are architecturally and legally separate.

---

## At a Glance

| | MerchCoins | MRCH Tokens |
|--|--|--|
| **What it is** | In-app loyalty discount currency | On-chain equity ownership |
| **Infrastructure** | Off-chain — PostgreSQL database | On-chain — Stellar Mainnet (SAC) |
| **Smart contracts** | None | Soroban (Rust) |
| **Legal classification** | Promotional discount voucher | Equity-backed utility token (MiCA) |
| **Value mechanism** | Fixed: 1 Coin = €1 discount | Variable: % of company equity |
| **How earned** | Crowdfunding rewards, promotions, campaigns | Sales milestones, employment, contribution |
| **How used** | Discount on merch purchases | Governance voting, profit distribution |
| **Who holds them** | Any platform user | Artists, employees, early backers |
| **Tradeable** | No — by design, never | Yes — via Stellar DEX post-vesting |
| **Profit distribution** | No | Yes — quarterly EURC payouts |
| **Blockchain required** | No | Yes — Stellar Network |
| **KYC required** | No | Yes (for token receipt and compliance) |
| **PRD section** | Section 2.8 | Section 20 |
| **Implementation phase** | MVP (now) | Year 2-3 |
| **Volatility** | None (fixed €1 value) | None on payouts (EURC = stable €) |

---

## MerchCoins: What They Are

MerchCoins are a **promotional discount currency** — functionally identical to Starbucks Stars or airline loyalty miles. They live in a PostgreSQL table (`merch_coin_balances`), they are issued by the platform, and they are redeemed as a €1 discount per coin on any merch order.

**They are:**
- Simple discount vouchers with zero regulatory risk
- Not subject to securities law (promotional discounts are explicitly exempt)
- Already built into the platform schema
- Off-chain, database-only, fully controlled by the platform

**They are not:**
- Blockchain tokens
- Investable or tradeable assets
- Part of the equity or ownership structure
- Connected to MRCH in any way whatsoever

**Developer directive (PRD Section 2.8):**
```
✅ Build coin system as non-tradable
❌ Do NOT architect for blockchain/external trading
❌ Do NOT expose any trading UI or mention trading in marketing
```

---

## MRCH Tokens: What They Are

MRCH tokens are **on-chain equity** — they represent a fractional ownership stake in MerchFrom, issued as a Stellar Asset on the Stellar blockchain. Holding MRCH means owning a piece of the company and receiving quarterly profit distributions in EURC (Circle's Euro stablecoin).

**They are:**
- Equity instruments representing 30% of the company, tokenized
- Subject to MiCA regulatory framework (EU)
- Issued and managed on Stellar Mainnet (SAC — Stellar Asset Contract)
- Governed by Soroban smart contracts (profit distribution, governance, vesting)

**They are not:**
- Discount vouchers
- In-app currency
- Related to MerchCoins in any technical or legal way
- Built yet (Year 2-3 roadmap)

---

## Why They Must Stay Separate

### Legal
Merging or linking them risks reclassifying MerchCoins as securities. MerchCoins are legally safe precisely because they are simple discount vouchers. The moment they are linked to equity or profit-sharing, they require MiCA registration and full regulatory compliance — adding months of legal work and cost.

### Technical
MerchCoins are a database column. MRCH tokens are a Stellar blockchain asset. They should never share state, reference each other in code, or be convertible between each other. The schemas are in different layers entirely.

### Marketing
Artists need to understand both clearly and separately:
- *"You have 50 Merch Coins — use them as €50 off your next order."*
- *"You have earned 5,000 MRCH tokens — you own 0.017% of MerchFrom and will receive quarterly profit distributions."*

Conflating these would cause confusion, erode trust in both systems, and create regulatory exposure.

### Developer Rule
The PRD Section 2.8 directive "❌ Do NOT architect for blockchain/external trading" refers explicitly to MerchCoins. This does not mean "build MerchCoins on Stellar instead." MerchCoins are permanently off-chain. MRCH tokens are the entirely separate on-chain equity system.

---

## Naming Conventions

| Context | MerchCoins | MRCH Tokens |
|---------|------------|-------------|
| In-app UI | "Merch Coins" or "coins" | "MRCH" or "your ownership tokens" |
| Artist communications | "Merch Coins (discount)" | "MRCH (equity)" |
| Marketing | "Merch Coins loyalty rewards" | "MRCH community ownership" |
| Investor docs | "loyalty discount system" | "tokenized equity (30% MRCH pool)" |
| Legal | "promotional discount vouchers" | "utility tokens with profit-sharing under MiCA" |
| Developer | `merch_coin_balances` table | Stellar SAC + Soroban contracts |

---

## The One-Sentence Test

If you are describing something that gives a discount on a product purchase → you are talking about **MerchCoins**.

If you are describing something that gives ownership of the company and a share of profits → you are talking about **MRCH tokens**.

These sentences cannot both be true of the same system.

---

## Cross-References

| Topic | Location |
|-------|----------|
| MerchCoins full specification | PRD.md Section 2.8 |
| MRCH token vision and economics | PRD.md Section 20 |
| MRCH full tokenomics and architecture | TOKENIZATION_VISION.md |
| MRCH artist onboarding guide | MRCH_ARTIST_ONBOARDING.md |
| Soroban contract architecture | TOKENIZATION_VISION.md Section 6 |
| SCF grant strategy | TOKENIZATION_VISION.md Section 5 |
