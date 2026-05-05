/**
 * Stanley Stella Catalog Index
 *
 * Maps the ~3,344 blank product images from /Assets/Blank Images/
 * into a structured catalog for the MerchStudio.
 *
 * Naming convention: {view}_{sku}_{color}.jpg
 *   view: PBM0 (packshot front), PFD0 (packshot flat/folded), PFM0 (packshot model)
 *   sku: STSU177, STBU185, etc.
 *   color: C002, C250, C727, etc.
 */

import type { GarmentEntry } from '@/lib/StudioContext';

// Product type mappings from SKU prefix
const SKU_TYPE_MAP: Record<string, string> = {
  STSU: 'tshirt',
  STBU: 'hoodie',
  STJM: 'jacket',
  STJW: 'jacket',
  STSK: 'tank',
  STTK: 'tank',
  STTW: 'longsleeve',
  STSW: 'sweatshirt',
  STPU: 'polo',
  STTM: 'tshirt',
  STTU: 'tshirt',
  STAU: 'accessory',
  STBB: 'accessory',
  STBK: 'accessory',
  STPK: 'accessory',
  STSB: 'accessory',
  STTB: 'accessory',
  STWM: 'workwear',
  STWW: 'workwear',
  STJU: 'jumper',
  STWU: 'workwear',
};

