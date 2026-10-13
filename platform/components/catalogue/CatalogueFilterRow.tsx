'use client';

import type { CSSProperties } from 'react';
import {
  FILTER_COLOURS,
  MIN_GROUP,
  SORTS,
  WEIGHT_BUCKETS,
  type CatalogueFilters,
  type Facets,
  type SortKey,
} from './catalogue-state';

const swatchColour = (hex: string) => ({ '--c': hex }) as CSSProperties;

interface CatalogueFilterRowProps {
  id: string;
  filters: CatalogueFilters;
  /** what the current category offers: only these are shown */
  facets: Facets;
  onChange: (patch: Partial<CatalogueFilters>) => void;
}

/** Fit, For, Weight, Colour and Sort. Each group lists only values the current
 * category has, and a group of fewer than two values is left out: it would
 * filter nothing. Choosing a chosen value again clears it. */
export function CatalogueFilterRow({ id, filters, facets, onChange }: CatalogueFilterRowProps) {
  return (
    <div className="cat-filters" id={id} role="group" aria-label="Filters">
      {facets.fits.length >= MIN_GROUP ? (
        <div className="cat-fgroup" role="group" aria-label="Fit">
          <span className="cat-label cat-dim" aria-hidden>
            Fit
          </span>
          {facets.fits.map((fit) => (
            <button
              key={fit}
              type="button"
              className="mf-chip"
              aria-pressed={filters.fit === fit}
              onClick={() => onChange({ fit: filters.fit === fit ? null : fit })}
            >
              {fit}
            </button>
          ))}
        </div>
      ) : null}

      {facets.audiences.length >= MIN_GROUP ? (
        <div className="cat-fgroup" role="group" aria-label="For">
          <span className="cat-label cat-dim" aria-hidden>
            For
          </span>
          {facets.audiences.map((audience) => (
            <button
              key={audience}
              type="button"
              className="mf-chip"
              aria-pressed={filters.audience === audience}
              onClick={() => onChange({ audience: filters.audience === audience ? null : audience })}
            >
              {audience}
            </button>
          ))}
        </div>
      ) : null}

      {facets.weights.length >= MIN_GROUP ? (
        <div className="cat-fgroup" role="group" aria-label="Weight">
          <span className="cat-label cat-dim" aria-hidden>
            Weight
          </span>
          {WEIGHT_BUCKETS.filter((bucket) => facets.weights.includes(bucket.key)).map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              className="mf-chip"
              aria-pressed={filters.weight === bucket.key}
              onClick={() => onChange({ weight: filters.weight === bucket.key ? null : bucket.key })}
            >
              {bucket.label}{' '}
              <span className="cat-chip-range">{bucket.range}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="cat-fgroup" role="group" aria-label="Colour">
        <span className="cat-label cat-dim" aria-hidden>
          Colour
        </span>
        {FILTER_COLOURS.map((colour) => {
          const offered = facets.colours.has(colour.code);
          return (
            <button
              key={colour.code}
              type="button"
              className="cat-sw"
              style={swatchColour(colour.hex)}
              aria-pressed={filters.colour === colour.code}
              aria-label={colour.name}
              title={offered ? colour.name : `${colour.name}: none here`}
              disabled={!offered}
              onClick={() => onChange({ colour: filters.colour === colour.code ? null : colour.code })}
            />
          );
        })}
      </div>

      <label className="cat-sort">
        <span className="cat-label cat-dim">Sort</span>
        <select value={filters.sort} onChange={(event) => onChange({ sort: event.target.value as SortKey })}>
          {SORTS.map((sort) => (
            <option key={sort.key} value={sort.key}>
              {sort.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
