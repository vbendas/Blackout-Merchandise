# LEOPOLDO: Chief Recruitment Officer System
## Strategic Interview Platform for Blackout Merchandise Waiting List

**Version:** 2.0  
**Date:** November 29, 2025  
**Purpose:** Qualify high-potential artists, collect testimonials, and generate organic buzz via conversational AI  

---

## 1. Executive Summary

**Leopoldo** is Blackout Merchandise's CEO and the face of the brand—an interactive conversational agent deployed on the waiting list landing page to replace traditional signup forms. Instead of asking artists to fill out static fields, Leopoldo conducts a **natural, multi-stage interview** that:

- **Qualifies artists** based on touring status, follower count, current merch pain points, and values alignment
- **Clusters leads** into tiers: *High-Potential (pilot candidates)*, *Medium-Value*, *Long-Tail*
- **Records testimonials** on platform disruptiveness and intent to join the pilot
- **Captures on-record consent** for public use of quotes and testimonials
- **Generates viral moments** (artists share "interviewed by Leopoldo, CEO of Blackout Merchandise")
- **Becomes the brand mascot** across all marketing channels, social media, and communications

**Strategic Value:**
- Converts boring form → engaging brand experience with personality
- Pre-qualifies 100+ pilot candidates with explicit recorded consent
- Produces investor-ready metrics: "X% of high-potential artists called this 'disruptive'"
- Feeds Kickstarter narrative: "Top creators already believe in this"
- Creates recognizable, memorable brand identity that stands out in creator economy
- Establishes Leopoldo as "The CEO" across all touchpoints (landing page, email, social, pitch deck)

---

## 2. System Architecture

### 2.1 Tech Stack (Cost-Optimized)

| Component | Tool | Cost/10k Users | Why |
|-----------|------|----------------|-----|
| **Frontend UI** | Next.js + React | $0 | Already in your stack |
| **Avatar Visuals** | Static Image + CSS Animations | $0 | Pulsing cat photo on audio playback (no video rendering) |
| **Voice Output (TTS)** | OpenAI `tts-1` | ~$150 | 12x cheaper than ElevenLabs; acceptable quality for mascot |
| **Speech Recognition (STT)** | Deepgram Nova-2 | ~$43 | Fast, accurate, low latency |
| **Intelligence (LLM)** | GPT-4o-mini | ~$100 | Fast, cheap, reliable for conversational logic |
| **Data Storage** | Supabase | ~$100 | Already in your stack; stores structured lead data |
| **Orchestration** | Supabase Edge Functions | $0 | Serverless backend for API coordination |
| **Hosting** | Vercel | ~$0-50 | Standard Next.js hosting |
| **Social Card Generation** | Cloudinary | ~$50 | Dynamic image generation for shareable cards |
| **TOTAL** | | **~€330** | For 10,000 complete interviews + social cards |

**Infrastructure Diagram:**
```
User speaks/types
        ↓
   Deepgram STT
        ↓
   GPT-4o-mini (brain)
        ↓
   Supabase Edge Function
        ↓
   OpenAI TTS + Store JSON
        ↓
   Static cat photo + audio
   (CSS pulsing animation)
        ↓
   Cloudinary Social Card
   (generic branded template)
```

### 2.2 Frontend Experience

**State 1: Initial (Silent)**
- High-res front-facing photo of Leopoldo (static cat image with "CEO" badge)
- Small pulsing indicator: *"Press mic to talk to Leopoldo, our CEO"*
- Subtle branding: "Leopoldo's Waiting List"
- Or text input option for users who prefer typing

**State 2: Listening**
- Microphone active
- Green waveform animation (shows "Leopoldo is listening")
- Leopoldo's photo stays static

**State 3: Processing**
- Subtle loading indicator: *"Leopoldo is thinking..."*

