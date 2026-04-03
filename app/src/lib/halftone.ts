/**
 * Halftone generation for screen printing
 * Creates halftone patterns at 45 LPI with 45° angle
 */

import { PRINT_SPECIFICATIONS } from '@/types/transformations';

export interface HalftoneOptions {
  lpi?: number;
  angle?: number;
  dotShape?: 'round' | 'elliptical' | 'square';
}

/**
 * Generate halftone pattern from grayscale image data
 * Uses ordered dithering algorithm
 */
export function generateHalftone(imageData: ImageData, options: HalftoneOptions = {}): ImageData {
  const { lpi = PRINT_SPECIFICATIONS.halftone.lpi, angle = PRINT_SPECIFICATIONS.halftone.angle } = options;

  const { width, height } = imageData;
  const data = imageData.data;
  const output = new ImageData(width, height);
  const outputData = output.data;

  // Calculate dot size based on LPI and DPI
  const dpi = 300; // Standard print DPI
  const dotSize = dpi / lpi;

  // Convert angle to radians
  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Bayer matrix for ordered dithering (8x8)
  const bayerMatrix = [
    [0, 48, 12, 60, 3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [8, 56, 4, 52, 11, 59, 7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [2, 50, 14, 62, 1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58, 6, 54, 9, 57, 5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Get grayscale value (0-255)
      const idx = (y * width + x) * 4;
      const gray = data[idx]; // Assume already grayscale

      // Rotate coordinates for angled halftone
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;

      // Calculate Bayer threshold
      const bx = Math.floor(rx / (dotSize / 8)) % 8;
      const by = Math.floor(ry / (dotSize / 8)) % 8;
      const threshold = ((bayerMatrix[by][bx] + 1) / 64) * 255;

      // Apply threshold
      const value = gray < threshold ? 0 : 255;

      // Set output pixel
      outputData[idx] = value;
      outputData[idx + 1] = value;
      outputData[idx + 2] = value;
      outputData[idx + 3] = 255; // Alpha
    }
  }

  return output;
}

/**
 * Convert image to grayscale
 */
export function convertToGrayscale(imageData: ImageData): ImageData {
  const { width, height } = imageData;
  const data = imageData.data;
  const output = new ImageData(width, height);
  const outputData = output.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Luminance formula
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    outputData[i] = gray;
    outputData[i + 1] = gray;
    outputData[i + 2] = gray;
    outputData[i + 3] = a;
  }

  return output;
}

/**
 * Extract color channel from image
 */
export function extractColorChannel(
  imageData: ImageData,
  targetColor: { r: number; g: number; b: number },
  tolerance: number = 30
): ImageData {
  const { width, height } = imageData;
  const data = imageData.data;
  const output = new ImageData(width, height);
  const outputData = output.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Calculate distance to target color
    const distance = Math.sqrt((r - targetColor.r) ** 2 + (g - targetColor.g) ** 2 + (b - targetColor.b) ** 2);

    // If within tolerance, keep the brightness, otherwise make it white (no ink)
    if (distance <= tolerance) {
      // Calculate how close it is (0-1)
      const intensity = 1 - distance / tolerance;
      const gray = Math.round(255 * (1 - intensity));

      outputData[i] = gray;
      outputData[i + 1] = gray;
      outputData[i + 2] = gray;
      outputData[i + 3] = a;
    } else {
      // No ink in this area
      outputData[i] = 255;
      outputData[i + 1] = 255;
      outputData[i + 2] = 255;
      outputData[i + 3] = a;
    }
  }

  return output;
}

/**
 * Create registration mark pattern
 * Standard offset printing cross mark
 */
export function createRegistrationMark(size: number = 20): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Clear
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);

  // Draw cross
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 4, 0, Math.PI * 2);
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Composite multiple color channels into single image
 */
export function compositeColors(channels: ImageData[], colors: { r: number; g: number; b: number }[]): ImageData {
  if (channels.length === 0) throw new Error('No channels provided');

  const { width, height } = channels[0];
  const output = new ImageData(width, height);
  const outputData = output.data;

  // Initialize with white
  for (let i = 0; i < outputData.length; i++) {
    outputData[i] = 255;
  }

  // Composite each channel
  for (let c = 0; c < channels.length; c++) {
    const channel = channels[c].data;
    const color = colors[c];

    for (let i = 0; i < channel.length; i += 4) {
      const intensity = channel[i] / 255; // Grayscale value (0-1)
      const inkAmount = 1 - intensity; // How much ink (0-1)

      // Mix with existing color using multiply blend
      outputData[i] = Math.round(outputData[i] * (1 - inkAmount) + color.r * inkAmount);
      outputData[i + 1] = Math.round(outputData[i + 1] * (1 - inkAmount) + color.g * inkAmount);
      outputData[i + 2] = Math.round(outputData[i + 2] * (1 - inkAmount) + color.b * inkAmount);
    }
  }

  // Set alpha
  for (let i = 3; i < outputData.length; i += 4) {
    outputData[i] = 255;
  }

  return output;
}
