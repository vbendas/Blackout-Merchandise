# Image Generation Architecture

> **Version**: 2.2
> **Last Updated**: October 18, 2026
> **Status**: Active — replaces the LoRA-first v1.x architecture
> **Vendor**: fal.ai (single API key, commercial license included)
> **Strategy**: Reference-guided generation on off-the-shelf frontier models (Nano Banana 2 primary, Seedream 5.0 Pro fallback). The LoRA-first plan was retired on 2026-08-24; no model training or fine-tuning is planned — see [Section 7](#7-retired-lora-plan-historical-note).

---

## Table of Contents

1. [Overview](#1-overview)
2. [fal.ai Endpoint Map](#2-falai-endpoint-map)
3. [Generation Pipeline](#3-generation-pipeline)
4. [Edit Loop](#4-edit-loop)
5. [Post-Processing Pipeline (Sharp)](#5-post-processing-pipeline-sharp)
6. [The Style System — Style Capsules](#6-the-style-system--style-capsules)
7. [Retired LoRA Plan (Historical Note)](#7-retired-lora-plan-historical-note)
8. [Cost Projections](#8-cost-projections)
9. [Database Schema](#9-database-schema)
10. [API Integration](#10-api-integration)
11. [Architecture Decisions](#11-architecture-decisions)
12. [Evidence Appendix — Aug 24, 2026 Pivot](#12-evidence-appendix--aug-24-2026-pivot)

---

## 1. Overview

### Why This Pivot

The v1.x architecture bet on custom-trained style LoRAs (FLUX.2 dev + `flux-2-trainer`) as the core style mechanism. The first trained LoRA (`american-traditional-v1`, 30 images, $6.40, `fal-ai/flux-2-trainer`) produced deformed, unusable output. The failure is dataset-limited, but head-to-head testing on Aug 24, 2026 surfaced a deeper structural issue: **canonical styles are already well-represented in frontier model weights, so a LoRA adds the least value exactly where the style is famous** (American Traditional tattoo flash being a well-documented public style). See [Section 12](#12-evidence-appendix--aug-24-2026-pivot) for full evidence.

The winning pattern instead: **prompt + one curated style reference image, fed to a frontier model's image-to-image/edit endpoint**. This produced production-ready results where both raw text-to-image and LoRA generation failed.

### Why fal.ai (Still)

| Factor | Decision |
|--------|----------|
| **Single Vendor** | One API key covers Nano Banana 2, Seedream 5.0 Pro fallback, background removal — ADR-001 holds |
| **Reference-Guided Generation** | Both NB2 and Seedream accept multiple reference images natively (14 and 10 respectively) |
| **Commercial License** | Included in API pricing — no separate licensing needed |
| **Native 4K Output** | NB2 renders at print resolution directly — no upscaler dependency in the critical path |

### What This Replaces

- **v1.x LoRA-first strategy** — `flux-2-trainer` + `flux-2/lora` + `flux-2/lora/edit` are retired and not used (see [Section 7](#7-retired-lora-plan-historical-note))
- **`clarity-upscaler` as a required pipeline step** — NB2's native 4K output makes it optional, beyond-4K-edge-case only
- **Ideogram as a candidate typography path** — dropped; NB2 handles in-image text well enough to reverse ADR-005

### Print Resolution Requirements

| Print Size | Resolution at 300 DPI | Notes |
|------------|----------------------|-------|
| 4×4" (chest logo) | 1200×1200 | Within NB2 native 1K-2K range |
| 12×16" (full back) | 3600×4800 (17.3MP) | Within NB2 native 4K output (4096×4096, 16.8MP) for most layouts |
| NB2 native max | 4096×4096 (4K, ~16.8MP) | No upscale step needed for the vast majority of print sizes |
| Beyond-4K edge case | `clarity-upscaler`, optional | Rare — oversized posters/banners only |

---

## 2. fal.ai Endpoint Map

### Production Endpoints

| Endpoint | Purpose | Cost | Resolution | Notes |
|----------|---------|------|------------|-------|
| `fal-ai/nano-banana-2` | Text-to-image generation | $0.08/image at 1K; 0.75x at 0.5K ($0.06); 1.5x at 2K ($0.12); 2x at 4K ($0.16) | Up to native 4K | Reference-free text-to-image only (no `image_urls` field) — used for quick drafts; capsule-guided generation goes through `/edit`. Verified Aug 24, 2026 |
| `fal-ai/nano-banana-2/edit` | Image-to-image, editing, reference-guided composition | Same pricing tier as above | Up to native 4K | Primary editing endpoint; accepts up to 14 reference images per request; invisible SynthID watermark, no visible watermark (confirmed in testing) |
| `bytedance/seedream/v5/pro/text-to-image` | Fallback text-to-image | Comparable tier pricing | Up to 2048×2048 | Fallback generation — same key, same reference-guided pattern |
| `bytedance/seedream/v5/pro/edit` | Fallback image-to-image / editing | First input image free; +$0.0045/additional input image; output $0.0675+ (≤1536×1536), $0.135+ (up to 2048×2048) | Up to 2048×2048 | Fallback editing; accepts up to 10 reference images; region-precise editing |
| `fal-ai/ideogram/remove-background` | Background removal | $0.01/image (flat) | Original size | Production-validated Aug 24, 2026: 30/30 clean cutouts |
| `fal-ai/clarity-upscaler` | Upscale beyond native 4K | $0.03/MP | 4096×4096+ | **Optional** — only invoked when a print size exceeds NB2's native 4K output |
| `fal-ai/flux-2` | Cheap preview/thumbnail tier | $0.012/MP (dev tier) | Up to 2048×2048 | Optional — fast/cheap preview renders; may be dropped at launch, not in the critical generation path |

The v1.x LoRA endpoints (`flux-2-trainer`, `flux-2/lora`, `flux-2/lora/edit`) were retired with the LoRA-first plan on 2026-08-24 and are not part of the pipeline.

### Smart Model Routing

```
User Request
    │
    ├─ "Generate new design" ──────→ nano-banana-2/edit (capsule: prompt template + anchor reference as image_urls[0])
    │       │                          (plain nano-banana-2 accepts no reference images — used only for reference-free drafts)
    │       │
    │       └─ fal outage / NB2 unavailable ──→ seedream/v5/pro/text-to-image (same capsule)
    │
    ├─ "Edit this design" ─────────→ nano-banana-2/edit (re-anchored to base image, see §4)
    │       │
    │       └─ fal outage / NB2 unavailable ──→ seedream/v5/pro/edit
    │
    ├─ "Make print-ready" ─────────→ remove-background → Sharp post-processing (native 4K render skips upscaler)
    │       │
    │       └─ print size exceeds native 4K ──→ clarity-upscaler (optional edge case)
    │
    └─ "Extract style attributes" ─→ OpenRouter (Claude Sonnet 5, fallback Gemini 3.7 Flash) → styles registry
```

---

## 3. Generation Pipeline

### Full Design Lifecycle

```
Phase 1: GENERATION
  Artist selects a style card (Francisca) → system resolves the Style Capsule:
    prompt template (macro) + micro instructions (shared attributes across picks) + ONE anchor reference image
  → fal-ai/nano-banana-2/edit generates the initial design (anchor reference in image_urls — the plain
    text-to-image endpoint takes no references, so capsule-guided generation always uses /edit)
  → Sharp auto-sharpen + contrast boost
  → Store intermediate in design session

Phase 2: ITERATION (repeats 2-10 times)
  Artist requests changes: "Make it darker", "Add roses", "Change font"
  → fal-ai/nano-banana-2/edit, re-anchored to the ORIGINAL base image with accumulated instructions (default — see §4)
  → Sharp auto-sharpen after each edit round
  → Store all intermediates

Phase 3: FINALIZATION (before approval)
  → fal-ai/ideogram/remove-background (if needed)
  → Final render at native 4K (nano-banana-2, 4K tier) for generated or edited designs. Drafts stay at 1K.
    Uploaded art is used as it is.
  → (edge case) clarity-upscaler if print size exceeds 4K
  → Sharp final sharpen + colour correction
  → Artist approves design

After approval: deterministic steps only
  → No regenerative model runs after approval: no NB2 re-render, no upscaler, no background removal.
    A regeneration can change details the client has already approved.
  → Print prep (colour separations, halftones, traps, production files) is deterministic.
    See `Documentation/Dev/Print-Prep-Plan.md`, sections 3 and 4.

Phase 4: MOCKUP
  → Cloudinary composites design onto garment photo
  → Artist previews on storefront
```

### Generation Parameters

```typescript
interface GenerationRequest {
  prompt: string;                    // Artist's description
  styleCapsuleId?: string;           // Resolves to prompt template + anchor reference image
  referenceImageUrls?: string[];     // Content refs (logos, mascots, sketches) — attached literally, never distilled
  width: number;                     // Default: 1024
  height: number;                    // Default: 1024 (up to native 4096 for final render)
  resolutionTier: '0.5K' | '1K' | '2K' | '4K'; // Drives cost multiplier — see §8
  negativePrompt?: string;           // Things to avoid
  seed?: number;                     // For reproducibility
}
```

---

## 4. Edit Loop

### The Core Workflow

`fal-ai/nano-banana-2/edit` is the primary interaction artists have with Francisca after initial generation. It takes an image + text instruction (+ optional reference images) and produces an edited version.

### Re-Anchoring Default (Aug 24, 2026)

**Default strategy: re-anchor every edit to the ORIGINAL base image with accumulated instructions**, rather than chaining edit-on-edit. The Aug 24, 2026 prototype (v1.4's LoRA-aware edit test) proved that degradation over multi-round edit chains comes from **sequential re-encoding noise**, not style drift — the subject illustration stayed crisp through 6 rounds in both tested arms, while surrounding texture decayed from repeatedly re-encoding the previous round's output. Re-anchoring to the base image with the full accumulated instruction set avoids that noise source entirely. This makes ADR-004's branching-on-degradation the **always-on default** rather than a fallback triggered by detected quality loss (ADR-004 amended — see §11).

```
Round 1: Generate → base.png (stored, never overwritten)

Round 2: "Make the skull bigger"
  Input: base.png + "Make the skull bigger" → design_v2.png

Round 3: "Add roses around the skull, make it darker"
  Input: base.png + "Make the skull bigger. Add roses around the skull, make it darker." → design_v3.png
    (accumulated instruction set, re-anchored to base.png — NOT chained from design_v2.png)

Round N: Same pattern — base.png + full accumulated instruction history → design_vN.png
```

### Limitations & Mitigations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **No strength control** | Every edit re-renders the full image | Smart prompting; accumulated-instruction re-anchoring (default) |
| **No mask/inpainting** | Cannot edit specific regions only | Use descriptive spatial prompts ("top-left area") |
| **Re-encoding noise on chained edits** | Compounds if edits are chained sequentially | Re-anchor to base image by default (see above) — chaining is no longer the default path |
| **Subject leakage from style reference** | Anchor reference can bleed subject/composition into output | Prefer an anchor whose subject differs from the request; always inject "use the reference image for style only, not subject or composition" |

### Edit Model Selection

```typescript
// Single-tier NB2 edit — no fast/max split, ~$0.08/round at 1K.
// Fallback flips to Seedream on the same reference-guided pattern if NB2 is unavailable.
function selectEditModel(): string {
  return 'fal-ai/nano-banana-2/edit';
}
```

---

## 5. Post-Processing Pipeline (Sharp)

### Why Sharp

- **Free** — no API costs (runs server-side on Node.js)
- **Deterministic** — same input always produces same output
- **Fast** — sub-second for most operations
- **Print-critical** — AI generation produces slightly soft images that need sharpening for screen printing

### Post-Processing Steps

| Step | When | Purpose |
|------|------|---------|
| **Auto-sharpen** | After EVERY AI edit round | Counteract AI softening |
| **Contrast boost** | After generation | Improve print contrast |
| **Exposure adjustment** | After generation | Normalize brightness |
| **Color correction** | Optional, artist-requested | Match specific Pantone colors |
| **Typography overlay** | If artist provides logo (content ref, exact placement) | Programmatic text/logo rendering — the exact-placement path for pixel-perfect logos, distinct from NB2's in-image generated typography (ADR-005 reversed, see §11) |
| **Final sharpen** | After finalization render (or optional upscale) | Ensure crisp edges at print resolution |

### Sharp Processing Function

```typescript
import sharp from 'sharp';

interface PostProcessOptions {
  sharpen?: boolean;        // Default: true
  contrast?: number;        // -1 to 1, default: 0.2
  brightness?: number;      // -1 to 1, default: 0
  normalize?: boolean;      // Default: true
}

async function postProcessImage(
  inputBuffer: Buffer,
  options: PostProcessOptions = {}
): Promise<Buffer> {
  const { sharpen = true, contrast = 0.2, normalize = true } = options;

  let pipeline = sharp(inputBuffer);

  if (normalize) pipeline = pipeline.normalize();
  if (sharpen) pipeline = pipeline.sharpen({ sigma: 1.5, m1: 1.0, m2: 0.5 });
  if (contrast !== 0) pipeline = pipeline.linear(1 + contrast, -(128 * contrast));

  return pipeline.png({ quality: 100 }).toBuffer();
}
```

---

## 6. The Style System — Style Capsules

Style Capsules are the style mechanism, replacing the retired LoRA catalog (see [Section 7](#7-retired-lora-plan-historical-note)).

Style Capsules replace the LoRA catalog as the mechanism for consistent, on-brand generation. A style gallery card (what the artist clicks) maps to a **prompt template** (macro style instructions) plus a **curated library of reference images**. Model names and reference images are never surfaced to the artist — the whole mechanism is backend-only.

### Netflix-Style Pick-Grid Personalization

On first use of a style, the artist optionally picks favorites from a grid of exemplar images from that style's reference library (skippable — falls back to curated defaults). The picks are stored once per user per style and act as a taste signal for capsule synthesis.

### Attribute Extraction

Every reference image (library and user-uploaded) is analyzed into structured JSON per the schema at `data/LoRAs/style-extraction/schema.md` — closed enums for `linework`, `palette`, `shading`, `composition`, `era_flavor`, etc., plus a free-text `signature_details` field for micro-features a style-injection prompt should reproduce.

**Extraction model: Claude Sonnet 5 via OpenRouter.** Chosen in an Aug 24, 2026 bake-off against Gemini 3.7 Flash across all 30 American Traditional library images:

| Metric | Result |
|--------|--------|
| Enum agreement — objective fields | High: 29-30/30 |
| Enum agreement — ambiguous fields (palette, shading, era_flavor) | Divergent: 17-18/30 |
| `signature_details` quality | Sonnet 5 clearly richer |
| Real undiscounted cost per image | Sonnet 5 $0.0119 vs Gemini 3.7 Flash $0.0089 (1.33x) |

Quality edge judged worth the 1.33x premium given tiny extraction volumes (one-time library pass + per-upload). **Gemini 3.7 Flash is the configured fallback extractor.** Schema enums are flagged for tightening with visual anchor descriptions — a known follow-up, not blocking.

### Capsule Synthesis

When an artist requests a generation:

1. Resolve the artist's picks for the selected style (or curated defaults if skipped)
2. **Macro instructions** — from the style's prompt template
3. **Micro instructions** — attributes shared across the picked images, sourced from their extraction JSONs
4. **One anchor image** — the picked image nearest the centroid of the picks (embedding-based selection), attached to the NB2 API call

**Subject-leakage guard**: prefer an anchor whose subject differs from the artist's current request, and always inject "use the reference image for style only, not subject or composition" into the prompt.

### Two Reference Lanes

| Lane | Examples | Handling |
|------|----------|----------|
| **Style refs** | Curated library images, user's own style uploads | Distilled into the capsule (macro + micro instructions) + one anchor image — never attached literally beyond the single anchor |
| **Content refs** | Logos, mascots, sketches the artist provides | Attached literally to the API call, never distilled; Sharp overlay remains the exact-placement path for pixel-perfect logo compositing |

### User Uploads — Artist Visual Identity

Artists can upload their own work as style references, running the same pipeline: extract attributes → synthesize a capsule → select the most representative upload as anchor.

**Guardrails**:
- Upload rights attestation checkbox at upload time
- ToS places responsibility on the uploader
- Order-time content check for trademarked characters/logos (physical-goods liability)
- Francisca coaches artists away from photos of tattoos on skin as style references — wrong medium; flat artwork only

### Persistence & Portability

Capsules are persisted and versioned per user per style. This gives:
- **Collection consistency** — same capsule + anchor reused across a merch drop
- **Model portability** — capsules (prompt template + attribute JSON + anchor selection) survive underlying model migrations. Trained model weights never could, which is one reason the project relies on capsules and hosted models instead of training its own.

---

## 7. Retired LoRA Plan (Historical Note)

The v1.x plan relied on custom-trained style LoRAs for the original 6-style catalog (American Traditional, Japanese, Blackwork, Vintage 90's, Realism, Dark Art). One experiment in August 2026 (`american-traditional-v1` and a white-background variant, $12.80 total) produced unusable output, and reference-guided generation on hosted frontier models outperformed it (see §12). The LoRA plan was **retired on 2026-08-24**. No model training or fine-tuning is planned; all image generation runs through hosted APIs (fal.ai: Nano Banana 2 primary, Seedream 5.0 Pro fallback).

The curated 30-image American Traditional image set and its per-image extraction JSONs (`data/LoRAs/style-extraction/`, a local data directory named before the pivot) are used only as the **style reference library for the American Traditional Style Capsule**.

---

## 8. Cost Projections

### Per-Design Cost Breakdown

| Step | Model | Cost | Notes |
|------|-------|------|-------|
| **Generation** | nano-banana-2 | $0.08 | 1K tier, capsule anchor + prompt |
| **Edit rounds (avg 4)** | nano-banana-2/edit × 4 | $0.32 | 4 rounds × $0.08, re-anchored to base each round |
| **Final render** | nano-banana-2 (native 4K) | $0.16 | 4K tier, print-ready — no separate upscale step in the common path |
| **Background removal** | remove-background | $0.01 | Flat, ~80% of designs |
| **Post-processing** | Sharp | $0.00 | Free, server-side |
| **Total per design** | | **~$0.57** | |

### Monthly Cost Scenarios

| Scale | Artists | Designs/Month | Edits/Design | Monthly Cost | Cost/Artist |
|-------|---------|---------------|-------------|-------------|-------------|
| **Launch** | 10 | 100 | 4 | ~$57 | $5.70 |
| **Early** | 50 | 500 | 4 | ~$285 | $5.70 |
| **Growth** | 100 | 1,000 | 4 | ~$570 | $5.70 |
| **Scale** | 500 | 5,000 | 4 | ~$2,850 | $5.70 |
| **Mass** | 1,000 | 10,000 | 4 | ~$5,700 | $5.70 |

### Attribute Extraction Costs

| Item | Cost | Notes |
|------|------|-------|
| One-time library pass (30 images, American Traditional) | ~$0.36 | 30 × $0.0119 (Sonnet 5) |
| Per user upload (Artist Visual Identity) | ~$0.012 | Sonnet 5, negligible at expected upload volumes |

### Cost Comparison

| Approach | Cost (500 artists, 5K designs/month) |
|----------|--------------------------------------|
| **NB2 reference-guided (this plan)** | ~$2,850/month |
| **v1.x LoRA-first plan (superseded)** | ~$1,500/month projected, but produced unusable output in testing — cost is moot if quality fails |
| **Manual design work** | €45/design = €225,000/month |

**ROI**: $2,850/month AI replaces €225,000/month manual labor = **~98.7% cost reduction**. The higher per-design cost than the superseded LoRA plan reflects paying for a pipeline that actually produces production-ready output — the LoRA plan's lower projected cost was never realized in practice.

---

## 9. Database Schema

### design_sessions Table

```typescript
// In src/db/schema.ts
export const designSessions = pgTable('design_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  artistId: uuid('artist_id').references(() => users.id),

  // Session metadata
  status: text('status').default('active').notNull(), // active, approved, archived
  styleId: uuid('style_id').references(() => styles.id),

  // Design data
  currentImageUrl: text('current_image_url'),       // Latest version Cloudinary URL
  baseImageUrl: text('base_image_url'),              // Original generation — the re-anchor target (§4)
  approvedImageUrl: text('approved_image_url'),      // Final approved version

  // Generation metadata
  editRound: integer('edit_round').default(0).notNull(),
  totalEdits: integer('total_edits').default(0).notNull(),

  // Prompt history — instructions accumulate; each edit round re-anchors to baseImageUrl
  prompts: jsonb('prompts').$type<{
    generation: string;           // Original generation prompt
    edits: Array<{
      round: number;
      instruction: string;
      accumulatedInstructions: string; // Full instruction history re-sent with base image
      model: string;              // nano-banana-2/edit or fallback seedream/v5/pro/edit
      imageUrl: string;           // Output Cloudinary URL
      timestamp: string;
    }>;
  }>().notNull().default({ generation: '', edits: [] }),

  // Cost tracking
  totalCostCents: integer('total_cost_cents').default(0).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### styles Table

Replaces `lora_styles`. Drops training-specific columns (`falModel` as a training target, `trainingSteps`, `trainingCost`); adds capsule-relevant fields.

```typescript
export const styles = pgTable('styles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name').notNull(),
  slug: text('slug').notNull().unique(),
  model: text('model').default('nano-banana-2').notNull(),   // Active generation model for this style
  promptTemplate: text('prompt_template').notNull(),          // Macro style instructions
  description: text('description').notNull(),
  bestFor: text('best_for').notNull(),
  referenceImages: jsonb('reference_images').$type<Array<{
    url: string;                  // Cloudinary URL
    extractionJsonPath: string;   // Pointer to attribute extraction JSON (data/LoRAs/style-extraction/...)
  }>>().notNull(),
  anchorSelectionMeta: jsonb('anchor_selection_meta').$type<{
    method: 'embedding-centroid';
    defaultAnchorImageUrl: string; // Used when the artist skips the pick-grid
  }>(),
  active: boolean('active').default(true).notNull(),
  version: text('version').default('v1').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### style_preferences Table (New — Pick-Grid Persistence)

```typescript
export const stylePreferences = pgTable('style_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  styleId: uuid('style_id').references(() => styles.id).notNull(),
  pickedImageIds: jsonb('picked_image_ids').$type<string[]>().notNull(), // From styles.referenceImages
  capsuleJson: jsonb('capsule_json').$type<{
    macroInstructions: string;
    microInstructions: string;      // Synthesized from shared attributes across picks
    anchorImageUrl: string;         // Centroid-nearest pick
  }>().notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 10. API Integration

### fal.ai Client Setup

```typescript
// app/src/lib/ai/falClient.ts
import { createFalClient } from '@fal-ai/client';

export const falClient = createFalClient({
  credentials: process.env.FAL_API_KEY!,
});

// Endpoint constants — verified live against fal.ai docs Aug 24, 2026
export const FAL_ENDPOINTS = {
  GENERATE: 'fal-ai/nano-banana-2',
  EDIT: 'fal-ai/nano-banana-2/edit',
  FALLBACK_GENERATE: 'bytedance/seedream/v5/pro/text-to-image',
  FALLBACK_EDIT: 'bytedance/seedream/v5/pro/edit',
  REMOVE_BACKGROUND: 'fal-ai/ideogram/remove-background',
  UPSCALER: 'fal-ai/clarity-upscaler',           // Optional — beyond-4K edge case only
  FLUX2_DEV_PREVIEW: 'fal-ai/flux-2',            // Optional — cheap preview/thumbnail tier
} as const;
```

This block mirrors the current `app/src/lib/ai/falClient.ts`.

### Generate Design API Route

```typescript
// app/src/app/api/generate-design/route.ts
import { falClient, FAL_ENDPOINTS } from '@/lib/ai/falClient';
import { postProcessImage } from '@/lib/image/postProcess';
import { resolveStyleCapsule } from '@/lib/ai/styleCapsule';

export async function POST(req: Request) {
  const { prompt, styleId, userId, resolutionTier = '1K' } = await req.json();

  // Resolve the artist's Style Capsule: macro + micro instructions + one anchor image
  const capsule = await resolveStyleCapsule({ styleId, userId });

  const fullPrompt = [capsule.macroInstructions, capsule.microInstructions, prompt].join('. ');

  // Generate with fal.ai. NB2's plain text-to-image endpoint takes no reference images, so a
  // capsule-anchored generation routes through the /edit endpoint (composition) even for a
  // "first" generation — reference-guided is only available with an input image attached.
  const result = await falClient.run(FAL_ENDPOINTS.EDIT, {
    input: {
      prompt: `${fullPrompt}. Use the reference image for style only, not subject or composition.`,
      image_urls: [capsule.anchorImageUrl],
      resolution: resolutionTier,
    },
  });

  // Post-process with Sharp
  const response = await fetch(result.images[0].url);
  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const processedBuffer = await postProcessImage(rawBuffer, {
    sharpen: true,
    contrast: 0.2,
    normalize: true,
  });

  // Upload to Cloudinary (or return buffer)
  // ...

  return Response.json({
    imageUrl: result.images[0].url,
    seed: result.seed,
    cost: 0.08, // $0.08 at 1K tier
  });
}
```

### Edit Design API Route

```typescript
// app/src/app/api/edit-design/route.ts
import { falClient, FAL_ENDPOINTS } from '@/lib/ai/falClient';
import { postProcessImage } from '@/lib/image/postProcess';

export async function POST(req: Request) {
  const { baseImageUrl, accumulatedInstructions, editRound = 1 } = await req.json();

  // Re-anchor to the ORIGINAL base image every round — default strategy since Aug 24, 2026
  // (degradation on chained edits traced to sequential re-encoding noise, not style drift; see §4)
  const result = await falClient.run(FAL_ENDPOINTS.EDIT, {
    input: {
      image_urls: [baseImageUrl],
      prompt: accumulatedInstructions,
    },
  });

  // Post-process
  const response = await fetch(result.images[0].url);
  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const processedBuffer = await postProcessImage(rawBuffer);

  // Upload to Cloudinary
  // ...

  return Response.json({
    imageUrl: result.images[0].url,
    editRound: editRound + 1,
    model: 'nano-banana-2/edit',
    cost: 0.08, // Single-tier, all rounds
  });
}
```

### Finalize Design API Route (before approval)

```typescript
// app/src/app/api/finalize-design/route.ts
import { falClient, FAL_ENDPOINTS } from '@/lib/ai/falClient';

export async function POST(req: Request) {
  // Runs before approval. Approval only records the returned image as the approved version.
  const { imageUrl, needsUpscale = false } = await req.json();

  // Remove background first (most designs need this)
  const bgRemoved = await falClient.run(FAL_ENDPOINTS.REMOVE_BACKGROUND, {
    input: { image_url: imageUrl },
  });

  // Re-render at native 4K — print-ready without an upscale step in the common path
  const finalRender = await falClient.run(FAL_ENDPOINTS.EDIT, {
    input: { image_urls: [bgRemoved.images[0].url], prompt: 'upscale to native resolution, preserve exact composition and detail', resolution: '4K' },
  });

  // Edge case only: print size exceeds native 4K
  const output = needsUpscale
    ? await falClient.run(FAL_ENDPOINTS.UPSCALER, {
        input: { image_url: finalRender.images[0].url, upscale_factor: 2 },
      })
    : finalRender;

  return Response.json({
    imageUrl: output.images[0].url,
    finalSize: needsUpscale ? '8192×8192 (upscaled)' : '4096×4096 (native)',
    cost: 0.01 + 0.16 + (needsUpscale ? 0.03 * 67 : 0), // bg removal + native 4K render + optional upscale
  });
}
```

---

## 11. Architecture Decisions

### ADR-001: fal.ai as Single Image Vendor

**Status**: Accepted
**Date**: May 13, 2026 (updated Aug 24, 2026)
**Context**: Needed a single provider for generation, editing, and background removal.
**Decision**: Use fal.ai exclusively for all image operations. Primary model Nano Banana 2, fallback Seedream 5.0 Pro — both routed through the same fal API key.
**Consequences**:
- (+) One API key, one bill, one integration
- (+) Reference-guided generation + editing in the same ecosystem
- (+) Fallback (Seedream) uses the identical reference-guided pattern — no separate integration work if NB2 is unavailable
- (-) Vendor lock-in for image pipeline
- (-) If fal.ai itself goes down (not just one model), both primary and fallback are unavailable

**Historical record**: The v1.x BFL klein warm-standby investigation (fal-trained FLUX.2 dev LoRAs are architecturally incompatible with BFL klein finetune endpoints) is retained as historical context but is no longer relevant — the pivot away from LoRA-first generation makes that mitigation moot. BFL text generation stays noted here purely as a historical record of prior evaluation, not as an active fallback path.

### ADR-002: Kontext Pro → Max Auto-Escalation

**Status**: Superseded
**Date**: May 13, 2026 (superseded Aug 24, 2026)
**Context**: Originally proposed a fast/max tier split for iterative editing.
**Superseded by**: There is no tier split. Single-tier `nano-banana-2/edit`, ~$0.08/round, used for all rounds, with re-anchor-to-base as the default strategy (see ADR-004 amendment below). This was already invalidated under the v1.x FLUX.2 architecture (no Kontext branding, no fast/max split at the dev tier) and remains invalidated under NB2 — no tier split exists in the current pipeline at all.

### ADR-003: Sharp Over Cloudinary for Post-Processing

**Status**: Accepted
**Date**: May 13, 2026
**Context**: Every AI edit produces slightly soft images. Need deterministic sharpening.
**Decision**: Use Node.js Sharp for all deterministic post-processing (sharpen, contrast, exposure). Cloudinary remains for storage, CDN, mockups.
**Consequences**:
- (+) Free (no API costs)
- (+) Deterministic (same input → same output)
- (+) Server-side (no client dependency)
- (-) Adds processing time (~200ms per image)

### ADR-004: Branch / Re-Anchor Strategy for Long Edit Chains

**Status**: Amended
**Date**: May 13, 2026 (amended Aug 24, 2026)
**Context**: Editing has no strength/mask/inpainting controls. Every edit re-renders the entire image. Quality degrades after several rounds of chained editing.
**Original decision**: Store all intermediates; branch from an earlier round with accumulated prompt when degradation is detected.
**Amendment (Aug 24, 2026)**: The Aug 24, 2026 prototype (six-round two-arm test, `flux-2/edit` vs `flux-2/lora/edit`, run against the v1.x pipeline but diagnostically applicable here) isolated the degradation source: **sequential re-encoding noise from chaining edit-on-edit**, not style drift and not a LoRA-fixable problem. The subject illustration stayed crisp through all 6 rounds in both tested arms; surrounding texture is what decayed. This means the mitigation does not need to wait for detected degradation — **re-anchoring every edit round to the original base image with accumulated instructions is now the always-on default**, not a fallback triggered by a quality check. Branching (returning to an arbitrary earlier round) remains available as a manual artist action but is no longer the primary degradation mitigation.
**Consequences**:
- (+) Removes the re-encoding noise source proactively instead of detecting and reacting to it
- (+) Simpler mental model — every edit is "base image + full instruction history," not a chain
- (+) Artists can still manually branch from any stored intermediate if they want a different starting point
- (-) Every edit call re-sends the full accumulated instruction text (negligible cost impact)

### ADR-005: No Typography-First Generation

**Status**: Reversed
**Date**: May 13, 2026 (reversed Aug 24, 2026)
**Original context**: FLUX 2's typography capability was "acceptable, not great." Decision was to not optimize for typography generation and rely on Sharp overlays for artist-provided logos/lettering.
**Reversal (Aug 24, 2026)**: Nano Banana 2 handles in-image text generation well — verified in the Aug 24, 2026 head-to-head ("hawk holding a banner written RISE ABOVE, american traditional tattoo style" and related tests). Lettering and banners generated directly by NB2 are now supported as part of the standard generation flow, not routed around.
**Consequences**:
- (+) Artists can now request text-in-design ("banner reading X") directly, no longer limited to overlay-only text
- (+) Reduces reliance on the Sharp overlay path for stylistic in-design lettering
- (-/note) The Sharp overlay path is **not removed** — it remains the exact-placement mechanism for pixel-perfect logo compositing (a content ref, not a style ref; see §6, Two Reference Lanes). Typography-in-generation and logo-overlay-for-exactness are complementary, not competing.

### ADR-006: Off-the-Shelf Frontier Models Over Custom-Trained LoRAs

**Status**: Accepted
**Date**: August 24, 2026
**Context**: The v1.x architecture bet on custom-trained style LoRAs as the primary style mechanism. The first trained LoRA (`american-traditional-v1`) produced deformed, unusable output despite a reasonable 30-image dataset and standard 1000-step training run ($6.40, `fal-ai/flux-2-trainer`).
**Decision**: Retire custom-trained LoRAs entirely (no model training in the product). Use reference-guided generation (prompt + curated reference image) on off-the-shelf frontier models — Nano Banana 2 primary, Seedream 5.0 Pro fallback — instead.
**Evidence**:
- Dataset-limited failure on the first LoRA training run, but a deeper structural issue underneath it: canonical/well-documented styles (e.g. American Traditional tattoo flash) are already known to frontier model weights, so a LoRA adds the least value exactly where the style is famous enough to be worth automating in the first place.
- Head-to-head 1: raw text-to-image on "hawk holding a banner written RISE ABOVE, american traditional tattoo style" — FLUX.2 pro failed badly; NB2, Nano Banana Pro, and Seedream 5 text-to-image all landed below production grade.
- Head-to-head 2: image-to-image with the same prompt plus ONE style reference image from the curated library — **production-ready results**. NB2 best, Seedream 5 close second (~$0.035/generation measured in testing). Reference-guided image-to-image is the winning pattern — not raw text-to-image, and not LoRA training.
- Nano Banana Pro ($0.15/1K, $0.30/4K, 14 refs) was evaluated as a primary candidate and not chosen: roughly 2x NB2's price, and NB2 beat it in the image-to-image comparison.
- FLUX.2 (dev $0.012/MP, pro $0.03 first MP + $0.015/extra MP, `flux-2/edit` $0.012/MP, `flux-2/lora` $0.021/MP, `flux-2/lora/edit` $0.021/MP) is relegated to an optional cheap preview/thumbnail tier, possibly dropped entirely at launch.
**Consequences**:
- (+) Production-ready output on the first tested pattern (reference-guided i2i), vs. an unusable first LoRA
- (+) No per-style training cost or training-quality risk
- (+) Capsules (see ADR-007) are portable across future model migrations; LoRA weights are not
- (-) Per-design cost is higher than the (unrealized) LoRA-plan projection (~$0.57 vs. ~$0.61 pre-sweep v1.x estimate — comparable, but the LoRA plan never produced usable output at that cost)
- (-) Ongoing dependency on frontier model providers' reference-image handling remaining stable
- (+) No model training anywhere in the product: the LoRA plan is retired and generation uses hosted APIs only (see §7)

### ADR-007: Reference-Guided Style Capsules

**Status**: Accepted
**Date**: August 24, 2026
**Context**: With the LoRA plan retired (ADR-006), the platform needs a mechanism to give artists consistent, on-brand style selection without exposing model names or raw reference images, and without re-litigating style choice on every generation call.
**Decision**: Build "Style Capsules" — prompt template (macro) + curated reference library, personalized per user via a one-time Netflix-style pick-grid, synthesized into macro + micro instructions plus one centroid-selected anchor image per generation call. Extract structured attributes from every reference image via Claude Sonnet 5 (OpenRouter), with Gemini 3.7 Flash as the configured fallback extractor.
**Evidence — extraction model bake-off (Aug 24, 2026, all 30 American Traditional library images)**:
- Enum agreement on objective fields: 29-30/30 between Sonnet 5 and Gemini 3.7 Flash
- Enum agreement on genuinely ambiguous fields (palette, shading, era_flavor): 17-18/30 — expected divergence, not a quality signal against either model
- Sonnet 5's `signature_details` free-text output clearly richer, capturing micro-features Gemini 3.7 Flash's output missed
- Real undiscounted cost: Sonnet 5 $0.0119/image vs. Gemini 3.7 Flash $0.0089/image (1.33x) — judged worth it given the tiny volumes involved (one-time library passes, per-upload extraction)
**Consequences**:
- (+) Artists never see model names or reference images — fully backend, seamless UX
- (+) Capsules are portable across model migrations (prompt template + attribute JSON + anchor selection logic all survive a swap from NB2 to a future model) — LoRA weights could never do this
- (+) Collection consistency: same capsule + anchor reused across a merch drop
- (+) User uploads (Artist Visual Identity) reuse the identical pipeline — no separate code path
- (-) Requires an attribute-extraction pipeline and schema (`data/LoRAs/style-extraction/schema.md`) to be maintained and periodically tightened (enums need visual anchor descriptions — known follow-up)
- (-) Subject-leakage risk from anchor images requires an explicit guard (anchor-subject mismatch preference + prompt injection) rather than being automatic

---

## 12. Evidence Appendix — Aug 24, 2026 Pivot

This section consolidates the raw evidence behind the pivot from v1.x (LoRA-first) to v2.0 (reference-guided frontier models). All facts below were verified directly by Victor on Aug 24, 2026.

### LoRA Training Failure

- `american-traditional-v1` — 30 images, `fal-ai/flux-2-trainer`, 1000 steps, $6.40 — trained successfully per the queue result, but generated output was deformed and unusable.
- A second run, `american-traditional-v1-white` (white-background dataset variant), was also trained ($6.40) as part of isolating the cause. Combined spend: **$12.80**.
- Both trained artifacts (`pytorch_lora_weights.safetensors`, config, metadata, smoke tests) are preserved at `data/LoRAs/trained/american-traditional-v1/` and `data/LoRAs/trained/american-traditional-v1-white/` as a local record of the experiment; they are not used by the product.

### Text-to-Image Head-to-Head

Prompt: "hawk holding a banner written RISE ABOVE, american traditional tattoo style"

| Model | Result |
|-------|--------|
| FLUX.2 pro | Failed badly |
| Nano Banana 2 | Below production grade |
| Nano Banana Pro | Below production grade |
| Seedream 5 | Below production grade |

### Image-to-Image Head-to-Head (Winning Pattern)

Same prompt + ONE style reference image from the curated American Traditional library:

| Model | Result | Cost |
|-------|--------|------|
| Nano Banana 2 | Production-ready, best of the tested set | — |
| Seedream 5 | Production-ready, close second | ~$0.035/generation measured |

This is the evidence basis for ADR-006: reference-guided image-to-image, not raw text-to-image and not LoRA training, is the pattern that produces usable output.

### Extraction Model Bake-Off

See ADR-007 evidence block above. Source data: `data/LoRAs/style-extraction/sonnet/` (32 extraction JSONs) and `data/LoRAs/style-extraction/gemini-flash/` (33 extraction JSONs), schema at `data/LoRAs/style-extraction/schema.md`.

---

## Appendix: Environment Variables

```bash
# fal.ai (image generation — Nano Banana 2 primary, Seedream 5.0 Pro fallback, background removal)
FAL_API_KEY=REDACTED

# OpenRouter (style attribute extraction — Claude Sonnet 5 primary, Gemini 3.7 Flash fallback)
OPENROUTER_API_KEY=REDACTED

# Cloudinary (image storage/CDN - already configured)
CLOUDINARY_CLOUD_NAME=blackoutmerch
CLOUDINARY_API_KEY=REDACTED
CLOUDINARY_API_SECRET=REDACTED
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=xxxxxxxx
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | May 13, 2026 | Initial architecture — fal.ai single vendor, Kontext editing, 6-LoRA catalog |
| 1.1 | Aug 24, 2026 | Provider-docs review: endpoint drift flagged (§2, §9), LoRA-aware editing upgrade candidate (§4), BFL klein warm-standby fallback (ADR-001), cost sensitivity note (§7), typography watch item (ADR-005), open actions (§11) |
| 1.2 | Aug 24, 2026 | Phase 1 endpoint sweep: confirmed live IDs/prices for all six endpoints; corrected trainer and remove-background pricing; revised per-design cost estimate to ~$0.61 pending upscaler billing-basis confirmation; flagged ADR-002's fast/max premise as invalidated |
| 1.3 | Aug 24, 2026 | Phase 3 BFL warm-standby check: ruled out — fal-trained FLUX.2 dev LoRAs architecturally incompatible with BFL klein finetune endpoints. ADR-001 mitigation reverted to plain non-LoRA generation fallback |
| 1.4 | Aug 24, 2026 | Phase 2 LoRA-aware edit prototype: not adopted — no sustained degradation advantage at ~75% higher cost; degradation traced to sequential edit chaining (re-encoding noise), not style drift; follow-up idea recorded: re-anchor edits to base image with accumulated prompts |
| **2.0** | **Aug 24, 2026** | **Major strategy pivot**: dropped custom-trained style LoRAs as the MVP mechanism after `american-traditional-v1` produced unusable output; adopted reference-guided generation on Nano Banana 2 (primary) / Seedream 5.0 Pro (fallback) via fal.ai, validated by an Aug 24 image-to-image head-to-head showing production-ready results vs. failed text-to-image and failed LoRA output. Deleted the upscaler from the critical finalization path (NB2 native 4K covers most print sizes); dropped Ideogram from the plan and reversed ADR-005 (NB2 handles in-design typography). Replaced the LoRA Strategy section with the Style Capsule system: prompt template + curated reference library, Netflix-style pick-grid personalization, Claude Sonnet 5 (OpenRouter) attribute extraction with Gemini 3.7 Flash fallback (bake-off evidence in §12), centroid-anchor selection, two reference lanes (style vs. content), user-upload "Artist Visual Identity" pipeline. Re-anchor-to-base is now the always-on edit default (ADR-004 amended); ADR-002's fast/max tier split formally superseded — no tier split exists anywhere in the pipeline. Added ADR-006 (off-the-shelf frontier models over custom LoRAs) and ADR-007 (reference-guided Style Capsules). Image set from the LoRA experiment repurposed as the Style Capsule reference library (the interim post-MVP re-scope recorded here was dropped in v2.2). Updated `styles`/`style_preferences` database schema (§9) and `app/src/lib/ai/falClient.ts` endpoint constants (§10) to match. |
| 2.1 | Oct 15, 2026 | Finalisation moved before approval (§3, Phase 3). The final 4K render for generated or edited designs, and any edge-case upscale, now run before the client approves. Nothing regenerative runs after approval, because a regeneration can change details the client approved, so the post-approval 4K re-render is dropped. Print prep after approval is deterministic (`Documentation/Dev/Print-Prep-Plan.md`). The §10 finalise route runs before approval; approval only records its output. |
| 2.2 | Oct 18, 2026 | LoRA plan confirmed retired for good: §7 rewritten as a historical note, legacy LoRA endpoint table and re-activation criteria removed, ADR-006 updated. No model training or fine-tuning is planned. |

---

**Owner**: Victor Bendas
**Review Schedule**: Quarterly (next: November 2026)
