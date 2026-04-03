/**
 * Color clustering logic for screen printing
 * Maps detected colors to Pantone clusters for print separation
 */

import {
  type ColorCluster,
  PRINT_SPECIFICATIONS,
  SCREEN_PRINTING_CLUSTERS,
  type SeparatedColorInfo,
} from '@/types/transformations';

// Color in RGB format
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// Detected color with metadata
export interface DetectedColor {
  rgb: RGBColor;
  hex: string;
  pixelCount: number;
  percentage: number;
}

// Result of color clustering
export interface ColorClusteringResult {
  colors: SeparatedColorInfo[];
  whiteBase: boolean;
  totalColors: number;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGBColor {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate Euclidean distance between two RGB colors
 */
export function colorDistance(c1: RGBColor, c2: RGBColor): number {
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
}

/**
 * Calculate perceived brightness (luminance)
 */
export function getBrightness(rgb: RGBColor): number {
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

/**
 * Check if color is dark (needs white base)
 */
export function isDarkColor(rgb: RGBColor): boolean {
  return getBrightness(rgb) < 0.5;
}

/**
 * Check if color is essentially white/light
 */
export function isLightColor(rgb: RGBColor, threshold: number = 0.9): boolean {
  return getBrightness(rgb) >= threshold;
}

/**
 * Find the closest Pantone cluster for a given color
 */
export function findClosestCluster(hex: string): ColorCluster {
  const rgb = hexToRgb(hex);
  let closestCluster = SCREEN_PRINTING_CLUSTERS[1]; // Default to black
  let minDistance = Infinity;

  // Skip white base in matching (handled separately)
  const clustersToMatch = SCREEN_PRINTING_CLUSTERS.filter((c) => !c.isBase);

  for (const cluster of clustersToMatch) {
    const clusterRgb = hexToRgb(cluster.hex);
    const distance = colorDistance(rgb, clusterRgb);

    if (distance < minDistance) {
      minDistance = distance;
      closestCluster = cluster;
    }
  }

  return closestCluster;
}

/**
 * Extract dominant colors from image data
 * Uses k-means clustering algorithm
 */
export function extractDominantColors(imageData: ImageData, maxColors: number = 8): DetectedColor[] {
  const pixels: RGBColor[] = [];
  const data = imageData.data;

  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Skip very light colors (white/background)
    if (r > 240 && g > 240 && b > 240) continue;

    pixels.push({ r, g, b });
  }

  if (pixels.length === 0) return [];

  // Simple k-means clustering
  const clusters = kMeansClustering(pixels, Math.min(maxColors, pixels.length));

  // Convert to DetectedColor format
  const totalPixels = pixels.length;
  return clusters.map((cluster) => ({
    rgb: cluster.center,
    hex: rgbToHex(Math.round(cluster.center.r), Math.round(cluster.center.g), Math.round(cluster.center.b)),
    pixelCount: cluster.pixels.length,
    percentage: (cluster.pixels.length / totalPixels) * 100,
  }));
}

/**
 * Simple k-means clustering for colors
 */
function kMeansClustering(pixels: RGBColor[], k: number): Array<{ center: RGBColor; pixels: RGBColor[] }> {
  // Initialize centroids randomly
  const centroids: RGBColor[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
  }

  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    // Assign pixels to nearest centroid
    const clusters: RGBColor[][] = Array.from({ length: k }, () => []);

    for (const pixel of pixels) {
      let minDist = Infinity;
      let closestIdx = 0;

      for (let i = 0; i < k; i++) {
        const dist = colorDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      clusters[closestIdx].push(pixel);
    }

    // Update centroids
    let moved = false;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;

      const newCentroid = {
        r: clusters[i].reduce((sum, p) => sum + p.r, 0) / clusters[i].length,
        g: clusters[i].reduce((sum, p) => sum + p.g, 0) / clusters[i].length,
        b: clusters[i].reduce((sum, p) => sum + p.b, 0) / clusters[i].length,
      };

      if (colorDistance(newCentroid, centroids[i]) > 1) {
        moved = true;
      }

      centroids[i] = newCentroid;
    }

    if (!moved) break;
    iterations++;
  }

  // Return final clusters
  const finalClusters: RGBColor[][] = Array.from({ length: k }, () => []);
  for (const pixel of pixels) {
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < k; i++) {
      const dist = colorDistance(pixel, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    finalClusters[closestIdx].push(pixel);
  }

  return finalClusters
    .filter((cluster) => cluster.length > 0)
    .map((cluster, i) => ({
      center: centroids[i],
      pixels: cluster,
    }));
}

/**
 * Cluster colors for screen printing
 * Maps detected colors to Pantone clusters
 */
export function clusterColorsForScreenPrinting(detectedColors: DetectedColor[]): ColorClusteringResult {
  // Check if we need white base (any dark colors present)
  const hasDarkColors = detectedColors.some((c) => isDarkColor(c.rgb));
  const needsWhiteBase = hasDarkColors;

  // Map each detected color to closest Pantone cluster
  const clusterMap = new Map<string, DetectedColor[]>();

  for (const color of detectedColors) {
    const cluster = findClosestCluster(color.hex);
    const existing = clusterMap.get(cluster.pantone) || [];
    existing.push(color);
    clusterMap.set(cluster.pantone, existing);
  }

  // Convert to separated color info
  const colors: SeparatedColorInfo[] = [];
  let order = 1;

  // White base always first if needed
  if (needsWhiteBase) {
    const whiteCluster = SCREEN_PRINTING_CLUSTERS.find((c) => c.isBase);
    if (whiteCluster) {
      colors.push({
        name: whiteCluster.name,
        pantone: whiteCluster.pantone,
        hex: whiteCluster.hex,
        pageNumber: 2, // Page 1 is composite
        order: order++,
      });
    }
  }

  // Add other colors sorted by brightness (light to dark)
  const sortedClusters = Array.from(clusterMap.entries()).sort((a, b) => {
    const clusterA = SCREEN_PRINTING_CLUSTERS.find((c) => c.pantone === a[0]);
    const clusterB = SCREEN_PRINTING_CLUSTERS.find((c) => c.pantone === b[0]);
    if (!clusterA || !clusterB) return 0;
    return getBrightness(hexToRgb(clusterA.hex)) - getBrightness(hexToRgb(clusterB.hex));
  });

  for (const [pantone] of sortedClusters) {
    const cluster = SCREEN_PRINTING_CLUSTERS.find((c) => c.pantone === pantone);

    // Skip if cluster not found or would exceed max colors
    if (!cluster || colors.length >= PRINT_SPECIFICATIONS.maxColors) break;

    colors.push({
      name: cluster.name,
      pantone: cluster.pantone,
      hex: cluster.hex,
      pageNumber: needsWhiteBase ? colors.length + 2 : colors.length + 1,
      order: order++,
    });
  }

  return {
    colors,
    whiteBase: needsWhiteBase,
    totalColors: colors.length,
  };
}

/**
 * Simplified color extraction from image URL
 * Uses canvas to get image data
 */
export async function extractColorsFromImage(imageUrl: string, maxColors: number = 8): Promise<DetectedColor[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Resize for performance (max 500px)
        const scale = Math.min(1, 500 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = extractDominantColors(imageData, maxColors);

        resolve(colors);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Get print order for colors
 * Returns colors sorted by print sequence (white base first, then light to dark)
 */
export function getPrintOrder(colors: SeparatedColorInfo[]): SeparatedColorInfo[] {
  return [...colors].sort((a, b) => {
    // White base always first
    if (a.name === 'White Base') return -1;
    if (b.name === 'White Base') return 1;

    // Then by brightness (light to dark)
    const brightnessA = getBrightness(hexToRgb(a.hex));
    const brightnessB = getBrightness(hexToRgb(b.hex));
    return brightnessB - brightnessA;
  });
}

/**
 * Validate color count for screen printing
 */
export function validateColorCount(count: number): { valid: boolean; message?: string } {
  if (count <= 0) {
    return { valid: false, message: 'No colors detected in design' };
  }

  if (count > PRINT_SPECIFICATIONS.maxColors) {
    return {
      valid: false,
      message: `Design has ${count} colors. Maximum is ${PRINT_SPECIFICATIONS.maxColors} for screen printing.`,
    };
  }

  return { valid: true };
}
