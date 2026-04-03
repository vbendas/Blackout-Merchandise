# Mockup Architecture - Technical Reference

> **Purpose**: This document is a technical reference for Phase 8+ development. Contains architecture specifications for product visualization and mockup generation system.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Components](#2-architecture-components)
3. [Product Template System](#3-product-template-system)
4. [Mockup Generation Pipeline](#4-mockup-generation-pipeline)
5. [Multi-Position Support](#5-multi-position-support)
6. [Authenticity Features](#6-authenticity-features)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)

---

## 1. System Overview

### 1.1 Purpose

The Mockup Architecture provides realistic product visualizations for artists and customers, showing how designs will look on actual products with authentic production characteristics (halftone patterns, fabric texture, garment folds).

### 1.2 Key Features

- **Authentic Halftone Display**: Mockups use actual halftoned design layers (not smooth originals)
- **Multiple Product Types**: T-shirts, hoodies, tote bags, beanies, etc.
- **Multiple Placements**: Front, back, sleeve, neck label
- **Multiple Views**: Flat, worn, closeup, detail
- **Realistic Effects**: Fabric texture, lighting, wrinkles, color adjustment
- **Template Library**: Product images for blank garments
- **Automatic Generation**: Generate all mockup variants after design approval

### 1.3 Quality Standards

- **Resolution**: 300 DPI for print accuracy
- **Output Format**: JPEG/WebP optimized for web
- **Authenticity**: Show halftone patterns visible at zoom
- **Color Accuracy**: Match Pantone colors within ±5% tolerance
- **Fabric Realism**: Show texture through halftone overlay

---

## 2. Architecture Components

### 2.1 Template System

**Product Templates:**
```
templates/
├── tshirt/
│   ├── front_chest/
│   │   ├── blank.jpg (base image)
│   │   ├── mask.png (printable area)
│   │   ├── fabric_texture.jpg (weave overlay)
│   │   └── config.json (placement, dimensions)
│   ├── back_full/
│   ├── left_sleeve/
│   └── right_sleeve/
├── hoodie/
│   ├── front_chest/
│   ├── back_full/
│   ├── hood_down/
│   └── pocket/
├── tote_bag/
└── beanie/
```

**Template Configuration:**
```json
{
  "product_type": "tshirt",
  "placement": "front_chest",
  "dimensions": {
    "print_area": {
      "x": 120,
      "y": 100,
      "width": 300,
      "height": 400
    },
    "safe_zone": {
      "x": 140,
      "y": 120,
      "width": 260,
      "height": 360
    }
  },
  "background": "white",
  "fabric_type": "cotton"
}
```

### 2.2 Compositing Pipeline

```
Design Input
    ↓
Halftone Processing (applied to design)
    ↓
Fabric Texture Overlay (subtle weave pattern)
    ↓
Product Template Loading (blank garment)
    ↓
Composition (multiply blend mode)
    ↓
Color Adjustment (fabric absorption simulation)
    ↓
Lighting Effects (realistic shadows/highlights)
    ↓
Fabric Wrinkles (subtle garment folds)
    ↓
Output: Realistic Mockup
```

---

## 3. Product Template System

### 3.1 Product Types

| Product | Placements | Views | Complexity |
|---------|-------------|--------|------------|
| **T-Shirt** | front_chest, back_full, left_sleeve, right_sleeve, internal_neckline | flat, worn_front, worn_back, closeup | Low |
| **Hoodie** | front_chest, back_full, hood_down, pocket | flat, worn_front, worn_back, closeup | Medium |
| **Tote Bag** | front_full, back_full | flat, worn_front | Low |
| **Beanie** | main_stitch, front_branded | flat, worn_front | Low |
| **Poster** | front_full | flat, closeup | Low |

### 3.2 Template Metadata

```typescript
interface ProductTemplate {
  id: string;
  productType: 'tshirt' | 'hoodie' | 'tote_bag' | 'beanie' | 'poster';
  placement: string;
  blankImage: string; // URL to template image
  printArea: Rectangle; // x, y, width, height
  safeZone: Rectangle; // x, y, width, height
  fabricTexture: string; // URL to texture overlay
  fabricType: 'cotton' | 'polyester' | 'canvas';
  placementConfig: PlacementConfig;
}

interface PlacementConfig {
  defaultScale: number;
  maxScale: number;
  position: 'center' | 'top-left' | 'bottom-right';
  blendMode: 'multiply' | 'overlay' | 'normal';
}
```

---

## 4. Mockup Generation Pipeline

### 4.1 Halftone Integration

**Critical Feature**: Use ACTUAL halftoned layers (not smooth original)

```typescript
async function generateAuthenticMockup(
  designId: string,
  halftoneLayerUrls: string[], // The actual halftoned PSD layers
  productType: string,
  placement: string
): Promise<Buffer> {
  
  // 1. Get product template
  const template = await getProductTemplate(productType, placement);
  
  // 2. IMPORTANT: Composite halftoned layers (not smooth original)
  const halftoneComposite = await compositeHalftoneLayersForMockup(
    halftoneLayerUrls
  );
  
  // 3. Calculate optimal placement
  const placementData = calculateDesignPlacement(template, halftoneComposite);
  
  // 4. Apply realistic product effects
  const mockup = await applyProductEffects(halftoneComposite, template, {
    placement: placementData,
    effects: {
      fabricTexture: true,      // Show fabric weave through halftone
      lighting: 'natural',       // Realistic lighting
      wrinkles: 'subtle',        // Natural garment folds
      colorAdjustment: true      // Fabric ink absorption
    }
  });
  
  // 5. Export high-quality mockup
  return mockup
    .jpeg({ quality: 90 })
    .toBuffer();
}
```

### 4.2 Realistic Effects Application

```typescript
async function applyProductEffects(
  halftoneDesign: Buffer,
  template: ProductTemplate,
  options: MockupOptions
): Promise<Buffer> {
  
  // 1. Apply fabric texture overlay (makes halftone more realistic)
  const withTexture = options.effects.fabricTexture
    ? await applyFabricTexture(halftoneDesign, template.fabricType)
    : halftoneDesign;
  
  // 2. Composite onto product template
  let mockup = await sharp(template.blankImage)
    .composite([{
      input: withTexture,
      top: options.placement.y,
      left: options.placement.x,
      blend: 'multiply'  // Blend with fabric texture
    }]);
  
  // 3. Apply color adjustment for fabric ink absorption
  if (options.effects.colorAdjustment) {
    mockup = mockup.modulate({
      brightness: 0.95,  // Slightly darker (ink absorption)
      saturation: 0.9    // Slightly less saturated (fabric texture)
    });
  }
  
  // 4. Export high-quality mockup
  return mockup
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Apply fabric texture overlay for realism
async function applyFabricTexture(
  design: Buffer,
  fabricType: 'cotton' | 'polyester' | 'canvas'
): Promise<Buffer> {
  
  // Load fabric texture based on type
  const fabricTexture = await loadFabricTexture(fabricType);
  
  // Overlay subtle fabric weave
  return sharp(design)
    .composite([{
      input: fabricTexture,
      blend: 'overlay',
      opacity: 0.15  // Subtle texture
    }])
    .toBuffer();
}
```

### 4.3 Customer-Facing Messaging

**On Product Page:**
```typescript
interface ProductMockupDisplay {
  mainImage: string;          // Primary mockup with halftone visible
  thumbnails: string[];       // Multiple views
  zoomEnabled: boolean;       // Allow customers to see halftone detail
  description: string;
}

const mockupDisplay: ProductMockupDisplay = {
  mainImage: mockups.find(m => m.view === 'worn_front').url,
  thumbnails: mockups.map(m => m.url),
  zoomEnabled: true,
  description: `
💡 AUTHENTIC SCREEN PRINT AESTHETIC

This design uses professional halftone screen printing techniques 
for a vintage, hand-crafted look. The subtle texture you see in 
preview is exactly how your product will look!

✅ What you see = What you get

[Zoom In] to see authentic halftone detail
  `
};
```

---

## 5. Multi-Position Support

### 5.1 Placement Options

```typescript
const PLACEMENT_OPTIONS = {
  front_chest: {
    area: '12x16 inches',
    offset: '3 inches from collar',
    mockupViews: ['flat_front', 'worn_front', 'closeup']
  },
  back_full: {
    area: '14x18 inches',
    offset: '2 inches from collar',
    mockupViews: ['flat_back', 'worn_back', 'closeup']
  },
  left_sleeve: {
    area: '3x4 inches',
    offset: '3 inches from shoulder seam',
    mockupViews: ['worn_sleeve', 'closeup']
  },
  right_sleeve: {
    area: '3x4 inches',
    offset: '3 inches from shoulder seam',
    mockupViews: ['worn_sleeve', 'closeup']
  },
  internal_neckline: {
    area: '2x1 inches',
    offset: 'center back collar',
    mockupViews: ['flat_internal', 'closeup']
  }
};
```

### 5.2 Multi-View Generation

```typescript
async function generateAllMockupViews(
  designId: string,
  halftoneLayerUrls: string[],
  approvedPlacements: string[]
) {
  const allMockups = [];
  
  for (const placement of approvedPlacements) {
    const placementConfig = PLACEMENT_OPTIONS[placement];
    
    for (const view of placementConfig.mockupViews) {
      const mockup = await generateProductMockup(
        designId,
        halftoneLayerUrls,
        ['productType'],
        [placement]
      );
      
      allMockups.push({
        placement: placement,
        view: view,
        url: mockup[0].mockupUrl
      });
    }
  }
  
  return allMockups;
}
```

---

## 6. Authenticity Features

### 6.1 Halftone Visibility

**Why Visible Halftone Matters:**
- Customer sees: Halftoned design with subtle texture
- Customer receives: Exact match to mockup
- Result: Perfect expectations, higher satisfaction, no "looks different" complaints

**Implementation:**
```typescript
// Customer-facing toggle
interface MockupDisplayOptions {
  showHalftone: boolean; // Always true for authenticity
  zoomLevel: 'normal' | 'detail' | 'ultra_detail';
}

function getHalftoneZoomLevel(level: string): number {
  switch (level) {
    case 'normal': return 1.0;   // Normal view
    case 'detail': return 2.5;    // 250% zoom
    case 'ultra_detail': return 4.0; // 400% zoom
  }
}
```

### 6.2 Fabric Texture Library

| Fabric Type | Texture Filename | Blend Mode | Opacity |
|-------------|------------------|-------------|----------|
| **Cotton** | cotton_weave.jpg | overlay | 0.12 |
| **Polyester** | polyester_weave.jpg | overlay | 0.10 |
| **Canvas** | canvas_weave.jpg | overlay | 0.15 |
| **Tri-Blend** | tri_blend_weave.jpg | overlay | 0.08 |

### 6.3 Lighting Effects

```typescript
async function applyRealisticLighting(
  mockup: Buffer,
  lightingType: 'natural' | 'studio' | 'outdoor'
): Promise<Buffer> {
  
  const configs = {
    natural: {
      brightness: 1.0,
      contrast: 1.1,
      shadows: true
    },
    studio: {
      brightness: 1.05,
      contrast: 1.15,
      shadows: true
    },
    outdoor: {
      brightness: 0.95,
      contrast: 1.05,
      saturation: 1.1,
      shadows: true
    }
  };
  
  return sharp(mockup)
    .modulate(configs[lightingType])
    .toBuffer();
}
```

---

## 7. Database Schema

```sql
-- Product templates
CREATE TABLE product_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type TEXT NOT NULL,
  placement TEXT NOT NULL,
  blank_image_url TEXT NOT NULL,
  print_area JSONB NOT NULL,
  safe_zone JSONB NOT NULL,
  fabric_texture_url TEXT,
  fabric_type TEXT,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mockup records
CREATE TABLE product_mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_session_id UUID REFERENCES design_sessions(id),
  product_type TEXT NOT NULL,
  placement TEXT NOT NULL,
  view_type TEXT NOT NULL,
  mockup_url TEXT NOT NULL,
  shows_halftone BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_mockups_design ON product_mockups(design_session_id);
CREATE INDEX idx_product_mockups_primary ON product_mockups(design_session_id, is_primary) WHERE is_primary = true;
```

---

## 8. API Endpoints

```typescript
// Generate all mockup views for a design
POST /api/mockups/generate-all
{
  designId: string;
  halftoneLayerUrls: string[];
  approvedPlacements: string[];
  productTypes: string[];
}

// Generate single mockup view
POST /api/mockups/generate
{
  designId: string;
  halftoneLayerUrls: string[];
  productType: string;
  placement: string;
}

// Regenerate mockups after design changes
POST /api/mockups/regenerate
{
  designId: string;
  reason: 'design_update' | 'placement_change' | 'halftone_regen';
}
```

---

**Last Updated**: January 17, 2026
**Status**: Technical Reference (Active for Phase 8+ Development)
**Owner**: Victor Bendas
