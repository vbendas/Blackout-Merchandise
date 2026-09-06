// Style Capsules: static v0 catalogue for the metal/tattoo/illustration crowd.
// No curated reference-image library yet (Victor adds later) — referenceUrls
// stays empty and generation falls back to prompt-only guidance until then.
// See Documentation/05-Shared/Image-Generation-Architecture.md §6.
export interface StyleCapsule {
  id: string;
  name: string;
  description: string;
  /** macro style instructions folded into the generation prompt */
  promptFragment: string;
  /** appended as guidance to avoid, folded into the prompt (NB2 has no dedicated negative-prompt field) */
  negativeFragment: string;
  suggestedPrintTechnique: string;
  /** curated anchor images; empty until Victor supplies a library per capsule */
  referenceUrls: string[];
}

export const STYLE_CAPSULES: StyleCapsule[] = [
  {
    id: 'american-traditional',
    name: 'American traditional',
    description: 'Bold black outlines, limited flat palette, vintage tattoo-flash energy.',
    promptFragment:
      'american traditional tattoo flash style, bold thick black outlines, flat limited color palette (red, green, yellow, black), classic vintage tattoo illustration, clean linework',
    negativeFragment: 'no photorealism, no gradients, no soft shading, no thin fragile lines',
    suggestedPrintTechnique: 'screen_2c',
    referenceUrls: [],
  },
  {
    id: 'blackletter',
    name: 'Blackletter',
    description: 'Gothic blackletter typography and ornamentation, high contrast.',
    promptFragment:
      'blackletter gothic typography, old english lettering, high contrast black ink, ornamental flourishes, medieval manuscript feel',
    negativeFragment: 'no sans-serif type, no soft rounded letterforms, no color gradients',
    suggestedPrintTechnique: 'screen_1c',
    referenceUrls: [],
  },
  {
    id: 'woodcut',
    name: 'Woodcut',
    description: 'Hand-carved woodblock print texture, heavy crosshatching, rustic and stark.',
    promptFragment:
      'woodcut print style, hand-carved woodblock texture, heavy crosshatching and stippling, high contrast black and white, rustic engraving look',
    negativeFragment: 'no smooth digital shading, no photorealistic texture, no color',
    suggestedPrintTechnique: 'screen_1c',
    referenceUrls: [],
  },
  {
    id: 'death-metal-logo',
    name: 'Death-metal logo',
    description: 'Jagged, near-illegible extreme-metal logo lettering, spikes and thorns.',
    promptFragment:
      'extreme death metal band logo lettering, jagged spiky illegible typography, thorned and bladed letterforms, symmetrical, monochrome, aggressive',
    negativeFragment: 'no friendly rounded fonts, no bright colors, no legibility at a glance',
    suggestedPrintTechnique: 'screen_1c',
    referenceUrls: [],
  },
  {
    id: 'riso-2-colour',
    name: 'Riso 2-colour',
    description: 'Risograph print aesthetic: two flat spot colours, visible grain, slight misregistration.',
    promptFragment:
      'risograph print style, two flat spot colors with visible halftone grain texture, slight color misregistration, screen-printed zine aesthetic',
    negativeFragment: 'no full-color gradients, no photographic detail, no smooth digital blending',
    suggestedPrintTechnique: 'screen_2c',
    referenceUrls: [],
  },
  {
    id: 'photocopy-zine',
    name: 'Photocopy zine',
    description: 'Degraded xerox photocopy look: high contrast, noise, cut-and-paste punk collage.',
    promptFragment:
      'degraded photocopy xerox texture, high contrast black and white, noisy grain, punk zine cut-and-paste collage aesthetic, torn paper edges',
    negativeFragment: 'no clean vector lines, no smooth gradients, no color',
    suggestedPrintTechnique: 'screen_1c',
    referenceUrls: [],
  },
  {
    id: 'line-tattoo',
    name: 'Line tattoo',
    description: 'Fine single-weight linework, minimal fine-line tattoo style, no shading.',
    promptFragment:
      'fine-line tattoo style, minimal single-weight continuous line illustration, no shading, delicate and precise linework',
    negativeFragment: 'no thick bold outlines, no heavy shading, no color fill',
    suggestedPrintTechnique: 'dtg',
    referenceUrls: [],
  },
  {
    id: 'halftone',
    name: 'Halftone',
    description: 'Classic comic-print halftone dot shading, high contrast pop-art energy.',
    promptFragment:
      'halftone dot print style, comic book shading with visible dot patterns, high contrast, retro pop-art printing technique',
    negativeFragment: 'no smooth gradients, no photorealistic shading, no soft blur',
    suggestedPrintTechnique: 'screen_2c',
    referenceUrls: [],
  },
];

export function getStyleCapsule(id: string): StyleCapsule | null {
  return STYLE_CAPSULES.find((c) => c.id === id) ?? null;
}

export function listStyleCapsules(): StyleCapsule[] {
  return STYLE_CAPSULES;
}
