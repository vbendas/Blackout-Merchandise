# Merch Coins Trading Strategy: Documentation Summary

**Date:** 2025
**Status:** ✅ Completed - Developer notes added to PRD and technical documentation

---

## Overview

The Merch Coins system will launch as **NON-TRADABLE** for simplicity, regulatory compliance, and focus on core business validation. Future internal trading capabilities are documented for potential Year 2+ implementation, but are **NOT** part of MVP or initial launch.

---

## What Was Implemented

### 1. **PRD Updated (PRD.md)**
- Added comprehensive "Launch Strategy: Non-Tradable with Future Upgrade Path" section
- Clear Phase 1 vs Phase 2 distinction
- Technical architecture notes for future marketplace
- Database schema extensions documented but marked as "DO NOT BUILD YET"
- Business logic and validation rules for potential future implementation
- Decision criteria for when to consider building trading features
- Developer action items clearly marked (✅ Do / ❌ Don't)
- 10-step migration path if trading is eventually greenlit

**Location:** PRD.md, Section 2.8, lines 1202-1316

### 2. **MERCH_COINS_TWO_TIER_SYSTEM.md Updated**
- Added note to database schema section referencing future-proofing
- Added comment in SQL schema about future `tradable` field
- Cross-referenced PRD for complete details

**Location:** MERCH_COINS_TWO_TIER_SYSTEM.md, lines 288-302

---

## Launch Implementation (Phase 1: Months 1-12)

### Core Features (BUILD THESE)
- ✅ Two-tier coin system (Platform + Artist coins)
- ✅ Coin issuance by platform and artists only
- ✅ Checkout redemption flow
- ✅ Wallet balance display
- ✅ Never expire (lifetime value)
- ✅ €1 per coin fixed value
- ✅ Clean margin accounting (platform vs artist)

### Trading Features (DO NOT BUILD)
- ❌ Marketplace UI for buying/selling coins
- ❌ Coin listings table
- ❌ Peer-to-peer coin transfers
- ❌ KYC verification flows
- ❌ Stripe Connect seller payouts
- ❌ Trading transaction history
- ❌ Any mention of "trading" or "marketplace" in marketing

---

## Future Consideration (Phase 2: Year 2+ Only If Validated)

### Pre-Conditions for Building Trading
Must satisfy **ALL** of these criteria:
1. Core business profitable and stable
2. User demand validated (>100 support requests/month for transfers)
3. Legal/regulatory review completed
4. Engineering resources available
5. Customer support scaled for marketplace issues

### Design Principles (If Implemented)
- **Internal marketplace only** - No external crypto exchanges
- **Platform-controlled** - All trades monitored
- **Fixed €1 value** - No speculation/volatility
- **10% platform fee** - On secondary trades
- **KYC required** - Both buyers and sellers
- **Transaction limits** - Max 1,000 coins/trade, 5 trades/day

### Database Schema Extensions
```sql
-- Only add these if trading is greenlit
ALTER TABLE merch_coin_balances ADD COLUMN tradable BOOLEAN DEFAULT false;

CREATE TABLE coin_listings (...);  -- See PRD for full schema
CREATE TABLE coin_trades (...);    -- See PRD for full schema
```

### 10-Step Migration Path
1. Add `tradable` field to balances table
2. Create listings and trades tables
3. Build marketplace UI
4. Integrate Stripe Connect payouts
5. Implement KYC verification
6. Add fraud detection and rate limits
7. Legal review and terms update
8. Soft launch with waitlist
9. Monitor for abuse (3-6 months)
10. Full rollout

---

## Why NOT Build Trading Now

1. **Complexity** - Adds payment flows, KYC, fraud prevention, disputes
2. **Regulatory risk** - May trigger securities laws
3. **Focus dilution** - Core business is merch sales, not marketplace
4. **Premature optimization** - No validated user demand yet
5. **Support burden** - Marketplace customer service overhead

---

## Documentation Cross-References

- **Primary Documentation:** PRD.md, Section 2.8 (lines 1202-1316)
- **Technical Schema:** MERCH_COINS_TWO_TIER_SYSTEM.md (lines 287-302)
- **Crowdfunding Rewards:** CROWDFUNDING_STRATEGY_FINAL.md
- **Timeline:** TIMELINE_OVERVIEW.md

---

## Developer Checklist

### For Initial Build (DO THESE)
- [x] Build coin system as non-tradable
- [x] Use clean data model that supports future trading (`coin_type`, `issuer_id` fields)
- [x] Document future vision in codebase (link to PRD Section 2.8)
- [x] Implement two-tier system (Platform + Artist coins)
- [x] Build checkout redemption with margin validation
- [x] Create wallet display UI
- [x] Implement never-expire logic

### For Future (DO NOT DO NOW)
- [ ] ❌ Build marketplace or listing features
- [ ] ❌ Expose any trading UI
- [ ] ❌ Mention trading in marketing materials
- [ ] ❌ Architect for blockchain or external trading
- [ ] ❌ Implement peer-to-peer transfers

---

## Key Takeaways

1. **Launch simple:** Non-tradable coins for purchases only
2. **Future-proof data model:** Schema supports trading later if needed
3. **Clear criteria:** Only build trading if user demand validated and business is stable
4. **Documentation complete:** All design decisions and migration paths documented in PRD
5. **Focus on core:** Merch sales and artist growth, not marketplace complexity

---

## Questions or Concerns?

**Q: Why allow future trading at all?**  
A: If users organically demand it (>100 requests/month), it signals valuable feature. But we validate demand first, don't build speculatively.

**Q: Won't this confuse developers?**  
A: No - documentation is clear: Phase 1 = non-tradable (build now), Phase 2 = trading (don't build unless criteria met). Action items use ✅/❌ symbols.

**Q: What if we want to pivot to trading sooner?**  
A: Follow the 10-step migration path in PRD. Requires legal review, KYC setup, and engineering sprint. Estimate 3-4 months minimum.

**Q: How do we track user demand?**  
A: Monitor support tickets, user interviews, social media mentions. Threshold: 100+ transfer requests/month = validated demand.

---

## Conclusion

✅ **Documentation complete**  
✅ **Developer notes added to PRD and technical docs**  
✅ **Clear build vs don't-build guidance**  
✅ **Future upgrade path documented**  

**Next Steps:**  
- Proceed with non-tradable coin system implementation
- Focus on crowdfunding campaign and MVP launch
- Monitor user feedback for trading demand (Year 1)
- Revisit trading decision in Year 2 based on criteria

---

*Last Updated: 2025*  
*Maintained by: Merch From Engineering Team*
