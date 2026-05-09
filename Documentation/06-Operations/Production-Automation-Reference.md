# Production Automation System - Technical Reference

> **Purpose**: This document is a technical reference for Phase 8+ development. Contains detailed algorithms and implementation blueprints for automated halftone generation, color separation, and production file export.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Computer Vision Pipeline](#3-computer-vision-pipeline)
4. [Color Separation System](#4-color-separation-system)
5. [Halftone Generation](#5-halftone-generation)
6. [PSD Export System](#6-psd-export-system)
7. [Mockup Regeneration](#7-mockup-regeneration)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)
10. [Performance Specifications](#10-performance-specifications)
11. [Cost Analysis](#11-cost-analysis)
12. [Error Handling](#12-error-handling)
13. [Testing Strategy](#13-testing-strategy)

---

## 1. System Overview

### 1.1 Purpose

The Production Automation System transforms user-uploaded or AI-generated artwork into production-ready files for **all print methods** (DTG, DTF, and screen printing), eliminating 1.5 hours of manual work per design while **ensuring perfect visual consistency across every print method**.

**Universal Standard:** Every design is processed identically with halftoned, color-separated layers regardless of print method. Whether printing one shirt on-demand (DTG) or 50 shirts in bulk (screen), production team uses the same halftoned layers for identical visual results.

### 1.2 Key Features

- **Universal Halftone Standard**: All print methods use the same halftoned layers
- **Intelligent Design Analysis**: AI-powered optimization suggestions
- **Automated Color Separation**: Optimized color detection for consistency
- **Per-Color Halftone**: Custom angle configuration to prevent moiré patterns
- **Single Production File**: One master PSD with reference layer for all methods
- **Production Package Generation**: PSD with layers + PDF placement guide + mockup
- **Mockup Auto-Update**: Regenerate product mockups after optimizations
- **Iterative Refinement**: SeeDream img2img for design modifications

### 1.3 Performance Targets

- **Processing Time**: <30 seconds per design (all steps)
- **Success Rate**: >98% automated processing
- **Cost**: $0.047 per design (AI + storage)
- **Quality**: 300+ DPI, print-ready output
- **Accuracy**: >95% color detection accuracy
- **Consistency**: 100% visual match across all print methods (DTG, DTF, screen)

### 1.4 Why Universal Halftone Standard

**Business Case: Perfect Brand Consistency**

**Scenario:**
```
Artist: "The Echoes" creates "Skrull" design
  ├─ Fan buys 1 shirt online → DTG printed using halftoned layers
  ├─ Artist orders 50 shirts for tour → Screen printed using same halftoned layers
  └─ Fan meets artist at show → Both wearing identical "Skrull" design
```

**How It Works:**
- Fan's DTG: Prints layers 1-3 (halftoned) composited by printer
- Artist's Screen: Prints layers 1-3 (halftoned) as separate films
- **Result: Visually identical** ✅ Same colors, same halftone, perfect match

**Why Halftone for DTG/DTF?**
- Modern DTG printers can print halftone patterns correctly
- Halftone dots at 300 DPI / 45 LPI are invisible to naked eye
- Ensures exact color matching between DTG and screen methods
- Creates smooth, professional appearance

**Benefits:**
1. **Brand Integrity**: Every product looks identical across all print methods
2. **Cost Savings**: Fewer colors = lower ink costs (DTG and screen)
3. **Production Flexibility**: Easy to switch from DTG → Screen at any volume
4. **Artist Confidence**: "My design works everywhere" guarantee
5. **Quality Control**: One master design = one quality standard
6. **No Redesign Needed**: Same file works for 1 shirt or 1,000 shirts

---

## 2. Architecture

### 2.1 System Flow

```
┌─────────────────────────────────────────────────────────┐
│                     USER UPLOADS/GENERATES DESIGN                │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 1: COMPUTER VISION ANALYSIS                               │
│  ├─ Color detection (OpenCV K-means)                            │
│  ├─ Gradient detection (Edge analysis)                          │
│  ├─ Text detection (Tesseract OCR)                              │
│  ├─ Bleed zone validation (Edge pixels)                         │
│  └─ DPI verification (Image metadata)                           │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 2: LLM OPTIMIZATION SUGGESTIONS (Claude Sonnet)           │
│  ├─ "7 colors detected → Reduce to 4? Save €8/unit"            │
│  ├─ "Gradient found → Convert to halftone for screen printing?" │
│  ├─ "No bleed zone → Add 0.125 inch automatically?"            │
│  └─ "Font too small → Increase to 8pt minimum?"                │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 3: USER APPROVAL                                          │
│  ├─ Preview suggested changes                                   │
│  ├─ Accept all / Accept individual / Skip                       │
│  └─ Request further refinements ("Make it darker")              │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 4: APPLY OPTIMIZATIONS                                    │
│  ├─ Color reduction (Sharp posterize)                           │
│  ├─ Halftone conversion (Custom algorithm)                      │
│  ├─ Bleed zone addition (Sharp extend)                          │
│  └─ Resolution upscaling (if needed)                            │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 5: COLOR SEPARATION                                       │
│  ├─ Detect unique colors (K-means clustering)                   │
│  ├─ Assign halftone angles (moiré prevention)                   │
│  │   • Black: 45°  • Cyan: 15°  • Magenta: 75°  • Yellow: 0°   │
│  ├─ Extract color masks (per-color layer isolation)             │
│  └─ Generate halftone per layer (custom dot patterns)           │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 6: PRODUCTION FILE GENERATION                             │
│  ├─ PSD with separated layers (ag-psd library)                  │
│  ├─ Individual layer PNGs (backup)                              │
│  ├─ PDF placement guide (PDFKit)                                │
│  └─ Production manifest JSON (metadata)                         │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 7: MOCKUP REGENERATION                                    │
│  ├─ Load product templates (t-shirt, hoodie, etc.)              │
│  ├─ Composite optimized design (Sharp)                          │
│  ├─ Generate multiple angles (front, back, worn)                │
│  └─ Update product database records                             │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 8: STORAGE & NOTIFICATION                                 │
│  ├─ Upload to Neon Storage (production bucket)                   │
│  ├─ Generate download links (expires in 30 days)                │
│  ├─ Send to production queue                                    │
│  └─ Notify production team + artist                             │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Computer Vision** | OpenCV (Node.js/Python) | Color detection, gradient analysis |
| **OCR** | Tesseract.js | Font size detection |
| **Image Processing** | Sharp | Optimization, resizing, compositing |
| **Halftone Generation** | Canvas (Node.js) + Custom Algorithm | Per-color halftone with angle control |
| **PSD Export** | ag-psd (npm library) | Multi-layer PSD file generation |
| **PDF Generation** | PDFKit | Placement guides for production team |
| **AI Analysis** | Claude Sonnet 4.5 (OpenRouter) | Optimization suggestions |
| **AI Refinement** | SeeDream 4.0 img2img | Design modifications |
| **AI Chat** | Mistral Large | Agent conversations, routing, character personalities |
| **AI Voice STT** | Mistral Voxtral Transcribe 2 | Speech-to-text ($0.003/min, sub-200ms) |
| **AI Voice TTS** | ElevenLabs TTS | Text-to-speech with zero-shot voice cloning |
| **Storage** | Neon Storage | Production files (PSD, PNG, PDF) |
| **Compute** | Vercel Edge Functions | Serverless processing |

---

## Implementation Notes

This document provides the complete technical specification for implementing the production automation system. For detailed code examples and algorithm implementations, refer to the original `PRODUCTION_AUTOMATION_TECHNICAL_SPEC.md` file in the old documentation archive.

**Key Algorithms to Implement:**
1. K-means clustering for color detection
2. Sobel edge detection for gradient analysis
3. Tesseract OCR for font size detection
4. Custom halftone generation algorithm with angle control
5. Multi-layer PSD export with reference layer
6. Authentic halftone mockup generation

**Database Tables to Create:**
- `production_packages` - Complete production packages with all files
- `design_iterations` - Design refinement history
- `product_mockups` - Multiple mockup views per design

---

**Last Updated**: January 17, 2026
**Status**: Technical Reference (Active for Phase 8+ Development)
**Owner**: Victor Bendas