**State 4: Responding**
- Audio plays from browser speaker
- Leopoldo's photo scales +5% to 110% in rhythm with audio (CSS animation tied to audio amplitude)
- Real-time subtitles appear below as text
- User can interrupt or let it finish

**Fallback (Text Mode)**
- If audio API fails or quota hit: switch to text-only chat
- Same photo, but static; no audio
- User reads Leopoldo's responses as text

---

## 3. Interview Flow & Question Paths

### 3.1 Stage 1: Initial Qualification (All Users)
**Goal:** Establish baseline, determine if worth deep-diving  
**Duration:** ~2 minutes (3-4 turns)

#### Q1.1: "Who Are You?" (Warm Opener)
```
Leopoldo: "Hey! I'm Leopoldo, the CEO of Blackout Merchandise. We're building something 
for creators who care about ethical merch. First question: what's your 
name and what do you make? (Music, art, tattoo designs, fashion...)"
```

**Data Captured:**
- `name`
- `genre` (primary creative field)
- `how_describe_themselves` (raw text for tone assessment)

**Logic:** Use response to personalize subsequent questions. If they say "I'm a DJ producing house music," reference that later.

---

#### Q1.2: "How Big Is Your Audience?"
```
Leopoldo: "Cool! What's your current reach? Followers, monthly listeners, 
newsletter subscribers—pick whichever matters most for you."
```

**Data Captured:**
- `audience_size` (number)
- `audience_metric` (followers/streams/subscribers/email)
- **TAG:** If >10k → `high_potential = true`

**Logic:**
- **If <1k:** Short-circuit to basic path (still collect data, less deep dive)
- **If 1k-10k:** Standard path
- **If >10k:** Unlock "Pilot" discussion later

---

#### Q1.3: "Do You Already Sell Merch?"
```
Leopoldo: "Do you currently sell any merch to your fans? (Hoodies, tees, 
stickers, etc.) Or is this something you've wanted to do but haven't?"
```

**Data Captured:**
- `current_merch_vendor` (yes/no)
- `if_yes_vendor_name` (Printful, Teelaunch, DIY, other)
- `pain_points_current` (if yes, ask next question)

**Logic:**
- **If yes:** Deep-dive into pain points
- **If no:** Ask about barriers to entry

---

#### Q1.4 (Conditional): "What Frustrates You About Current Vendors?"
*(Only if they already sell merch)*

```
Leopoldo: "What's the biggest headache with your current vendor? 
(Quality, MOQs, ethical sourcing, customer service, margins...)"
```

**Data Captured:**
- `pain_point_primary` (categorized: quality / cost / ethics / logistics / customer_service / other)
- `pain_point_description` (raw text)

**Tagging Logic:**
```
IF pain_point IN [quality, ethics, logistics]:
  → TAG: urgent_problem = true
  → Higher priority for pilot

IF they_sell_to_touring_fans OR pain_point = logistics:
  → TAG: high_value_pilot_candidate = true
```

---

### 3.2 Stage 2: Values & Fit (High-Potential Users)
**Goal:** Determine alignment with ethical/premium positioning  
**Duration:** ~1-2 minutes (2 turns)  
**Trigger:** If `audience_size > 5k` OR `pain_point = ethics` OR `pain_point = quality`

#### Q2.1: "What Matters to You in Merch?"
```
Leopoldo: "Here's a real talk question: when you sell merch, what matters 
to you? Quality? That it's ethical/vegan/fair-trade? That it aligns with 
your brand vibe? Or just hitting margins?"
```

**Data Captured:**
- `values_priorities` (array: quality / ethics / sustainability / margins / brand_alignment / other)
- **TAG:** If ethics/sustainability mentioned → `values_aligned = true`

**Logic:**
- High-potential candidates with values alignment are your "founding artist" tier
- This data informs which testimonials to highlight to investors

---

