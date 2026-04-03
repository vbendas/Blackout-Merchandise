# PrintScore: Expert Quality Network
## Product Requirements Document

**Version:** 2.3 (Revised with Evaluation Feedback - Critical Gaps Addressed)
**Date:** January 23, 2026
**Status:** Concept (Future Implementation)
**Parent Project:** Merch From
**Planned Phase:** Phase 8+ (Post-Investment)
**Project Manager:** [Brazil Technical Manager - TBD]
**Evaluation Score:** 8/10
**Response to Evaluation:** All critical gaps addressed except FLUX model (deferred per user)

---

## 1. Executive Summary

**One-liner:** PrintScore is a distributed expert evaluation network that pays screen printers to score artwork and print quality, building the world's first expert-trained dataset for print AI.

### The Opportunity

| Metric | Value |
|--------|-------|
| **Primary Value** | Training data for Merch From's AI color separation engine |
| **Secondary Value** | Industry credibility through expert network |
| **Tertiary Value** | Potential B2B licensing to ink/equipment manufacturers |

### Why This Works

- **200+ evaluators** across diverse markets capture production reality no single expert can
- **€5/evaluation** is meaningful income in Brazil (R$30) while sustainable for platform
- **Payment-after-audit** model ensures only quality data enters the training pipeline
- **GDPR-compliant** anonymized production photos protect client privacy
- **100% open-source AI stack** eliminates API dependencies and recurring costs
- **Honeypot evaluations** detect and prevent fraud/collusion

### Strategic Position

PrintScore is **not** a standalone business—it's Merch From's **expert quality network** that:
1. Validates AI model outputs against industry consensus
2. Generates proprietary training data competitors cannot replicate
3. Creates industry relationships (ink brands, equipment manufacturers)
4. Provides social impact story for crowdfunding narrative

---

## 2. Core Concept

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  EVALUATOR WORKFLOW (30-60 seconds)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CAPTURE     →  Take photo of artwork + printed result      │
│  2. SCORE       →  Slide 4 criteria (1-5 each)                 │
│  3. SUBMIT      → Queue for audit                             │
│  4. GET PAID    →  €5 after audit approval                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  PRINT SHOPS     │────▶│  PRINTSCORE      │────▶│  MERCH FROM AI   │
│  (200+ global)   │     │  (Audit + Store) │     │  (LoRA Training) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                        │
        │                        ▼                        │
        │               ┌──────────────────┐              │
        │               │  EXPERT PANEL    │              │
        │               │  (5% Calibration)│              │
        │               └──────────────────┘              │
        │                                                 │
        └─────────────────────────────────────────────────┘
                    Feedback Loop (Model Improvement)
```

### Data Sources

| Source | Description | Volume |
|--------|-------------|--------|
| **Blackout Historical** | 9 years of production jobs (photographed) | 2,000-5,000 examples |
| **Merch From Production** | Live jobs from platform orders | Ongoing |
| **Print Shop Submissions** | Real production from network | 6,000+/month at scale |

---

## 3. Scoring System

### Master Score (1-5)

| Score | Label | Description |
|-------|-------|-------------|
| 1 | FAIL | Cannot be printed / should not ship |
| 2 | BELOW AVG | Major issues, requires revision |
| 3 | STANDARD | Acceptable for production |
| 4 | GOOD | Professional quality |
| 5 | EXCELLENT | Reference quality |

### Criteria (4 Dimensions)

| Criterion | What It Measures |
|-----------|------------------|
| **Printability** | Registration complexity, screen requirements, halftone stability |
| **Color Accuracy** | Pantone fidelity, luminance preservation |
| **Detail Preservation** | Edge quality, small text, halftone retention |
| **Commercial Viability** | Cost efficiency, scalability, production time |

### Failure Capture (When Score < 3)

- Registration issues
- Color mismatch
- Detail loss
- Ink deposit problems
- Curing issues
- Substrate interaction
- Other (free text)

---

## 4. Economic Model

### Evaluator Payments

| Tier | Requirement | Rate |
|------|-------------|------|
| **Standard** | Audit-approved evaluation | €5.00 |
| **Quality Bonus** | 95%+ agreement rate | +€1.00 |
| **Volume Bonus** | 100+ monthly evaluations | +€0.50 |

**Payment Conditions:**
- Evaluation accepted only after automated + audit checks
- Rejected evaluations = no payment (feedback provided)
- Monthly payout cycle (minimum €20 threshold)

### Payment Methods by Region

| Region | Primary Method | Backup Method | Processing Time |
|--------|---------------|---------------|-----------------|
| **Brazil** | Pix (instant) | Mercado Pago | Instant / 1-2 days |
| **Argentina** | Mercado Pago | Wise | 1-2 days |
| **Portugal/EU** | Wise | SEPA Transfer | 1-3 days |
| **Other LatAm** | Mercado Pago | Wise | 1-3 days |
| **International** | Wise | PayPal | 2-5 days |

### Expert Panel Compensation

| Expert | Role | Monthly Volume | Rate | Monthly Total |
|--------|------|----------------|------|---------------|
| **Expert A** | Lead Auditor | 200 audits | €3/audit | €600 |
| **Expert B** | Technical Advisor | 150 audits | €3/audit | €450 |
| **Expert C** | Quality Master | 150 audits | €3/audit | €450 |
| **Calibration Sessions** | All 3 | 2 hours/month | €50/hour | €300 |
| **Total Expert Costs** | | | | **€1,800/month** |

### Platform Economics (Month 6 Target)

| Category | Monthly Cost |
|----------|--------------|
| Evaluator payments (5,000 × €5) | €25,000 |
| Quality bonuses (~10%) | €2,500 |
| Expert panel compensation | €1,800 |
| Payment processing (1.5%) | €450 |
| Hosting + infrastructure | €500 |
| **Total** | **€30,250** |

### Financial Sustainability Path

```
┌─────────────────────────────────────────────────────────────────┐
│  FUNDING RUNWAY ANALYSIS                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INITIAL FUNDING:                                               │
│  • Merch From allocation:     €50,000                          │
│  • Ink brand sponsorship:     €30,000 (target)                 │
│  • Equipment sponsorship:     €15,000 (target)                 │
│  • Total Available:           €95,000                          │
│                                                                 │
│  BURN RATE PROJECTION:                                          │
│  • Month 1-2 (Pilot):         €8,000/month                     │
│  • Month 3-4 (Beta):          €15,000/month                    │
│  • Month 5-6 (Launch):        €25,000/month                    │
│  • Month 7-12 (Scale):        €30,000/month                    │
│                                                                 │
│  CUMULATIVE SPEND:                                              │
│  • After Pilot (M2):          €16,000                          │
│  • After Beta (M4):           €46,000                          │
│  • After Launch (M6):         €96,000 ← Break-even point       │
│                                                                 │
│  SUSTAINABILITY TRIGGERS:                                       │
│  • Month 6: Require sponsorship revenue ≥€30K                  │
│  • Month 8: Evaluate B2B licensing opportunities               │
│  • Month 10: Break-even or reduce scale                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Go/No-Go Decision Points

