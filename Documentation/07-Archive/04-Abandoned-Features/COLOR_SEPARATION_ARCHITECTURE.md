# Color Separation Architecture: Initial Implementation

## Overview

This document outlines the technical architecture for our deterministic color separation system using Sharp.js as the foundation. This system will serve as the baseline that Expert A will score and that we'll later enhance with machine learning.

---

## 🏗️ **System Architecture**

### **Core Components**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Input Design  │───▶│ Color Separation │───▶│ Halftone Files  │
│   (Any Format)  │    │     Engine       │    │  (Print Ready)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Expert's Scoring │
                       │    Interface     │
                       └──────────────────┘
```

### **Technology Stack**

- **Core Engine:** Sharp.js (Node.js image processing)
- **Canvas Operations:** node-canvas (for halftone generation)
- **Database:** Supabase (storing results + Expert's scores)
- **File Storage:** Supabase Storage (layer files + halftones)
- **API:** Next.js API routes (integration with platform)

---

## 🔧 **Detailed Implementation**

### **1. Color Analysis Engine**

```typescript
interface ColorAnalysisConfig {
  maxColors: number;          // 2-6 colors depending on print method
  tolerance: number;          // Color matching tolerance (0-100)
  minColorArea: number;       // Minimum pixels for significant color
  quantizationLevels: number; // Color precision reduction (16-64)
}

interface DominantColor {
  r: number;
  g: number; 
  b: number;
  pixelCount: number;
  percentage: number;
  brightness: number;
}
```

**Algorithm Flow:**
1. **Load Image:** Sharp.js loads and converts to RGBA buffer
2. **Pixel Analysis:** Iterate through all pixels, skip transparent
3. **Color Quantization:** Reduce precision to group similar colors
4. **Frequency Analysis:** Count pixel occurrences for each quantized color
5. **Significance Filter:** Remove colors below minimum area threshold
6. **Dominant Selection:** Sort by frequency, take top N colors

**Code Structure:**
```typescript
class ColorAnalysisEngine {
  async analyzeImage(buffer: Buffer): Promise<DominantColor[]> {
    // Convert image to raw pixel data
    const { data, info } = await sharp(buffer)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    
    // Build color histogram with quantization
    const colorMap = this.buildColorHistogram(data, info);
    
    // Extract and rank dominant colors
    return this.extractDominantColors(colorMap, info);
  }
  
  private quantizeColor(r: number, g: number, b: number): QuantizedColor {
    const levels = this.config.quantizationLevels;
    const step = Math.floor(256 / levels);
    
    return {
      r: Math.floor(r / step) * step,
      g: Math.floor(g / step) * step,
      b: Math.floor(b / step) * step
    };
  }
}
```

### **2. Print Method Optimization**

```typescript
interface PrintMethodConfig {
  screen: {
    maxColors: 4;
    prioritizeContrast: true;
    minimumSeparation: 40; // Brightness difference
    preferFewColors: true;
  };
  dtg: {
    maxColors: 8;
    allowGradients: true;
    fineDetail: true;
    colorBlending: true;
  };
  dtf: {
    maxColors: 6;
    sharpEdges: true;
    highContrast: true;
    solidColors: true;
  };
}
```

**Screen Print Optimization:**
```typescript
optimizeForScreenPrint(colors: DominantColor[]): OptimizedColor[] {
  // Step 1: Limit to cost-effective color count
  let selected = colors.slice(0, 4);
  
  // Step 2: Sort by print order (dark to light)
  selected.sort((a, b) => this.getBrightness(a) - this.getBrightness(b));
  
  // Step 3: Ensure minimum contrast between colors
  selected = this.ensureContrast(selected, 40);
  
  // Step 4: Check for screen printing compatibility
  selected = this.validateScreenCompatibility(selected);
  
  return selected.map((color, index) => ({
    ...color,
    printOrder: index + 1,
    screenAngle: SCREEN_ANGLES[index],
    meshRecommendation: this.recommendMesh(color)
  }));
}
```

### **3. Layer Separation Engine**

```typescript
interface SeparationLayer {
  layerId: string;
  color: OptimizedColor;
  layerBuffer: Buffer;
  maskBuffer: Buffer;
  fileName: string;
  printSpecs: LayerPrintSpecs;
}

interface LayerPrintSpecs {
  screenAngle: number;      // Halftone angle (0-90°)
  frequency: number;        // Lines per inch (45-85 LPI)
  dotShape: 'round' | 'elliptical' | 'square';
  meshSize: string;         // Screen mesh (e.g., "230T")
  inkType: 'plastisol' | 'water-based' | 'discharge';
}
```

**Layer Generation Process:**
```typescript
async generateSeparationLayers(
  originalBuffer: Buffer, 
  optimizedColors: OptimizedColor[]
): Promise<SeparationLayer[]> {
  
  const layers: SeparationLayer[] = [];
  
  for (let i = 0; i < optimizedColors.length; i++) {
    const color = optimizedColors[i];
    
    // Create color isolation mask
    const mask = await this.createColorMask(originalBuffer, color);
    
    // Generate layer with isolated color
    const layerBuffer = await this.applyColorMask(originalBuffer, mask, color);
    
    // Create print specifications
    const printSpecs = this.generatePrintSpecs(color, i);
    
    layers.push({
      layerId: `layer_${i + 1}`,
      color,
      layerBuffer,
      maskBuffer: mask,
      fileName: `Layer_${i + 1}_${this.colorToName(color)}.png`,
      printSpecs
    });
  }
  
  return layers;
}
```

### **4. Halftone Generation**

```typescript
interface HalftoneConfig {
  frequency: number;    // Lines per inch
  angle: number;        // Screen angle in degrees
  dotShape: DotShape;   // Shape of halftone dots
  threshold: number;    // Dot generation threshold
}

