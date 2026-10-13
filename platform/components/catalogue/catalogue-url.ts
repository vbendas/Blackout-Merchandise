import {
  ALL,
  AUDIENCE_ORDER,
  FILTER_COLOURS,
  FIT_ORDER,
  INITIAL_FILTERS,
  SORTS,
  WEIGHT_BUCKETS,
  categoryFromName,
  type CatalogueFilters,
} from './catalogue-state';

// The catalogue page keeps its state in the query string, so a link, a
// refresh and the browser's Back button all land where the artist was:
//
//   /studio/catalogue?category=Jackets&q=zip&fit=Relaxed&for=Women&weight=heavy
//     &colour=French+Navy&sort=price&blank=STJU251&design=<id>&designName=<name>&from=<session id>
//
// Values are matched without regard to case; anything unknown is ignored.
// Pure: no React, no window.

export const CATALOGUE_PATH = '/studio/catalogue';

const MAX_QUERY_LENGTH = 80;
const MAX_NAME_LENGTH = 80;
/** a blank's style code */
const BLANK_CODE = /^[A-Za-z0-9]{3,16}$/;
/** a session or design id */
const ID = /^[\w-]{1,100}$/;
/** what a design is called when its card has no title */
export const DEFAULT_DESIGN_NAME = 'your artwork';

export interface CatalogueDesign {
  id: string;
  name: string;
}

export interface CatalogueUrl {
  filters: CatalogueFilters;
  /** the blank whose detail is open (?blank=) */
  blank: string | null;
  /** the chat session the artist came from (?from=), where "Back to the chat" goes */
  from: string | null;
  /** the design the artist is picking garments for (?design=&designName=) */
  design: CatalogueDesign | null;
}

/** What the address keeps of the search text: trimmed and not too long. */
export function normaliseQuery(value: string): string {
  return value.trim().slice(0, MAX_QUERY_LENGTH);
}

/** The option of `allowed` the value names, ignoring case; null when it names none. */
function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  const wanted = (value ?? '').trim().toLowerCase();
  if (!wanted) return null;
  return allowed.find((option) => option.toLowerCase() === wanted) ?? null;
}

export function parseCatalogueParams(get: (name: string) => string | null): CatalogueUrl {
  const colour = (get('colour') ?? '').trim().toLowerCase();
  const blank = (get('blank') ?? '').trim();
  const from = (get('from') ?? '').trim();
  const designId = (get('design') ?? '').trim();
  return {
    filters: {
      category: categoryFromName(get('category') ?? undefined),
      q: normaliseQuery(get('q') ?? ''),
      fit: oneOf(get('fit'), FIT_ORDER),
      audience: oneOf(get('for'), AUDIENCE_ORDER),
      weight: oneOf(
        get('weight'),
        WEIGHT_BUCKETS.map((bucket) => bucket.key),
      ),
      colour: colour ? (FILTER_COLOURS.find((c) => c.name.toLowerCase() === colour || c.code.toLowerCase() === colour)?.code ?? null) : null,
      sort:
        oneOf(
          get('sort'),
          SORTS.map((sort) => sort.key),
        ) ?? INITIAL_FILTERS.sort,
    },
    blank: BLANK_CODE.test(blank) ? blank.toUpperCase() : null,
    from: ID.test(from) ? from : null,
    design: ID.test(designId) ? { id: designId, name: (get('designName') ?? '').trim().slice(0, MAX_NAME_LENGTH) || DEFAULT_DESIGN_NAME } : null,
  };
}

/** '' or '?category=...': what the address carries for this state. Defaults are left out. */
export function catalogueSearch(url: CatalogueUrl): string {
  const { filters, blank, from, design } = url;
  const params = new URLSearchParams();
  if (filters.category !== ALL) params.set('category', filters.category);
  if (normaliseQuery(filters.q)) params.set('q', normaliseQuery(filters.q));
  if (filters.fit) params.set('fit', filters.fit);
  if (filters.audience) params.set('for', filters.audience);
  if (filters.weight) params.set('weight', filters.weight);
  if (filters.colour) params.set('colour', FILTER_COLOURS.find((c) => c.code === filters.colour)?.name ?? filters.colour);
  if (filters.sort !== INITIAL_FILTERS.sort) params.set('sort', filters.sort);
  if (blank) params.set('blank', blank);
  if (design) {
    params.set('design', design.id);
    params.set('designName', design.name);
  }
  if (from) params.set('from', from);
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** What an entry point asks for: see CatalogueOpenOptions in CatalogueProvider.tsx. */
export interface CatalogueHrefOptions {
  category?: string;
  q?: string;
  code?: string;
  design?: CatalogueDesign;
}

/** The address of the catalogue page for an entry point: a category (any
 * spelling the assistant used), a search, one blank's detail, a design to
 * pick garments for, and the session to go back to. */
export function catalogueHref(options: CatalogueHrefOptions = {}, from: string | null = null): string {
  const code = (options.code ?? '').trim();
  const designId = options.design?.id ?? '';
  return (
    CATALOGUE_PATH +
    catalogueSearch({
      filters: { ...INITIAL_FILTERS, category: categoryFromName(options.category), q: normaliseQuery(options.q ?? '') },
      blank: BLANK_CODE.test(code) ? code.toUpperCase() : null,
      from: from && ID.test(from) ? from : null,
      design: options.design && ID.test(designId) ? { id: designId, name: options.design.name.trim().slice(0, MAX_NAME_LENGTH) || DEFAULT_DESIGN_NAME } : null,
    })
  );
}

/** The session id in /studio/s/<id>, or null on any other page. */
export function sessionIdFromPath(pathname: string): string | null {
  const match = /^\/studio\/s\/([^/?#]+)/.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** The page of a session, where "Back to the chat" goes. */
export function sessionHref(sessionId: string): string {
  return `/studio/s/${encodeURIComponent(sessionId)}`;
}
