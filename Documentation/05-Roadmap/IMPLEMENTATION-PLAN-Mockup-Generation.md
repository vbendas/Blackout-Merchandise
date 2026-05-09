# Implementation Plan: Mockup Generation System

> **Document Version:** 1.0  
> **Created:** February 21, 2026  
> **Status:** Ready for Implementation  
> **Estimated Duration:** 2 weeks  
> **Target Phase:** 5.5 (Between Phase 5 AI Integration and Phase 6 Commerce)

---

## Executive Summary

Build a production-ready mockup generation service based on CTDave001's `automated_mockups` foundation, extended with Merch From's unique requirements:
- **Halftone integration** (show actual dot patterns, not smooth designs)
- **Dual-resolution output** (300 DPI for print files, 72 DPI for web)
- **Fabric texture overlays** (cotton, polyester, canvas, tri-blend)
- **Multi-view generation** (flat, worn, closeup per placement)
- **Full Stanley Stella catalog support**

### Key Differentiators
Unlike generic mockup generators, Merch From's system shows **authentic halftone patterns** - the same dots that will appear on the actual printed product. This creates perfect expectation alignment between mockup and reality.

---

## 1. Overview

### 1.1 Goal
Create a Python microservice that generates realistic product mockups by compositing halftoned designs onto Stanley Stella product templates with fabric texture, lighting effects, and authentic screen print aesthetics.

### 1.2 Scope

**IN SCOPE:**
- Python microservice with FastAPI
- Template preparation system for Stanley Stella products
- Halftone processing pipeline
- Dual-resolution output generation
- Fabric texture library
- REST API for mockup generation
- Integration with Node.js backend
- Docker containerization

**OUT OF SCOPE (Future Phases):**
- Real-time preview in browser (use generated mockups)
- AI-powered auto-placement (manual config first)
- 3D mockups (2D only for MVP)
- Video mockups (static images only)

### 1.3 Success Criteria
- [ ] Generate mockup in < 3 seconds for single design
- [ ] Batch process 50 mockups in < 30 seconds
- [ ] Output quality matches Stanley Stella studio photos
- [ ] Halftone dots visible at 100% zoom
- [ ] API responds with both high-res and web-res URLs
- [ ] All Stanley Stella product categories supported

### 1.4 Dependencies
- Stanley Stella studio mockup packshots (provided by user) ✅
- Cloudinary account (for image storage)
- Neon PostgreSQL (for template metadata)
- Python 3.11+ environment

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MOCKUP GENERATION SYSTEM                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Node.js    │    │   Python     │    │  Cloudinary  │               │
│  │   Backend    │───▶│  Microservice│───▶│   Storage    │               │
│  │  (Next.js)   │    │   (FastAPI)  │    │              │               │
│  └──────────────┘    └──────┬───────┘    └──────────────┘               │
│                             │                                            │
│                             ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │                    PROCESSING PIPELINE                        │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │       │
│  │  │ Halftone │─▶│ Template │─▶│ Composite│─▶│  Export  │     │       │
│  │  │ Process  │  │  Load    │  │  Blend   │  │  Dual    │     │       │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │       │
│  │         │           │            │            │              │       │
│  │         ▼           ▼            ▼            ▼              │       │
│  │  ┌──────────────────────────────────────────────────────┐   │       │
│  │  │              LIBRARIES & ASSETS                       │   │       │
│  │  │  • Pillow/PIL (image processing)                      │   │       │
│  │  │  • NumPy (array operations)                           │   │       │
│  │  │  • OpenCV (rotation, transforms)                      │   │       │
│  │  │  • scikit-image (halftone algorithms)                 │   │       │
│  │  │  • Fabric textures (cotton, polyester, canvas)        │   │       │
│  │  │  • Stanley Stella templates (flat, worn, closeup)     │   │       │
│  │  └──────────────────────────────────────────────────────┘   │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
Artist Design (PNG/PSD)
         │
         ▼
