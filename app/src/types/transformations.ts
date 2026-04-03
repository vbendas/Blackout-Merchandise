/**
 * Transformation types and constants for Cloudinary image processing
 * Used in the Merch Studio for non-destructive image transformations
 */

// All available transformation types
export type TransformationType =
  // Background
  | 'remove_bg'
  // Enhance
  | 'auto_enhance'
  | 'sharpen'
  | 'upscale'
  | 'noise_reduction'
  | 'gen_restore'
  // Adjustments
  | 'brightness'
  | 'contrast'
  | 'saturation'
  // Effects
  | 'grayscale'
  | 'sepia'
  | 'vignette'
  | 'oil_paint'
  | 'cartoonify'
  | 'vectorize'
  // Geometry
  | 'flip_h'
  | 'flip_v'
  | 'rotate_90'
  | 'rotate_180'
  | 'rotate_270'
  // Style
  | 'drop_shadow'
  | 'border'
  | 'round_corners'
  | 'tint'
  // Advanced AI
  | 'gen_fill'
  | 'smart_crop'
  | 'gen_recolor'
  // Arrange (client-side only)
  | 'bring_front'
  | 'send_back'
  | 'move_up'
  | 'move_down';

// Specific parameter types for transformations
export interface SliderParams {
  value: number;
}

export interface AmountParams {
  amount: number;
}

export interface StrengthParams {
  strength: number;
}

export interface ColorParams {
  color: string;
}

export interface ShadowParams {
  x: number;
  y: number;
  blur: number;
  color: string;
}

export interface BorderParams {
  width: number;
  color: string;
}

export interface RadiusParams {
  radius: number;
}

export interface TintParams {
  color: string;
  strength: number;
}

export interface RecolorParams {
  target: string;
  color: string;
}

// Union type for all transformation parameters
export type TransformationParams =
  | SliderParams
  | AmountParams
  | StrengthParams
  | ColorParams
  | ShadowParams
  | BorderParams
  | RadiusParams
  | TintParams
  | RecolorParams
  | Record<string, never>; // for transformations without params

// Transformation with parameters
// Using flexible Record for runtime compatibility while specific types are exported for documentation
export interface Transformation {
  type: TransformationType;
  params?: Record<string, string | number>;
  appliedAt: number;
}

// Transformation category for hierarchical menu
export interface TransformationCategory {
  id: string;
  label: string;
  icon: string;
  transformations: TransformationType[];
}

// Transformation categories organized for UI
export const TRANSFORMATION_CATEGORIES: TransformationCategory[] = [
  {
    id: 'background',
    label: 'Background',
    icon: 'ImageOff',
    transformations: ['remove_bg'],
  },
  {
    id: 'enhance',
    label: 'Enhance',
    icon: 'Wand2',
    transformations: ['auto_enhance', 'sharpen', 'upscale', 'noise_reduction', 'gen_restore'],
  },
  {
    id: 'adjustments',
    label: 'Adjustments',
    icon: 'SlidersHorizontal',
    transformations: ['brightness', 'contrast', 'saturation'],
  },
  {
    id: 'effects',
    label: 'Effects',
    icon: 'Sparkles',
    transformations: ['grayscale', 'sepia', 'vignette', 'oil_paint', 'cartoonify', 'vectorize'],
  },
  {
    id: 'geometry',
    label: 'Flip & Rotate',
    icon: 'RotateCw',
    transformations: ['flip_h', 'flip_v', 'rotate_90', 'rotate_180', 'rotate_270'],
  },
  {
    id: 'style',
    label: 'Style',
    icon: 'Palette',
    transformations: ['drop_shadow', 'border', 'round_corners', 'tint'],
  },
  {
    id: 'arrange',
    label: 'Arrange',
    icon: 'Layers',
    transformations: ['bring_front', 'send_back', 'move_up', 'move_down'],
  },
  {
    id: 'advanced',
    label: 'Advanced AI',
    icon: 'Brain',
    transformations: ['gen_fill', 'smart_crop', 'gen_recolor'],
  },
];

