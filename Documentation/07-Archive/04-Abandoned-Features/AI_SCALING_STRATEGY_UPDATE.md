# AI Infrastructure Scaling Strategy - PRD Update

**Date:** November 9, 2025  
**Status:** ✅ PRD Updated with AI Moat Strategy

---

## 🎯 Strategic Decision: API-First → Self-Hosted at Scale

### The Approach

**Phase 1 (Months 1-18): Launch with APIs**
- Use SeeDream 4.0 via OpenRouter ($0.03/generation)
- Cost: $30/month at 1,000 generations (100 artists)
- Zero infrastructure investment
- Fast to market (no delays)
- Proven quality

**Phase 2 (Months 18-24): Migrate to Self-Hosted Step1X-Edit**
- Deploy at 250+ artists (break-even point)
- 80% cost reduction (from $0.03 to ~$0.006 per generation)
- Fine-tuned on 5,000+ expert-scored designs
- Proprietary dataset = competitive moat

---

## 📊 Economic Justification

### Cost Comparison (Annual)

| Artists | Generations/Month | SeeDream API | Self-Hosted | Winner |
|---------|-------------------|--------------|-------------|--------|
| 100 | 1,000 | $360/year | €6,808/year | **API (20× cheaper)** |
| 250 | 5,000 | $1,800/year | €1,808/year | **Break-even** |
| 500 | 10,000 | $3,600/year | €1,808/year | **Self-hosted (50% savings)** |
| 1,000 | 20,000 | $7,200/year | €1,808/year | **Self-hosted (75% savings)** |

### Break-Even: 250+ Artists (5,000 generations/month)

**Self-Hosted Investment:**
- NVIDIA A6000 GPU: €5,000
- Setup & integration: €3,000
- Monthly operations: €150 (electricity + cooling + maintenance)
- **Funded by profits** (€30-50K/month by Year 2)

---

## 🏗️ Dataset Building Strategy

### The Competitive Moat

While using APIs in Year 1, we simultaneously build a proprietary dataset:

**Collection Process:**
1. **Every design generated** = dataset entry
2. **Artist feedback loops** = refinement preference data
3. **Expert manual scoring** = 9 years screen printing expertise applied
4. **Production validation** = real prints scored for quality

**Quality Scoring Rubric (1-5):**
- Print-readiness (color separation, halftone compatibility)
- Design execution (aesthetic quality, prompt adherence)
- Technical specs (DPI, dimensions, bleed)
- Production efficiency (screen count, registration complexity)

**Dataset Growth:**
```
Month 7 (Launch): 100 designs
Month 12: 1,200 designs
Month 18: 5,000 designs (ready for fine-tuning)
Month 24: 10,000+ designs (world-class dataset)
```

---

## 💰 Investor Pitch Angle

> "We're launching with proven APIs to achieve profitability fast—AI costs are just $0.03 per design, completely negligible at <0.1% of revenue. But we're not stopping there. From Day 1, we're building a proprietary dataset of expert-scored screen printing designs. By Year 2, when we hit 250+ artists, we'll migrate to our own open-source infrastructure running Step1X-Edit fine-tuned on 5,000+ real-world designs. That's when our margin expansion accelerates—80% cost reduction while competitors stay locked into expensive APIs. We're building both a profitable business AND a defensible AI moat."

**Why This Wins:**
- ✅ Capital efficiency (no premature infrastructure)
- ✅ De-risked execution (validate before building deep tech)
- ✅ Margin expansion story (clear path to 80% reduction)
- ✅ Defensible moat (proprietary dataset)
- ✅ Investor confidence (strategic thinking)

---

## 📝 PRD Updates Made

### 1. Technology Stack Section (§5.1)
Added:
- **Phase 1: API-Based** (SeeDream 4.0)
- **Phase 2: Self-Hosted** (Step1X-Edit fine-tuned)

### 2. New Section: AI Infrastructure Economics (§5.2)
Added comprehensive breakdown:
- Cost analysis Year 1
- Break-even calculations
- Self-hosted infrastructure specs
- Proprietary dataset strategy
- Technical migration plan (4 phases)
- Investor pitch positioning