┌──────────────────────┐
│ 1. HALFTONE PROCESS  │
│    - Convert to dots │
│    - 55-65 LPI       │
│    - 15° angle       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. DUAL RESOLUTION   │
│    - High-res: 300dpi│
│    - Web-res: 72dpi  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. TEMPLATE LOADING  │
│    - Load blank      │
│    - Load mask       │
│    - Get placement   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 4. COMPOSITING       │
│    - Resize design   │
│    - Rotate (if needed)
│    - Position        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 5. REALISM EFFECTS   │
│    - Fabric texture  │
│    - Blend mode      │
│    - Lighting        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 6. EXPORT            │
│    - High-res JPEG   │
│    - Web-res WebP    │
│    - Upload to CDN   │
└──────────────────────┘
```

---

## 3. Task Breakdown

### Group A: Foundation & Setup (Parallel - No Dependencies)

---

#### **T1: Python Microservice Scaffold** [SUBAGENT] [Group A] [Complexity: M]

**Description:** Set up FastAPI project structure with proper configuration

**Subtasks:**
1. T1.1: Create `/services/mockup-generator/` directory structure
2. T1.2: Set up Python virtual environment (venv)
3. T1.3: Create `requirements.txt` with dependencies:
   - fastapi
   - uvicorn
   - pillow
   - numpy
   - opencv-python
   - scikit-image
   - python-multipart
   - python-dotenv
   - httpx (for Cloudinary upload)
4. T1.4: Create `main.py` with basic FastAPI app
5. T1.5: Set up environment configuration (`.env` template)
6. T1.6: Create logging configuration

**Dependencies:** None

**Files Affected:**
- `/services/mockup-generator/main.py`
- `/services/mockup-generator/requirements.txt`
- `/services/mockup-generator/.env.example`
- `/services/mockup-generator/config.py`

**Essential Comments:**
- [ARCH] Use FastAPI for automatic OpenAPI docs generation
- [DEP] Python 3.11+ required for better type hints
- [VERIFY] Test with `uvicorn main:app --reload`

**Acceptance Criteria:**
- [ ] FastAPI server starts without errors
- [ ] `/health` endpoint returns 200 OK
- [ ] All dependencies install correctly

---

#### **T2: Stanley Stella Template Processing** [SUBAGENT] [Group A] [Complexity: L]

**Description:** Process Stanley Stella studio mockups to extract templates and create configuration files

**Subtasks:**
1. T2.1: Create template directory structure:
   ```
   /services/mockup-generator/templates/
   ├── stanley-stella/
   │   ├── t-shirts/
   │   │   ├── creator/
   │   │   ├── changer/
   │   │   └── painted/
   │   ├── hoodies/
   │   │   ├── connector/
   │   │   ├── cultor/
   │   │   └── drummer/
   │   ├── sweatshirts/
   │   ├── tote-bags/
   │   ├── beanies/
   │   └── posters/
   ```

2. T2.2: For each product category:
   - Create `blank/` subdirectory for clean templates
   - Create `mask/` subdirectory for printable area masks
   - Create `config.json` with placement coordinates

3. T2.3: Use CTDave001's placeholder detection logic to:
   - Add colored placeholder boxes to mockups (red #FF0000)
   - Run detection algorithm to find coordinates
   - Generate config.json with placement data

4. T2.4: Create template metadata schema

5. T2.5: Build template index for quick lookup

**Dependencies:** None

**Files Affected:**
- `/services/mockup-generator/templates/` (entire directory)
- `/services/mockup-generator/scripts/prepare_templates.py`
- `/services/mockup-generator/src/template_manager.py`

**Essential Comments:**
- [CRITICAL] Stanley Stella assets are proprietary - do not commit to public repo
- [ARCH] Config.json uses same format as CTDave001's params.json for compatibility
- [GOTCHA] Some products have multiple views (flat, worn, closeup) - process all
- [VERIFY] Run detection script on all templates, verify coordinates visually

**Acceptance Criteria:**
- [ ] All Stanley Stella products have config.json files
- [ ] Placeholder detection works on 100% of templates
- [ ] Config files include: print_area, safe_zone, fabric_type, available_views

---

#### **T3: Fabric Texture Library** [SUBAGENT] [Group A] [Complexity: S]

**Description:** Create fabric texture overlays for realistic mockup appearance

**Subtasks:**
1. T3.1: Create texture assets directory:
   ```
   /services/mockup-generator/assets/textures/
   ├── cotton_weave.jpg
   ├── polyester_weave.jpg
   ├── canvas_weave.jpg
   ├── tri_blend_weave.jpg
   └── texture_config.json
   ```

2. T3.2: Generate or source seamless fabric textures (2048x2048px)
3. T3.3: Create texture configuration with blend modes and opacity:
   ```json
   {
     "cotton": { "file": "cotton_weave.jpg", "blend": "overlay", "opacity": 0.12 },
     "polyester": { "file": "polyester_weave.jpg", "blend": "overlay", "opacity": 0.10 },
     "canvas": { "file": "canvas_weave.jpg", "blend": "overlay", "opacity": 0.15 },
     "tri_blend": { "file": "tri_blend_weave.jpg", "blend": "overlay", "opacity": 0.08 }
   }
   ```

4. T3.4: Create texture loader utility

**Dependencies:** None

**Files Affected:**
- `/services/mockup-generator/assets/textures/*`
- `/services/mockup-generator/src/texture_manager.py`

**Essential Comments:**
- [ARCH] Textures should be seamless/tileable
- [GOTCHA] Opacity values tuned for subtle effect - not too obvious
- [VERIFY] Test textures on white and dark garment colors

**Acceptance Criteria:**
- [ ] 4 fabric textures created
- [ ] Textures apply correctly without visible seams
- [ ] Effect is subtle but visible on zoom

---

### Group B: Core Processing Modules (Depends on Group A)

---

#### **T4: Halftone Processing Engine** [SUBAGENT] [Group B] [Complexity: L] (depends on T1)

**Description:** Implement halftone conversion for authentic screen print appearance

**Subtasks:**
1. T4.1: Research and implement halftone algorithms:
   - Ordered dithering (Bayer matrix)
   - Error diffusion (Floyd-Steinberg)
   - Circular/dot patterns

2. T4.2: Create `halftone_processor.py` module:
   ```python
   class HalftoneProcessor:
       def __init__(self, lpi: float = 55, angle: float = 15):
           self.lpi = lpi  # Lines per inch
           self.angle = angle  # Screen angle
       
       def process(self, image: Image.Image) -> Image.Image:
           # Convert to halftone
           pass
       
       def process_for_resolution(self, image: Image.Image, dpi: int) -> Image.Image:
           # Adjust halftone for target resolution
           pass
   ```

3. T4.3: Implement dual-resolution output:
   - High-res: 300 DPI with fine halftone (85 LPI)
   - Web-res: 72 DPI with coarser halftone (45 LPI)

4. T4.4: Add color separation (CMYK) for multi-color designs
5. T4.5: Create batch processing for multiple designs
6. T4.4: Write unit tests for halftone accuracy

**Dependencies:** T1 (Python scaffold)

**Files Affected:**
- `/services/mockup-generator/src/halftone_processor.py`
- `/services/mockup-generator/tests/test_halftone.py`

**Essential Comments:**
- [CRITICAL] Halftone dots must be visible in final mockup - this is a key differentiator
- [ARCH] Use scikit-image for dithering algorithms
- [GOTCHA] Different LPI for different resolutions to maintain dot visibility
- [VERIFY] Compare output to actual screen printed samples

**Acceptance Criteria:**
- [ ] Halftone dots visible at 100% zoom in web mockups
- [ ] 300 DPI output has finer dots than 72 DPI
- [ ] Color separation works for multi-color designs
- [ ] Processing time < 1 second per design

---

#### **T5: Compositing Engine (Based on CTDave001)** [SUBAGENT] [Group B] [Complexity: L] (depends on T1, T2)

**Description:** Port and enhance CTDave001's compositing logic

**Subtasks:**
1. T5.1: Port core compositing logic from CTDave001's `generator.py`
2. T5.2: Enhance with Merch From requirements:
   - Support multiple blend modes (multiply, overlay, normal)
   - Add rotation handling
   - Add scaling modes (fit, fill, stretch)
   - Add alignment options (9-point grid)

3. T5.3: Create `compositing_engine.py`:
   ```python
   class CompositingEngine:
       def __init__(self, template_config: dict):
           self.config = template_config
       
       def composite(self, design: Image.Image, effects: dict) -> Image.Image:
           # Apply texture, lighting, effects
           pass
       
       def apply_fabric_texture(self, design: Image.Image, fabric_type: str) -> Image.Image:
           # Overlay fabric texture
           pass
       
       def apply_lighting(self, image: Image.Image, lighting_type: str) -> Image.Image:
           # Adjust brightness/contrast for realism
           pass
   ```

4. T5.4: Implement fabric texture overlay using T3 assets
5. T5.5: Add color adjustment for ink absorption simulation
6. T5.6: Write unit tests for compositing accuracy

**Dependencies:** T1 (Python scaffold), T2 (Templates), T3 (Textures)

**Files Affected:**
- `/services/mockup-generator/src/compositing_engine.py`
- `/services/mockup-generator/src/utils/image_utils.py`
- `/services/mockup-generator/tests/test_compositing.py`

**Essential Comments:**
- [ARCH] Based on CTDave001's compositing logic but enhanced
- [GOTCHA] Multiply blend mode can darken too much - test with light designs
- [VERIFY] Output should match Stanley Stella studio photo quality

**Acceptance Criteria:**
- [ ] Design composites correctly onto template
- [ ] Rotation handled accurately
- [ ] Fabric texture visible but not overwhelming
- [ ] Lighting effects look natural

---

#### **T6: Template Manager** [SUBAGENT] [Group B] [Complexity: M] (depends on T2)

**Description:** Create template loading and caching system

**Subtasks:**
1. T6.1: Create `template_manager.py`:
   ```python
   class TemplateManager:
       def __init__(self, templates_dir: str):
           self.templates_dir = templates_dir
           self.cache = {}
       
       def load_template(self, product_type: str, view: str) -> Template:
           # Load blank, mask, and config
           pass
       
       def get_available_views(self, product_type: str) -> list:
           # Return list of available views (flat, worn, closeup)
           pass
       
       def validate_placement(self, placement: dict) -> bool:
           # Check if design fits in print area
           pass
   ```

2. T6.2: Implement template caching for performance
3. T6.3: Add template metadata validation
4. T6.4: Create template registry for quick lookup
5. T6.5: Add error handling for missing templates

**Dependencies:** T2 (Template processing)

**Files Affected:**
- `/services/mockup-generator/src/template_manager.py`
- `/services/mockup-generator/src/models/template.py`

**Essential Comments:**
- [ARCH] Cache loaded templates in memory for reuse
- [GOTCHA] Template files are large - use lazy loading
- [VERIFY] All Stanley Stella products load without errors

**Acceptance Criteria:**
- [ ] Templates load in < 100ms (cached)
- [ ] All views accessible per product
- [ ] Missing templates return clear error messages

---

### Group C: API & Integration (Depends on Group B)

---

#### **T7: FastAPI Endpoints** [SUBAGENT] [Group C] [Complexity: L] (depends on T1, T4, T5, T6)

**Description:** Create REST API endpoints for mockup generation

**Subtasks:**
1. T7.1: Create Pydantic models for requests/responses:
   ```python
   class GenerateMockupRequest(BaseModel):
       design_url: str
       product_sku: str
       views: list[str] = ["flat", "worn"]
       placement: str = "front_chest"
       fabric_type: str = "cotton"
       
   class GenerateMockupResponse(BaseModel):
       mockup_id: str
       high_res_url: str
       web_res_url: str
       product_sku: str
       views: list[str]
       generated_at: datetime
   ```

2. T7.2: Implement POST `/generate` endpoint:
   - Download design from URL
   - Process halftone
   - Generate mockups for all requested views
   - Upload to Cloudinary
   - Return URLs

3. T7.3: Implement POST `/generate-batch` endpoint:
   - Accept multiple designs
   - Parallel processing
   - Progress tracking

4. T7.4: Implement GET `/templates` endpoint:
   - List available products
   - Return available views per product

5. T7.5: Implement GET `/health` endpoint
6. T7.6: Add request validation and error handling
7. T7.7: Add rate limiting middleware

**Dependencies:** T1, T4, T5, T6

**Files Affected:**
- `/services/mockup-generator/src/api/routes.py`
- `/services/mockup-generator/src/api/models.py`
- `/services/mockup-generator/src/api/middleware.py`
- `/services/mockup-generator/main.py`

**Essential Comments:**
- [ARCH] Use Pydantic for automatic validation and OpenAPI docs
- [CRITICAL] Validate design URLs before downloading (security)
- [GOTCHA] Batch requests can be large - implement streaming responses
- [VERIFY] Test with curl, verify OpenAPI docs at `/docs`

**Acceptance Criteria:**
- [ ] All endpoints return proper JSON responses
- [ ] Request validation rejects invalid input
- [ ] Error messages are clear and actionable
- [ ] Rate limiting prevents abuse

---

#### **T8: Cloudinary Integration** [SUBAGENT] [Group C] [Complexity: M] (depends on T7)

**Description:** Upload generated mockups to Cloudinary CDN

**Subtasks:**
1. T8.1: Install Cloudinary Python SDK
2. T8.2: Create `cloudinary_uploader.py`:
   ```python
   class CloudinaryUploader:
       def __init__(self, cloud_name: str, api_key: str, api_secret: str):
           # Initialize Cloudinary
           pass
       
       def upload_mockup(self, image: Image.Image, mockup_id: str, resolution: str) -> str:
           # Upload and return URL
           pass
       
       def generate_transformation_url(self, public_id: str, width: int = None) -> str:
           # Generate on-the-fly resize URL
           pass
   ```

3. T8.3: Configure upload folders:
   - `merch-from/mockups/{mockup_id}/high_res.jpg`
   - `merch-from/mockups/{mockup_id}/web_res.webp`

4. T8.4: Implement image optimization:
   - High-res: JPEG quality 95
   - Web-res: WebP quality 85

5. T8.5: Add error handling and retry logic
6. T8.6: Write tests for upload functionality

**Dependencies:** T7 (API endpoints)

**Files Affected:**
- `/services/mockup-generator/src/storage/cloudinary_uploader.py`
- `/services/mockup-generator/tests/test_cloudinary.py`

**Essential Comments:**
- [ARCH] Use Cloudinary's unsigned upload for client-side uploads
- [GOTCHA] Large high-res files may timeout - implement chunked upload
- [VERIFY] Verify images display correctly from Cloudinary URLs

**Acceptance Criteria:**
- [ ] Images upload successfully to Cloudinary
- [ ] High-res files are < 10MB
- [ ] Web-res files are < 500KB
- [ ] URLs are publicly accessible

---

#### **T9: Node.js Integration** [SUBAGENT] [Group C] [Complexity: M] (depends on T7)

**Description:** Create Node.js service client for Python microservice

**Subtasks:**
1. T9.1: Create `mockupService.ts` in Node.js backend:
   ```typescript
   export class MockupService {
       private baseUrl: string;
       
       constructor() {
           this.baseUrl = process.env.MOCKUP_SERVICE_URL;
       }
       
       async generateMockup(params: GenerateMockupParams): Promise<MockupResult> {
           // Call Python service
       }
       
       async generateBatchMockups(params: BatchParams): Promise<BatchResult> {
           // Batch generation
       }
       
       async getAvailableTemplates(): Promise<Template[]> {
           // Get template list
       }
   }
   ```

2. T9.2: Create API route `/api/mockups/generate`:
   - Accept design file upload
   - Forward to Python service
   - Return mockup URLs

3. T9.3: Create API route `/api/mockups/batch` for batch generation
4. T9.4: Add error handling and retry logic
5. T9.5: Add logging for debugging
6. T9.6: Write integration tests

**Dependencies:** T7 (FastAPI endpoints)

**Files Affected:**
- `/app/src/lib/services/mockupService.ts`
- `/app/src/app/api/mockups/generate/route.ts`
- `/app/src/app/api/mockups/batch/route.ts`
- `/app/src/app/api/mockups/templates/route.ts`

**Essential Comments:**
- [ARCH] Use HTTP client with timeout (30s for single, 5min for batch)
- [GOTCHA] Python service may be down - implement circuit breaker
- [VERIFY] Test end-to-end from frontend upload to mockup display

**Acceptance Criteria:**
- [ ] Node.js can call Python service successfully
- [ ] File uploads work correctly
- [ ] Error responses propagate to frontend
- [ ] Timeout handling works

---

### Group D: Testing & Optimization (Depends on Group C)

---

#### **T10: End-to-End Testing** [SUBAGENT] [Group D] [Complexity: M] (depends on T7, T8, T9)

**Description:** Comprehensive testing of the entire pipeline

**Subtasks:**
1. T10.1: Create test suite for Python service:
   - Unit tests for each module
   - Integration tests for API endpoints
   - Performance tests for batch processing

2. T10.2: Create test designs:
   - Simple single-color design
   - Multi-color complex design
   - Light design on dark garment
   - Dark design on light garment

3. T10.3: Test all Stanley Stella products
4. T10.4: Performance benchmarks:
   - Single mockup generation time
   - Batch processing throughput
   - Memory usage

5. T10.5: Visual quality validation:
   - Halftone visibility
   - Fabric texture subtlety
   - Color accuracy

6. T10.6: Create test report with metrics

**Dependencies:** T7, T8, T9

**Files Affected:**
- `/services/mockup-generator/tests/*`
- `/services/mockup-generator/test_report.md`

**Essential Comments:**
- [CRITICAL] Visual quality must match Stanley Stella standards
- [VERIFY] Run full test suite before deployment
- [GOTCHA] Test with actual production-sized images (3000x3000px+)

**Acceptance Criteria:**
- [ ] All unit tests pass
- [ ] API integration tests pass
- [ ] Performance meets targets (< 3s single, < 30s batch/50)
- [ ] Visual quality approved by stakeholder

---

#### **T11: Docker Deployment** [SUBAGENT] [Group D] [Complexity: S] (depends on T1, T7)

**Description:** Containerize Python microservice for deployment

**Subtasks:**
1. T11.1: Create `Dockerfile`:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   EXPOSE 8000
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. T11.2: Create `docker-compose.yml` for local development
3. T11.3: Add `.dockerignore` to reduce image size
4. T11.4: Configure environment variables for production
5. T11.5: Test Docker build and run
6. T11.6: Document deployment process

**Dependencies:** T1, T7

**Files Affected:**
- `/services/mockup-generator/Dockerfile`
- `/services/mockup-generator/docker-compose.yml`
- `/services/mockup-generator/.dockerignore`
- `/services/mockup-generator/DEPLOYMENT.md`

**Essential Comments:**
- [ARCH] Use slim base image to reduce size
- [GOTCHA] OpenCV requires system dependencies - install libgl1
- [VERIFY] Container starts and responds to health checks

**Acceptance Criteria:**
- [ ] Docker image builds successfully
- [ ] Container runs and serves requests
- [ ] Image size < 1GB

---

#### **T12: Documentation & Handoff** [MAIN] [Group D] [Complexity: S] (depends on T10, T11)

**Description:** Create comprehensive documentation for the system

**Subtasks:**
1. T12.1: Write API documentation (OpenAPI/Swagger)
2. T12.2: Create integration guide for Node.js backend
3. T12.3: Document template preparation process
4. T12.4: Write deployment guide
5. T12.5: Create troubleshooting guide
6. T12.6: Update main project README

**Dependencies:** T10, T11

**Files Affected:**
- `/services/mockup-generator/README.md`
- `/services/mockup-generator/API.md`
- `/services/mockup-generator/INTEGRATION.md`
- `/Documentation/05-Shared/Mockup-System-API.md`

**Essential Comments:**
- [VERIFY] Documentation reviewed by another developer

**Acceptance Criteria:**
- [ ] API docs complete with examples
- [ ] Integration guide has code samples
- [ ] Deployment guide is step-by-step
- [ ] Troubleshooting covers common errors

---

## 4. Parallelization Map

```
Week 1:
├── Group A (Parallel, Days 1-3):
│   ├── T1: Python Microservice Scaffold [SUBAGENT]
│   ├── T2: Stanley Stella Template Processing [SUBAGENT]
│   └── T3: Fabric Texture Library [SUBAGENT]
│
├── Group B (Parallel, Days 4-7, after Group A):
│   ├── T4: Halftone Processing Engine [SUBAGENT]
│   ├── T5: Compositing Engine [SUBAGENT]
│   └── T6: Template Manager [SUBAGENT]
│
Week 2:
├── Group C (Parallel, Days 8-10, after Group B):
│   ├── T7: FastAPI Endpoints [SUBAGENT]
│   ├── T8: Cloudinary Integration [SUBAGENT]
│   └── T9: Node.js Integration [SUBAGENT]
│
├── Group D (Sequential, Days 11-14, after Group C):
│   ├── T10: End-to-End Testing [SUBAGENT]
│   ├── T11: Docker Deployment [SUBAGENT]
│   └── T12: Documentation & Handoff [MAIN]
```

---

## 5. Agent Assignments

| Task | Agent | Type | Est. Hours |
|------|-------|------|------------|
| T1: Python Scaffold | Python Specialist | SUBAGENT | 4-6 |
| T2: Template Processing | Image Processing Specialist | SUBAGENT | 12-16 |
| T3: Texture Library | Asset Creator | SUBAGENT | 3-4 |
| T4: Halftone Engine | Image Processing Specialist | SUBAGENT | 10-12 |
| T5: Compositing Engine | Python Developer | SUBAGENT | 10-12 |
| T6: Template Manager | Python Developer | SUBAGENT | 6-8 |
| T7: FastAPI Endpoints | Backend API Specialist | SUBAGENT | 10-12 |
| T8: Cloudinary Integration | Cloud Storage Specialist | SUBAGENT | 6-8 |
| T9: Node.js Integration | Full-Stack Developer | SUBAGENT | 8-10 |
| T10: E2E Testing | QA Engineer | SUBAGENT | 8-10 |
| T11: Docker Deployment | DevOps Specialist | SUBAGENT | 4-6 |
| T12: Documentation | Technical Writer | MAIN | 4-6 |

**Total Estimated Effort:** 85-110 hours (~2 weeks with 1-2 developers)

---

## 6. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stanley Stella assets unavailable | HIGH | Have backup plan to purchase mockup templates from Placeit or similar |
| Halftone quality not meeting standards | HIGH | Iterate on algorithms, consult with screen printing experts |
| Processing too slow | MEDIUM | Implement caching, optimize algorithms, add worker queue |
| Cloudinary upload failures | MEDIUM | Implement retry logic, add fallback storage |
| Template detection fails | MEDIUM | Manual fallback for problematic templates |

---

## 7. Success Metrics

### Performance Metrics
- Single mockup generation: < 3 seconds
- Batch processing (50 mockups): < 30 seconds
- API response time (P95): < 5 seconds
- Memory usage: < 2GB per worker

### Quality Metrics
- Halftone visibility: Dots visible at 100% zoom
- Color accuracy: Within ±5% of Pantone (verified visually)
- File sizes: High-res < 10MB, Web-res < 500KB
- Visual approval: 95%+ approval rate from test users

### Coverage Metrics
- Stanley Stella products: 100% supported
- Template views: All views (flat, worn, closeup) working
- Fabric types: All 4 types supported

---

## 8. Integration Points

### Phase 5 (AI Integration) → Phase 5.5 (Mockup Generation)
- Receives halftoned designs from SDXL + LoRAs generation
- Uses color separation from OpenCV processing

### Phase 5.5 (Mockup Generation) → Phase 6 (Commerce)
- Provides mockups for product catalog display
- Supplies images for checkout and order confirmation
- Enables artist design approval workflow

### Node.js Backend Integration
```typescript
// Example usage in artist dashboard
const mockupService = new MockupService();

const mockups = await mockupService.generateMockup({
  designUrl: halftonedDesignUrl,
  productSku: 'STTU755_CREATOR_BLACK',
  views: ['flat', 'worn', 'closeup'],
  placement: 'front_chest',
  fabricType: 'cotton'
});

// Returns:
// {
//   mockupId: 'mock_123456',
//   highResUrl: 'https://res.cloudinary.com/.../high_res.jpg',
//   webResUrl: 'https://res.cloudinary.com/.../web_res.webp',
//   productSku: 'STTU755_CREATOR_BLACK',
//   views: ['flat', 'worn', 'closeup'],
//   generatedAt: '2026-03-15T10:30:00Z'
// }
```

---

## 9. Related Documents

- **Original Tool:** https://github.com/CTDave001/automated_mockups
- **Fork:** https://github.com/PopoolaIbrahim/automated_mockups_generator
- **Mockup Architecture:** `/Documentation/05-Shared/Mockup-Architecture-Reference.md`
- **Database Schema:** `/Documentation/05-Shared/Database-Schema.md`
- **Roadmap:** `/Documentation/02-Roadmap/Roadmap.md`
- **Roadmap Update:** Phase 5.5 added between Phase 5 and Phase 6

---

## 10. Next Steps

1. **Prerequisites Check:**
   - [ ] Confirm Stanley Stella mockup packshots are available
   - [ ] Verify Cloudinary account credentials
   - [ ] Set up Python 3.11+ development environment

2. **Begin Implementation:**
   - [ ] Start Group A tasks in parallel subagents (T1, T2, T3)
   - [ ] Assign Python Specialist to T1 + T4 + T5
   - [ ] Assign Image Processing Specialist to T2 + T4

3. **Weekly Check-ins:**
   - Review progress on Group A
   - Prepare for Group B when A completes
   - Adjust timeline if needed

---

**Plan Owner:** Victor Bendas  
**Created:** February 21, 2026  
**Status:** READY FOR IMPLEMENTATION  
**Estimated Start:** Upon approval

---

## Approval

Before implementation begins, confirm:

- [ ] Stanley Stella mockup packshots are available and accessible
- [ ] Cloudinary account is configured with proper credentials
- [ ] Python 3.11+ environment is ready for development
- [ ] Development resources assigned to subagents
- [ ] Success criteria are understood and agreed upon
- [ ] Timeline (2 weeks) is realistic given other commitments
- [ ] Risk mitigations are acceptable

**Approved by:** _________________  
**Date:** _________________
