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
  original_color?: string | null;
  rgb?: [number, number, number] | null;
  coverage?: number | null;
  type?: string;
  channel?: string;
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

export interface WhiteBaseLayer {
  layer: number;
  filename: string;
  path: string;
  choke_applied: boolean;
  choke_px: number;
  original_area: number;
  choked_area: number;
  area_reduction_percent?: number;
}

export interface SeparationResponse {
  success: boolean;
  color_mode: string;
  print_method: string;
  original_colors: ColorCluster[];
  filtered_colors: Array<{
    rgb: [number, number, number];
    hex: string;
    reason: string;
  }>;
  kept_colors: number;
  garment_reveal_coverage: number;
  pantone_mappings: PantoneMapping[];
  white_base_layer: WhiteBaseLayer | null;
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