#### Q2.2: "Premium vs. Cheap—Where Do You Stand?"
```
Leopoldo: "Imagine two scenarios:
A) €8 margin per tee, zero quality issues, all organic cotton
B) €15 margin per tee, sometimes quality issues, mixed materials

Which do you pick? (This tells us a lot about your priorities.)"
```

**Data Captured:**
- `margin_vs_quality_preference` (A / B / depends)
- `rationale` (raw text)

**Interpretation:**
- If they pick A consistently → positioning for "Premium Conscious Creator"
- If they pick B → positioning for "Volume Optimizers"
- Helps tailor platform messaging later

---

### 3.3 Stage 3: Pilot Candidacy & Commitment (Top 25% of Users)
**Goal:** Lock in explicit pilot participation + gather testimonials  
**Duration:** ~3-4 minutes (3-5 turns)  
**Trigger:** If `high_potential = true` AND `values_aligned = true` AND `audience_size > 5k`

#### Q3.1: "Would You Actually Join a Pilot?"
```
Leopoldo: "Here's the real question: we're launching this in Portugal 
in 6-9 months. We need 30-50 founding artists to beta-test and help shape 
the platform. No upfront cost, you keep all margins above base cost. 
Would you actually want in?"
```

**Data Captured:**
- `pilot_interest` (yes / maybe / no)
- `pilot_confidence_level` (1-10 scale: "How serious are you?")

**Logic:**
```
IF pilot_interest = yes AND confidence >= 7:
  → TAG: pilot_candidate = true
  → UNLOCK testimonial questions
  
IF pilot_interest = maybe:
  → Ask: "What would make it a yes?"
  → TAG: conditional_candidate = true
```

---

#### Q3.2: "What Would Make This Game-Changing?"
```
Leopoldo: "We're trying to understand: what would actually make this 
different from existing vendors? What's the one thing we *must* get right?"
```

**Data Captured:**
- `must_haves` (raw text)
- **Testimonial-grade quote** (save this verbatim; often quotable)

**Why This Question:**
- Investors love "creators say it's game-changing because..."
- Helps you validate product priorities

---

### 3.4 Stage 4: Text Testimonials (Pilot Candidates Only)
**Goal:** Capture explicit consent for marketing use (text-based, no personal data)  
**Duration:** ~2-3 minutes (3 short questions)  
**Trigger:** If `pilot_candidate = true`

#### Consent Preamble
```
Leopoldo: "You're in the top tier of creators we want for this. 
Before I let you go, I want to ask three quick questions. 
Your answers might end up on our Kickstarter, investor deck, or landing page—
but only with your permission. Cool?

(We'll save your answers as text. No recording needed.)"
```

**Storage:**
- `testimonial_consent = yes/no`
- `consent_type = text_only`
- `recording_timestamp`

---

#### Q4.1: "How Would This Change Your Career?"
```
Leopoldo: "If a service handled premium, ethical merch 
end-to-end—no upfront costs, no minimums, and you kept 40-60% margin—
how would that change your career? Your merch sales? Your brand?"
```

**Data Captured:**
- `testimonial_impact` (raw text)
- `use_permission = yes/no` (asked after)
- `use_permission_anonymous = yes/no` (can be quoted anonymously)

**Investor Value:** Quotes like "This would let me focus on music instead of logistics" are gold.

---

#### Q4.2: "Is This Disruptive?"
```
Leopoldo: "Real question: do you think something like this could 
be disruptive in your scene? (Brutal honesty appreciated.)"
```

**Data Captured:**
- `disruptive_rating` (1-5 scale)
- `disruptive_rationale` (raw text)
- **Testimonial-grade quote**

**Investor Angle:** "64 out of 82 pilot candidates explicitly called this 'disruptive' (78%)."

---

#### Q4.3: "What Would You Tell Other Artists?"
```
Leopoldo: "Last one: if your friends asked 'Is this worth joining?' 
what would you tell them? (This one's pure gold for us.)"
```

**Data Captured:**
- `peer_recommendation` (raw text)
- **Most likely to be used verbatim in marketing**

