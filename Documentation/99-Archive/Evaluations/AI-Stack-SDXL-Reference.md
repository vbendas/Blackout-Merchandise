> Archived: the LoRA plan described here was retired on 2026-08-24 in favour of hosted reference-guided generation.

# AI Stack: SDXL Implementation Reference

**Status:** ✅ Active for MVP (Phases 4-7)  
**Last Updated:** January 28, 2026  
**Decision:** SDXL as primary base model (not Flux1.dev)  
**Rationale:** Editing-focused workflow, mature ecosystem, cost efficiency

---

## Executive Summary

### Why SDXL Over Flux1.dev

| Factor | SDXL + Optimization | Flux1.dev | Winner |
|--------|---------------------|-----------|--------|
| **Editing ecosystem** | ⭐⭐⭐⭐⭐ (ControlNet mature) | ⭐⭐⭐ (limited) | **SDXL** |
| **Generation speed** | ⭐⭐⭐⭐⭐ (~13s) | ⭐⭐ (~57s) | **SDXL** |
| **Text rendering** | ⭐⭐⭐ (LoRA + post-process) | ⭐⭐⭐⭐⭐ | **Flux** |
| **Infrastructure** | ⭐⭐⭐⭐⭐ (1 server) | ⭐⭐ (2 servers) | **SDXL** |
| **Monthly cost** | €550 | €1,100+ | **SDXL** |
| **Overall for merch** | **⭐⭐⭐⭐⭐** | **⭐⭐⭐** | **SDXL** |

### Use Case Analysis
- **80%+ requests:** Edits to existing designs (ControlNet advantage)
- **20% requests:** New design generation
- **Text requirements:** Minor percentage, solvable with LoRAs + post-processing

### Cost Comparison
```
SDXL Only:        €550/month  (1 server, simple maintenance)
SDXL + Flux:      €1,100+/month  (2 servers, complex maintenance)
Savings:          €550+/month  (50% less infrastructure)
```

---

## 1. Recommended SDXL Stack

### Base Model
- **Model:** SDXL 1.0 Base (0.9) + Refiner
- **License:** Open RAIL++ (commercial OK)
- **VRAM:** 8-12GB (fp16)
- **Host Options:**
  - **Self-hosted:** RunPod/Modal (€500-800/month)
  - **Hosted API:** Replicate/Fal ($0.012-0.025 per image)
  - **Hybrid:** Self-hosted base + API for edge cases

### ControlNet Models (Essential for Editing)

```
┌─────────────────────────────────────────────────────────────┐
│ CONTROLNET ECOSYSTEM FOR MERCH WORKFLOWS                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DEPTH MAP (keep layout, change style)                   │
│     Use: Background swaps, color changes                    │
│     Model: controlnet-depth-sdxl-1.0                        │
│                                                              │
│  2. CANNY EDGES (keep outlines, change fill)                │
│     Use: Logo placement, style transfer                     │
│     Model: controlnet-canny-sdxl-1.0                        │
│                                                              │
│  3. OPENPOSE (keep human pose, change clothing)             │
│     Use: Character designs, mascot edits                    │
│     Model: controlnet-openpose-sdxl-1.0                     │
│                                                              │
│  4. LINEART (keep line work, change colors)                 │
│     Use: Anime/manga style edits                            │
│     Model: controlnet-lineart-sdxl-1.0                      │
│                                                              │
│  5. NORMAL MAP (keep 3D structure, change textures)         │
│     Use: Product mockup variations                          │
│     Model: controlnet-normal-sdxl-1.0                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**VRAM Requirements:**
- SDXL Base: 8-12GB
- ControlNet (per model): 2-4GB additional
- **Recommendation:** Load ControlNet models on-demand, keep SDXL base loaded

---

## 2. LoRA Strategy for Merch

### Text LoRAs (Solve Flux's advantage)

**Training data requirements per LoRA:**

```yaml
text_styles:
  vintage_poster:
    examples: 50
    trigger: "vintage poster text"
    style: "Curved text, distressed, 3-4 colors"
    use_case: "Band merch, retro brands"
    
  minimalist:
    examples: 40
    trigger: "minimalist text"
    style: "Clean sans-serif, centered, 1-2 colors"
    use_case: "Corporate, modern brands"
    
  streetwear:
    examples: 60
    trigger: "streetwear typography"
    style: "Bold, angular, high contrast"
    use_case: "Urban fashion, skate brands"
    
  corporate:
    examples: 45
    trigger: "corporate logo"
    style: "Grid-based, structured, professional"
    use_case: "Business merchandise"