// Human-readable labels for transformations
export const TRANSFORMATION_LABELS: Record<TransformationType, string> = {
  remove_bg: 'Remove Background',
  auto_enhance: 'Auto-Enhance',
  sharpen: 'Sharpen',
  upscale: 'AI Upscale',
  noise_reduction: 'Noise Reduction',
  gen_restore: 'AI Restore',
  brightness: 'Brightness',
  contrast: 'Contrast',
  saturation: 'Saturation',
  grayscale: 'Grayscale',
  sepia: 'Sepia',
  vignette: 'Vignette',
  oil_paint: 'Oil Paint',
  cartoonify: 'Cartoonify',
  vectorize: 'Vectorize',
  flip_h: 'Flip Horizontal',
  flip_v: 'Flip Vertical',
  rotate_90: 'Rotate 90°',
  rotate_180: 'Rotate 180°',
  rotate_270: 'Rotate 270°',
  drop_shadow: 'Drop Shadow',
  border: 'Add Border',
  round_corners: 'Round Corners',
  tint: 'Tint Color',
  gen_fill: 'AI Generative Fill',
  smart_crop: 'AI Smart Crop',
  gen_recolor: 'AI Recolor',
  bring_front: 'Bring to Front',
  send_back: 'Send to Back',
  move_up: 'Move Up',
  move_down: 'Move Down',
};

// Parameter definitions for transformations that need them
export interface TransformationParamDef {
  name: string;
  type: 'slider' | 'color' | 'select';
  min?: number;
  max?: number;
  default: string | number;
  step?: number;
}

export const TRANSFORMATION_PARAMS: Partial<Record<TransformationType, TransformationParamDef[]>> = {
  brightness: [{ name: 'value', type: 'slider', min: -100, max: 100, default: 0, step: 1 }],
  contrast: [{ name: 'value', type: 'slider', min: -100, max: 100, default: 0, step: 1 }],
  saturation: [{ name: 'value', type: 'slider', min: -100, max: 100, default: 0, step: 1 }],
  sharpen: [{ name: 'amount', type: 'slider', min: 0, max: 200, default: 100, step: 10 }],
  vignette: [{ name: 'strength', type: 'slider', min: 0, max: 100, default: 30, step: 5 }],
  oil_paint: [{ name: 'strength', type: 'slider', min: 0, max: 100, default: 30, step: 5 }],
  cartoonify: [{ name: 'strength', type: 'slider', min: 0, max: 100, default: 50, step: 5 }],
  drop_shadow: [
    { name: 'x', type: 'slider', min: 0, max: 50, default: 10, step: 1 },
    { name: 'y', type: 'slider', min: 0, max: 50, default: 10, step: 1 },
    { name: 'blur', type: 'slider', min: 0, max: 50, default: 10, step: 1 },
    { name: 'color', type: 'color', default: '#000000' },
  ],
  border: [
    { name: 'width', type: 'slider', min: 1, max: 20, default: 2, step: 1 },
    { name: 'color', type: 'color', default: '#FFFFFF' },
  ],
  round_corners: [{ name: 'radius', type: 'slider', min: 0, max: 100, default: 20, step: 5 }],
  tint: [
    { name: 'color', type: 'color', default: '#FF0000' },
    { name: 'strength', type: 'slider', min: 0, max: 100, default: 50, step: 5 },
  ],
};

// Print-ready file metadata
export interface PrintReadyFile {
  url: string;
  filename: string;
  format: 'tiff';
  pages: number;
  colors: SeparatedColorInfo[];
  dimensions: {
    width: number; // mm
    height: number; // mm
    dpi: number;
  };
  createdAt: number;
}

export interface SeparatedColorInfo {
  name: string;
  pantone: string;
  hex: string;
  pageNumber: number;
  order: number;
}