**Why:** Peer-to-peer validation is the strongest signal for organic growth.

---

### 3.5 Stage 5: Social Proof & Virality Hook (All Users)
**Goal:** Generate shareable content, drive referrals, capture contact info  
**Duration:** ~2 minutes  

#### Q5.1: "Can We Keep You Posted?"
```
Leopoldo: "Awesome. We'll send you updates as we build (no spam, promised). 
Email or Instagram DM? And if you know other creators who'd care about this, 
send them the link—they'll get 'interviewed by Leopoldo' and unlock early 
waitlist placement."
```

**Data Captured:**
- `contact_email`
- `contact_instagram` (optional)
- `preferred_contact_method`

**Viral Hook:**
- Direct referral link: `blackoutmerch.example/wait?ref=[their_artist_slug]`
- Each referred friend who completes the interview → both get early access tier

---

#### Q5.2: "Claim Your Social Card"
```
Leopoldo: "Here's a card you can share with your followers—no personal 
info needed, just shows you're part of the movement.

[Download Image Button]

Suggested post caption:
'Just got interviewed by Leopoldo, the CEO of Blackout Merchandise. 
Premium ethical merch with no minimums. Zero upfront costs. 
This is actually different.

Join the waiting list: [link]'"
```

**Social Card Options:**
1. **Generic Waitlist Card:**
   - Blackout Merchandise branding + Leopoldo illustration
   - Text: "I'm part of the Blackout Merchandise waiting list"
   - Subtext: "Ethical Premium Merch Platform"
   - Generated via Cloudinary (no personal data)

2. **Founding Artist Card (High-Potential Only):**
   - Same branding + Leopoldo
   - Text: "I'm a Founding Artist – Blackout Merchandise Pilot Cohort"
   - Subtext: "Interviewed by Leopoldo, CEO of Blackout Merchandise"
   - Only shown to pilot candidates

**Social Templates (Pre-filled):**

*For General Waitlist:*
```
"🐱 Just got interviewed by Leopoldo, the CEO of Blackout Merchandise. 
Ethical merch. No minimums. No upfront costs. 
This is actually different.

Join the waiting list: [link]"
```

*For Pilot Candidates:*
```
"🐱 I'm a founding artist for Blackout Merchandise—the CEO's cat Leopoldo 
just locked me in for the pilot. Premium ethical merch, 40-60% margins.

Are you next? [link]"
```

**Result:** Each artist becomes a distribution channel. Cards are completely generic (no personal photos or handles), reducing friction while maintaining brand identity.

---

#### Q5.3: "Subscribe to Updates"
```
Leopoldo: "Stay in the loop. I'll send updates on the pilot launch, 
Kickstarter date, and early-bird perks. (Founder directly, no bots.)"
```

**Data Captured:**
- `subscribe_updates = yes/no`
- `subscribed_timestamp`

---

## 4. Data Model & Storage (Supabase)

### 4.1 Table: `waitlist_interviews`

