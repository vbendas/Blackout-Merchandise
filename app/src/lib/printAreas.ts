/**
 * Shared Print Areas Configuration
 * Used by both ShowroomLightbox and ProductDetailLightbox
 */

export interface PrintArea {
  id: string;
  name: string;
  label: string;
}

export const defaultPrintAreas: PrintArea[] = [
  { id: 'front', name: 'front', label: 'Front' },
  { id: 'back', name: 'back', label: 'Back' },
  { id: 'left_sleeve', name: 'left_sleeve', label: 'Left Sleeve' },
  { id: 'right_sleeve', name: 'right_sleeve', label: 'Right Sleeve' },
];

export const categoryPrintAreas: Record<string, PrintArea[]> = {
  'T-Shirts': [
    { id: 'front', name: 'front', label: 'Front' },
    { id: 'back', name: 'back', label: 'Back' },
    { id: 'left_sleeve', name: 'left_sleeve', label: 'Left Sleeve' },
    { id: 'right_sleeve', name: 'right_sleeve', label: 'Right Sleeve' },
  ],
  Hoodies: [
    { id: 'front', name: 'front', label: 'Front' },
    { id: 'back', name: 'back', label: 'Back' },
    { id: 'left_sleeve', name: 'left_sleeve', label: 'Left Sleeve' },
    { id: 'right_sleeve', name: 'right_sleeve', label: 'Right Sleeve' },
    { id: 'hood', name: 'hood', label: 'Hood' },
  ],
  Jackets: [
    { id: 'front', name: 'front', label: 'Front' },
    { id: 'back', name: 'back', label: 'Back' },
    { id: 'left_sleeve', name: 'left_sleeve', label: 'Left Sleeve' },
    { id: 'right_sleeve', name: 'right_sleeve', label: 'Right Sleeve' },
  ],
  Accessories: [
    { id: 'front', name: 'front', label: 'Front' },
    { id: 'back', name: 'back', label: 'Back' },
  ],
};

export function getPrintAreasForProduct(category?: string): PrintArea[] {
  if (category && categoryPrintAreas[category]) {
    return categoryPrintAreas[category];
  }
  return defaultPrintAreas;
}