| Milestone | Threshold | Action if Not Met |
|-----------|-----------|-------------------|
| Month 2 | 15+ active evaluators | Extend pilot, adjust incentives |
| Month 4 | €30K sponsorship secured | Reduce scope or pause |
| Month 6 | 2,000+ quality evaluations | Delay AI training |
| Month 8 | Break-even path visible | Scale down to maintenance mode |

---

## 5. Quality Control

### Three-Tier Audit System

```
┌─────────────────────────────────────────────────────────────────┐
│  QUALITY CONTROL PIPELINE                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TIER 1: AUTOMATED (70%)                                       │
│  • Duplicate detection (perceptual hashing)                    │
│  • Completion verification (all fields present)                │
│  • Time bounds (30s-30min acceptable range)                    │
│  • Image quality check (resolution, blur detection)            │
│  • Honeypot validation (see below)                             │
│                                                                 │
│  TIER 2: PEER REVIEW (25%)                                     │
│  • Experienced evaluators cross-check submissions              │
│  • Consensus-based validation                                  │
│  • Flagging for expert review                                  │
│                                                                 │
│  TIER 3: EXPERT PANEL (5%)                                     │
│  • Expert A, Expert B, Expert C                  │
│  • Edge cases and calibration samples                          │
│  • Final authority on disputed evaluations                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Honeypot Evaluation System (Fraud Prevention)

**Purpose:** Detect and prevent evaluator fraud, collusion, and low-effort submissions.

| Honeypot Type | Frequency | Detection Method |
|---------------|-----------|------------------|
| **Gold Standard** | 5% of assignments | Pre-scored images with known-correct answers |
| **Duplicate Check** | 3% of assignments | Same image sent twice, scores must match |
| **Impossible Task** | 2% of assignments | Deliberately flawed images that should score 1 |

**Fraud Detection Rules:**

```python
# Honeypot validation logic
def validate_honeypot_response(evaluation, honeypot):
    if honeypot.type == 'gold_standard':
        # Score must be within ±0.5 of expert consensus
        deviation = abs(evaluation.master_score - honeypot.correct_score)
        if deviation > 0.5:
            flag_evaluator(evaluation.evaluator_id, 'honeypot_fail')
            return False
    
    elif honeypot.type == 'duplicate_check':
        # Previous score for same image must match within ±0.3
        previous = get_previous_evaluation(evaluation.evaluator_id, honeypot.image_id)
        if previous and abs(evaluation.master_score - previous.master_score) > 0.3:
            flag_evaluator(evaluation.evaluator_id, 'inconsistent_scoring')
            return False
    
    elif honeypot.type == 'impossible_task':
        # Must identify as fail (score 1-2)
        if evaluation.master_score > 2:
            flag_evaluator(evaluation.evaluator_id, 'quality_blindness')
            return False
    
    return True
```

**Consequences:**
- 1 honeypot fail: Warning + retraining materials
- 2 honeypot fails in 30 days: 7-day suspension
- 3 honeypot fails in 90 days: Permanent ban

### Evaluator Quality Score

| Agreement Rate | Status | Action |
|----------------|--------|--------|
| 95%+ | Trusted | Quality bonus eligible |
| 85-94% | Standard | Normal operation |
| 75-84% | Probation | Reduced evaluation quota |
| <75% | Suspended | Retraining required |

---

## 6. GDPR Compliance & Data Retention

### Privacy-by-Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Anonymization** | No client names, logos, or identifying marks in photos |
| **Data Minimization** | Only collect what's needed for scoring |
| **Consent** | Clear terms at evaluator onboarding |
| **Right to Deletion** | Evaluators can request data removal |

### Photo Requirements

- Artwork: Original design (cropped to remove identifying info)
- Print result: Product only (no background, packaging, labels)
- No client names, order numbers, or business identifiers visible
- Metadata stripped from uploaded images (EXIF, GPS, etc.)

### Data Retention Policy

| Data Type | Retention Period | After Retention | Legal Basis |
|-----------|------------------|-----------------|-------------|
| **Evaluation Images** | 3 years | Anonymized or deleted | Legitimate interest (AI training) |
| **Evaluator Profiles** | Account lifetime + 2 years | Deleted | Contract performance |
| **Payment Records** | 7 years | Archived (tax compliance) | Legal obligation |
| **Honeypot Results** | 1 year | Aggregated statistics only | Fraud prevention |
| **AI Training Data** | Indefinite | Anonymized metadata retained | Legitimate interest |
| **Audit Logs** | 2 years | Deleted | Security |

### Data Deletion Process

```sql
-- Automated retention cleanup (runs weekly)
-- 1. Delete evaluation images older than 3 years
DELETE FROM printscore_evaluation_images 
WHERE created_at < NOW() - INTERVAL '3 years';

