import type { ClusterResponse, MapColorResponse, PantoneListResponse, SeparationResponse } from './types';

const COLOR_SEPARATION_SERVICE_URL = process.env.COLOR_SEPARATION_SERVICE_URL || 'http://localhost:8001';

export class ColorSeparationClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || COLOR_SEPARATION_SERVICE_URL;
  }

  async separateColors(
    image: File,
    options: {
      garment_color?: string;
      max_colors?: number;
      threshold?: number;
      color_mode?: string;
      print_method?: string;
      choke_px?: number;
      trap_px?: number;
      skip_white_base?: boolean;
      include_halftone?: boolean;
    } = {}
  ): Promise<SeparationResponse> {
    const formData = new FormData();
    formData.append('image', image);

    if (options.garment_color) {
      formData.append('garment_color', options.garment_color);
    }
    if (options.max_colors) {
      formData.append('max_colors', options.max_colors.toString());
    }
    if (options.threshold) {
      formData.append('threshold', options.threshold.toString());
    }
    if (options.color_mode) {
      formData.append('color_mode', options.color_mode);
    }
    if (options.print_method) {
      formData.append('print_method', options.print_method);
    }
    if (options.choke_px !== undefined) {
      formData.append('choke_px', options.choke_px.toString());
    }
    if (options.trap_px !== undefined) {
      formData.append('trap_px', options.trap_px.toString());
    }
    if (options.skip_white_base !== undefined) {
      formData.append('skip_white_base', options.skip_white_base.toString());
    }
    if (options.include_halftone !== undefined) {
      formData.append('include_halftone', options.include_halftone.toString());
    }

    const response = await fetch(`${this.baseUrl}/api/v1/separate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Color separation failed: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  async clusterColors(image: File, maxColors: number = 6): Promise<ClusterResponse> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('max_colors', maxColors.toString());

    const response = await fetch(`${this.baseUrl}/api/v1/cluster`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Color clustering failed: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  async getPantoneColors(): Promise<PantoneListResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/pantone`);

    if (!response.ok) {
      throw new Error(`Failed to fetch Pantone colors: ${response.statusText}`);
    }

    return response.json();
  }

  async mapColorToPantone(options: { rgb?: number[] } | { hex?: string }): Promise<MapColorResponse> {
    const params = new URLSearchParams();

    if ('rgb' in options && options.rgb) {
      params.append('rgb', options.rgb.join(','));
    } else if ('hex' in options && options.hex) {
      params.append('hex', options.hex);
    }

    const response = await fetch(`${this.baseUrl}/api/v1/map-color?${params}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(`Color mapping failed: ${error.detail || response.statusText}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const colorSeparationClient = new ColorSeparationClient();
