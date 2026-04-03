export interface ColorCluster {
  rgb: [number, number, number];
  hex: string;
  coverage: number;
  pixel_count: number;
}

export interface SeparationLayer {
  layer: number | string;
  filename: string;
  path: string;
  original_color: string | null;
  rgb: [number, number, number] | null;
  coverage: number | null;
}

export interface PantoneMapping {
  original_color: {
    rgb: [number, number, number];
    hex: string;
  };
  best_match: {
    pantone: string;
    name: string;
    hex: string;
    rgb: [number, number, number];
    category: string;
    distance: number;
  };
  alternatives: Array<{
    pantone: string;
    name: string;
    hex: string;
    distance: number;
  }>;
  magna_recipe?: {
    base: string;
    pigment: string;
    notes?: string;
  };
}

export interface SeparationMetadata {
  processing_time_ms: number;
  algorithm: string;
  input_filename: string;
  garment_color: string;
}

export interface SeparationResponse {
  success: boolean;
  original_colors: ColorCluster[];
  filtered_colors: Array<{
    rgb: [number, number, number];
    hex: string;
    reason: string;
  }>;
  kept_colors: number;
  garment_reveal_coverage: number;
  pantone_mappings: PantoneMapping[];
  layers: SeparationLayer[];
  halftone_layers: Record<string, unknown> | null;
  metadata: SeparationMetadata;
  errors: string[];
}

export interface ClusterRequest {
  image: File;
  max_colors?: number;
}

export interface ClusterResponse {
  success: boolean;
  clusters: Array<{
    rgb: [number, number, number];
    hex: string;
    percentage: number;
    pixel_count: number;
  }>;
}

export interface PantoneMatch {
  pantone: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  category: string;
  distance: number;
  magna_recipe?: {
    base: string;
    pigment: string;
  };
}

export interface MapColorRequest {
  rgb?: number[];
  hex?: string;
}

export interface MapColorResponse {
  success: boolean;
  input: {
    rgb: number[] | null;
    hex: string | null;
  };
  matches: PantoneMatch[];
}

export interface PantoneColor {
  pantone: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  category: string;
  magna_base?: string;
  magna_pigment?: string;
}

export interface PantoneListResponse {
  success: boolean;
  colors: PantoneColor[];
}
