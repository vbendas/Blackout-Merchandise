import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABSOLUTE_MAX_SCREENS, DEFAULT_RECIPE, STANDARD_MAX_SCREENS, mergeRecipe } from '@/lib/print/defaults';
import { STYLE_CAPSULES, getStyleCapsule, inkColoursFor } from '@/lib/services/style-capsules';

// What print prep applies from a recipe, deterministically, and the model must
// therefore never be asked to paint (Print-Prep-Plan sections 4 and 13).
const PAINTED_EFFECTS = /half-?tone|\bdots?\b|dotted|grain|noise|noisy|speckle|misregist|registration|texture|xerox|photocopy|risograph|stipple/i;
const PAINTED_EFFECT_CAPSULES = ['riso-2-colour', 'halftone', 'photocopy-zine'];

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

function capsule(id: string) {
  const found = getStyleCapsule(id);
  assert.ok(found, `capsule ${id} exists`);
  return found;
}

/** The number of ink colours a prompt asks for, as the words say it. */
function colourCountIn(prompt: string): number {
  const exactly = prompt.match(/exactly (\w+) flat ink colours/);
  if (exactly) return WORDS[exactly[1]];
  assert.match(prompt, /one solid ink colour/);
  return 1;
}

test('all eight capsules are there and carry a print recipe', () => {
  assert.equal(STYLE_CAPSULES.length, 8);
  for (const c of STYLE_CAPSULES) {
    assert.ok(c.printRecipe, `${c.id} has a printRecipe`);
    assert.ok(c.printRecipe.method, `${c.id} sets a method`);
    assert.ok(c.printRecipe.maxScreens, `${c.id} sets a screen budget`);
    assert.equal(typeof c.printRecipe.highlightWhite, 'boolean', `${c.id} decides on the highlight white`);
  }
});

test('every recipe stays inside the screen budget and merges into a valid recipe', () => {
  for (const c of STYLE_CAPSULES) {
    const merged = mergeRecipe(DEFAULT_RECIPE, c.printRecipe);
    assert.ok(merged.maxScreens >= 2 && merged.maxScreens <= STANDARD_MAX_SCREENS, `${c.id}: ${merged.maxScreens} screens is within the standard ${STANDARD_MAX_SCREENS}`);
    assert.ok(merged.maxScreens <= ABSOLUTE_MAX_SCREENS);
    assert.ok(['spot', 'auto'].includes(merged.method), `${c.id}: Phase 1 separates spot, or lets the engine decide`);
    assert.ok(merged.halftone.lpi >= 20 && merged.halftone.lpi <= 85, `${c.id}: ${merged.halftone.lpi} lpi holds on a screen`);
    assert.ok(merged.underbaseChokeMm > 0 && merged.underbaseChokeMm <= 0.5);
    assert.ok(merged.trapMm >= 0 && merged.knockoutDeltaE > 0);
    // nothing the capsule left alone is lost
    assert.equal(merged.screenPpi, DEFAULT_RECIPE.screenPpi);
  }
});

test('the colours a prompt asks for come from the recipe', () => {
  for (const c of STYLE_CAPSULES) {
    const fromRecipe = inkColoursFor(c.printRecipe);
    assert.equal(c.inkColours, fromRecipe, `${c.id}: inkColours is derived`);
    assert.equal(colourCountIn(c.promptFragment), fromRecipe, `${c.id}: the prompt asks for ${fromRecipe} colours`);
    // the negative prompt draws the same line
    assert.match(c.negativeFragment, fromRecipe === 1 ? /no other colours/ : new RegExp(`no more than ${Object.keys(WORDS).find((w) => WORDS[w] === fromRecipe)} colours`));
    // ink colours plus the white underbase (and a highlight white, if kept) fill the budget
    const merged = mergeRecipe(DEFAULT_RECIPE, c.printRecipe);
    assert.equal(fromRecipe + 1 + (merged.highlightWhite ? 1 : 0), merged.maxScreens, `${c.id}: the screens add up`);
  }
});

test('the engine defaults leave six ink colours, as the plan says', () => {
  assert.equal(inkColoursFor({}), 6);
  assert.equal(inkColoursFor({ maxScreens: 15 }), 13);
  assert.equal(inkColoursFor({ maxScreens: 1 }), 1);
});

test('american traditional asks for four colours and the recipe agrees', () => {
  const traditional = capsule('american-traditional');
  assert.equal(traditional.inkColours, 4);
  assert.match(traditional.promptFragment, /exactly four flat ink colours \(red, green, yellow and black\)/);
  assert.equal(traditional.printRecipe.method, 'spot');
  assert.equal(traditional.printRecipe.maxScreens, 5, 'four inks and the underbase');
  assert.equal(traditional.suggestedPrintTechnique, 'screen');
  // the old suggestion was screen_2c: nothing may still say two colours
  assert.doesNotMatch(`${traditional.promptFragment} ${traditional.negativeFragment}`, /two|2c/i);
});

test('a named palette has one name per ink, so the names and the count cannot disagree', () => {
  for (const c of STYLE_CAPSULES) {
    const named = c.promptFragment.match(/\(([^)]+)\)$/);
    if (!named) continue;
    assert.equal(named[1].split(/, | and /).length, c.inkColours, `${c.id}: palette (${named[1]}) matches ${c.inkColours} inks`);
  }
});

test('the riso, halftone and photocopy prompts no longer ask the model to paint print effects', () => {
  for (const id of PAINTED_EFFECT_CAPSULES) {
    const c = capsule(id);
    for (const [field, text] of Object.entries({ promptFragment: c.promptFragment, negativeFragment: c.negativeFragment, description: c.description })) {
      assert.doesNotMatch(text, PAINTED_EFFECTS, `${id}.${field} asks for a painted effect: "${text}"`);
    }
  }
});

test('the dot look of riso and halftone comes from the recipe instead', () => {
  const riso = mergeRecipe(DEFAULT_RECIPE, capsule('riso-2-colour').printRecipe);
  const halftone = mergeRecipe(DEFAULT_RECIPE, capsule('halftone').printRecipe);
  assert.ok(riso.halftone.lpi < DEFAULT_RECIPE.halftone.lpi, 'riso tints print coarser than the default');
  assert.ok(halftone.halftone.lpi < riso.halftone.lpi, 'comic dots are the coarsest');
  assert.equal(halftone.method, 'auto', 'tinted art is the one look the engine decides on');
  // a look that shades with tints may keep them; the flat ones may not
  assert.match(capsule('halftone').negativeFragment, /no smooth gradients/);
  assert.doesNotMatch(capsule('halftone').negativeFragment, /no tints/);
  assert.match(capsule('riso-2-colour').negativeFragment, /no tints/);
});

test('fine-line looks get a shallow underbase choke so the strokes keep their white', () => {
  for (const id of ['blackletter', 'death-metal-logo', 'line-tattoo']) {
    assert.ok(mergeRecipe(DEFAULT_RECIPE, capsule(id).printRecipe).underbaseChokeMm < DEFAULT_RECIPE.underbaseChokeMm, id);
  }
});

test('line tattoo suits DTG/DTF and the rest are flat spot art for screens', () => {
  assert.equal(capsule('line-tattoo').suggestedPrintTechnique, 'dtg_dtf');
  for (const c of STYLE_CAPSULES.filter((x) => x.id !== 'line-tattoo')) assert.equal(c.suggestedPrintTechnique, 'screen', c.id);
});

test('anchor images stay empty until the owner supplies them', () => {
  for (const c of STYLE_CAPSULES) assert.deepEqual(c.referenceUrls, [], c.id);
});