-- 2. Anonymize old evaluations (keep scores, remove links)
UPDATE printscore_evaluations 
SET artwork_url = NULL, print_url = NULL, detail_url = NULL,
    notes = '[REDACTED]', anonymized_at = NOW()
WHERE created_at < NOW() - INTERVAL '3 years'
  AND anonymized_at IS NULL;

-- 3. Delete inactive evaluator profiles
DELETE FROM printscore_evaluators
WHERE last_active_at < NOW() - INTERVAL '2 years'
  AND wallet_balance = 0;
```

---

## 7. Technical Architecture

### Open-Source AI Stack (100% Self-Hosted)

```
┌─────────────────────────────────────────────────────────────────┐
│  PRINTSCORE AI STACK - FULLY SELF-HOSTED                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✗ NO Google/OpenAI API dependencies                           │
│  ✓ Full commercial use allowed                                 │
│  ✓ Model queuing for single-GPU deployment                     │
│  ✓ Fine-tunable for screen printing domain                     │
│  ✓ Data stays on your infrastructure                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### AI Model Stack

| Component | Model | License | VRAM | Commercial Use |
|-----------|--------|----------|------|----------------|
| **Quality Assessor** | Qwen2.5-VL-7B-Instruct | Qwen License | 16-20GB | Yes |
| **Image Generation** | FLUX.2-klein-9B | Apache 2.0 | 12-16GB | Yes |
| **Image Enhancement** | Real-ESRGAN x4 + GFPGAN | BSD-3 / Apache 2.0 | 2-4GB | Yes |
| **Image Editing** | SDXL Inpainting | Open RAIL++ | 8-12GB | Yes |
| **Style Transfer** | SDXL + LoRA | Open RAIL++ | 8-12GB | Yes |
| **Color Separation** | OpenCV + Custom Python | MIT/BSD | CPU | Yes |

### GPU Resource Management (Single GPU Strategy)

**Challenge:** All models exceed 24GB if loaded simultaneously.

**Solution:** Sequential model loading with request queuing.

```
┌─────────────────────────────────────────────────────────────────┐
│  MODEL SERVING STRATEGY (Single RTX 4090)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  APPROACH: Triton Inference Server with Model Queuing          │
│                                                                 │
│  1. Request arrives at API Gateway                              │
│  2. Gateway checks which model is needed                        │
│  3. If model not loaded → Queue request, swap models            │
│  4. Process request                                             │
│  5. Return result                                               │
│                                                                 │
│  MODEL PRIORITY (always loaded first):                          │
│  • Qwen2.5-VL (primary assessor) - 16GB                        │
│                                                                 │
│  ON-DEMAND LOADING:                                             │
│  • FLUX.2 (generation) - swap in when needed                   │
│  • SDXL (editing) - swap in when needed                        │
│  • Real-ESRGAN (always fast, 2GB) - can coexist               │
│                                                                 │
│  SWAP TIME: ~15-30 seconds per model                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Multi-GPU Upgrade Path (When scaling):**

| Configuration | Models | Use Case |
|---------------|--------|----------|
| **1× RTX 4090** | Qwen2.5-VL + Real-ESRGAN | Pilot/Beta |
| **2× RTX 4090** | Above + FLUX.2 dedicated | Launch |
| **3× RTX 4090** | Above + SDXL dedicated | Scale |

### Infrastructure Requirements

| Component | Recommended | Cost |
|-----------|--------------|-------|
| **GPU** | NVIDIA RTX 4090 (24GB) or A5000 | €2,000 |
| **CPU** | AMD EPYC 7313P or Intel i9-13900K | €400 |
| **RAM** | 64GB DDR5 | €250 |
| **Storage** | 2TB NVMe SSD + 8TB HDD | €550 |
| **Power Supply** | 1200W 80+ Gold | €150 |
| **Total Server Cost** | | **~€3,350** |

### Performance Requirements (SLAs)

| Operation | Target Latency | Max Latency | Throughput |
|-----------|---------------|-------------|------------|
| **Evaluation Submission** | <500ms | 2s | 100/min |
| **Quality Assessment (Qwen2.5-VL)** | <5s | 15s | 12/min |
| **Color Separation (OpenCV)** | <3s | 10s | 20/min |
| **Image Enhancement (Real-ESRGAN)** | <10s | 30s | 6/min |
| **Design Generation (FLUX.2)** | <30s | 60s | 2/min |
| **Full Pipeline (process_submission)** | <45s | 120s | 1/min |

### Disaster Recovery Plan

```
┌─────────────────────────────────────────────────────────────────┐
│  DISASTER RECOVERY & BACKUP STRATEGY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DATABASE (Neon PostgreSQL):                                    │
│  • Automatic point-in-time recovery (7 days)                   │
│  • Daily snapshots to S3 (retained 30 days)                    │
│  • Cross-region replication (EU-West backup)                   │
│  • RTO: 1 hour | RPO: 5 minutes                                │
│                                                                 │
│  MODEL CHECKPOINTS:                                             │
│  • Weekly backup to S3 Glacier                                 │
│  • LoRA weights versioned in Git LFS                           │
│  • Base models can be re-downloaded from HuggingFace           │
│  • RTO: 4 hours | RPO: 1 week                                  │
│                                                                 │
│  EVALUATION IMAGES (Cloudinary):                               │
│  • Cloudinary handles redundancy                               │
│  • Monthly export to S3 for long-term storage                  │
│  • RTO: 2 hours | RPO: 1 day                                   │
│                                                                 │
│  GPU SERVER FAILURE:                                            │
│  • Fallback to CPU-only mode (OpenCV still works)              │
│  • Queue AI tasks until GPU restored                           │
│  • Cloud GPU rental as emergency backup (RunPod/Lambda)        │
│  • RTO: 4-24 hours | RPO: 0 (tasks queued)                    │
│                                                                 │
│  MONITORING:                                                    │
│  • Uptime monitoring via Better Uptime                         │
│  • GPU health via nvidia-smi alerts                            │
│  • Database connection pooling via PgBouncer                   │
│  • Alert channels: Slack, Email, SMS                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Shared Infrastructure (Merch From Monorepo)

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | Next.js 16 (App Router) | PWA capabilities |
| **Database** | Neon PostgreSQL (shared) | New tables in existing schema |
| **Auth** | Clerk (shared tenant) | Phone/OTP for evaluators |
| **Storage** | Cloudinary | Image optimization |
| **Payments** | Wise + Mercado Pago + Pix | Regional coverage |