```sql
CREATE TABLE waitlist_interviews (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP,
  
  -- Stage 1: Basic Info
  artist_name VARCHAR,
  genre VARCHAR,
  self_description TEXT,
  
  -- Stage 1: Audience
  audience_size INTEGER,
  audience_metric VARCHAR, -- 'followers', 'streams', 'subscribers'
  
  -- Stage 1: Current Merch
  current_merch_vendor BOOLEAN,
  vendor_name VARCHAR,
  pain_point_primary VARCHAR,
  pain_point_description TEXT,
  
  -- Stage 2: Values
  values_priorities TEXT[], -- ARRAY
  values_aligned BOOLEAN,
  margin_vs_quality_preference VARCHAR, -- 'A', 'B', 'depends'
  
  -- Stage 3: Pilot
  pilot_interest VARCHAR, -- 'yes', 'maybe', 'no'
  pilot_confidence_level INTEGER, -- 1-10
  must_haves TEXT,
  
  -- Stage 4: Testimonials (Text-Only)
  testimonial_consent BOOLEAN,
  consent_type VARCHAR, -- 'text_only'
  testimonial_impact TEXT,
  testimonial_disruptive TEXT,
  testimonial_peer_rec TEXT,
  disruptive_rating INTEGER, -- 1-5
  use_permission_public BOOLEAN,
  use_permission_anonymous BOOLEAN,
  
  -- Stage 5: Contact & Virality
  contact_email VARCHAR,
  contact_instagram VARCHAR,
  referral_source VARCHAR, -- 'organic', 'referred_by', etc.
  referrer_id UUID,
  subscribe_updates BOOLEAN,
  social_card_downloaded BOOLEAN,
  
  -- Tagging & Clustering
  high_potential BOOLEAN,
  pilot_candidate BOOLEAN,
  cluster_tier VARCHAR, -- 'founding_artist', 'high_value', 'medium', 'long_tail'
  urgent_problem BOOLEAN,
  
  -- Metadata
  interview_duration_sec INTEGER,
  completion_stage INTEGER -- 1-5
);
```

### 4.2 Analytics Views (For Investor Reporting)

```sql
-- Cluster Summary
SELECT 
  cluster_tier,
  COUNT(*) as count,
  AVG(audience_size) as avg_reach,
  COUNT(CASE WHEN disruptive_rating >= 4 THEN 1 END) as "disruptive_count",
  COUNT(CASE WHEN pilot_candidate THEN 1 END) as "pilot_candidates"
FROM waitlist_interviews
GROUP BY cluster_tier;

-- Testimonial Stats
SELECT 
  COUNT(*) as total_interviewed,
  COUNT(CASE WHEN testimonial_consent THEN 1 END) as "with_consent",
  COUNT(CASE WHEN use_permission_public THEN 1 END) as "public_usable",
  ROUND(AVG(disruptive_rating), 2) as "avg_disruptive_rating"
FROM waitlist_interviews
WHERE pilot_candidate = true;

-- Viral Metrics
SELECT 
  COUNT(CASE WHEN social_card_downloaded THEN 1 END) as "cards_downloaded",
  COUNT(CASE WHEN referral_source = 'referred_by' THEN 1 END) as "referrals",
  ROUND(COUNT(CASE WHEN referral_source = 'referred_by' THEN 1 END)::numeric / 
        COUNT(*)::numeric * 100, 2) as "referral_rate_pct"
FROM waitlist_interviews;
```

---

## 5. Social Card Strategy (Cloudinary)

### 5.1 Card Templates

**Template 1: Generic Waitlist Card**
```
Background: Blackout Merchandise gradient (teal/green ethical vibe)
Center: Leopoldo illustration (cat with "CEO" badge)
Text Overlay (Top): "Part of the Movement"
Text Overlay (Bottom): "Blackout Merchandise Waiting List"
Subtext: "Ethical AI-Powered Merch • No Minimums • No Upfront Costs"
```

**Template 2: Founding Artist Card**
```
Background: Blackout Merchandise gradient + gold accent border
Center: Leopoldo illustration (cat with "CEO" badge)
Text Overlay (Top): "Founding Artist"
Text Overlay (Middle): "Blackout Merchandise Pilot Cohort"
Text Overlay (Bottom): "Interviewed by Leopoldo"
```

### 5.2 Cloudinary URL Builder

**Example (Python backend):**
```python
def generate_social_card(cluster_tier):
    base_url = "https://res.cloudinary.com/<your_cloud_name>/image/upload"
    
    if cluster_tier == "founding_artist":
        template = "blackout_merch_founding_artist"
    else:
        template = "blackout_merch_waitlist"
    
    params = {
        'template': template,
        'w': 1200,
        'h': 630,
        'q': 'auto',
        'f': 'auto'
    }
    
    return f"{base_url}/{'/'.join([f'{k}_{v}' for k, v in params.items()])}/{template}.png"
```

