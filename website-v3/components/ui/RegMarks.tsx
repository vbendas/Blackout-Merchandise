// Registration marks: four 14px crosshairs centred on the corners of the
// nearest positioned ancestor (Round 9 WP6a). Look: .mf-regmark in
// design-tokens/material.css. Decorative, aria-hidden.

export type RegCorner = 'tl' | 'tr' | 'bl' | 'br';

const ALL: readonly RegCorner[] = ['tl', 'tr', 'bl', 'br'];

interface RegMarksProps {
  /** Subset of corners; default all four. */
  corners?: readonly RegCorner[];
}

export function RegMarks({ corners = ALL }: RegMarksProps) {
  return (
    <>
      {corners.map((corner) => (
        <span key={corner} className="mf-regmark" data-corner={corner} aria-hidden="true" />
      ))}
    </>
  );
}