const STANDARD_SCREEN_ANGLES = {
  black: 45,    // Most neutral angle
  cyan: 75,     // Avoid moiré with black
  magenta: 15,  // Avoid moiré with cyan
  yellow: 0     // Least visible, can use any angle
};
```

**Halftone Algorithm:**
```typescript
async createHalftone(
  layerBuffer: Buffer,
  config: HalftoneConfig
): Promise<Buffer> {
  
  // Convert to grayscale for halftone processing
  const grayscaleData = await sharp(layerBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { data, info } = grayscaleData;
  const { width, height } = info;
  const halftoneData = Buffer.alloc(data.length);
  
  // Apply halftone pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      const grayValue = data[pixelIndex];
      
      // Calculate dot size based on gray value
      const dotSize = this.calculateDotSize(grayValue, config);
      
      // Determine if this pixel should print
      const shouldPrint = this.evaluateHalftonePoint(
        x, y, dotSize, config
      );
      
      halftoneData[pixelIndex] = shouldPrint ? 0 : 255;
    }
  }
  
  return sharp(halftoneData, {
    raw: { width, height, channels: 1 }
  }).png().toBuffer();
}

private calculateDotSize(grayValue: number, config: HalftoneConfig): number {
  // Darker pixels = larger dots
  const normalizedGray = grayValue / 255;
  const dotSize = (1 - normalizedGray) * config.maxDotSize;
  
  return Math.max(0, Math.min(1, dotSize));
}