### Database Schema (Additions to Merch From)

```sql
-- Evaluator profile (extends user_profiles)
CREATE TABLE printscore_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  phone VARCHAR(20) UNIQUE NOT NULL,
  country VARCHAR(2) DEFAULT 'BR',
  language VARCHAR(2) DEFAULT 'pt',
  quality_score DECIMAL(3,2) DEFAULT 0.85,
  honeypot_pass_rate DECIMAL(3,2) DEFAULT 1.0,
  total_evaluations INTEGER DEFAULT 0,
  approved_evaluations INTEGER DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  pix_key TEXT,  -- Brazil
  mercadopago_email TEXT,  -- Argentina/LatAm
  wise_email TEXT,  -- International
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'probation', 'suspended', 'banned')),
  suspension_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evaluation submissions
CREATE TABLE printscore_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluator_id UUID REFERENCES printscore_evaluators(id),
  
  -- Photos (Cloudinary URLs)
  artwork_url TEXT NOT NULL,
  print_url TEXT NOT NULL,
  detail_url TEXT,
  
  -- Scores
  master_score INTEGER CHECK (master_score BETWEEN 1 AND 5),
  printability INTEGER CHECK (printability BETWEEN 1 AND 5),
  color_accuracy INTEGER CHECK (color_accuracy BETWEEN 1 AND 5),
  detail_preservation INTEGER CHECK (detail_preservation BETWEEN 1 AND 5),
  commercial_viability INTEGER CHECK (commercial_viability BETWEEN 1 AND 5),
  
  -- Metadata
  job_type TEXT CHECK (job_type IN ('screen', 'dtg', 'dtf', 'hybrid')),
  color_count INTEGER,
  fabric_type TEXT,
  failure_reasons TEXT[],
  notes TEXT,
  
  -- Honeypot tracking
  is_honeypot BOOLEAN DEFAULT FALSE,
  honeypot_type TEXT CHECK (honeypot_type IN ('gold_standard', 'duplicate_check', 'impossible_task')),
  honeypot_passed BOOLEAN,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  audit_tier TEXT,  -- 'automated', 'peer', 'expert'
  audited_by UUID,
  audit_notes TEXT,
  payment_status TEXT DEFAULT 'pending',
  
  -- Data retention
  anonymized_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payout records
CREATE TABLE printscore_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluator_id UUID REFERENCES printscore_evaluators(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  method TEXT CHECK (method IN ('pix', 'mercadopago', 'wise', 'sepa')),
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  reference TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Honeypot library
CREATE TABLE printscore_honeypots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  honeypot_type TEXT NOT NULL CHECK (honeypot_type IN ('gold_standard', 'duplicate_check', 'impossible_task')),
  correct_score DECIMAL(3,2),  -- For gold_standard
  correct_failures TEXT[],  -- Expected failure reasons
  active BOOLEAN DEFAULT TRUE,
  times_used INTEGER DEFAULT 0,
  pass_rate DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI model training data
CREATE TABLE printscore_ai_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID REFERENCES printscore_evaluations(id),
  
  -- Model being trained
  model_name TEXT NOT NULL CHECK (model_name IN ('qwen2.5-vl', 'flux2', 'realesrgan', 'sdxl')),
  model_version TEXT NOT NULL,
  
  -- Training signals
  training_data JSONB NOT NULL,
  success_score DECIMAL(3,2),
  feedback_text TEXT,
  
  -- Model metadata
  hyperparameters JSONB,
  checkpoint_path TEXT,
  performance_metrics JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_evaluations_status ON printscore_evaluations(status);
CREATE INDEX idx_evaluations_evaluator ON printscore_evaluations(evaluator_id);
CREATE INDEX idx_evaluations_created ON printscore_evaluations(created_at DESC);
CREATE INDEX idx_evaluators_country ON printscore_evaluators(country);
CREATE INDEX idx_honeypots_active ON printscore_honeypots(active, honeypot_type);
```

