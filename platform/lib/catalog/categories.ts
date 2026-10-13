// The Studio's garment categories, in the order the catalogue lists them.
// No imports, so client code can use it without pulling in the catalog tables.

/** Every category typeFor() (catalog-filters.ts) returns. */
export const CATALOGUE_CATEGORIES = [
  'T-shirts',
  'Sweats & Hoodies',
  'Jackets',
  'Bags & Accessories',
  'Kids & Baby',
  'Bottoms',
  'Shirts',
  'Polos',
] as const;

export type CatalogueCategory = (typeof CATALOGUE_CATEGORIES)[number];