// Color cluster for screen printing
export interface ColorCluster {
  name: string;
  pantone: string;
  hex: string;
  isBase?: boolean;
  matches: string[]; // Similar hex colors that map to this cluster
}

// Screen printing color clusters (up to 8 colors including white base)
export const SCREEN_PRINTING_CLUSTERS: ColorCluster[] = [
  {
    name: 'White Base',
    pantone: 'Process White',
    hex: '#FFFFFF',
    isBase: true,
    matches: ['#FFFFFF', '#F5F5F5', '#FAFAFA', '#F0F0F0'],
  },
  {
    name: 'Process Black',
    pantone: 'Process Black',
    hex: '#000000',
    matches: ['#000000', '#1A1A1A', '#2D2D2D', '#1C1C1C', '#0D0D0D'],
  },
  {
    name: 'PMS 485 C Red',
    pantone: 'PMS 485 C',
    hex: '#DA291C',
    matches: ['#FF0000', '#DC143C', '#B22222', '#FF4444', '#CC0000', '#FF3333'],
  },
  {
    name: 'PMS 116 C Yellow',
    pantone: 'PMS 116 C',
    hex: '#FFCD00',
    matches: ['#FFD700', '#FFFF00', '#FFA500', '#FF8C00', '#FFC107', '#FFEB3B'],
  },
  {
    name: 'PMS 300 C Blue',
    pantone: 'PMS 300 C',
    hex: '#0066CC',
    matches: ['#0000FF', '#1E90FF', '#4169E1', '#00008B', '#0066CC', '#0055AA'],
  },
  {
    name: 'PMS 350 C Green',
    pantone: 'PMS 350 C',
    hex: '#2D5F2D',
    matches: ['#008000', '#228B22', '#006400', '#32CD32', '#2E7D32', '#388E3C'],
  },
  {
    name: 'PMS 259 C Purple',
    pantone: 'PMS 259 C',
    hex: '#6B2D5C',
    matches: ['#800080', '#9370DB', '#8A2BE2', '#4B0082', '#6A1B9A', '#7B1FA2'],
  },
  {
    name: 'PMS 152 C Orange',
    pantone: 'PMS 152 C',
    hex: '#FF6B35',
    matches: ['#FF4500', '#FF6347', '#FF7F50', '#FF5722', '#FF8A65', '#FFAB91'],
  },
];

// Print specifications
export const PRINT_SPECIFICATIONS = {
  canvas: {
    width: 420, // mm (A2)
    height: 594, // mm (A2)
    dpi: 300,
    margin: 10, // mm
    footerHeight: 8, // mm
  },
  designArea: {
    maxWidth: 380, // mm (38cm)
    maxHeight: 550, // mm (55cm)
  },
  halftone: {
    lpi: 45, // Lines per inch - sweet spot for DTG/DTF/Screen
    angle: 45, // degrees
  },
  maxColors: 8, // Including white base
  fileNaming: {
    separator: '-',
    dateFormat: 'DDMMYYYY',
  },
};

// Helper to calculate pixels from mm at given DPI
export function mmToPixels(mm: number, dpi: number = 300): number {
  return Math.round((mm * dpi) / 25.4);
}

// Helper to get canvas dimensions in pixels
export function getCanvasPixels(): { width: number; height: number } {
  const { canvas } = PRINT_SPECIFICATIONS;
  return {
    width: mmToPixels(canvas.width, canvas.dpi),
    height: mmToPixels(canvas.height, canvas.dpi),
  };
}

// Helper to get design area in pixels
export function getDesignAreaPixels(): { width: number; height: number } {
  const { designArea } = PRINT_SPECIFICATIONS;
  return {
    width: mmToPixels(designArea.maxWidth, PRINT_SPECIFICATIONS.canvas.dpi),
    height: mmToPixels(designArea.maxHeight, PRINT_SPECIFICATIONS.canvas.dpi),
  };
}