// Common Stanley Stella color codes
const COLOR_MAP: Record<string, { name: string; hex: string }> = {
  C001: { name: 'White', hex: '#FFFFFF' },
  C002: { name: 'Black', hex: '#000000' },
  C004: { name: 'Navy', hex: '#1B2854' },
  C005: { name: 'Heather Grey', hex: '#A0A0A0' },
  C007: { name: 'Burgundy', hex: '#6B1F35' },
  C013: { name: 'Army', hex: '#4A533E' },
  C018: { name: 'Indigo', hex: '#3F4E8F' },
  C028: { name: 'Grey Melange', hex: '#C0C0C0' },
  C036: { name: 'Red', hex: '#C8102E' },
  C038: { name: 'Sage', hex: '#87A878' },
  C048: { name: 'Mustard', hex: '#D4A843' },
  C053: { name: 'Sand', hex: '#C2B280' },
  C054: { name: 'Vintage White', hex: '#F5F5DC' },
  C057: { name: 'Terracotta', hex: '#E2725B' },
  C059: { name: 'Petrol', hex: '#1A6B6B' },
  C060: { name: 'Mocha', hex: '#8B6914' },
  C063: { name: 'Olive', hex: '#556B2F' },
  C068: { name: 'Storm', hex: '#4A6572' },
  C078: { name: 'Coral', hex: '#FF7F50' },
  C080: { name: 'Rust', hex: '#B7410E' },
  C081: { name: 'Ocean Depth', hex: '#2C5F6F' },
  C082: { name: 'Washed Burgundy', hex: '#8B4557' },
  C085: { name: 'Lilac', hex: '#C8A2C8' },
  C086: { name: 'Mint', hex: '#98FF98' },
  C088: { name: 'Dusty Pink', hex: '#D4A5A5' },
  C089: { name: 'Sage Green', hex: '#9DC183' },
  C101: { name: 'Lavender', hex: '#E6E6FA' },
  C102: { name: 'Stone', hex: '#928E85' },
  C103: { name: 'Moss', hex: '#8A9A5B' },
  C109: { name: 'Slate', hex: '#708090' },
  C112: { name: 'Bubblegum', hex: '#FFC1CC' },
  C115: { name: 'Denim', hex: '#1560BD' },
  C116: { name: 'Powder Blue', hex: '#B0E0E6' },
  C129: { name: 'Pastel Pink', hex: '#FFD1DC' },
  C133: { name: 'Clay', hex: '#B66A50' },
  C134: { name: 'Sunset', hex: '#FA5B3D' },
  C135: { name: 'Soft Purple', hex: '#A78BCA' },
  C136: { name: 'Pastel Blue', hex: '#AEC6CF' },
  C137: { name: 'Pale Blue', hex: '#AFEEEE' },
  C138: { name: 'Salmon', hex: '#FA8072' },
  C140: { name: 'Graphite', hex: '#484848' },
  C142: { name: 'Ice Blue', hex: '#D6EAF8' },
  C143: { name: 'Ice Mint', hex: '#C5E8D5' },
  C144: { name: 'Pale Mint', hex: '#98D8C8' },
  C145: { name: 'Blush', hex: '#DE5D83' },
  C146: { name: 'Apricot', hex: '#FBCEB1' },
  C147: { name: 'Pastel Yellow', hex: '#FDFD96' },
  C149: { name: 'Orchid', hex: '#DA70D6' },
  C150: { name: 'Sky Blue', hex: '#87CEEB' },
  C151: { name: 'Fuchsia', hex: '#FF00FF' },
  C152: { name: 'Coral Pink', hex: '#F88379' },
  C153: { name: 'Pale Pink', hex: '#FADADD' },
  C155: { name: 'Rose', hex: '#FF007F' },
  C156: { name: 'Turquoise', hex: '#40E0D0' },
  C157: { name: 'Light Grey', hex: '#D3D3D3' },
  C158: { name: 'Medium Grey', hex: '#BEBEBE' },
  C161: { name: 'Dark Grey', hex: '#A9A9A9' },
  C162: { name: 'Charcoal', hex: '#36454F' },
  C204: { name: 'Bright Red', hex: '#FF0000' },
  C223: { name: 'Royal Blue', hex: '#4169E1' },
  C224: { name: 'Bright Blue', hex: '#0096FF' },
  C230: { name: 'Bright Green', hex: '#00FF00' },
  C232: { name: 'Bright Yellow', hex: '#FFFF00' },
  C244: { name: 'Bright Orange', hex: '#FF6600' },
  C250: { name: 'White', hex: '#FFFFFF' },
  C253: { name: 'Heather Navy', hex: '#2B3856' },
  C356: { name: 'Dark Heather', hex: '#383838' },
  C357: { name: 'Light Heather', hex: '#E0E0E0' },
  C358: { name: 'Charcoal Heather', hex: '#555555' },
  C359: { name: 'Ash', hex: '#B2BEB5' },
  C360: { name: 'Oxford Navy', hex: '#1B2854' },
  C361: { name: 'French Navy', hex: '#1A2942' },
  C504: { name: 'Kiwi', hex: '#8EE53F' },
  C591: { name: 'Neon Yellow', hex: '#FFFF00' },
  C600: { name: 'Off White', hex: '#FAF9F6' },
  C601: { name: 'Natural', hex: '#F5F5DC' },
  C602: { name: 'Cream', hex: '#FFFDD0' },
  C651: { name: 'Melange Grey', hex: '#999999' },
  C652: { name: 'Melange Black', hex: '#333333' },
  C702: { name: 'Dark Grey Heather', hex: '#484848' },
  C710: { name: 'Heather Khaki', hex: '#9F8D70' },
  C715: { name: 'Heather Sand', hex: '#C2B280' },
  C724: { name: 'Heather Denim', hex: '#5B7FA3' },
  C727: { name: 'Sport Grey', hex: '#A0A0A0' },
  C728: { name: 'Dark Heather Grey', hex: '#696969' },
  C729: { name: 'Marl Grey', hex: '#B0B0B0' },
  C730: { name: 'Light Marl', hex: '#D0D0D0' },
  C731: { name: 'Dark Marl', hex: '#707070' },
  C732: { name: 'Heather Brown', hex: '#8B6914' },
  C733: { name: 'Heather Burgundy', hex: '#6B1F35' },
  C735: { name: 'Heather Green', hex: '#556B2F' },
};

// Featured products for the studio (curated subset)
export const FEATURED_PRODUCTS = [
  // T-Shirts
  { sku: 'STSU177', name: 'Creator T-Shirt', type: 'tshirt' },
  { sku: 'STSU168', name: 'Creator Heavy T-Shirt', type: 'tshirt' },
  { sku: 'STTU169', name: 'Creator T-Shirt', type: 'tshirt' },
  { sku: 'STTU177', name: 'Creator Heavy T-Shirt', type: 'tshirt' },
  { sku: 'STTM961', name: 'Creator Essential T-Shirt', type: 'tshirt' },

  // Hoodies
  { sku: 'STBU185', name: 'Creator Hoodie', type: 'hoodie' },
  { sku: 'STBU186', name: 'Creator Heavy Hoodie', type: 'hoodie' },
  { sku: 'STBU576', name: 'Creator Zip Hoodie', type: 'hoodie' },

  // Sweatshirts
  { sku: 'STSW212', name: 'Creator Sweatshirt', type: 'sweatshirt' },
  { sku: 'STSW213', name: 'Creator Crew Sweatshirt', type: 'sweatshirt' },

  // Long Sleeve
  { sku: 'STTW172', name: 'Creator Long Sleeve', type: 'longsleeve' },
  { sku: 'STTW173', name: 'Creator Heavy Long Sleeve', type: 'longsleeve' },

  // Tank
  { sku: 'STSK180', name: 'Creator Tank Top', type: 'tank' },
  { sku: 'STTK184', name: 'Creator Essential Tank', type: 'tank' },

  // Jackets
  { sku: 'STJM158', name: 'Creator Jacket', type: 'jacket' },
  { sku: 'STJM188', name: 'Creator Bomber Jacket', type: 'jacket' },
  { sku: 'STJW159', name: 'Creator Denim Jacket', type: 'jacket' },

  // Accessories
  { sku: 'STAU760', name: 'Creator Tote Bag', type: 'accessory' },
  { sku: 'STTB918', name: 'Creator Shopper', type: 'accessory' },
  { sku: 'STSK180', name: 'Creator Cap', type: 'accessory' },
];