### 3. Database Schema (§5.4)
Added new tables:
- `design_quality_scores` - Expert scoring system
- `design_refinement_preferences` - User preference data
- `ml_training_dataset` - Export view for fine-tuning

### 4. Pitch Deck (§2.3)
Updated:
- Added Slide 9: "AI Moat Strategy"
- Updated Unit Economics slide with AI costs
- Added dataset metrics to investor-ready metrics

### 5. Acceptance Criteria (§4)
Added new phase:
- **Phase 6: Dataset Collection System** (Month 7)
  - Scoring interface
  - Metadata capture
  - Export functionality
  - Quality tracking
  - Milestone: 5,000 designs by Month 18

---

## 🛠️ Technical Implementation

### Database Tables Created

```sql
-- Expert scoring for ML training
CREATE TABLE design_quality_scores (
  id UUID PRIMARY KEY,
  design_session_id UUID REFERENCES design_sessions(id),
  print_readiness_score INTEGER CHECK (BETWEEN 1 AND 5),
  design_execution_score INTEGER CHECK (BETWEEN 1 AND 5),
  technical_specs_score INTEGER CHECK (BETWEEN 1 AND 5),
  production_efficiency_score INTEGER CHECK (BETWEEN 1 AND 5),
  overall_score DECIMAL(3,2),
  scorer_id UUID,
  was_printed BOOLEAN,
  print_quality_actual INTEGER,
  created_at TIMESTAMP
);

-- User preference tracking for fine-tuning
CREATE TABLE design_refinement_preferences (
  id UUID PRIMARY KEY,
  design_session_id UUID,
  before_image_url TEXT,
  after_image_url TEXT,
  refinement_instruction TEXT,
  user_accepted BOOLEAN,
  preference_strength INTEGER,
  created_at TIMESTAMP
);
```

### Migration Timeline

**Month 18: Infrastructure Setup**
- Acquire NVIDIA A6000 GPU (€5,000 from profits)
- Install Step1X-Edit base model
- Set up inference API wrapper

**Month 19-20: Fine-Tuning**
- Export 5,000-image dataset
- Fine-tune Step1X-Edit on screen printing data
- A/B test vs. SeeDream

**Month 21-22: Gradual Migration**
- Deploy custom model as primary
- Maintain SeeDream as fallback
- Monitor quality metrics

**Month 23-24: Full Migration**
- 100% traffic to self-hosted
- Remove SeeDream dependency
- Realize €120+/month savings

---

## 🎯 Success Metrics

**Dataset Quality:**
- Average score >3.5/5.0
- >60% designs scored 4.0+
- >100 production-validated prints

**Fine-Tuned Model Performance:**
- Quality >= SeeDream (A/B test)
- Inference speed <5s per generation
- >95% success rate
- User satisfaction maintained

**Economic Impact:**
- 80% cost reduction achieved
- Break-even at 250+ artists
- €1,440/year savings at 500 artists
- €5,400/year savings at 1,000 artists

---

## 🚀 Why This Strategy Is Brilliant

1. **No Risk:** APIs work today, self-hosting only happens if scale justifies it
2. **Capital Efficient:** Zero infrastructure investment during validation
3. **Defensible Moat:** Dataset becomes proprietary IP asset
4. **Margin Expansion:** Clear path to 80% AI cost reduction
5. **Investor Story:** Shows long-term strategic thinking
6. **Fallback Plan:** If custom model fails, keep using APIs (no harm)

---

## 📌 Next Steps

### Immediate (Pre-Launch):
- ✅ PRD updated with strategy
- ⏳ Include in investor pitch deck
- ⏳ Add to financial projections
- ⏳ Create dataset scoring interface mockups

### Month 7 (Launch):
- Deploy dataset collection system
- Begin manual scoring (target: 50/month)
- Track design session metadata
- Monitor user refinement preferences

### Month 18 (Scale):
- Evaluate dataset readiness (5,000+ designs)
- Acquire GPU hardware
- Begin fine-tuning process
- A/B test custom model vs. APIs

---

**This strategy transforms Merch From from "another AI platform" into "the only screen-print-optimized AI in the market" while maintaining capital efficiency and de-risking execution.**
