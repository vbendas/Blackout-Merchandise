// DEV ONLY (WP3). Sample strings for the specimen. Real UI strings (nav,
// set list, apply word, composer placeholder, stats labels) come from the
// live dictionary; only what the dictionary lacks lives here. Nothing in this
// file ships: it is imported only by app/dev/specimen/Specimen.tsx.
import type { LangCode } from './faces';

/** Diacritic stress strings from the plan (5, step j). */
export const DIACRITIC_STRINGS: { lang: LangCode; text: string }[] = [
  { lang: 'pt', text: 'AÇÃO ÀS ÓCULOS' },
  { lang: 'de', text: 'ÄÖÜ STRASSE ß' },
  { lang: 'es', text: 'NIÑO Ñ ¿HOLA?' },
  { lang: 'fr', text: 'ŒUVRE ÉTÉ ÇA' },
  { lang: 'nl', text: 'ÏJ ËÉN' },
];

/** Wide caps line for the clipping demo (accents above, cedilla/tails below). */
export const CLIP_PROBE = 'ÃÕÑÂÊÜ ÇQÇ';

export interface Samples {
  /** Chips under the composer. */
  chips: string[];
  /** Button labels. */
  btnPrimary: string;
  btnInk: string;
  /** Mono agent tool-status lines. */
  tools: { name: string; arg: string; state: string; ms: string }[];
  /** SpecRow labels. */
  spec: { label: string; value: string }[];
  /** Stat unit for the blank count. */
  blanks: string;
  /** Card labels. */
  cardSample: string;
  cardFrom: string;
  /** Stamp words as they might read per locale (fixed strings, glyph-verified). */
  stamps: { approved: string; proof: string; void: string };
}

const en: Samples = {
  chips: ['Tour tee, 50 pcs', 'Flash sheet drop', 'Festival crew hoodies', 'Label capsule run'],
  btnPrimary: 'Start your brief',
  btnInk: 'See the catalog',
  tools: [
    { name: 'brief.parse', arg: 'tee / back print / 50', state: 'ok', ms: '0.4s' },
    { name: 'mockup.render', arg: 'front + back', state: 'ok', ms: '3.1s' },
    { name: 'quote.price', arg: '50 pcs / 2 colours', state: 'live', ms: '...' },
    { name: 'proof.send', arg: 'pdf', state: 'queued', ms: '-' },
  ],
  spec: [
    { label: 'Garment', value: 'Oversized tee' },
    { label: 'Weight', value: '280 gsm' },
    { label: 'Print', value: 'Screen, 2 colours' },
    { label: 'Quantity', value: '50' },
  ],
  blanks: 'blanks',
  cardSample: 'SAMPLE',
  cardFrom: 'From',
  stamps: { approved: 'APPROVED', proof: 'PROOF', void: 'VOID' },
};

const pt: Samples = {
  ...en,
  chips: ['T-shirt de tour, 50 un.', 'Folha de flash', 'Hoodies da equipa do festival', 'Cápsula da editora'],
  btnPrimary: 'Começa o teu briefing',
  btnInk: 'Ver o catálogo',
  blanks: 'peças base',
  cardFrom: 'Desde',
  stamps: { approved: 'APROVADO', proof: 'PROVA', void: 'NULO' },
};

const es: Samples = {
  ...en,
  chips: ['Camiseta de gira, 50 uds.', 'Hoja de flash', 'Sudaderas del equipo del festival', 'Cápsula del sello'],
  btnPrimary: 'Empieza tu brief',
  btnInk: 'Ver el catálogo',
  blanks: 'prendas base',
  cardFrom: 'Desde',
  stamps: { approved: 'APROBADO', proof: 'PRUEBA', void: 'NULO' },
};

const fr: Samples = {
  ...en,
  chips: ['T-shirt de tournée, 50 pcs', 'Planche de flash', 'Sweats de l’équipe du festival', 'Capsule du label'],
  btnPrimary: 'Lance ton brief',
  btnInk: 'Voir le catalogue',
  blanks: 'pièces de base',
  cardFrom: 'Dès',
  stamps: { approved: 'APPROUVÉ', proof: 'ÉPREUVE', void: 'NUL' },
};

const nl: Samples = {
  ...en,
  chips: ['Tour-shirt, 50 stuks', 'Flashsheet-drop', 'Festivalcrew-hoodies', 'Label-capsule'],
  btnPrimary: 'Start je brief',
  btnInk: 'Bekijk de catalogus',
  blanks: 'basisstukken',
  cardFrom: 'Vanaf',
  stamps: { approved: 'GOEDGEKEURD', proof: 'PROEF', void: 'ONGELDIG' },
};

const de: Samples = {
  ...en,
  chips: ['Tour-Shirt, 50 Stück', 'Flash-Sheet-Drop', 'Festival-Crew-Hoodies', 'Label-Kapsel'],
  btnPrimary: 'Brief starten',
  btnInk: 'Katalog ansehen',
  blanks: 'Rohlinge',
  cardFrom: 'Ab',
  stamps: { approved: 'FREIGEGEBEN', proof: 'KORREKTUR', void: 'UNGÜLTIG' },
};

export const SAMPLES: Record<LangCode, Samples> = { en, pt, es, fr, nl, de };