// Common colors to show per product (prioritized)
const COMMON_COLORS = [
  'C002', // Black
  'C250', // White
  'C005', // Heather Grey
  'C727', // Sport Grey
  'C004', // Navy
  'C223', // Royal Blue
  'C054', // Vintage White
  'C013', // Army
  'C036', // Red
  'C244', // Bright Orange
];

/**
 * Parse a filename into a GarmentEntry
 * Format: {view}_{sku}_{color}.jpg
 */
export function parseFilename(filename: string): GarmentEntry | null {
  // Remove extension
  const baseName = filename.replace('.jpg', '');

  // Parse: PBM0_STSU177_C002
  const match = baseName.match(/^(\w+?)_(ST\w+?)_(C\d+)$/);
  if (!match) return null;

  const [, viewPrefix, sku, colorCode] = match;

  // Determine view type
  let view: string;
  if (viewPrefix.startsWith('PBM')) view = 'front';
  else if (viewPrefix.startsWith('PFD')) view = 'back';
  else if (viewPrefix.startsWith('PFM')) view = 'model';
  else view = 'front';

  // Determine product type from SKU prefix
  const skuPrefix = sku.substring(0, 4); // STSU, STBU, etc.
  const productType = SKU_TYPE_MAP[skuPrefix] || 'unknown';

  // Get color info
  const colorInfo = COLOR_MAP[colorCode] || { name: colorCode, hex: '#888888' };

  return {
    sku,
    productType,
    colorCode,
    colorName: colorInfo.name,
    colorHex: colorInfo.hex,
    view,
    imagePath: `/Assets/Blank Images/${filename}`,
  };
}

/**
 * Group catalog entries by SKU
 */
export function groupBySku(entries: GarmentEntry[]): Record<string, GarmentEntry[]> {
  return entries.reduce((acc, entry) => {
    if (!acc[entry.sku]) acc[entry.sku] = [];
    acc[entry.sku].push(entry);
    return acc;
  }, {} as Record<string, GarmentEntry[]>);
}

/**
 * Get available colors for a specific SKU
 */
export function getColorsForSku(
  entries: GarmentEntry[],
  sku: string
): Array<{ code: string; name: string; hex: string }> {
  const skuEntries = entries.filter((e) => e.sku === sku);
  const colorMap = new Map<string, { name: string; hex: string }>();

  skuEntries.forEach((entry) => {
    if (!colorMap.has(entry.colorCode)) {
      colorMap.set(entry.colorCode, { name: entry.colorName, hex: entry.colorHex });
    }
  });

  return Array.from(colorMap.entries()).map(([code, info]) => ({
    code,
    ...info,
  }));
}

/**
 * Get available views for a specific SKU + color
 */
export function getViewsForSkuColor(
  entries: GarmentEntry[],
  sku: string,
  colorCode: string
): GarmentEntry[] {
  return entries.filter((e) => e.sku === sku && e.colorCode === colorCode);
}

/**
 * Get a specific entry for SKU + color + view
 */
export function getEntry(
  entries: GarmentEntry[],
  sku: string,
  colorCode: string,
  view: string
): GarmentEntry | undefined {
  return entries.find((e) => e.sku === sku && e.colorCode === colorCode && e.view === view);
}

/**
 * Get featured products with their available colors
 */
export function getFeaturedProducts(entries: GarmentEntry[]) {
  return FEATURED_PRODUCTS.map((product) => {
    const colors = getColorsForSku(entries, product.sku);
    // Filter to common colors first
    const common = colors.filter((c) => COMMON_COLORS.includes(c.code));
    const others = colors.filter((c) => !COMMON_COLORS.includes(c.code));
    const sortedColors = [...common, ...others];

    return {
      ...product,
      colors: sortedColors,
      available: colors.length > 0,
    };
  }).filter((p) => p.available);
}