---

## 8. User Experience

### Onboarding (2 Minutes)

1. **Phone verification** (SMS OTP)
2. **Profile setup** (name, country, language, payment method)
3. **Tutorial video** (30 seconds)
4. **First evaluation** (guided with honeypot)

### Evaluation Flow (60 Seconds)

```
HOME → CAPTURE (artwork) → CAPTURE (print) → SCORE (4 sliders) → SUBMIT → DONE
```

### Key Screens

| Screen | Purpose |
|--------|---------|
| **Home** | Stats, earnings, start evaluation |
| **Capture** | Camera interface with guidelines |
| **Score** | 4 slider controls + failure checkboxes |
| **Wallet** | Balance, payout history, request payout |
| **Profile** | Settings, quality score, level |

---

## 9. AI Model Details

### Model 1: Print Quality Assessor

**Primary: Qwen2.5-VL-7B-Instruct**

| Specification | Value |
|---------------|-------|
| **Performance** | ~80% of GPT-4V quality |
| **License** | Qwen License (commercial OK) |
| **VRAM** | 16-20GB (bf16) |
| **Fine-tuning** | LoRA supported |
| **Training Time** | ~4-6 hours for 2,000 examples |
| **Key Benchmarks** | MMMU: 70.2, DocVQA: 96.4, OCRBench: 885 |

**Assessment Prompt Template:**

```
You are an expert screen printing quality assessor with 20+ years of experience.
Evaluate this artwork for screen printing production using these criteria:

SCORING RUBRIC:
1. PRINTABILITY (1-5): How feasible is this design?
   - 5: Ready for production
   - 3: Moderate adjustments needed
   - 1: Requires complete redesign

2. COLOR ACCURACY (1-5): How well will colors reproduce?
   - 5: Exact Pantone match achievable
   - 3: Within ±20% tolerance
   - 1: Outside ±30% tolerance

3. DETAIL PRESERVATION (1-5): Will fine details survive?
   - 5: All details preserved
   - 3: Noticeable detail loss
   - 1: Critical detail loss

4. COMMERCIAL VIABILITY (1-5): Is this production-efficient?
   - 5: Highly efficient, minimal waste
   - 3: Moderately efficient
   - 1: Not commercially viable

OUTPUT JSON FORMAT:
{
  "printability": <1-5>,
  "colorAccuracy": <1-5>,
  "detailPreservation": <1-5>,
  "commercialViability": <1-5>,
  "masterScore": <weighted average>,
  "estimatedColors": <number>,
  "recommendedMethod": "screen|dtg|dtf",
  "warnings": [<list>],
  "suggestions": [<list>]
}
```

**Fallback Model: LLaVA-1.6-Mistral-7B**

| Specification | Value |
|---------------|-------|
| **License** | Apache 2.0 (fully open) |
| **VRAM** | 14-18GB |
| **Performance** | ~65% of GPT-4V |
| **Use Case** | Backup if Qwen licensing changes |

### Model 2: Color Separator

**OpenCV + scikit-learn (algorithmic, no AI needed)**

| Component | Technology | License |
|-----------|------------|---------|
| **Color Detection** | K-means clustering in LAB space | BSD-3 |
| **Pantone Matching** | Delta E 2000 calculation | BSD |
| **Halftone Generation** | Industry-standard angles | MIT |
| **File Export** | Pillow + psd-tools | HPND |

**Key Features:**
- Adaptive K-means for optimal color count
- 15,000+ Pantone library matching
- Moiré prevention via angle assignment
- Print order optimization (light to dark)

### Model 3: Image Enhancer

**Real-ESRGAN x4 + GFPGAN**

| Component | Model | License | VRAM |
|-----------|--------|----------|------|
| **Upscaling** | Real-ESRGAN_x4plus | BSD-3-Clause | 2-4GB |
| **Face Restoration** | GFPGANv1.4 | Apache 2.0 | 2-4GB |

**Enhancement Pipeline:**
1. 4x upscaling with Real-ESRGAN
2. Face enhancement (if detected)
3. Edge sharpening for print
4. Contrast optimization

### Model 4: Design Generator

**FLUX.2-klein-9B (Apache 2.0)**

| Specification | Value |
|---------------|-------|
| **License** | Apache 2.0 (fully commercial) |
| **VRAM** | 12-16GB (bf16) |
| **Resolution** | 1024×1024 native |
| **Text Rendering** | Best in class |
| **Fine-tuning** | LoRA supported |

**LoRA Training for Print Styles:**
- Train on PrintScore high-scoring examples (score >= 4.5)
- 50-200 images per style
- Automatic captioning from metadata
- Rank 16, ~1000 steps

### Model 5: Image Editor

**SDXL Inpainting (Open RAIL++)**

| Specification | Value |
|---------------|-------|
| **License** | Open RAIL++ (commercial allowed) |
| **VRAM** | 8-12GB (fp16) |
| **Use Cases** | Object removal, background extension |
| **Control** | Can combine with ControlNet |

---

## 10. Training Data Requirements