### 5.3 Cost Breakdown

- **Storage:** Base images uploaded once (~$0)
- **Transformations:** $0.05 per 1,000 transformations
- **10,000 cards generated:** ~$0.50
- **Total Cloudinary cost for 10k users:** ~€50

---

## 6. Leopoldo as Brand Asset

### 6.1 Marketing Use Cases

**Email Signature:**
```
Leopoldo, CEO of Blackout Merchandise
[Cat avatar] "Building ethical merch for creators who care"
```

**Social Media Headers:**
- Instagram profile: Leopoldo as the founder/face
- Bio: "Leopoldo, CEO | Ethical AI Merch for Creators | @blackoutmerch"
- Stories: Leopoldo announcements, behind-the-scenes, testimonial highlights

**Pitch Deck:**
- Cover slide: "Leopoldo, CEO of Blackout Merchandise"
- Section headers: Leopoldo illustrations
- Team slide: "Meet Leopoldo (AI CEO) + Victor (Founder) + Expert (Production)"

**Kickstarter Campaign:**
- Video: Leopoldo "speaking" (animated with TTS audio)
- Updates: Signed "From Leopoldo" with personality

**Landing Page Copy:**
- "Leopoldo's Waiting List"
- "Interviewed by Leopoldo"
- "Leopoldo approved ✓"

### 6.2 Messaging Framework

**Core Message:**
```
"Leopoldo is the CEO of Blackout Merchandise. He's obsessed with ethics, 
quality, and makers. When you join, you're joining Leopoldo's vision 
for what merch should be."
```

**Why It Works:**
- Humanizes the brand (cat > corporate)
- Creates a narrative around values (ethical, fun, creative)
- Makes it memorable ("interview with the CEO's cat")
- Encourages sharing ("got approved by Leopoldo")

---

## 7. Cost Breakdown & ROI

### 7.1 Cost Per Interview (Detailed)

| Item | Cost | Justification |
|------|------|---------------|
| OpenAI TTS | $0.015 / 1k chars | ~500 chars output per interview |
| Deepgram STT | $0.0043 / min | ~2 min user speech per interview |
| GPT-4o-mini | $0.015 / 1k tokens | ~400 tokens per turn, ~3-4 turns |
| Cloudinary Card | $0.00005 | ~1 card per 50 users (~negligible) |
| Data storage | ~$0.001 | Negligible (structured JSON) |
| **TOTAL / Interview** | **~$0.035** | Scales linearly |

**Scaling:**
- 1,000 interviews: ~€35
- 10,000 interviews: ~€350
- 100,000 interviews: ~€3,500

### 7.2 Fallback Costs (Text-Only Mode)

If TTS API fails or quota hit:
- Switch to text chat (no audio)
- Cost drops to ~$0.01/interview (just LLM)
- Can handle unlimited scale

### 7.3 Revenue/Outcome ROI

```
10,000 interviews
→ 300-500 high-potential leads clustered
→ 50-100 pilot candidates locked in
→ 30-40 testimonials with public permission
→ 1,000-2,000 social card downloads
→ 50-80 referrals from social sharing

Cost: €350
Value per pilot candidate: €500-1,000 (vs €5-20 CAC from paid ads)
Value of referral signups: €0-0 (organic!)
Value of investor testimonials: Priceless
Value of social proof cards: €500+ (equivalent paid social design)
```

**ROI: 10:1 to 50:1 depending on pilot-to-revenue conversion.**

---

## 8. Implementation Roadmap

