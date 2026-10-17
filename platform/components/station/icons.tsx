// The few glyphs the stations use, drawn as the rest of the platform draws them (a 1.8 stroke, round caps), a little
// bigger for a touch screen. Decorative: the button or label next to each one says what it is.
import type { SVGProps } from 'react';

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export const IconBack = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const IconNext = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconRefresh = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" />
  </Icon>
);

/** A screen that stays on. */
export const IconAwake = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="12" rx="1.5" />
    <path d="M9 21h6M12 17v4" />
  </Icon>
);

export const IconZoom = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5M11 8.5v5M8.5 11h5" />
  </Icon>
);

export const IconFlag = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 21V4M6 5h11l-2 4 2 4H6" />
  </Icon>
);

export const IconDocument = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />
  </Icon>
);

/** Delete the last digit. */
export const IconBackspace = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M21 5H9l-6 7 6 7h12zM13 9.5l5 5M18 9.5l-5 5" />
  </Icon>
);