private evaluateHalftonePoint(
  x: number, 
  y: number, 
  dotSize: number, 
  config: HalftoneConfig
): boolean {
  
  const { frequency, angle } = config;
  
  // Convert angle to radians
  const rad = (angle * Math.PI) / 180;
  
  // Rotate coordinates
  const rotX = x * Math.cos(rad) - y * Math.sin(rad);
  const rotY = x * Math.sin(rad) + y * Math.cos(rad);
  
  // Calculate grid spacing
  const gridSpacing = 72 / frequency; // Convert LPI to pixels (assuming 72 DPI base)
  
  // Find nearest grid point
  const gridX = Math.round(rotX / gridSpacing) * gridSpacing;
  const gridY = Math.round(rotY / gridSpacing) * gridSpacing;
  
  // Calculate distance from grid center
  const distance = Math.sqrt(
    Math.pow(rotX - gridX, 2) + Math.pow(rotY - gridY, 2)
  );
  
  // Calculate maximum dot radius for this gray level
  const maxRadius = (gridSpacing / 2) * Math.sqrt(dotSize);
  
  return distance <= maxRadius;
}
```

---

## 📊 **Output Specifications**

### **File Structure**
```
design_12345_separation/
├── original.png                 # Original design
├── preview.png                  # Combined preview
├── layers/
│   ├── Layer_1_Black.png       # Separated layer files
│   ├── Layer_2_Red.png
│   └── Layer_3_Yellow.png
├── halftones/
│   ├── Halftone_1_Black_45deg.png
│   ├── Halftone_2_Red_75deg.png  
│   └── Halftone_3_Yellow_0deg.png
└── print_specs.json            # Production specifications
```

### **Print Specifications JSON**
```json
{
  "designId": "design_12345",
  "separationId": "sep_67890", 
  "timestamp": "2025-01-10T14:30:00Z",
  "printMethod": "screen",
  "colorCount": 3,
  "colors": [
    {
      "layerNumber": 1,
      "name": "Black",
      "rgb": [0, 0, 0],
      "hex": "#000000",
      "printOrder": 1,
      "screenAngle": 45,
      "frequency": 55,
      "meshRecommendation": "230T",
      "inkType": "plastisol",
      "coverage": "85%"
    }
  ],
  "productionNotes": [
    "Print black first for best registration",
    "Use standard plastisol inks",
    "Cure at 320°F for 60 seconds"
  ],
  "qualityChecks": [
    "Verify dot pattern clarity",
    "Check color registration alignment", 
    "Confirm ink opacity"
  ]
}
```

---

## 🔄 **Processing Workflow**

### **API Endpoint Integration**
```typescript
// API Route: /api/color-separation
export async function POST(request: Request) {
  const { designId, printMethod } = await request.json();
  
  try {
    // Step 1: Retrieve design from database
    const design = await getDesign(designId);
    
    // Step 2: Initialize separation engine
    const engine = new ColorSeparationEngine({
      printMethod,
      qualityLevel: 'production'
    });
    
    // Step 3: Process color separation
    const separation = await engine.processSeparation(design.buffer);
    
    // Step 4: Save results to storage
    const savedFiles = await saveToStorage(separation);
    
    // Step 5: Queue for Expert's scoring
    await queueForExpertScoring(designId, separation);
    
    // Step 6: Update database
    await updateDesignSeparation(designId, {
      separationId: separation.id,
      status: 'completed',
      fileUrls: savedFiles,
      processedAt: new Date()
    });
    
    return Response.json({
      success: true,
      separationId: separation.id,
      colorCount: separation.colors.length,
      files: savedFiles
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### **Database Schema**
```sql
-- Color separation results
CREATE TABLE color_separations (
  id UUID PRIMARY KEY,
  design_id UUID REFERENCES designs(id),
  print_method TEXT CHECK (print_method IN ('screen', 'dtg', 'dtf')),
  color_count INTEGER,
  colors JSONB, -- Array of color specifications
  file_urls JSONB, -- URLs to layer and halftone files
  print_specs JSONB, -- Production specifications
  processing_time_ms INTEGER,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Expert's scoring (will be populated by scoring interface)
CREATE TABLE expert_scores (
  id UUID PRIMARY KEY,
  separation_id UUID REFERENCES color_separations(id),
  color_accuracy DECIMAL(2,1) CHECK (color_accuracy >= 1 AND color_accuracy <= 5),
  print_efficiency DECIMAL(2,1) CHECK (print_efficiency >= 1 AND print_efficiency <= 5),
  technical_quality DECIMAL(2,1) CHECK (technical_quality >= 1 AND technical_quality <= 5),
  production_feasibility DECIMAL(2,1) CHECK (production_feasibility >= 1 AND production_feasibility <= 5),
  overall_score DECIMAL(2,1) CHECK (overall_score >= 1 AND overall_score <= 5),
  notes TEXT,
  scored_at TIMESTAMP DEFAULT NOW()
);

-- Production validation (when designs are actually printed)
CREATE TABLE production_validations (
  id UUID PRIMARY KEY,
  separation_id UUID REFERENCES color_separations(id),
  print_result_photo TEXT, -- URL to photo of printed result
  customer_satisfaction DECIMAL(2,1),
  reproduction_accuracy DECIMAL(2,1),
  defect_rate DECIMAL(3,2),
  production_notes TEXT,
  validated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📈 **Performance Targets**

### **Processing Speed**
- Simple designs (2-3 colors): < 5 seconds
- Complex designs (4+ colors): < 15 seconds  
- High-resolution images (>300 DPI): < 30 seconds

### **Quality Metrics**
- Color accuracy: 95%+ match to original intent
- Halftone quality: No visible moiré patterns
- Print readiness: 100% production-compatible output
- File compatibility: Works with all major RIP software

### **Scalability**
- Concurrent processing: 10+ separations simultaneously
- Daily volume: 500+ separations without performance degradation
- File storage: Efficient compression while maintaining quality

---

## 🔍 **Error Handling**

### **Common Issues & Solutions**
```typescript
enum SeparationError {
  INSUFFICIENT_COLORS = 'Too few significant colors detected',
  TOO_MANY_COLORS = 'Design too complex for selected print method',
  LOW_CONTRAST = 'Insufficient contrast between colors',
  INVALID_FORMAT = 'Unsupported image format or corruption',
  PROCESSING_TIMEOUT = 'Image too large or complex to process'
}

class SeparationErrorHandler {
  static async handleError(error: SeparationError, context: ProcessingContext) {
    switch (error) {
      case SeparationError.TOO_MANY_COLORS:
        // Automatically reduce color count and retry
        return await this.reduceColorComplexity(context);
        
      case SeparationError.LOW_CONTRAST:
        // Enhance contrast and retry
        return await this.enhanceContrast(context);
        
      case SeparationError.PROCESSING_TIMEOUT:
        // Resize image and retry
        return await this.resizeAndRetry(context);
        
      default:
        throw new ProcessingError(`Unable to process: ${error}`);
    }
  }
}
```

---

## 🚀 **Deployment Strategy**

### **Phase 1: Internal Testing (Month 1)**
- Deploy to staging environment
- Process 100+ test designs
- Validate output quality manually
- Performance optimization

### **Phase 2: Expert Integration (Month 2)**
- Deploy scoring interface
- Train Expert on scoring system
- Begin daily scoring routine
- Collect baseline dataset

### **Phase 3: Production Launch (Month 3)**
- Deploy to production
- Process real artist designs
- Monitor performance metrics
- Collect user feedback

### **Phase 4: Data Collection (Months 4-6)**
- Scale to 50+ daily separations
- Accumulate 1,000+ Expert scores
- Analyze patterns in scoring
- Prepare for ML enhancement

This deterministic system serves as the foundation that Expert will score and that we'll later enhance with machine learning based on his expert feedback.