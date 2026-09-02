import type { Key } from './types';

// Canonical English category/fit/technique names (used everywhere as the
// data model — filter state, URL params, sort order) mapped to their
// display dictionary key. Only the mapped label is translated; the
// canonical value itself never changes with language. Unknown names
// have no mapping and callers fall back to the English string.

export const TYPE_KEYS: Record<string, Key> = {
  'T-shirts': 'catalog.type.tshirts',
  'Sweats & Hoodies': 'catalog.type.sweatsHoodies',
  Jackets: 'catalog.type.jackets',
  Polos: 'catalog.type.polos',
  Shirts: 'catalog.type.shirts',
  Bottoms: 'catalog.type.bottoms',
  'Bags & Accessories': 'catalog.type.bagsAccessories',
  'Kids & Baby': 'catalog.type.kidsBaby',
};

export function typeKey(typeName: string): Key | undefined {
  return TYPE_KEYS[typeName];
}

export const FIT_KEYS: Record<string, Key> = {
  Medium: 'catalog.fit.medium',
  Relaxed: 'catalog.fit.relaxed',
  Fitted: 'catalog.fit.fitted',
  Oversized: 'catalog.fit.oversized',
};

export function fitKey(fitName: string): Key | undefined {
  return FIT_KEYS[fitName];
}

export const TECHNIQUE_KEYS: Record<string, Key> = {
  'Screen print': 'modal.technique.screenPrint',
  DTG: 'modal.technique.dtg',
  Embroidery: 'modal.technique.embroidery',
  'Heat transfer': 'modal.technique.heatTransfer',
};

export function techniqueKey(techniqueName: string): Key | undefined {
  return TECHNIQUE_KEYS[techniqueName];
}