### Minimum Viable Dataset (Go/No-Go Threshold)

| Milestone | Minimum Required | Optimal Target | Decision |
|-----------|-----------------|---------|----------|
| **Pilot Complete** | 500 evaluations | 1,000 | Continue to Beta |
| **Beta Complete** | 2,000 evaluations | 3,000 | Continue to Launch |
| **AI Training Start** | 5,000 evaluations | 10,000 | Begin LoRA fine-tuning |
| **Production Ready** | 15,000 evaluations | 30,000 | Deploy to Merch From |

**Quality Requirements for Training Data:**
- Minimum 90% approval rate in dataset
- Score distribution within target ranges
- Geographic diversity (no single country >60%)
- Print method diversity (screen >50%, but others represented)

### Dataset Composition Targets (Year 1)

```
By Score Distribution:
├── Excellent (4.5-5.0): 15%
├── Good (3.5-4.4): 35%
├── Standard (2.5-3.4): 30%
├── Poor (1.5-2.4): 15%
└── Fail (1.0-1.4): 5%

By Print Method:
├── Screen Print: 60%
├── DTG: 25%
├── DTF: 10%
└── Hybrid: 5%

By Complexity:
├── Simple (1-4 colors): 40%
├── Medium (5-8 colors): 40%
└── Complex (9+ colors): 20%

By Geography:
├── Brazil: 50%
├── Argentina: 15%
├── Portugal: 15%
├── Other Latin America: 10%
└── Other Europe: 10%
```

### Model Training Requirements

| Model | Minimum Examples | Optimal | Update Frequency |
|-------|-----------------|---------|------------------|
| **Assessor (Qwen2.5-VL)** | 5,000 | 15,000+ | Weekly |
| **Separator** | N/A (rule-based) | 500+ feedback | Quarterly |
| **Enhancer** | 50 per style | 200 per style | Per style |
| **Generator (FLUX)** | 50 per style | 200 per style | Per style |
| **Editor (SDXL)** | 100 pairs | 500+ pairs | Monthly |

---

## 11. Launch Phases

### Phase 1: Pilot (Month 1-2)

| Activity | Details |
|----------|---------|
| **Evaluators** | 15-20 Brazilian contacts |
| **Data source** | Blackout historical jobs |
| **Payments** | Manual Pix transfers |
| **Goal** | Validate scoring consistency |
| **Go/No-Go** | 15+ evaluators, 500+ evaluations |

### Phase 2: Beta (Month 3-4)

| Activity | Details |
|----------|---------|
| **Evaluators** | 50 (Brazil + Argentina) |
| **Data source** | Historical + Merch From production |
| **Payments** | Automated via partner company |
| **Goal** | Test payment infrastructure |
| **Go/No-Go** | €30K sponsorship secured, 2,000+ evaluations |

### Phase 3: Launch (Month 5-6)

| Activity | Details |
|----------|---------|
| **Evaluators** | 100+ (Latin America + Portugal) |
| **Data source** | All sources active |
| **Payments** | Full automation |
| **Goal** | Sustainable evaluation volume |
| **Go/No-Go** | 5,000+ evaluations, break-even path visible |

### Phase 4: Scale (Month 7-12)

| Activity | Details |
|----------|---------|
| **Evaluators** | 200+ global |
| **Dataset size** | 30,000+ training examples |
| **AI training** | LoRA fine-tuning initiated |
| **Sponsorships** | Active partnerships |

---

## 12. Success Metrics

### Volume Metrics

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Active evaluators | 50 | 100 | 200+ |
| Evaluations/month | 1,500 | 5,000 | 10,000+ |
| Approval rate | 80%+ | 85%+ | 90%+ |

### Quality Metrics

| Metric | Target |
|--------|--------|
| Expert agreement rate | 90%+ |
| Honeypot pass rate | 95%+ |
| Evaluator retention (30-day) | 80%+ |
| Evaluator retention (90-day) | 70%+ |
| Average quality score | 85%+ |

### Business Metrics

| Metric | Target |
|--------|--------|
| Cost per approved evaluation | <€6 |
| Dataset ML-ready | 100% (Month 6) |
| Model training initiated | Yes (Month 6) |
| Break-even achieved | Month 8-10 |

---

## 13. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|------------|------------|
| Low-quality submissions | Medium | High | Payment-after-audit, quality scoring |
| Evaluator fraud/collusion | Medium | High | Honeypot system (10%), IP tracking, score variance analysis |
| Evaluator churn | Low | Medium | Competitive pay, community building, gamification |
| Payment fraud | Low | Medium | Brazilian partner handles Pix KYC, Mercado Pago verification |
| GDPR violation | Low | High | Strict photo guidelines, metadata stripping, retention policy |
| Slow dataset growth | Medium | High | Seed with historical jobs, Merch From production |
| GPU server failure | Low | Medium | Cloud GPU backup (RunPod), CPU fallback mode |
| Technical Manager unavailable | Medium | High | Document processes, cross-train Victor on critical paths |
| Sponsorship shortfall | Medium | High | Multiple sponsor targets, reduce scope if needed |

---

## 14. Team Structure

| Role | Person | Responsibility | Backup |
|------|--------|----------------|--------|
| **Project Owner** | Victor Bendas | Strategy, expert panel liaison | N/A |
| **Technical Manager** | [Brazil contact - TBD] | Development, operations, Pix payments | Victor (limited) |
| **Expert Panel Lead** | Expert A | Audit coordination, calibration | Expert B |
| **Technical Advisor** | Expert B | Complex technical issues | Expert C |
| **Quality Master** | Expert C | Final quality decisions | Expert |