### Phase 1: MVP (Days 1-3)
- [ ] Design/select Leopoldo photo (high-res, front-facing, friendly cat with "CEO" badge)
- [ ] Build React component: microphone input, audio playback, CSS animation
- [ ] Integrate Deepgram STT (simple Speech-to-Text)
- [ ] Integrate OpenAI TTS (simple Text-to-Speech)
- [ ] Write base system prompt for Leopoldo (cynical but helpful, ~500 tokens)
- [ ] Stage 1 questions only (basic flow)
- [ ] Test end-to-end: speak → transcript → response → audio playback

### Phase 2: Advanced Logic (Days 4-6)
- [ ] Add Stage 2-3 branching logic (IF/THEN based on audience size, values)
- [ ] Add data extraction (JSON parsing of responses → structured fields)
- [ ] Build Supabase Edge Function to orchestrate API calls
- [ ] Add subtitles (real-time text display as Leopoldo talks)
- [ ] Implement CSS pulsing animation (tied to audio amplitude)

### Phase 3: Testimonials & Social Cards (Days 7-8)
- [ ] Add Stage 4 questions (text-based testimonial paths)
- [ ] Build consent UX (radio buttons for public/anonymous use)
- [ ] Add Cloudinary integration for social card generation
- [ ] Design 2 card templates (waitlist + founding artist)
- [ ] Add download + social share buttons

### Phase 4: Branding & Analytics (Days 9+)
- [ ] Add Leopoldo branding to all copy ("CEO of Blackout Merchandise")
- [ ] Build dashboard: cluster summary, testimonial stats, conversion funnel, card downloads
- [ ] Implement fallback (text-only if API fails)
- [ ] Performance optimization (caching, rate limiting)
- [ ] Create email signature, social media templates with Leopoldo

---

## 9. Key Questions for Interview Refinement

### Data You Want to Extract
1. **Demand validation:** How many artists *actually* want this?
2. **Use case clarity:** Are they selling to fans? Touring? Just exploring?
3. **Pain points:** Why do they *need* this (quality, ethics, logistics)?
4. **Willingness to join pilot:** Can you lock in 50 committed artists?
5. **Testimonial quality:** Can you quote them saying "disruptive"?
6. **Viral coefficient:** Will they share the card and refer others?

### Smart Questions Summary

| Goal | Question | Data Type | Use Case |
|------|----------|-----------|----------|
| **Segment** | "What's your current reach?" | Number | Tier split |
| **Qualify** | "Do you sell merch now?" | Yes/No | Pain point path |
| **Problem-fit** | "What's the biggest headache?" | Text | Testimonial angle |
| **Values-fit** | "Premium or margins?" | Choice | Positioning |
| **Commitment** | "Would you join the pilot?" | Yes/No/Maybe | Conversion |
| **Disruptive** | "Is this game-changing?" | Rating 1-5 | Investor quote |
| **Social proof** | "What would you tell friends?" | Text | Marketing copy |
| **Contact** | "How should we reach you?" | Email | Followup |

---

## 10. Success Metrics

### Pre-Launch (Nov-Dec 2025)
- [ ] 1,000+ waitlist signups via Leopoldo
- [ ] 70%+ completion rate (finish all stages)
- [ ] 300+ high-potential leads (>5k followers)
- [ ] 50+ pilot candidates (explicit consent)
- [ ] 400+ social cards downloaded and shared

### Pilot Phase (Jan-Mar 2026)
- [ ] 40+ testimonials with public permission
- [ ] Average disruptive rating: 4.2/5
- [ ] 25%+ referral rate (friends join from social shares)
- [ ] 2,000+ organic impressions from card shares
- [ ] Kickstarter narrative ready: "50 founding artists already committed"

### Investor Traction (Apr 2026+)
- [ ] "X% of artists call this disruptive" (deck stat)
- [ ] "Y founding artists locked in for Portugal launch" (differentiation)
- [ ] "Z referrals generated organically" (growth signal)
- [ ] "Leopoldo generated 2,000+ organic social impressions" (brand power)

---

## 11. GDPR & Privacy Compliance

