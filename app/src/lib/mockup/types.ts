export type ViewType = 'flat' | 'worn' | 'closeup';
export type Placement = 'front_chest' | 'back_full' | 'left_sleeve' | 'right_sleeve' | 'internal_neckline';
export type FabricType = 'cotton' | 'polyester' | 'canvas' | 'tri_blend';

export interface MockupRequest {
  design_url: string;
  product_sku: string;
  color_code?: string;
  views?: ViewType[];
  placement?: Placement;
  fabric_type?: FabricType;
  halftone?: boolean;
  dpi?: number;
}

export interface MockupView {
  view_type: ViewType;
  high_res_url: string;
  web_res_url: string;
  width: number;
  height: number;
}

export interface MockupResponse {
  success: boolean;
  mockup_id: string;
  product_sku: string;
  views: MockupView[];
  generated_at: string;
  processing_time_ms: number;
}

export interface MockupBatchRequest {
  designs: MockupRequest[];
}

export interface BatchMockupResult {
  index: number;
  success: boolean;
  mockup?: MockupResponse;
  error?: string;
}

export interface MockupBatchResponse {
  success: boolean;
  batch_id: string;
  total: number;
  completed: number;
  failed: number;
  results: BatchMockupResult[];
  processing_time_ms: number;
}

export interface TemplateInfo {
  sku: string;
  name: string;
  category: string;
  available_views: ViewType[];
  available_placements: Placement[];
  fabric_types: FabricType[];
  thumbnail_url?: string;
}

export interface TemplatesResponse {
  success: boolean;
  templates: TemplateInfo[];
  total: number;
}

export interface ProductTemplate {
  sku: string;
  name: string;
  category: string;
  fabric_type: string;
  gsm: number;
  colors: Record<string, { name: string; hex: string; available: boolean }>;
  print_area: {
    chest: { x: number; y: number; width: number; height: number };
    center: { x: number; y: number; width: number; height: number };
  };
}
