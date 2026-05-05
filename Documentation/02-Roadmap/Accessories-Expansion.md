# Phase 10: Accessories Expansion — Detailed Plan

> **Document Version:** 1.0  
> **Created:** May 4, 2026  
> **Status:** Planning  
> **Owner:** Victor Bendas  
> **Parent:** [Roadmap.md](./Roadmap.md) — Phase 10

---

## Table of Contents

1. [Vision](#vision)
2. [Strategic Context](#strategic-context)
3. [Product Definition](#product-definition)
4. [Technical Architecture](#technical-architecture)
5. [Meshy API Integration](#meshy-api-integration)
6. [Post-Processing Pipeline](#post-processing-pipeline)
7. [3D Viewer (In-App)](#3d-viewer-in-app)
8. [Cat-Suite Integration](#cat-suite-integration)
9. [Database Schema](#database-schema)
10. [Equipment & Facility](#equipment--facility)
11. [Pilot Program](#pilot-program)
12. [Data Collection & Fine-Tuning](#data-collection--fine-tuning)
13. [Timeline & Milestones](#timeline--milestones)
14. [Success Criteria](#success-criteria)
15. [Risk Mitigation](#risk-mitigation)

---

## Vision

Expand Merch From from garments into **3D-printed jewelry accessories** — pendants, rings, bracelets, earrings, and custom pieces. Artists use the same Cat-Suite AI workflow they know: describe what they want, iterate with Francisca on design, approve a 3D preview, and receive a premium metal accessory produced at our Portugal facility.

**The pitch to investors:** "We don't just print t-shirts. Our AI can design and produce custom jewelry — from artist conversation to finished brass pendant in 72 hours."

---

## Strategic Context

### Why Accessories?

| Factor | Advantage |
|--------|-----------|
| **Higher margins** | Jewelry has 5-10x markup vs. garments (€5 material → €50-80 retail) |
| **Artist differentiation** | Custom accessories = unique merch that competitors can't replicate |
| **Platform extensibility** | Proves the AI-to-physical pipeline works beyond garments |
| **Crowdfunding appeal** | "AI-designed jewelry" is a compelling investor story |
| **Data moat** | Each design generates training data that improves the AI over time |
| **Same Cat-Suite** | No new AI agents needed — Leopoldo, Francisca, Antonia cover the workflow |

### Production Model

```
Artist describes accessory
    ↓
Cat-Suite generates 3D model (Meshy API)
    ↓
Post-processed to print-ready STL
    ↓
3D printed in castable resin (Formlabs Form 4)
    ↓
Lost-wax casting in brass/silver
    ↓
Electroplating (gold/silver on brass)
    ↓
Quality check → Ship to customer
```

**Cost structure (example: brass pendant with gold plating):**
- Castable resin: ~€0.50
- Casting material (brass): ~€1-2
- Gold plating: ~€2-3
- Labor (automated + finishing): ~€5-8
- **Total production cost: ~€10-15**
- **Retail price: €45-80** (artist sets price, Merch From takes base cost + margin)

---

## Product Definition

### Accessory Types (Phased Rollout)

| Phase | Type | Complexity | Examples |
|-------|------|------------|----------|
| **Pilot A** | Simple | Low | Signet rings, plain bands, basic pendants, simple earrings |
| **Pilot B** | Medium | Medium | Engraved pieces, textured surfaces, multi-element pendants |
| **Pilot C** | Complex | High | Filigree, articulated pieces, stone settings, chain links |
| **Full Launch** | All | Variable | Everything above + custom requests |

### Materials & Finishes

| Material | Base | Finish | Price Point |
|----------|------|--------|-------------|
| **Brass + Gold Plating** | Brass | 18K gold electroplate | €45-65 |
| **Brass + Silver Plating** | Brass | Silver electroplate | €35-50 |
| **Solid Silver (925)** | Sterling silver | Polished/brushed | €60-100 |
| **Solid Gold (14K)** | 14K gold | Polished | €150-300+ |

**Default offering:** Brass + gold plating (luxury look, accessible price).

### Artist Interaction Flow

```
1. Artist: "I want to design a pendant for my fans"
2. Leopoldo: "Great! Let's start with the shape — what are you thinking?"
3. Artist: "A wolf head, aggressive style, medium size"
4. Francisca: "Here are 3 interpretations — pick one to refine"
5. [3D viewer shows 3 Meshy-generated options]
6. Artist: "Option 2, but make the ears bigger and add texture"
7. Francisca: "Updated — take a look"
8. [3D viewer shows refined model]
9. Artist: "Perfect, let's do brass with gold plating"
10. Leopoldo: "Your pendant will be €55 retail, you earn €25 per sale. Ready to publish?"
11. Artist approves → STL sent to production queue
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Merch From App (/app)                  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Cat-Suite    │  │  3D Viewer   │  │  Material    │  │
│  │  Chat Flow    │  │  (Three.js)  │  │  Selector    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            │                             │
│                    ┌───────▼───────┐                     │
│                    │  Accessories  │                     │
│                    │  API Routes   │                     │
│                    └───────┬───────┘                     │
└────────────────────────────┼─────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │ Meshy   │        │ Post-   │        │ Database│
    │ API     │        │ Process │        │ (Neon)  │
    │ (SaaS)  │        │ (Py:8002)│       │         │
    └─────────┘        └─────────┘        └─────────┘
```

### Microservices (Ports)

| Service | Port | Technology | Purpose |
|---------|------|-----------|---------|
| **Main App** | 3000 | Next.js | Frontend, API routes, auth |
| **Mockup Generator** | 8000 | Python/FastAPI | Garment mockups (existing) |
| **Color Separation** | 8001 | Python/FastAPI | Spot color separation (existing) |
| **Accessories Pipeline** | 8002 | Python/FastAPI | 3D post-processing (NEW) |

---

## Meshy API Integration

### Why Meshy?

| Factor | Details |
|--------|---------|
| **Production-ready output** | Exports STL/3MF with smart remesh — closest to print-ready among SaaS options |
| **Pricing** | ~$0.10-0.50 per generation — sustainable for interactive design flow |
| **Speed** | ~30-60 seconds per model — acceptable for iterative design |
| **API** | RESTful API with image-to-3D and text-to-3D endpoints |
| **STL export** | Direct STL export — no format conversion needed |
| **Future-proof** | Outputs can become training data for our own fine-tuned model |

### API Integration (TypeScript Client)

```typescript
// app/src/lib/accessories/meshy-client.ts

interface MeshyGenerationRequest {
  input: {
    type: 'text' | 'image';
    content: string; // text prompt or base64 image
  };
  settings: {
    topology: 'triangle' | 'quad';
    target_polycount: number; // 10K-50K for jewelry
    export_format: 'stl' | 'glb' | 'obj';
  };
}

interface MeshyGenerationResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model_url?: string; // download URL for STL/GLB
  preview_url?: string; // thumbnail
  progress?: number; // 0-100
}

export class MeshyClient {
  private apiKey: string;
  private baseUrl = 'https://api.meshy.ai/v1';

  async generate(request: MeshyGenerationRequest): Promise<MeshyGenerationResponse> {
    // POST to Meshy API
    // Poll for completion
    // Return model URL
  }

  async getTask(taskId: string): Promise<MeshyGenerationResponse> {
    // GET task status
  }
}
```

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/accessories/generate` | POST | Start 3D generation (text or image input) |
| `/api/accessories/status/[taskId]` | GET | Poll generation progress |
| `/api/accessories/approve/[designId]` | POST | Approve design for production |
| `/api/accessories/designs` | GET | List user's accessory designs |
| `/api/accessories/designs/[id]` | GET | Get design details + 3D URLs |

---

## Post-Processing Pipeline

### Purpose

Meshy output is visually good but not production-ready. The post-processing pipeline converts it to a printable, castable STL.

### Processing Steps

```
Input: Meshy GLB/OBJ
    ↓
1. MESH REPAIR
   - Close holes (watertight)
   - Remove internal geometry
   - Fix non-manifold edges
   - Recalculate normals
    ↓
2. SCALE ENFORCEMENT
   - Set real-world dimensions (mm)
   - Ring: inner diameter by size (US 6-13)
   - Pendant: max dimension 20-40mm
   - Bracelet: inner circumference by size
    ↓
3. WALL THICKNESS VALIDATION
   - Minimum 0.8mm wall for casting
   - Flag areas below threshold
   - Auto-thicken if possible, flag if not
    ↓
4. SYMMETRY ENFORCEMENT
   - Detect bilateral symmetry intent
   - Enforce precise symmetry on X/Z axis
    ↓
5. MANUFACTURING FEATURES
   - Add bail loop for pendants (if missing)
   - Add ring shank (if needed)
   - Ensure draft angles for demolding
    ↓
6. EXPORT
   - STL (binary, manifold) for 3D printing
   - GLB (web preview) for in-app viewer
   - Castability score (0-100)
    ↓
Output: Production-ready STL + preview GLB + metadata
```

### Technology

| Component | Library | Purpose |
|-----------|---------|---------|
| **Mesh repair** | PyMeshLab / trimesh | Watertight, normals, internal geometry |
| **Geometry ops** | Open3D / trimesh | Scaling, boolean ops, symmetry |
| **Thickness check** | trimesh + numpy | Ray-casting wall thickness analysis |
| **STL export** | trimesh / numpy-stl | Binary STL with manifold guarantee |
| **API framework** | FastAPI | Same pattern as ports 8000/8001 |

### Castability Score

```python
def calculate_castability_score(mesh) -> dict:
    """Score 0-100 for jewelry castability."""
    scores = {
        'watertight': is_watertight(mesh),          # 0 or 25
        'wall_thickness': wall_thickness_score(mesh), # 0-25
        'no_undercuts': undercut_score(mesh),        # 0-25
        'symmetry': symmetry_score(mesh),            # 0-25
    }
    total = sum(scores.values())
    return {
        'total': total,
        'breakdown': scores,
        'printable': total >= 70,
        'warnings': generate_warnings(scores),
    }
```

### API Endpoints (Port 8002)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/process` | POST | Full post-processing pipeline (GLB in → STL + GLB out) |
| `/validate` | POST | Castability check only (no modification) |
| `/health` | GET | Service health |

---

## 3D Viewer (In-App)

### Technology

**React Three Fiber** (R3F) — React renderer for Three.js. Integrates naturally with the existing Next.js/React stack.

### Dependencies

```json
{
  "@react-three/fiber": "^9.x",
  "@react-three/drei": "^10.x",
  "three": "^0.170.x"
}
```

### Component Architecture

```
AccessoriesViewer/
├── Accessories3DViewer.tsx      # Main viewer component
├── ModelLoader.tsx              # Loads GLB files from URL
├── MaterialPreview.tsx          # Gold/silver/brass material switcher
├── ViewerControls.tsx           # Zoom, rotate, reset camera
├── AnnotationOverlay.tsx        # Dimension labels, wall thickness warnings
└── hooks/
    ├── useModelLoader.ts        # GLB loading with suspense
    └── useMaterialSwitch.ts     # Material swap logic
```

### Viewer Features

| Feature | Description |
|---------|-------------|
| **Interactive rotation** | Click-drag to rotate, scroll to zoom |
| **Material preview** | Switch between brass/silver/gold in real-time |
| **Dimension overlay** | Show key measurements on the model |
| **Castability badge** | Green/yellow/red indicator from post-processing |
| **Mobile touch** | Pinch-to-zoom, two-finger rotate |
| **Screenshot** | Capture current view for sharing |
| **Fullscreen** | Expand to full viewport |

### Integration Points

- **Chat inline card:** Small 3D preview in chat bubble (like existing MockupCardInline)
- **Detail lightbox:** Full-screen 3D viewer with controls (like CatalogLightbox)
- **Approve flow:** "Approve for production" button sends STL to production queue

---

## Cat-Suite Integration

### Agent Roles

| Agent | Role | Interaction Pattern |
|-------|------|-------------------|
| **Leopoldo** | Pricing, materials, business | "Brass with gold plating is €55 retail — you earn €25 per sale" |
| **Francisca** | Design direction, 3D iteration | "Let's try a more aggressive angle — here's the preview" |
| **Antonia** | Production tracking | "Your pendant is in the casting phase — 3 days to shipping" |

### Routing Updates

The existing context-aware routing (Phase 3.7) needs new keywords:

```typescript
// Add to agentKnowledgeBase.ts
const accessoryKeywords = [
  'pendant', 'ring', 'bracelet', 'earring', 'necklace',
  'jewelry', 'jewellery', 'accessory', 'accessories',
  '3d print', 'brass', 'silver', 'gold', 'casting',
];

// Francisca handles: design, 3D preview, material aesthetics
// Leopoldo handles: pricing, material cost, business terms
// Antonia handles: production status, shipping, order tracking
```

### Conversation Flow

1. **Intent detection:** User mentions accessories → route to Francisca (design) or Leopoldo (pricing)
2. **Design loop:** Francisca asks for description → calls Meshy API → shows 3D preview → iterates
3. **Material selection:** Leopoldo presents options with pricing
4. **Approval:** User approves in 3D viewer → STL sent to production
5. **Tracking:** Antonia provides production updates

---

## Database Schema

### New Tables

```sql
-- accessory_designs: Core design records
CREATE TABLE accessory_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  accessory_type TEXT NOT NULL, -- 'pendant', 'ring', 'bracelet', 'earring'
  complexity TEXT DEFAULT 'simple', -- 'simple', 'medium', 'complex'
  
  -- Meshy generation
  meshy_task_id TEXT,
  meshy_input_type TEXT, -- 'text' | 'image'
  meshy_input_content TEXT, -- prompt or image URL
  meshy_raw_url TEXT, -- raw Meshy output (GLB)
  
  -- Post-processed
  processed_glb_url TEXT, -- web preview
  processed_stl_url TEXT, -- print-ready
  castability_score INTEGER, -- 0-100
  castability_breakdown JSONB, -- detailed scores
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'generated', 'processing', 'ready', 'approved', 'production'
  
  -- Metadata
  wall_thickness_ok BOOLEAN,
  symmetry_applied BOOLEAN,
  warnings JSONB, -- array of warning strings
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- accessory_iterations: Edit history
CREATE TABLE accessory_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES accessory_designs(id),
  iteration_number INTEGER NOT NULL,
  change_description TEXT, -- "made ears bigger, added texture"
  meshy_input_content TEXT, -- new prompt/image for this iteration
  meshy_raw_url TEXT,
  processed_glb_url TEXT,
  castability_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- accessory_materials: Material/finish options
CREATE TABLE accessory_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Brass + Gold Plating"
  base_material TEXT NOT NULL, -- "brass", "silver", "gold"
  finish TEXT, -- "gold_plate", "silver_plate", "polished", "brushed"
  cost_base INTEGER NOT NULL, -- production cost in cents
  retail_suggested INTEGER, -- suggested retail in cents
  available BOOLEAN DEFAULT TRUE
);

-- accessory_orders: Production orders
CREATE TABLE accessory_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES accessory_designs(id),
  material_id UUID NOT NULL REFERENCES accessory_materials(id),
  customer_order_id UUID REFERENCES orders(id), -- links to main orders table
  
  -- Production
  production_status TEXT DEFAULT 'queued', -- 'queued', 'printing', 'casting', 'finishing', 'quality_check', 'shipping', 'completed'
  printer_assignment TEXT,
  production_notes TEXT,
  
  -- Tracking
  estimated_completion TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  tracking_number TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- accessory_training_data: For future fine-tuning
CREATE TABLE accessory_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES accessory_designs(id),
  
  -- Input pair
  input_type TEXT, -- 'text' | 'image' | 'text+image'
  input_content TEXT,
  
  -- Output
  output_stl_url TEXT,
  output_quality_score INTEGER, -- human-rated 1-5
  
  -- Metadata
  castability_score INTEGER,
  casting_success BOOLEAN, -- did it actually cast successfully?
  customer_satisfaction INTEGER, -- 1-5 rating
  human_touchup_hours DECIMAL, -- hours of manual CAD work needed
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Drizzle Schema (TypeScript)

```typescript
// Add to src/db/schema.ts

export const accessoryDesigns = pgTable('accessory_designs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  accessoryType: text('accessory_type').notNull(),
  complexity: text('complexity').default('simple'),
  meshyTaskId: text('meshy_task_id'),
  meshyInputType: text('meshy_input_type'),
  meshyInputContent: text('meshy_input_content'),
  meshyRawUrl: text('meshy_raw_url'),
  processedGlbUrl: text('processed_glb_url'),
  processedStlUrl: text('processed_stl_url'),
  castabilityScore: integer('castability_score'),
  castabilityBreakdown: jsonb('castability_breakdown'),
  status: text('status').default('draft'),
  wallThicknessOk: boolean('wall_thickness_ok'),
  symmetryApplied: boolean('symmetry_applied'),
  warnings: jsonb('warnings'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ... (similar for other tables)
```

---

## Equipment & Facility

### Portugal Facility Setup (€12-15K)

| Category | Equipment | Model | Cost | Purpose |
|----------|-----------|-------|------|---------|
| **3D Printer** | Formlabs Form 4 + Wash+Cure | SLA | €5,500 | Castable resin prints |
| **Resin** | Castable Wax Resin + True Cast | | €400 | Jewelry-specific casting resins |
| **Burnout Oven** | Neycraft Programmable | | €1,500 | Wax/resin burnout from investment |
| **Vacuum Caster** | Neycraft Compact | | €2,000 | Suck molten metal into mold |
| **Vacuum Pump** | 2-stage rotary vane | | €300 | Investment degassing |
| **Investment Mixer** | Ransom & Randolph | | €250 | Mix investment under vacuum |
| **Flasks & Supplies** | Various sizes | | €300 | Steel cylinders, investment, sprues |
| **Melting Equipment** | Propane/oxy torch + furnace | | €400 | Metal melting |
| **Flex Shaft** | Foredom | | €350 | Grinding, polishing, drilling |
| **Tumbler** | Raytech TV-10 | | €400 | Mass finishing |
| **Ultrasonic Cleaner** | Generic 2-3L | | €100 | Cleaning castings |
| **Electroplating Kit** | Rectifier + solutions | | €500 | Gold/silver plating on brass |
| **Hand Tools** | Files, saws, pliers | | €300 | Bench work |
| **Casting Grain** | Silver, brass (initial stock) | | €800 | Raw metal |
| **Ventilation** | Fume extractor + filters | | €300 | Safety for resin + casting |
| **Total** | | | **€13,400** | |

### Facility Requirements

- **Space:** 15-25 sqm dedicated area within Portugal facility
- **Electrical:** 2x 220V circuits (burnout oven draws 1500-2000W)
- **Ventilation:** Fume extraction for resin printing + burnout
- **Fire safety:** Fire extinguisher, metal-rated bucket for casting
- **Water:** Access to water for quenching and cleaning

### Production Capacity (Starter)

| Metric | Capacity |
|--------|----------|
| **Print time per piece** | 2-4 hours (depending on size/complexity) |
| **Casting time per piece** | 3-5 hours (burnout + cast + cool) |
| **Finishing time per piece** | 30-90 minutes |
| **Daily throughput** | 3-5 pieces/day (single printer) |
| **Weekly throughput** | 15-25 pieces/week |
| **Monthly throughput** | 60-100 pieces/month |

---

## Pilot Program

### Structure

| Phase | Timeline | Artists | Complexity | Data Goal |
|-------|----------|---------|------------|-----------|
| **Pilot A** | Months 1-3 | 5 | Simple (signet rings, plain bands, basic pendants) | 50-100 designs |
| **Pilot B** | Months 4-6 | 8 | Medium (engraved, textured, multi-element) | 150-300 designs |
| **Pilot C** | Months 7-12 | 10+ | Complex (filigree, articulated, stone settings) | 500+ designs |

### Artist Selection Criteria

- Already active on Merch From (garment sales)
- Existing audience that would buy accessories
- Willing to provide feedback on AI design flow
- Mix of art styles (realistic, abstract, typography, illustrative)

### Artist Incentives

| Incentive | Details |
|-----------|---------|
| **Free production** | Artists pay only material cost (~€5-15/piece) |
| **Revenue share** | Same model as garments (artist sets retail, takes margin) |
| **Founding Artist** | "Founding Accessory Artist" badge on profile |
| **Early access** | First to use AI 3D design tools |
| **Co-creation** | Feedback directly shapes product development |

### Data Collection Per Design

Every design generates a training data point:

```
Input:
  - Text description (natural language)
  - Reference images (if provided)
  - User edits/iterations (change descriptions)
  - Material selection

Output:
  - Meshy raw output (GLB)
  - Post-processed STL (print-ready)
  - Castability score
  - Post-processing steps applied (log)

Quality Metrics:
  - Did it print successfully? (boolean)
  - Did it cast successfully? (boolean)
  - Customer satisfaction (1-5)
  - Human touchup hours needed (float)
  - Return/complaint rate
```

---

## Data Collection & Fine-Tuning

### Phase 1: Meshy Bootstrap (Year 2, Months 1-6)

Use Meshy as-is. Collect all input→output pairs.

### Phase 2: Synthetic Dataset (Year 2, Months 4-8)

| Step | Action | Volume |
|------|--------|--------|
| 1 | Curate reference jewelry 3D models (Turbosquid, CGTrader) | 500-1,000 models |
| 2 | Generate variations via Meshy (different angles, styles) | 3,000-5,000 outputs |
| 3 | Run through post-processing pipeline | All outputs |
| 4 | Score each output (castability, print success) | Automated |
| 5 | Create paired dataset: (reference + text) → (production-ready STL) | 3,000-5,000 pairs |

**Cost:** €2-5K for dataset licensing + €500-1K compute

### Phase 3: Fine-Tuning (Year 2, Months 8-12)

| Decision | Options | Recommendation |
|----------|---------|---------------|
| **Base model** | Hunyuan3D-2 vs TRELLIS | TRELLIS (MIT license, training code available) |
| **Method** | LoRA vs full fine-tune | LoRA (cheaper, faster, preserves base capabilities) |
| **Compute** | A100 GPU | €200-1,000 for LoRA training run |
| **Dataset** | Pilot data + synthetic pairs | 3,000-10,000 pairs |

### Phase 4: Evaluation & Deployment (Year 2 end → Year 3)

- A/B test: Meshy generic vs. fine-tuned model
- Metrics: castability score, print success rate, customer satisfaction
- Deploy fine-tuned model if it outperforms Meshy by >15%
- Keep Meshy as fallback for accessory types not in training data

---

## Timeline & Milestones

### Pre-Crowdfunding (Now → Jan 2027)

| Milestone | Target | Deliverable |
|-----------|--------|-------------|
| **M1: 3D Viewer POC** | Oct 2026 | Three.js viewer rendering GLB files in app |
| **M2: Meshy API Connected** | Nov 2026 | Text/image → 3D generation working |
| **M3: Basic Design Flow** | Dec 2026 | Cat-Suite conversation → 3D preview → approve |
| **M4: Crowdfunding Demo** | Jan 2027 | Full end-to-end demo (design → preview → "order") |

### Post-Crowdfunding (Feb 2027 → Jul 2028)

| Milestone | Target | Deliverable |
|-----------|--------|-------------|
| **M5: Post-Processing Pipeline** | Mar 2027 | Automated mesh repair + castability check |
| **M6: Material Selector** | Apr 2027 | Brass/silver/gold preview in 3D viewer |
| **M7: Pilot A Launch** | May 2027 | 5 artists, simple pieces, data collection |
| **M8: Equipment Installed** | Jun 2027 | Portugal facility operational |
| **M9: First Physical Pieces** | Jul 2027 | Test prints + castings successful |
| **M10: Pilot B Launch** | Aug 2027 | 8 artists, medium complexity |
| **M11: Pilot C Launch** | Jan 2028 | 10+ artists, complex pieces |
| **M12: Fine-Tuned Model** | Jun 2028 | Proprietary model outperforming generic Meshy |
| **M13: Full Public Launch** | Jul 2028 | All artists, all complexity levels |

---

## Success Criteria

### Crowdfunding Demo (M4)
- ✅ 3D viewer renders GLB files in-app (desktop + mobile)
- ✅ Meshy API generates 3D models from text input (< 60s)
- ✅ Cat-Suite guides user through design conversation
- ✅ Material/finish preview works in 3D viewer
- ✅ End-to-end flow: describe → generate → preview → approve
- ✅ Demo is impressive enough for investor presentation

### Pilot Success (M7-M10)
- ✅ 5+ artists actively designing accessories
- ✅ 50+ designs generated through the pipeline
- ✅ 80%+ castability score on generated designs
- ✅ Physical production working (print → cast → finish)
- ✅ Data collection pipeline capturing all training pairs

### Full Launch Success (M13)
- ✅ Fine-tuned model outperforming generic Meshy by 15%+
- ✅ <2 hours average human touchup per complex piece
- ✅ 60+ accessories produced monthly
- ✅ Artist satisfaction >4.0/5.0
- ✅ Customer satisfaction >4.0/5.0
- ✅ Positive unit economics (production cost < 30% of retail)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Meshy API changes/pricing | Medium | Abstract behind our own API layer; evaluate TRELLIS/Hunyuan3D as fallback |
| Casting quality inconsistency | High | Start with brass (cheapest), iterate burnout profiles before scaling |
| AI output not production-ready | Medium | Budget 2-4h CAD cleanup per complex piece early; automate over time |
| Artist adoption low | Medium | Start with existing garment artists; accessories as upsell |
| Fine-tuning data insufficient | Low | Synthetic data pipeline generates 1000s of pairs; Meshy outputs as training data |
| Equipment downtime | Medium | Keep Meshy as digital-only option; equipment is for physical production only |
| Regulatory (precious metals) | Low | Brass/silver jewelry under €500 has minimal EU regulation; gold requires hallmarking |

---

## Related Documents

- **Parent Roadmap:** [Roadmap.md](./Roadmap.md) — Phase 10 entry
- **Mockup System:** [IMPLEMENTATION-PLAN-Mockup-Generation.md](./IMPLEMENTATION-PLAN-Mockup-Generation.md) — Same microservice pattern
- **Color Separation:** Phase 5.6 — Same Python/FastAPI pattern for post-processing
- **MerchStation TUI:** [MerchStation-Plan.md](../04-TUI/MerchStation-Plan.md) — Production queue integration
- **Crowdfunding:** [04-Crowdfunding-Landing/Overview.md](../04-Crowdfunding-Landing/Overview.md) — Campaign integration

---

**Document Owner:** Victor Bendas  
**Last Updated:** May 4, 2026  
**Status:** Planning — Pre-crowdfunding prototype prioritized