```

### Style LoRAs (Merch-specific aesthetics)

| Style | Examples | Trigger | Characteristics |
|-------|----------|---------|-----------------|
| **Vintage Tattoo** | 50 | `vintage tattoo` | Bold outlines, limited palette (black, red, yellow, blue) |
| **Minimalist** | 40 | `minimalist design` | Clean shapes, single-color, high contrast |
| **80s Poster** | 60 | `80s poster` | Distressed text, neon gradients |
| **Corporate** | 45 | `corporate design` | Professional, grid-aligned, scalable |

### LoRA Training Requirements

**Minimum viable dataset:**
- **20 images** per LoRA (minimum)
- **50-100 images** per LoRA (optimal)
- **Format:** 1024x1024 PNG, transparent background preferred
- **Captioning:** Automatic with BLIP, manual review

**Training time:** ~2-4 hours per LoRA on RTX 4090

---

## 3. Implementation Workflow

### Customer Has Design Ready (80% of cases)

```
1. Customer uploads logo/design
2. Describe desired composition
3. Use ControlNet (Depth/Canny) with reference
4. Generate base with SDXL
5. Overlay customer logo precisely
6. Apply text LoRA if slogan needed
7. Final vector cleanup in Illustrator
```

**API Example:**
```typescript
POST /api/design/edit
{
  "original": "customer_logo_url",
  "edits": {
    "background": "black",
    "style": "vintage tattoo",
    "text": {
      "content": "BAND NAME",
      "style": "vintage_poster",
      "position": "center"
    }
  },
  "controlnet": {
    "type": "depth",
    "reference": "layout_reference.png"
  }
}
```

### Customer Needs Full Design (20% of cases)

```
1. Use specialized LoRA (vintage, minimalist, etc.)
2. Generate with SDXL + LoRA
3. Expert scoring loop (if PrintScore active)
4. Customer approves/edits
5. Add text via LoRA or post-processing
6. Final cleanup
```

**API Example:**
```typescript
POST /api/design/generate
{
  "prompt": "vintage skull with roses",
  "style": "american_traditional",
  "text": {
    "content": "MERCH FROM",
    "style": "vintage_poster"
  },
  "config": {
    "color_count": 4,
    "resolution": "300dpi",
    "format": "vector"
  }
}
```

---

## 4. Infrastructure Setup

### Option A: Self-Hosted (Recommended for scale)

**Docker Compose Configuration:**
```yaml
version: '3.8'

services:
  sdxl-base:
    image: sdxl-inference:latest
    gpu: true
    environment:
      - MODEL=stabilityai/stable-diffusion-xl-base-1.0
      - VRAM=12GB
      - MAX_BATCH_SIZE=4
    ports: ["8000:8000"]
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
  
  controlnet:
    image: controlnet-sdxl:latest
    gpu: true
    environment:
      - MODELS=depth,canny,openpose,lineart
      - VRAM_PER_MODEL=3GB
    ports: ["8001:8001"]
    depends_on:
      - sdxl-base
  
  lora-registry:
    image: lora-manager:latest
    volumes:
      - ./loras:/app/loras
    ports: ["8002:8002"]
  
  api-gateway:
    image: api-gateway:latest
    environment:
      - SDXL_URL=http://sdxl-base:8000
      - CONTROLNET_URL=http://controlnet:8001
      - LORA_URL=http://lora-registry:8002
    ports: ["80:80"]
    depends_on:
      - sdxl-base
      - controlnet
      - lora-registry
