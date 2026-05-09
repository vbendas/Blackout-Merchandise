# Color Separation Architecture - Technical Reference

> **Purpose**: This document is a technical reference for color separation system. Contains architecture and technical specifications for implementing halftone-based color separation with Pantone matching.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Color Detection Methods](#2-color-detection-methods)
3. [Halftone Angle Assignment](#3-halftone-angle-assignment)
4. [Pantone Matching System](#4-pantone-matching-system)
5. [Color Layer Generation](#5-color-layer-generation)
6. [Output Formats](#6-output-formats)

---

## 1. System Overview

### 1.1 Purpose

The Color Separation System automates the process of separating full-color artwork into individual printable color layers for screen printing, with proper halftone angles and Pantone matching. This reduces manual separation time from 2-3 hours to <30 seconds.

### 1.2 Key Features

- **Automated Color Detection**: K-means clustering with adaptive K
- **Intelligent Color Count**: Reduces from 15+ colors to optimal 4-8
- **Halftone Angle Assignment**: Industry-standard angles to prevent moiré patterns
- **Pantone Matching**: Matches detected colors to nearest Pantone codes (15,000+ library)
- **Color Layer Export**: Individual PNGs + master PSD with separated layers
- **Print Order Optimization**: Lightest to darkest for optimal registration

---

## 2. Color Detection Methods

### 2.1 K-Means Clustering Algorithm

**Purpose**: Group similar pixels into color clusters

```typescript
import cv from '@techstark/opencv-js';

interface DetectedColor {
  rgb: [number, number, number];
  lab: [number, number, number];
  hex: string;
  percentage: number;
  pantone?: string;
  pixels: number[][];
}

async function detectSpotColors(
  imageBuffer: Buffer, 
  options: { maxColors: number; minColorDifference: number }
): Promise<DetectedColor[]> {
  
  // 1. Load image
  const mat = cv.matFromImageData(
    await sharp(imageBuffer).raw().toBuffer()
  );
  
  // 2. Convert to LAB color space (better color separation)
  const lab = new cv.Mat();
  cv.cvtColor(mat, lab, cv.COLOR_RGB2Lab);
  
  // 3. Reshape to 2D array (pixels × 3 channels)
  const pixels = lab.data;
  const rows = lab.rows * lab.cols;
  const data = new cv.Mat(rows, 3, cv.CV_32F);
  
  for (let i = 0; i < rows; i++) {
    data.floatPtr(i, 0)[0] = pixels[i * 3];
    data.floatPtr(i, 1)[0] = pixels[i * 3 + 1];
    data.floatPtr(i, 2)[0] = pixels[i * 3 + 2];
  }
  
  // 4. Determine optimal K (adaptive)
  let optimalK = options.maxColors || 6;
  
  // Reduce if image is simple
  if (rows * cols < 500000) { // <700×700px
    optimalK = Math.min(optimalK, 4);
  }
  
  // 5. K-means clustering
  const labels = new cv.Mat();
  const centers = new cv.Mat();
  const criteria = new cv.TermCriteria(
    cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER,
    100, // Max iterations
    0.2  // Epsilon
  );
  
  cv.kmeans(
    data,
    optimalK,
    labels,
    criteria,
    10, // Attempts
    cv.KMEANS_PP_CENTERS // Initial center selection
  );
  
  // 6. Extract dominant colors
  const colors: DetectedColor[] = [];
  
  for (let i = 0; i < optimalK; i++) {
    const center = centers.floatPtr(i);
    const l = center[0];
    const a = center[1];
    const b = center[2];
    
    // Convert LAB back to RGB
    const rgb = labToRgb(l, a, b);
    
    // Count pixels
    const pixelCount = countPixelsInCluster(labels, i);
    const percentage = (pixelCount / rows) * 100;
    
    // Skip colors with <1% coverage
    if (percentage < 1) continue;
    
    colors.push({
      rgb: rgb,
      hex: rgbToHex(rgb),
      percentage: percentage,
      pantone: matchToPantone(rgb), // Optional: match to Pantone library
      pixels: getPixelCoordinates(labels, i, mat.cols)
    });
  }
  
  // 7. Merge similar colors
  return mergeSimilarColors(colors, options.minColorDifference);
}
```

### 2.2 Color Similarity Metrics

```typescript
// Delta E (CIE Lab) - perceptually accurate
function deltaE(c1: [number, number, number], c2: [number, number, number]): number {
  const dl = Math.sqrt(
    Math.pow(c2[0] - c1[0], 2) +
    Math.pow(c2[1] - c1[1], 2) +
    Math.pow(c2[2] - c1[2], 2)
  );
  return dl;
}

// Simple Euclidean in RGB (fallback)
function colorDistance(rgb1: number[], rgb2: number[]): number {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
}
```

### 2.3 Adaptive Color Count

**Logic:**
- Start with maxColors = 8
- If any color has <3% coverage → Try K-7
- If any color has <3% coverage → Try K-6
- If any color has <3% coverage → Try K-5
- Minimum K = 4 (below 4 colors → manual review needed)

---

## 3. Halftone Angle Assignment

### 3.1 Industry-Standard Angles

**Purpose**: Prevent moiré patterns by using non-overlapping angles

```typescript
const HALFTONE_ANGLES = {
  black: 45,      // Baseline angle
  cyan: 15,       // 30° offset from black
  magenta: 75,    // 30° offset from cyan
  yellow: 0,      // 45° offset from magenta (least visible)
  white: 22.5,    // Underbase for dark garments
  red: 30,        // Custom spot color
  blue: 60,       // Custom spot color
  green: 52.5,    // Custom spot color
  orange: 37.5,   // Custom spot color
  custom: (index: number) => [45, 15, 75, 0, 22.5, 30, 60, 52.5][index % 8]
};
```

### 3.2 Angle Assignment Algorithm

```typescript
function determinePrintOrder(
  colorName: string,
  allColors: DetectedColor[]
): number {
  // White underbase always first
  if (colorName === 'white') return 1;
  
  // Sort by luminance (perceived brightness)
  const sorted = allColors
    .map(c => ({ 
      name: identifyColorName(c.rgb), 
      luminance: getLuminance(c.rgb) 
    }))
    .sort((a, b) => b.luminance - a.luminance);
  
  return sorted.findIndex(c => c.name === colorName) + 1;
}

function getLuminance(rgb: number[]): number {
  // Perceived luminance formula
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

interface ColorLayer {
  id: string;
  name: string;
  rgb: [number, number, number];
  pantone?: string;
  angle: number;
  frequency: number; // Lines per inch (LPI)
  dotShape: 'round' | 'ellipse' | 'square';
  pixels: number[][];
  printOrder: number; // 1 = first layer, 2 = second, etc.
}
```

### 3.3 Angle Validation

**Moiré Prevention Rules:**
- Minimum angle difference: 15° between any two colors
- No two angles should be within ±5° of each other
- Custom colors (non-CMYK) use rotation pattern starting from 45°

**Example:**
```
Valid:   Black=45°, Cyan=15°, Magenta=75°, Yellow=0°
          (All differences ≥ 15°) ✅

Invalid: Black=45°, Cyan=50°, Magenta=60°, Yellow=15°
          (Cyan-Yellow difference = 35° < 15°) ❌
```

---

## 4. Pantone Matching System

### 4.1 Pantone Library

**Database Structure:**
```sql
CREATE TABLE pantone_library (
  code TEXT PRIMARY KEY, -- e.g., "PMS 185 C"
  name TEXT,              -- e.g., "Ultramarine Green"
  hex TEXT NOT NULL,      -- #00FF9F
  rgb_r INTEGER NOT NULL,   -- 0-255
  rgb_g INTEGER NOT NULL,   -- 0-255
  rgb_b INTEGER NOT NULL,   -- 0-255
  lab_l REAL NOT NULL,
  lab_a REAL NOT NULL,
  lab_b REAL NOT NULL,
  color_group TEXT,         -- e.g., "CMYK", "Spot"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pantone_rgb ON pantone_library(rgb_r, rgb_g, rgb_b);
CREATE INDEX idx_pantone_lab ON pantone_library(lab_l, lab_a, lab_b);
```

### 4.2 Matching Algorithm

```typescript
async function matchToPantone(rgb: number[]): Promise<string> {
  const lab = rgbToLab(rgb);
  
  // Find nearest Pantone in LAB space (perceptually accurate)
  const result = await db.query(`
    SELECT code, name, hex
    FROM pantone_library
    ORDER BY 
      POWER(lab_l - $1::real, 2) + 
           POWER(lab_a - $2::real, 2) + 
           POWER(lab_b - $3::real, 2)
    ASC
    LIMIT 1
  `, [lab[0], lab[1], lab[2]]);
  
  return result[0].code;
}

// RGB to LAB conversion
function rgbToLab(rgb: number[]): number[] {
  // Simplified conversion (full conversion requires complex math)
  return [0, 0, 0]; // Placeholder - use full conversion library
}
```

### 4.3 Tolerance Thresholds

| Tolerance Level | Delta E Range | Application |
|-----------------|----------------|-------------|
| **Exact** | <2 | Production match |
| **Very Close** | 2-5 | Acceptable for most jobs |
| **Acceptable** | 5-10 | May need minor adjustment |
| **Poor** | >10 | Requires color correction |

---

## 5. Color Layer Generation

### 5.1 Layer Structure

```typescript
async function generateColorLayers(
  imageBuffer: Buffer,
  detectedColors: DetectedColor[]
): Promise<ColorLayer[]> {
  
  return detectedColors.map((color, index) => {
    const colorName = identifyColorName(color.rgb);
    
    return {
      id: `layer_${index}`,
      name: colorName,
      rgb: color.rgb,
      pantone: color.pantone,
      angle: HALFTONE_ANGLES[colorName.toLowerCase()] || 
             HALFTONE_ANGLES.custom(index),
      frequency: 45, // 45 LPI standard for t-shirts
      dotShape: 'round',
      pixels: color.pixels,
      printOrder: determinePrintOrder(colorName, detectedColors)
    };
  });
}
```

### 5.2 Print Order Logic

**Standard Order:**
1. White underbase (if present)
2. Yellow (lightest CMYK)
3. Magenta
4. Cyan
5. Black
6-7. Spot colors in luminance order

**Rationale:** Lighter colors printed first → Better ink drying → Less picking up of darker inks

---

## 6. Output Formats

### 6.1 PSD Export

**Layer Structure:**
```
design_production_master.psd
├─ Layer 0: "White - Underbase (22.5°, 35 LPI)" [VISIBLE] ✅ PRINT
├─ Layer 1: "Yellow (0°, 45 LPI)" [VISIBLE] ✅ PRINT
├─ Layer 2: "Magenta (75°, 45 LPI)" [VISIBLE] ✅ PRINT
├─ Layer 3: "Cyan (15°, 45 LPI)" [VISIBLE] ✅ PRINT
├─ Layer 4: "Black (45°, 45 LPI)" [VISIBLE] ✅ PRINT
└─ Layer 5: "__PRODUCTION_INFO__" [HIDDEN]
```

### 6.2 File Formats

| Format | Purpose | Extension |
|---------|---------|-----------|
| **PSD** | Master file with layers | .psd |
| **PNG** | Individual layer exports | .png |
| **PDF** | Placement guide | .pdf |
| **JSON** | Production metadata | .json |

### 6.3 Metadata Format

```json
{
  "designId": "design_123",
  "dimensions": {
    "width": 4500,
    "height": 5400,
    "dpi": 300
  },
  "printMethod": "screen",
  "colorLayers": [
    {
      "name": "White",
      "pantone": "PMS WHITE",
      "angle": 22.5,
      "frequency": 35,
      "dotShape": "round",
      "printOrder": 1
    },
    {
      "name": "Black",
      "pantone": "PMS PROCESS BLACK",
      "angle": 45,
      "frequency": 45,
      "dotShape": "round",
      "printOrder": 4
    }
  ],
  "generatedAt": "2026-01-17T10:30:00Z",
  "processingTimeMs": 28500
}
```

---

## Implementation Notes

This document provides complete technical specification for implementing color separation system. For detailed code examples and algorithm implementations, refer to the original `COLOR_SEPARATION_ARCHITECTURE.md` file in the old documentation archive.

**Key Algorithms to Implement:**
1. K-means clustering for color detection (with adaptive K)
2. LAB color space conversion for perceptually accurate matching
3. Delta E calculation for Pantone matching
4. Angle assignment algorithm with moiré prevention
5. Print order optimization (lightest to darkest)

**Database Tables to Create:**
- `pantone_library` - 15,000+ Pantone codes
- `color_layer_cache` - Cached color match results
- `separation_jobs` - Track color separation processing

**API Endpoints:**
- `POST /api/color-separation/analyze` - Detect colors in image
- `POST /api/color-separation/generate-layers` - Generate separated layers
- `POST /api/color-separation/export-psd` - Export production-ready PSD

---

**Last Updated**: January 17, 2026
**Status**: Technical Reference (Active for Phase 8+ Development)
**Owner**: Victor Bendas