### Technical Manager Role (Critical)

**Responsibilities:**
- PWA development and maintenance
- API and database operations
- AI model deployment and monitoring
- Payment processing (Pix integration via company)
- Evaluator support (Portuguese/Spanish)
- Bug fixes and feature development

**Requirements:**
- Based in Brazil (for Pix handling)
- Full-stack development experience
- Basic ML/AI understanding
- Portuguese + Spanish language
- Available 20+ hours/week initially

**Risk Mitigation:**
- Document all processes in runbooks
- Cross-train Victor on critical operations
- Identify backup developer for emergencies
- Use managed services where possible

---

## 15. Crowdfunding Integration

### Positioning

PrintScore is mentioned in Merch From crowdfunding as:
> "We're building the world's first expert-scored print quality network—200+ professional printers across Latin America and Europe who evaluate every design. This creates AI training data no competitor can replicate."

### Stretch Goals

| Amount | PrintScore Milestone |
|--------|---------------------|
| €50K | Pilot with 20 evaluators |
| €75K | Beta with 50 evaluators |
| €100K | Launch with 100+ evaluators |

### Backer Narrative

> "Your backing doesn't just fund a platform—it creates sustainable income for print shops in Brazil, Argentina, and Portugal while building the AI that will transform the industry."

---

## 16. Sponsorship Opportunities

### Ink Manufacturers (Magna Colours, etc.)

| Offering | Value to Sponsor |
|----------|------------------|
| Logo in app | Brand visibility to 200+ professional printers |
| Dataset insights | Industry quality benchmarks |
| Early AI access | Competitive advantage |
| Co-marketing | Association with innovation |

### Equipment Manufacturers

| Offering | Value to Sponsor |
|----------|------------------|
| Equipment mentions | "Printed on [Brand]" in evaluations |
| Performance data | Anonymous quality correlations |
| Network access | Direct line to 200+ potential customers |

---

## 17. AI Model Operations

### Model Training Pipeline

```yaml
# Weekly automated training schedule
training_schedule:
  weekly:
    # Monday: Assess new evaluations
    - model: qwen2.5-vl
      data_source: printscore_evaluations
      condition: count > 50
      min_quality_score: 3.0
    
    # Wednesday: Update enhancement model
    - model: realesrgan
      data_source: high_score_evaluations
      condition: score >= 4.5
      min_examples: 100
    
    # Friday: Train new style LoRAs
    - model: flux2
      data_source: categorized_high_scores
      condition: per_category > 50
      lora_rank: 16
  
  monthly:
    # Full model retraining with all data
    - model: all
      full_retrain: true
      validation_split: 0.1
      hyperparameter_search: true
```

### Performance Monitoring

| Metric | Alert Threshold |
|--------|-----------------|
| Response time | >5000ms |
| GPU utilization | >95% |
| Error rate | >1% |
| Accuracy score | <85% |
| Up-to-date % | <90% |

### Model Serving with vLLM/Triton

```yaml
version: '3.8'

services:
  # Model Server with queuing
  model-server:
    image: vllm/vllm-openai:latest
    environment:
      - CUDA_VISIBLE_DEVICES=0
      - MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
      - MAX_MODEL_LEN=4096
      - GPU_MEMORY_UTILIZATION=0.85
    volumes:
      - ./models:/models
      - ./loras:/loras
    ports:
      - "8001:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
  
  # Color Separator (CPU only)
  color-separator:
    build: ./models/color-separator
    environment:
      - PANTONE_DB=/data/pantone.db
    volumes:
      - ./data:/data
    ports:
      - "8002:8002"
  
  # Image Enhancer (lightweight, can coexist)
  enhancer:
    build: ./models/enhancer
    environment:
      - CUDA_VISIBLE_DEVICES=0
      - MODEL_PATH=/models/realesrgan
    volumes:
      - ./models:/models
    ports:
      - "8003:8003"
  
  # Request Queue (for heavy models)
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  # API Gateway with rate limiting
  gateway:
    build: ./gateway
    environment:
      - MODEL_SERVER_URL=http://model-server:8001
      - SEPARATOR_URL=http://color-separator:8002
      - ENHANCER_URL=http://enhancer:8003
      - REDIS_URL=redis://redis:6379
      - MAX_CONCURRENT_REQUESTS=5
    ports:
      - "8000:8000"
    depends_on:
      - model-server
      - color-separator
      - enhancer
      - redis
```

---

## 18. PWA Requirements

| Feature | V1 (MVP) | V2 (Future) |
|---------|----------|-------------|
| Installable | Yes | Yes |
| Offline queue | No | Yes |
| Push notifications | No | Yes |
| Camera access | Yes | Yes |
| Biometric auth | No | Yes |

---

## 19. Gamification (V2 - Post-Launch)

### Level System (Deferred)

| Level | Evaluations | Benefit |
|-------|-------------|---------|
| Apprentice | 0-24 | Standard rate |
| Skilled | 25-74 | +€0.25/eval |
| Practitioner | 75-199 | +€0.50/eval |
| Expert | 200-499 | +€1.00/eval |
| Legend | 500+ | +€1.50/eval |

### Badges (Deferred)

- First evaluation completed
- 7-day streak
- 100 total evaluations
- 95%+ quality score
- Photo quality excellence

---

## 20. Merch From Phase Placement

**Recommended: Phase 8** (Post-Investment, Post-MVP)