```

**Infrastructure Cost:** €500-800/month (1x RTX 4090 or A5000)

### Option B: Hosted API (Recommended for MVP)

**Services:**
- **Replicate:** $0.015-0.025 per image
- **Fal.ai:** $0.012-0.020 per image
- **RunPod Serverless:** $0.008-0.015 per image

**Cost for 1000 images/month:** $12-25

### Option C: Hybrid (Best of both)

**Architecture:**
```
Self-hosted: SDXL base + ControlNet (high volume, cost-effective)
Hosted API: Specialized LoRAs, edge cases (flexibility)
```

**Cost:** €300-500/month base + usage

---

## 5. Cost Optimization

### Monthly Cost Scenarios

| Volume | Self-Hosted | Hosted API | Hybrid |
|--------|-------------|------------|--------|
| 500 images | €550 | €15 | €200 |
| 1,000 images | €550 | €25 | €250 |
| 5,000 images | €550 | €125 | €400 |
| 10,000 images | €550 | €250 | €500 |

**Break-even point:** ~2,000 images/month for self-hosted

### Optimization Strategies

1. **Batch generations:** Queue requests, process together
   - Reduces GPU idle time
   - Better throughput (2-3x faster)

2. **Cache results:** Store common compositions
   - Use Redis for result caching
   - 60-70% hit rate for common requests

3. **Use LoRAs:** Reduce prompt tokens by 50-80%
   - Short trigger words vs long prompts
   - Better consistency

4. **ControlNet efficiency:** Use lower resolution ControlNet inputs
   - 512x512 ControlNet reference
   - 1024x1024 final output
   - Saves 50% VRAM

5. **Model swapping:** Load only needed models
   - Keep SDXL base loaded
   - Load ControlNet on-demand
   - Unload after 5 minutes idle

---

## 6. Quality Control

### Pre-Generation Validation

```python
def validate_merch_design(prompt, config):
    """Validate design before generation"""
    
    # Check color count (screen printing constraint)
    if config.get('color_count', 99) > 6:
        return False, "Too many colors for screen printing"
    
    # Check resolution
    if config.get('min_resolution', 0) < 300:
        return False, "Resolution too low for print"
    
    # Check for gradients (if screen printing)
    if config.get('method') == 'screen' and 'gradient' in prompt.lower():
        return False, "Gradients not suitable for screen printing"
    
    # Check text length (if text present)
    if config.get('text'):
        if len(config['text']) > 50:
            return False, "Text too long for merch placement"
    
    return True, "Valid"
```

### Post-Generation Scoring

**Automated checks:**
- Color count analysis (OpenCV)
- Resolution verification
- Contrast ratio check
- Text legibility (if present)

**Expert review (if PrintScore active):**
- 5% of generations sampled
- 4 criteria: Printability, Color Accuracy, Detail Preservation, Commercial Viability
- Scores 1-5 per criterion

**Customer approval:**
- Final validation before production
- 3 revision rounds included

---

## 7. Training Your Own LoRAs

### Data Collection

**Sources:**
- Expert's portfolio: 500+ professional designs
- PrintScore network: Ongoing evaluations
- Customer designs: With permission

**Requirements:**
- **Minimum:** 20 images per LoRA
- **Optimal:** 50-100 images
- **Format:** 1024x1024 PNG, transparent background preferred
- **Captioning:** Automatic with BLIP, manual review

### Training Process

**Using Kohya_SS:**
```bash
python train_network.py \
  --pretrained_model_name_or_path=stabilityai/stable-diffusion-xl-base-1.0 \
  --train_data_dir=./training_data/vintage_poster \
  --output_dir=./loras \
  --network_dim=16 \
  --network_alpha=8 \
  --resolution=1024,1024 \
  --train_batch_size=1 \
  --learning_rate=1e-4 \
  --max_train_steps=1000 \
  --mixed_precision="fp16" \
  --optimizer="AdamW8bit" \
  --save_precision="fp16"
```

**Training time:** ~2-4 hours per LoRA on RTX 4090

### Quality Validation

**Test protocol:**
1. Generate 10 different prompts with LoRA
2. Score consistency (1-5 scale)
3. Check for overfitting (should generalize)
4. Expert panel review (if available)

**Acceptance criteria:**
- Consistency score ≥ 4.0
- No overfitting (varies appropriately)
- Prints well (test print required)

---

## 8. Integration with MerchFrom

### API Endpoints

**Design Generation:**
```typescript
POST /api/design/generate
{
  "prompt": "vintage skull design",
  "style": "american_traditional",
  "controlnet": {
    "type": "depth",
    "reference": "customer_logo_url"
  },
  "text": {
    "content": "BAND NAME",
    "style": "vintage_poster"
  },
  "config": {
    "color_count": 4,
    "resolution": "300dpi",
    "format": "vector"
  }
}
```

**Design Editing:**
```typescript
POST /api/design/edit
{
  "original": "design_url",
  "edits": {
    "change_background": "black",
    "move_logo": "center",
    "add_text": "SLOGAN"
  },
  "controlnet": "canny"
}
```

**LoRA Management:**
```typescript
POST /api/loras/train
{
  "name": "vintage_poster_v2",
  "images": ["url1", "url2", ...],
  "trigger_word": "vintage poster text",
  "style_description": "Curved text, distressed, 3-4 colors"
}
```

### Frontend Integration

**React Component Example:**
```typescript
import { useState } from 'react';

const DesignGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('minimalist');
  const [logo, setLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('style', style);
    if (logo) formData.append('logo', logo);
    
    try {
      const response = await fetch('/api/design/generate', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      setResult(data.image_url);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your design..."
      />
      <select value={style} onChange={(e) => setStyle(e.target.value)}>
        <option value="minimalist">Minimalist</option>
        <option value="vintage">Vintage</option>
        <option value="streetwear">Streetwear</option>
      </select>
      <input 
        type="file" 
        onChange={(e) => setLogo(e.target.files?.[0] || null)}
      />
      <button onClick={generate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate'}
      </button>
      {result && <img src={result} alt="Generated design" />}
    </div>
  );
};
```

---

## 9. Comparison: SDXL vs Flux for Merch

### When to Use SDXL (Current Strategy)

✅ **80%+ of use cases**
- Editing existing designs (ControlNet advantage)
- Fast iteration (13s vs 57s)
- Mature ecosystem (tools, tutorials, community)
- Single model infrastructure
- Cost-effective at scale

### When Flux Might Be Better (Future)

⚠️ **Specialized cases only**
- Text-heavy designs (slogans, posters)
- Complex compositions requiring perfect prompt adherence
- High-value customers where quality justifies cost
- Can use hosted API for these edge cases

### The Verdict

**SDXL wins for MerchFrom** because:

1. **Workflow is edit-focused** → ControlNet advantage is critical
2. **Speed matters** → 13s vs 57s affects customer satisfaction
3. **Cost savings** → €550/month vs €1,100+ funds other priorities
4. **Text limitations are solvable** → LoRAs + post-processing
5. **Infrastructure simplicity** → 1 server vs 2

---

## 10. Migration Path (If Needed Later)

### From SDXL Only → SDXL + Flux

```
Phase 1: SDXL Only (Current)
  ↓
Phase 2: Measure text volume
  ↓
Phase 3: If text > 30% → Add Flux API endpoint
  ↓
Phase 4: Route text-heavy to Flux
  ↓
Phase 5: Evaluate cost/quality impact
  ↓
Phase 6: If justified → Self-hosted Flux server
```

**Decision point:** After 3 months of production data

**Metrics to track:**
- Text-heavy request percentage
- Customer satisfaction with text quality
- Cost per design (Flux vs SDXL)
- Generation time impact

---

## 11. Resources & References

### Official Documentation
- **SDXL Base:** https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
- **ControlNet SDXL:** https://huggingface.co/diffusers/controlnet-sdxl
- **LoRA Training:** https://github.com/kohya-ss/sd-scripts

### Community Tools
- **ComfyUI:** Visual workflow builder for SDXL
- **Automatic1111:** WebUI for testing
- **Replicate API:** Hosted SDXL + ControlNet

### Training Data Sources
- **Expert's portfolio:** 500+ professional designs
- **PrintScore network:** Ongoing evaluations
- **Customer designs:** With permission

---

## 12. Quick Start Checklist

### Week 1: Setup
- [ ] Deploy SDXL base model (self-hosted or API)
- [ ] Integrate ControlNet models (Depth, Canny, OpenPose)
- [ ] Test basic generation (10 test prompts)
- [ ] Test ControlNet workflows (5 reference images)

### Week 2: LoRA Development
- [ ] Collect 50+ examples per desired style
- [ ] Caption images automatically
- [ ] Train first LoRA (vintage or minimalist)
- [ ] Validate LoRA quality (10 test generations)

### Week 3: Integration
- [ ] Build API endpoints
- [ ] Create frontend components
- [ ] Test end-to-end workflow
- [ ] Implement quality checks

### Week 4: Production
- [ ] Load test (100+ concurrent requests)
- [ ] Monitor costs and performance
- [ ] Gather user feedback
- [ ] Optimize based on usage patterns

---

## 13. Decision Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Primary model** | SDXL | Mature editing ecosystem, cost-effective |
| **Secondary model** | Flux (future) | Only if text volume > 30% |
| **Infrastructure** | 1 server | Simplicity, cost savings |
| **LoRA strategy** | Text + Style | Solve text limitation, ensure consistency |
| **Cost target** | €550/month | 50% savings vs dual model |
| **Timeline** | MVP now, Flux later | Validate need before investing |

---

**Document Status:** ✅ Ready for Implementation  
**Last Updated:** January 28, 2026  
**Next Review:** After Phase 4 completion  
**Owner:** Victor Bendas
