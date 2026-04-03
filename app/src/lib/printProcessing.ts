/**
 * Print processing utilities
 * Generates print-ready TIFF files with color separation and halftones
 */

import {
  getCanvasPixels,
  getDesignAreaPixels,
  mmToPixels,
  PRINT_SPECIFICATIONS,
  type SeparatedColorInfo,
} from '@/types/transformations';
import { convertToGrayscale, generateHalftone } from './halftone';

export interface PrintProcessingOptions {
  customerName: string;
  designName: string;
  orderNumber: string;
  colors: SeparatedColorInfo[];
  designPosition: { x: number; y: number }; // Percentage (0-100)
  designSize: { width: number; height: number }; // Percentage (0-100)
}

/**
 * Generate file name according to specification
 * Format: {customer-name}_{design-name}_{order-number}_{DDMMYYYY}.tiff
 */
export function generateFileName(customerName: string, designName: string, orderNumber: string): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}${month}${year}`;

  // Clean names (remove special chars, replace spaces with hyphens)
  const cleanCustomer = customerName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  const cleanDesign = designName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');

  return `${cleanCustomer}_${cleanDesign}_${orderNumber}_${dateStr}.tiff`;
}

/**
 * Create A2 canvas with margins and registration marks
 */
export function createPrintCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  designArea: { x: number; y: number; width: number; height: number };
} {
  const { width, height } = getCanvasPixels();
  const { canvas, ctx } = createCanvas(width, height);

  // Fill with white
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Calculate margins
  const marginPx = mmToPixels(PRINT_SPECIFICATIONS.canvas.margin);

  // Calculate design area
  const designAreaPx = getDesignAreaPixels();
  const designArea = {
    x: marginPx,
    y: marginPx,
    width: designAreaPx.width,
    height: designAreaPx.height,
  };

  // Add registration marks
  addRegistrationMarks(ctx, width, height, marginPx);

  return { canvas, ctx, designArea };
}

/**
 * Create canvas with context
 */
function createCanvas(
  width: number,
  height: number
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  return { canvas, ctx };
}

/**
 * Add registration marks to canvas
 */
function addRegistrationMarks(ctx: CanvasRenderingContext2D, width: number, height: number, margin: number): void {
  const markSize = 40; // Pixels
  const markOffset = margin - 10; // Slightly outside margin

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;

  // Four corner marks
  const positions = [
    { x: markOffset, y: markOffset }, // Top-left
    { x: width - markOffset, y: markOffset }, // Top-right
    { x: markOffset, y: height - markOffset }, // Bottom-left
    { x: width - markOffset, y: height - markOffset }, // Bottom-right
  ];

  for (const pos of positions) {
    drawRegistrationMark(ctx, pos.x, pos.y, markSize);
  }
}

/**
 * Draw single registration mark
 */
function drawRegistrationMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const half = size / 2;

  // Cross
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x + half, y);
  ctx.moveTo(x, y - half);
  ctx.lineTo(x, y + half);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(x, y, half / 2, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Add footer text to canvas
 */
function addFooterText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  customerName: string,
  designName: string,
  orderNumber: string,
  colorName: string
): void {
  const marginPx = mmToPixels(PRINT_SPECIFICATIONS.canvas.margin);
  const footerHeightPx = mmToPixels(PRINT_SPECIFICATIONS.canvas.footerHeight);
  const footerY = height - marginPx - footerHeightPx / 2;

  ctx.fillStyle = 'black';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const footerText = `${customerName} | ${designName} | ${orderNumber} | ${colorName}`;
  ctx.fillText(footerText, marginPx + 20, footerY);
}

/**
 * Place design on canvas at specified position
 */
function placeDesign(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  designArea: { x: number; y: number; width: number; height: number },
  position: { x: number; y: number }, // Percentage 0-100
  size: { width: number; height: number } // Percentage 0-100
): void {
  // Calculate actual position and size within design area
  const x = designArea.x + (position.x / 100) * designArea.width;
  const y = designArea.y + (position.y / 100) * designArea.height;
  const width = (size.width / 100) * designArea.width;
  const height = (size.height / 100) * designArea.height;

  // Draw image
  ctx.drawImage(image, x, y, width, height);
}

/**
 * Generate composite page (full color preview)
 */
export async function generateCompositePage(imageUrl: string, options: PrintProcessingOptions): Promise<Blob> {
  const { canvas, ctx, designArea } = createPrintCanvas();
  const { width, height } = getCanvasPixels();

  // Load and draw design
  const image = await loadImage(imageUrl);
  placeDesign(ctx, image, designArea, options.designPosition, options.designSize);

  // Add footer
  addFooterText(ctx, width, height, options.customerName, options.designName, options.orderNumber, 'COMPOSITE');

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/tiff');
  });
}

/**
 * Generate color separation page
 */
export async function generateSeparationPage(
  imageUrl: string,
  color: SeparatedColorInfo,
  options: PrintProcessingOptions
): Promise<Blob> {
  const { canvas, ctx, designArea } = createPrintCanvas();
  const { width, height } = getCanvasPixels();

  // Load image
  const image = await loadImage(imageUrl);

  // Create temporary canvas to extract color channel
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = designArea.width;
  tempCanvas.height = designArea.height;
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) {
    throw new Error('Failed to get temporary canvas context');
  }

  // Draw design at full size
  tempCtx.drawImage(image, 0, 0, designArea.width, designArea.height);

  // Get image data
  const imageData = tempCtx.getImageData(0, 0, designArea.width, designArea.height);

  // Convert to grayscale (for halftone)
  const grayData = convertToGrayscale(imageData);

  // Apply halftone
  const halftoneData = generateHalftone(grayData);

  // Put halftone back
  tempCtx.putImageData(halftoneData, 0, 0);

  // Draw halftone onto main canvas at correct position
  const x = designArea.x + (options.designPosition.x / 100) * designArea.width;
  const y = designArea.y + (options.designPosition.y / 100) * designArea.height;
  const w = (options.designSize.width / 100) * designArea.width;
  const h = (options.designSize.height / 100) * designArea.height;

  ctx.drawImage(tempCanvas, x, y, w, h);

  // Add footer
  addFooterText(
    ctx,
    width,
    height,
    options.customerName,
    options.designName,
    options.orderNumber,
    `${color.pantone} ${color.name}`.toUpperCase()
  );

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/tiff');
  });
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Generate complete print-ready TIFF file
 * Returns array of page blobs
 */
export async function generatePrintReadyFile(
  imageUrl: string,
  options: PrintProcessingOptions
): Promise<{ pages: Blob[]; fileName: string }> {
  const pages: Blob[] = [];

  // Page 1: Composite (full color)
  const compositePage = await generateCompositePage(imageUrl, options);
  pages.push(compositePage);

  // Pages 2-N: Color separations
  for (const color of options.colors) {
    const separationPage = await generateSeparationPage(imageUrl, color, options);
    pages.push(separationPage);
  }

  const fileName = generateFileName(options.customerName, options.designName, options.orderNumber);

  return { pages, fileName };
}

/**
 * Combine multiple TIFF pages into single file
 * Note: This is a simplified version. In production, use a proper TIFF library
 */
export async function combineTiffPages(pages: Blob[]): Promise<Blob> {
  // For now, return first page (in production, use libtiff or similar)
  // TODO: Implement proper multi-page TIFF using server-side processing
  return pages[0];
}