```
Phase Timeline:
├── Phase 3 (Current): Frontend Content Suite
├── Phase 4: Neon + Drizzle Integration
├── Phase 5: Clerk Auth Flows
├── Phase 6: Crowdfunding Campaign
├── Phase 7: MVP Launch (10 artists, first orders)
├── Phase 8: AI Training & Quality Network ← PRINTSCORE
└── Phase 9+: Scale & Expansion
```

### Phase Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 8 DEPENDENCIES                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HARD DEPENDENCIES (Must complete before PrintScore):          │
│  • Phase 6: Crowdfunding success (funding secured)             │
│  • Phase 7: MVP Launch (10 artists, first orders)                │
│  • At least 1 sponsor commitment                               │
│  • Technical Manager hired and onboarded                       │
│                                                                 │
│  SOFT DEPENDENCIES (Can run in parallel):                      │
│  • Expert panel contracts signed                               │
│  • GPU server provisioned                                      │
│  • PWA development started                                     │
│  • Honeypot library created                                    │
│                                                                 │
│  OUTPUTS (PrintScore delivers to later phases):                │
│  • Training dataset for Phase 9 AI deployment                  │
│  • Quality benchmarks for production standards                 │
│  • Expert network for ongoing validation                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 8 Timeline

| Month | Activity |
|-------|----------|
| Month 7 | Sponsorship negotiations, pilot planning |
| Month 8 | PrintScore pilot (15-20 evaluators) |
| Month 9 | Beta expansion (50 evaluators) |
| Month 10 | Full launch (100+ evaluators) |
| Month 11-12 | Scale to 200+, AI training begins |

---

## 21. API Integration Example

```python
class PrintScoreAI:
    """Unified AI API for PrintScore processing."""
    
    def __init__(self):
        self.assessor = APIClient("http://model-server:8001")
        self.separator = APIClient("http://color-separator:8002")
        self.enhancer = APIClient("http://enhancer:8003")
        self.queue = RedisQueue("redis://redis:6379")
    
    async def process_submission(
        self, 
        artwork_path: str,
        print_result_path: Optional[str] = None,
        timeout: int = 120  # Max 2 minutes for full pipeline
    ) -> dict:
        """
        Process PrintScore submission through full AI pipeline.
        
        SLA Targets:
        - Quality assessment: <15s
        - Color separation: <10s
        - Enhancement: <30s
        - Total pipeline: <120s
        """
        
        start_time = time.time()
        
        # Step 1: Quality assessment (priority)
        assessment = await self.assessor.analyze_image(
            image_path=artwork_path,
            prompt=ASSESSMENT_PROMPT,
            timeout=15
        )
        
        # Check SLA
        if time.time() - start_time > 15:
            log.warning(f"Assessment exceeded SLA: {time.time() - start_time}s")
        
        # Step 2: Color separation (CPU, fast)
        separation = await self.separator.generate_separations(
            image_path=artwork_path,
            color_count=assessment['estimatedColors'],
            timeout=10
        )
        
        # Step 3: Enhancement if needed (queue if GPU busy)
        enhanced = None
        if assessment['detailPreservation'] < 4:
            enhanced = await self.enhancer.enhance_for_print(
                image_path=artwork_path,
                enhance_faces=assessment.get('hasFaces', False),
                timeout=30
            )
        
        total_time = time.time() - start_time
        if total_time > timeout:
            log.error(f"Pipeline exceeded timeout: {total_time}s")
        
        return {
            'assessment': assessment,
            'separation': separation,
            'enhanced': enhanced,
            'processing_time_ms': int(total_time * 1000)
        }
```

---

## 22. Final Recommendations

### Implementation Priority

1. **Start with Qwen2.5-VL + OpenCV separator + Real-ESRGAN**
   - Covers 90% of use cases
   - Sequential loading on single GPU
   
2. **Add FLUX.2 after 5,000 high-quality examples**
   - Style-specific LoRAs become valuable
   - Consider second GPU at this stage
   
3. **Deploy with Docker + vLLM + Redis queue**
   - Microservices architecture
   - Request queuing for resource management
   
4. **Automated weekly training**
   - Continuous improvement with new data
   - Models get better over time

5. **Focus on fraud prevention from day 1**
   - Honeypot system essential
   - Build trust through fair, consistent audits

### Key Success Factors

- **Payment reliability**: Evaluators must trust they'll be paid
- **Audit fairness**: Clear, consistent rejection criteria
- **Fraud prevention**: Honeypots catch bad actors early
- **Community building**: WhatsApp/Discord groups for evaluators
- **Expert calibration**: Monthly sessions to maintain scoring consistency
- **Sponsor relationships**: Early engagement with ink/equipment brands
- **Technical Manager**: Critical hire - don't launch without one

---

## Related Documents

- **Parent PRD:** Merch From PRD (Section 3: Expert Dataset Curator Panel)
- **Expert Panel:** Expert A, Expert B, Expert C
- **Technical Reference:** ML-Training-Reference.md, Color-Separation-Reference.md
- **GDPR:** Merch From Privacy Policy (extended for PrintScore)

---

**Document Version:** 2.3
**Last Updated:** January 23, 2026
**Owner:** Victor Bendas
**Implementation Team:** [Brazil Technical Manager - TBD]
**AI Architecture:** 100% Open-Source, Self-Hosted
**Evaluation Score:** 8/10
**Response to Evaluation:** All critical gaps addressed except FLUX model (deferred per user)