# Image Generation Architecture

> **Version**: 1.0  
> **Last Updated**: May 13, 2026  
> **Status**: Active — replaces `flux-lora-replicate-training-plan.md`  
> **Vendor**: fal.ai (single API key, commercial license included)

---

## Table of Contents

1. [Overview](#1-overview)
2. [fal.ai Endpoint Map](#2-falai-endpoint-map)
3. [Generation Pipeline](#3-generation-pipeline)
4. [Kontext Iterative Editing](#4-kontext-iterative-editing)
5. [Post-Processing Pipeline (Sharp)](#5-post-processing-pipeline-sharp)
6. [LoRA Strategy](#6-lora-strategy)
7. [Cost Projections](#7-cost-projections)
8. [Database Schema](#8-database-schema)
9. [API Integration](#9-api-integration)
10. [Architecture Decisions](#10-architecture-decisions)

---

## 1. Overview

### Why fal.ai

| Factor | Decision |
|--------|----------|
| **LoRA Support** | `fal-ai/flux-2-dev/lora` accepts up to 3 custom LoRAs simultaneously |
| **LoRA Training** | `fal-ai/flux-2-trainer` trains custom LoRAs at ~$8/LoRA |
| **Iterative Editing** | `fal-ai/flux-2-kontext` — multi-turn image editing (core workflow) |
| **Commercial License** | Included in API pricing — no separate licensing needed |
| **Single Vendor** | One API key covers training, generation, editing, upscaling, background removal |

### What This Replaces

- **BFL API (FLUX 2 Flex/Pro/Max)** — no custom LoRA support on Flex API
- **Replicate LoRA training** — migrated from `flux-lora-replicate-training-plan.md`
- **OpenRouter image routing** — fal.ai is now the primary and only image provider

### Print Resolution Requirements

| Print Size | Resolution at 300 DPI | Notes |
|------------|----------------------|-------|
| 4×4" (chest logo) | 1200×1200 | Within native generation range |
| 12×16" (full back) | 3600×4800 (17.3MP) | Requires upscaling from 2048×2048 |
| Max generation | 2048×2048 (4MP) | fal.ai maximum output |
| Target after upscale | 4096×4096+ (16MP+) | Acceptable for most print sizes |

---

## 2. fal.ai Endpoint Map

### Production Endpoints

| Endpoint | Purpose | Cost | Resolution | Notes |
|----------|---------|------|------------|-------|
| `fal-ai/flux-2-trainer` | Train custom LoRAs | $0.008 × steps (~$8 per LoRA) | N/A | 1000 steps standard |
| `fal-ai/flux-2-dev/lora` | Generate with LoRAs | ~$0.05/image | Up to 2048×2048 | Accepts up to 3 LoRAs |
| `fal-ai/flux-2-kontext` | Iterative image editing | $0.04/image | Up to 2048×2048 | Rounds 1-3 (fast) |
| `fal-ai/flux-2-kontext/max` | High-fidelity editing | $0.08/image | Up to 2048×2048 | Rounds 4+ (precision) |
| `fal-ai/flux-2-upscaler` | Upscale to print resolution | ~$0.03/image | 4096×4096+ | Final step before print |
| `fal-ai/ideogram/remove-background` | Background removal | ~$0.02/image | Original size | For transparent PNG exports |

### Smart Model Routing

```
User Request
    │
    ├─ "Generate new design" ────→ flux-2-dev/lora (+ LoRA style)
    │
    ├─ "Edit this design" ───────→ kontext (round 1-3) → kontext/max (round 4+)
    │
    ├─ "Make print-ready" ───────→ remove-background → upscaler → Sharp post-processing
    │
    └─ "Train new style" ────────→ flux-2-trainer → store LoRA in registry
```

---

## 3. Generation Pipeline

### Full Design Lifecycle

```
Phase 1: GENERATION
  Artist describes concept
  → Francisca selects LoRA style (or base model)
  → fal-ai/flux-2-dev/lora generates initial design
  → Sharp auto-sharpen + contrast boost
  → Store intermediate in design session

Phase 2: ITERATION (repeats 2-10 times)
  Artist requests changes: "Make it darker", "Add roses", "Change font"
  → fal-ai/flux-2-kontext (or kontext/max for round 4+)
  → Sharp auto-sharpen after each edit round
  → Store all intermediates (branching strategy)
  → If quality degrades: branch from earlier round with accumulated prompt

Phase 3: FINALIZATION
  Artist approves design
  → fal-ai/ideogram/remove-background (if needed)
  → fal-ai/flux-2-upscaler (to 4096×4096+)
  → Sharp final sharpen + color correction
  → Enter color separation / halftone pipeline (OpenCV)

Phase 4: MOCKUP
  → Cloudinary composites design onto garment photo
  → Artist previews on storefront
```

### Generation Parameters

```typescript
interface GenerationRequest {
  prompt: string;                    // Artist's description
  loraIds?: string[];                // Up to 3 LoRA slugs
  loraWeights?: number[];            // Weight per LoRA (0.0-2.0, default 1.0)
  width: number;                     // Default: 1024
  height: number;                    // Default: 1024
  negativePrompt?: string;           // Things to avoid
  seed?: number;                     // For reproducibility
  numInferenceSteps?: number;        // Default: 28
  guidanceScale?: number;            // Default: 3.5
}
```

---

## 4. Kontext Iterative Editing

### The Core Workflow

Kontext is FLUX 2's dedicated multi-turn image editing model. It takes an image + text instruction and produces an edited version. This is the PRIMARY interaction artists have with Francisca.

### How Kontext Works

```
Round 1: Generate or provide initial image
  Input: prompt + LoRA → Output: design_v1.png

Round 2: "Make the skull bigger"
  Input: design_v1.png + "Make the skull bigger" → Output: design_v2.png

Round 3: "Add roses around the skull, make it darker"
  Input: design_v2.png + "Add roses around the skull, darker tones" → Output: design_v3.png

Round 4+: Switch to kontext/max for higher fidelity
  Input: design_v3.png + instruction → Output: design_v4.png
```

### Limitations & Mitigations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **No strength control** | Every edit re-renders entire image | Use smart prompting; accumulate changes |
| **No mask/inpainting** | Cannot edit specific regions only | Use descriptive spatial prompts ("top-left area") |
| **Quality degradation** | Compounds after ~6 rounds | Branch from earlier round; use kontext/max |
| **Max resolution 2048×2048** | Not print-ready | Upscale as final step |

### Branching Strategy

When quality degrades (detected by user feedback or automated metrics), the system can "branch" — returning to an earlier intermediate image and applying ALL accumulated changes as a single prompt:

```
Round 1: design_v1 (base)
Round 2: design_v2 (from v1)
Round 3: design_v3 (from v2) ← quality still good
Round 4: design_v4 (from v3) ← slight degradation
Round 5: design_v5 (from v4) ← noticeable degradation

BRANCH: Return to design_v3, apply "all changes from rounds 4-5" as single prompt
→ design_v5_branch (fresh, higher quality)
```

### Auto-Escalation to kontext/max

```typescript
function selectKontextModel(editRound: number): string {
  if (editRound <= 3) return 'fal-ai/flux-2-kontext';      // $0.04/image
  return 'fal-ai/flux-2-kontext/max';                       // $0.08/image
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
| **Typography overlay** | If artist provides logo/text | Programmatic text rendering |
| **Final sharpen** | After upscaling | Ensure crisp edges at print resolution |

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

## 6. LoRA Strategy

### MVP LoRA Styles (6 Initial)

| # | Style | Trigger Word | LoRA Name | Best For |
|---|-------|-------------|-----------|----------|
| 1 | **American Traditional** | `american traditional` | `american-traditional-v1` | Bold lines, vintage tattoo, band merch |
| 2 | **Japanese** | `japanese style` | `japanese-v1` | Irezumi, koi, dragons, waves |
| 3 | **Blackwork** | `blackwork` | `blackwork-v1` | All-black, geometric, dotwork, mandala |
| 4 | **Vintage 90's** | `vintage 90s` | `vintage-90s-v1` | Grunge, distressed, retro band tees |
| 5 | **Realism** | `realism` | `realism-v1` | Photorealistic portraits, nature, detailed art |
| 6 | **Dark** | `dark art` | `dark-art-v1` | Gothic, horror, occult, macabre |

### LoRA Training Process

```
1. Curate 20-30 reference images per style (Expert's archive)
2. Upload to fal.ai training endpoint
3. Train with 1000 steps (~$8 per LoRA)
4. Test with 10 prompts, verify quality
5. Register in database with trigger word, examples, metadata
6. Deploy to production (active: true)
```

### LoRA Registry Schema

```typescript
interface LoRAStyle {
  id: string;                    // UUID
  displayName: string;           // "American Traditional"
  slug: string;                  // "american-traditional-v1"
  falModel: string;              // fal.ai model ID after training
  triggerWord: string;           // "american traditional"
  version: string;               // "v1"
  exampleImages: string[];       // Cloudinary URLs (3-5 examples)
  description: string;           // "Bold lines, vintage tattoo aesthetic"
  bestFor: string;               // "Band merch, tattoo-inspired designs"
  active: boolean;               // Show in gallery?
  trainedAt: Date;
  trainingSteps: number;         // Default: 1000
  trainingCost: number;          // Default: ~$8
}
```

### LoRA Selection UX

The customer never sees technical details. Francisca presents a **visual gallery**:

```
┌─────────────────────────────────────────────────────────┐
│  Francisca: "What style matches your vibe?"             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [🎨 3 Images]       [🎸 3 Images]       [💀 3 Images]│
│  American            Vintage 90's         Dark Art      │
│  Traditional                                                    │
│                                                         │
│  [🌊 3 Images]       [🖤 3 Images]       [🖼 3 Images]│
│  Japanese            Blackwork            Realism       │
│                                                         │
│  [🎯 Upload]                                           │
│  Custom (bring your own)                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Click card → system maps to LoRA behind the scenes
- Type "American Traditional skull" → auto-detected, same LoRA
- Upload reference → Francisca analyzes and suggests closest LoRA

### Future LoRA Expansion

| Phase | LoRAs | Training Source |
|-------|-------|----------------|
| **MVP (now)** | 6 | Expert's archive (20 images each) |
| **Month 1-3** | 6 (+ v2 improvements) | + customer-approved designs |
| **Month 4-6** | 10 | + Abstract, Pixel Art, Graffiti, Watercolor |
| **Month 7+** | 15+ | + Regional styles, artist-specific LoRAs |

---

## 7. Cost Projections

### Per-Image Cost Breakdown

| Step | Model | Cost | Notes |
|------|-------|------|-------|
| **Generation** | flux-2-dev/lora | $0.05 | Initial design with LoRA |
| **Edit rounds 1-3** | kontext × 3 | $0.12 | 3 rounds × $0.04 (average) |
| **Edit rounds 4+** | kontext/max × 1 | $0.08 | 1 round × $0.08 (average) |
| **Background removal** | remove-background | $0.02 | Optional, ~80% of designs |
| **Upscale** | flux-2-upscaler | $0.03 | Always needed for print |
| **Post-processing** | Sharp | $0.00 | Free, server-side |
| **Total per design** | | **~$0.30** | Realistic average |

### Monthly Cost Scenarios

| Scale | Artists | Designs/Month | Edits/Design | Monthly Cost | Cost/Artist |
|-------|---------|---------------|-------------|-------------|-------------|
| **Launch** | 10 | 100 | 4 | ~$30 | $3.00 |
| **Early** | 50 | 500 | 4 | ~$150 | $3.00 |
| **Growth** | 100 | 1,000 | 4 | ~$300 | $3.00 |
| **Scale** | 500 | 5,000 | 4 | ~$1,500 | $3.00 |
| **Mass** | 1,000 | 10,000 | 4 | ~$3,000 | $3.00 |

### LoRA Training Costs

| Phase | LoRAs | Cost/LoRA | Total | Frequency |
|-------|-------|-----------|-------|-----------|
| **Initial** | 6 | $8 | $48 | One-time |
| **Monthly retraining** | 6 | $8 | $48/month | Ongoing |
| **New styles (Year 1)** | +9 | $8 | $72 | One-time each |
| **Year 1 total** | | | ~$700 | |

### Cost Comparison

| Approach | Cost (500 artists, 5K designs/month) |
|----------|--------------------------------------|
| **fal.ai (this plan)** | ~$1,500/month |
| **BFL API (old plan)** | ~$1,800/month |
| **Replicate + LoRA (archived)** | ~$188/month but no iterative editing |
| **Manual design work** | €45/design = €225,000/month |

**ROI**: $1,500/month AI replaces €225,000/month manual labor = **99.3% cost reduction**

---

## 8. Database Schema

### design_sessions Table

```typescript
// In src/db/schema.ts
export const designSessions = pgTable('design_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  artistId: uuid('artist_id').references(() => users.id),
  
  // Session metadata
  status: text('status').default('active').notNull(), // active, approved, archived
  loraStyleId: uuid('lora_style_id').references(() => loraStyles.id),
  
  // Design data
  currentImageUrl: text('current_image_url'),       // Latest version Cloudinary URL
  originalImageUrl: text('original_image_url'),     // First generation
  approvedImageUrl: text('approved_image_url'),     // Final approved version
  
  // Generation metadata
  editRound: integer('edit_round').default(0).notNull(),
  totalEdits: integer('total_edits').default(0).notNull(),
  branchCount: integer('branch_count').default(0).notNull(),
  
  // Prompt history
  prompts: jsonb('prompts').$type<{
    generation: string;           // Original generation prompt
    edits: Array<{
      round: number;
      instruction: string;
      model: string;              // kontext or kontext/max
      imageUrl: string;           // Output Cloudinary URL
      parentImageUrl: string;     // Input image URL
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

### lora_styles Table

```typescript
export const loraStyles = pgTable('lora_styles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name').notNull(),
  slug: text('slug').notNull().unique(),
  falModel: text('fal_model').notNull(),          // fal.ai model ID
  triggerWord: text('trigger_word').notNull(),
  description: text('description').notNull(),
  exampleImages: jsonb('example_images').$type<string[]>().notNull(),
  bestFor: text('best_for').notNull(),
  active: boolean('active').default(true).notNull(),
  version: text('version').default('v1').notNull(),
  trainingSteps: integer('training_steps').default(1000).notNull(),
  trainingCostCents: integer('training_cost_cents').default(800).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### design_intermediates Table (Branching Support)

```typescript
export const designIntermediates = pgTable('design_intermediates', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => designSessions.id).notNull(),
  round: integer('round').notNull(),
  imageUrl: text('image_url').notNull(),          // Cloudinary URL
  model: text('model').notNull(),                 // flux-2-dev/lora, kontext, kontext/max
  instruction: text('instruction'),               // Edit instruction (null for generation)
  parentIntermediateId: uuid('parent_intermediate_id'), // For branching
  isBranch: boolean('is_branch').default(false).notNull(),
  costCents: integer('cost_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 9. API Integration

### fal.ai Client Setup

```typescript
// app/src/lib/ai/falClient.ts
import { createFalClient } from '@fal-ai/client';

export const falClient = createFalClient({
  credentials: process.env.FAL_API_KEY!,
});

// Endpoint constants
export const FAL_ENDPOINTS = {
  TRAIN_LORA: 'fal-ai/flux-2-trainer',
  GENERATE_WITH_LORA: 'fal-ai/flux-2-dev/lora',
  KONTEXT: 'fal-ai/flux-2-kontext',
  KONTEXT_MAX: 'fal-ai/flux-2-kontext/max',
  UPSCALER: 'fal-ai/flux-2-upscaler',
  REMOVE_BACKGROUND: 'fal-ai/ideogram/remove-background',
} as const;
```

### Generate Design API Route

```typescript
// app/src/app/api/generate-design/route.ts
import { falClient, FAL_ENDPOINTS } from '@/lib/ai/falClient';
import { postProcessImage } from '@/lib/image/postProcess';

export async function POST(req: Request) {
  const { prompt, loraId, width = 1024, height = 1024 } = await req.json();
  
  // Build LoRA sources if specified
  const loraSources = loraId ? [{ id: loraId, weight: 1.0 }] : [];
  
  // Generate with fal.ai
  const result = await falClient.run(FAL_ENDPOINTS.GENERATE_WITH_LORA, {
    input: {
      prompt,
      image_size: `${width}x${height}`,
      loras: loraSources,
      num_inference_steps: 28,
      guidance_scale: 3.5,
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
    cost: 0.05,
  });
}
```

### Edit Design API Route (Kontext)

```typescript
// app/src/app/api/edit-design/route.ts
import { falClient, FAL_ENDPOINTS } from '@/lib/ai/falClient';
import { postProcessImage } from '@/lib/image/postProcess';

export async function POST(req: Request) {
  const { imageUrl, instruction, editRound = 1 } = await req.json();
  
  // Auto-escalate to kontext/max after round 3
  const endpoint = editRound <= 3 
    ? FAL_ENDPOINTS.KONTEXT 
    : FAL_ENDPOINTS.KONTEXT_MAX;
  
  const result = await falClient.run(endpoint, {
    input: {
      image_url: imageUrl,
      prompt: instruction,
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
    model: endpoint === FAL_ENDPOINTS.KONTEXT ? 'kontext' : 'kontext/max',
    cost: editRound <= 3 ? 0.04 : 0.08,
  });
}
```

### Upscale for Print API Route

```typescript
// app/src/app/api/upscale-design/route.ts
import { falClient, FAL_ENDPOINTS } from '@/lib/ai/falClient';

export async function POST(req: Request) {
  const { imageUrl } = await req.json();
  
  // Remove background first (most designs need this)
  const bgRemoved = await falClient.run(FAL_ENDPOINTS.REMOVE_BACKGROUND, {
    input: { image_url: imageUrl },
  });
  
  // Upscale to print resolution
  const upscaled = await falClient.run(FAL_ENDPOINTS.UPSCALER, {
    input: {
      image_url: bgRemoved.images[0].url,
      upscale_factor: 2,  // 2048 → 4096
    },
  });
  
  // Final Sharp post-processing
  const response = await fetch(upscaled.images[0].url);
  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const finalBuffer = await postProcessImage(rawBuffer, {
    sharpen: true,
    contrast: 0.1,
  });
  
  return Response.json({
    imageUrl: upscaled.images[0].url,
    originalSize: '2048×2048',
    upscaledSize: '4096×4096',
    cost: 0.05, // $0.02 bg removal + $0.03 upscale
  });
}
```

---

## 10. Architecture Decisions

### ADR-001: fal.ai as Single Image Vendor

**Status**: Accepted  
**Date**: May 13, 2026  
**Context**: Needed a single provider for LoRA training, generation, iterative editing, upscaling, and background removal.  
**Decision**: Use fal.ai exclusively for all image operations.  
**Consequences**:
- (+) One API key, one bill, one integration
- (+) LoRA training + inference in same ecosystem
- (+) Kontext iterative editing (no other provider offers this)
- (-) Vendor lock-in for image pipeline
- (-) If fal.ai goes down, no image generation fallback

**Mitigation**: BFL API (FLUX 2 Flex) can serve as emergency fallback for basic generation (no LoRA, no editing).

### ADR-002: Kontext Pro → Max Auto-Escalation

**Status**: Accepted  
**Date**: May 13, 2026  
**Context**: Kontext quality degrades over many edit rounds. Max is more expensive but higher fidelity.  
**Decision**: Use Kontext Pro ($0.04) for rounds 1-3, Kontext Max ($0.08) for rounds 4+.  
**Consequences**:
- (+) Saves money on first 3 rounds (most common)
- (+) Higher quality when edits compound
- (-) Cost doubles for round 4+

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

### ADR-004: Branch Strategy for Long Edit Chains

**Status**: Accepted  
**Date**: May 13, 2026  
**Context**: Kontext has no strength/mask/inpainting controls. Every edit re-renders the entire image. Quality degrades after ~6 rounds.  
**Decision**: Store ALL intermediate images. When degradation is detected, branch from an earlier round with accumulated prompt.  
**Consequences**:
- (+) Prevents quality death spiral
- (+) Artists can return to any earlier version
- (+) Branching produces higher quality than sequential edits
- (-) More storage (each intermediate ~2MB)
- (-) More complex UI (branch visualization)

### ADR-005: No Typography-First Generation

**Status**: Accepted  
**Date**: May 13, 2026  
**Context**: FLUX 2's typography capability is "acceptable, not great". Artists mostly bring their own logos/letterings.  
**Decision**: Do not optimize for typography generation. Artists upload logos; Sharp overlays them programmatically if needed.  
**Consequences**:
- (+) Avoids investing in a weak capability
- (+) Artists retain brand control over logos
- (-) Cannot generate text-heavy designs from scratch
- (-) Some artists may expect AI text generation

---

## Appendix: Environment Variables

```bash
# fal.ai (image generation)
FAL_API_KEY=REDACTED

# Cloudinary (image storage/CDN - already configured)
CLOUDINARY_CLOUD_NAME=merchfrom
CLOUDINARY_API_KEY=REDACTED
CLOUDINARY_API_SECRET=REDACTED
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=xxxxxxxx
```

---

**Owner**: Victor Bendas  
**Review Schedule**: After P0 Demo Hardening (May 25, 2026)