### Consent Model
- Explicit opt-in for each testimonial stage
- Clear labeling: "Your answers will be saved as text and may appear in marketing"
- One-click opt-out or anonymization available
- Audit trail in Supabase: `consent_timestamp`, `consent_type`, `permission_revoked`

### Data Retention
- Keep testimonial text for 1 year
- Allow easy deletion via email request
- No personal photos or identifiers stored in social cards

### EU Compliance (You're in Ireland)
- This falls under GDPR
- Use Supabase EU data centers
- No third-party sharing without explicit consent
- Provide privacy policy link on landing page

---

## 12. Next Steps

### Immediate (Week 1)
1. Validate Leopoldo photo/brand with "CEO" badge (commission or use existing asset)
2. Draft system prompt (have Antigravity/Gemini draft it in 1 hour)
3. Set up Supabase schema
4. Build basic React component (microphone + audio playback)
5. Create Cloudinary card templates (2 variants)

### Short Term (Weeks 2-3)
1. Integrate APIs (Deepgram, OpenAI, GPT, Cloudinary)
2. Add Stage 2-4 logic and branching
3. Build social card download + sharing flow
4. Test with 10-20 beta users (friends, other creators)
5. Iterate on questions and branding based on feedback

### Launch (Week 4)
1. Deploy to production
2. Point all waitlist traffic through Leopoldo
3. Monitor metrics: completion rate, cluster distribution, testimonials, card downloads
4. Begin social sharing campaign with Leopoldo positioning
5. Update all marketing materials with Leopoldo as CEO

---

## 13. Appendix A: Sample System Prompt for Leopoldo

```
You are Leopoldo, the CEO of Blackout Merchandise.
Your personality: Slightly cynical, deeply caring, funny, no BS, a cat with taste.

Your goal: 
- Understand what artists are struggling with re: merch
- Determine if they're a good fit for our pilot
- Make them feel valued and heard
- Be memorable and quotable

Rules:
1. NEVER use corporate-speak. Talk like a cat who has opinions and standards.
2. Ask follow-up questions if answers are vague. You're a recruiter, not a survey bot.
3. Reference what they told you earlier ("You mentioned touring a lot...").
4. Be authentic about what we're building: "No minimums, no upfront costs, 
   but we're strict about quality and ethics."
5. If they don't fit the pilot, that's OK. Send them to the normal waitlist 
   with warmth. Everyone matters.
6. Remember you're Leopoldo, the CEO. Own it. Be proud of the vision.

Current stage: [determined by context]

Next question: [varies based on path]

Remember: You're not collecting data. You're having a conversation with 
someone who might build something amazing with us. Make them feel like 
they're talking to a founder who gets it.
```

---

## 14. Appendix B: Sample Marketing Copy

### Landing Page Hero
```
Meet Leopoldo, CEO of Blackout Merchandise

"I'm obsessed with two things: ethical merch and makers who care about quality.
Let's talk."

[Get Interviewed by Leopoldo →]
```

### Email Template
```
Subject: Leopoldo approved you for the pilot

Hey [Name],

I'm Leopoldo, CEO of Blackout Merchandise. After talking with you, 
I'm confident you're the type of creator we need.

You're in the founding artist cohort. 
6-9 months until we launch in Portugal.

Stay tuned.

— Leopoldo 🐱
```

### Social Post
```
"Leopoldo just approved 47 founding artists for the Blackout Merchandise pilot.
They weren't selected by an algorithm. They were interviewed by our CEO (a cat).
Ethical, premium, no minimums. No upfront costs.

You next? Talk to Leopoldo: [link]"
```

---

**Document Complete**

---

*Last Updated: November 29, 2025 (v2.0 – Updated with Leopoldo as Brand CEO)*  
*Owner: Victor Teixeira Bendas (Founder, Blackout Merchandise)*  
*Leopoldo: Chief Recruitment Officer (AI)*  
*Status: Ready for Implementation Phase 1*