// A pick from the catalogue: several blanks, each in one or more colours,
// sent to the chat as one message, either for one design or for one run.
// Client-safe (no imports): the catalogue builds it, the chat sends it, the
// server turns it into exact codes for the assistant.

/** The most blanks one pick can hold. */
export const MAX_PICK = 12;

export interface PickColour {
  /** supplier colour code, e.g. 'C727' */
  code: string;
  /** printed name, e.g. 'French Navy' */
  name: string;
  /** swatch colour for the dots in the artist's message, e.g. '#2a3143' */
  hex: string;
}

export interface PickBlank {
  /** blank style code, e.g. 'STSU177' */
  code: string;
  /** display name, e.g. 'Heavy hoodie' */
  name: string;
  /** at least one */
  colours: PickColour[];
  /** front photo path for the strip in the artist's message, e.g. '/packshots/PFM0_STSU177_C002.png' */
  image: string;
}

export interface ChatPick {
  /** one design on every blank, or one run quote with a line per blank and colour */
  intent: 'design' | 'run';
  /** set when the pick started from a design card ("Put it on garments") */
  design?: { id: string; name: string };
  blanks: PickBlank[];
}

/** The sentence the artist's message shows above the strip of garments. */
export function pickSentence(pick: ChatPick): string {
  const count = pick.blanks.length;
  const blanks = `${count} blank${count === 1 ? '' : 's'}`;
  if (pick.intent === 'run') return `Quote a run of these ${blanks}`;
  return pick.design ? `Put ${pick.design.name} on these ${blanks}` : `Use one design on these ${blanks}`;
}