/**
 * Pre-built catalog (will be populated at build time or runtime)
 * In production, this would be generated from scanning the Assets directory
 */
export const STATIC_CATALOG: GarmentEntry[] = [
  // A curated subset of common products/colors for immediate use
  // T-Shirts
  { sku: 'STSU177', productType: 'tshirt', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STSU177_C002.jpg' },
  { sku: 'STSU177', productType: 'tshirt', colorCode: 'C250', colorName: 'White', colorHex: '#FFFFFF', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STSU177_C250.jpg' },
  { sku: 'STSU177', productType: 'tshirt', colorCode: 'C005', colorName: 'Heather Grey', colorHex: '#A0A0A0', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STSU177_C005.jpg' },
  { sku: 'STSU177', productType: 'tshirt', colorCode: 'C727', colorName: 'Sport Grey', colorHex: '#A0A0A0', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STSU177_C727.jpg' },
  { sku: 'STSU177', productType: 'tshirt', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'back', imagePath: '/Assets/Blank Images/PFD0_STSU177_C002.jpg' },
  { sku: 'STSU177', productType: 'tshirt', colorCode: 'C250', colorName: 'White', colorHex: '#FFFFFF', view: 'back', imagePath: '/Assets/Blank Images/PFD0_STSU177_C250.jpg' },

  // Hoodies
  { sku: 'STBU185', productType: 'hoodie', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STBU185_C002.jpg' },
  { sku: 'STBU185', productType: 'hoodie', colorCode: 'C250', colorName: 'White', colorHex: '#FFFFFF', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STBU185_C250.jpg' },
  { sku: 'STBU185', productType: 'hoodie', colorCode: 'C005', colorName: 'Heather Grey', colorHex: '#A0A0A0', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STBU185_C005.jpg' },
  { sku: 'STBU185', productType: 'hoodie', colorCode: 'C727', colorName: 'Sport Grey', colorHex: '#A0A0A0', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STBU185_C727.jpg' },
  { sku: 'STBU185', productType: 'hoodie', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'back', imagePath: '/Assets/Blank Images/PFD0_STBU185_C002.jpg' },
  { sku: 'STBU185', productType: 'hoodie', colorCode: 'C250', colorName: 'White', colorHex: '#FFFFFF', view: 'back', imagePath: '/Assets/Blank Images/PFD0_STBU185_C250.jpg' },

  // Long Sleeve
  { sku: 'STTW172', productType: 'longsleeve', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STTW172_C002.jpg' },
  { sku: 'STTW172', productType: 'longsleeve', colorCode: 'C250', colorName: 'White', colorHex: '#FFFFFF', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STTW172_C250.jpg' },
  { sku: 'STTW172', productType: 'longsleeve', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'back', imagePath: '/Assets/Blank Images/PFD0_STTW172_C002.jpg' },

  // Tank
  { sku: 'STSK180', productType: 'tank', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STSK180_C002.jpg' },
  { sku: 'STSK180', productType: 'tank', colorCode: 'C250', colorName: 'White', colorHex: '#FFFFFF', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STSK180_C250.jpg' },

  // Sweatshirt
  { sku: 'STSW212', productType: 'sweatshirt', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STSW212_C002.jpg' },
  { sku: 'STSW212', productType: 'sweatshirt', colorCode: 'C250', colorName: 'White', colorHex: '#FFFFFF', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STSW212_C250.jpg' },

  // Jacket
  { sku: 'STJM188', productType: 'jacket', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STJM188_C002.jpg' },
  { sku: 'STJM188', productType: 'jacket', colorCode: 'C253', colorName: 'Heather Navy', colorHex: '#2B3856', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STJM188_C253.jpg' },

  // Accessories
  { sku: 'STAU760', productType: 'accessory', colorCode: 'C002', colorName: 'Black', colorHex: '#000000', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STAU760_C002.jpg' },
  { sku: 'STAU760', productType: 'accessory', colorCode: 'C007', colorName: 'Burgundy', colorHex: '#6B1F35', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STAU760_C007.jpg' },
  { sku: 'STAU760', productType: 'accessory', colorCode: 'C250', colorName: 'White', colorHex: '#FFFFFF', view: 'front', imagePath: '/Assets/Blank Images/PBM0_STAU760_C250.jpg' },
];

export type { GarmentEntry };
