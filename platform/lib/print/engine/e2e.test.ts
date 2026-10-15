// End to end on the owner's test design (Assets/test_design.png): painted art
// at 98 ppi over 28 cm, made for dark shirts. Screen plates render at 300 ppi
// here to keep the suite quick; the method choice does not depend on it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { ProofRequest, ScreenSeparationResult } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE, mergeRecipe } from '@/lib/print/defaults';
import { decodeArt, prepareDtg, renderDtgLoupe, renderDtgProof, renderScreenLoupe, renderScreenProof, separateScreen } from './index';
import { BLACK, LABEL, NAVY, WHITE, distinctValues } from './testing';

const ROOT = path.resolve(__dirname, '../../../..');
const DESIGN = path.join(ROOT, 'Assets/test_design.png');
const PACKSHOTS = path.resolve(__dirname, '../../../public/packshots');
const PLACEMENT = { position: 'front_chest', widthMm: 280 };
const RECIPE = mergeRecipe(DEFAULT_RECIPE, { screenPpi: 300 });
const BOX = { x: 0.2976, y: 0.3465, w: 0.4039, h: 0.4 };

function request(garment: typeof BLACK, file: string): ProofRequest {
  return { garment, placement: PLACEMENT, packshot: { image: fs.readFileSync(path.join(PACKSHOTS, file)), printBox: BOX } };
}

let screen: ScreenSeparationResult | null = null;
async function separate(): Promise<ScreenSeparationResult> {
  if (!screen) {
    const art = await decodeArt(fs.readFileSync(DESIGN));
    screen = await separateScreen({ art, placement: PLACEMENT, garments: [BLACK, NAVY, WHITE], recipe: RECIPE, inks: DEFAULT_INK_SYSTEM, label: LABEL });
  }
  return screen;
}

test('decodes the test design to RGBA with its metadata ppi', async () => {
  const art = await decodeArt(fs.readFileSync(DESIGN));
  assert.equal(art.width, 1080);
  assert.equal(art.height, 1296);
  assert.equal(art.channels, 4);
  assert.equal(art.ppi, 72);
  assert.equal(art.data.length, 1080 * 1296 * 4);
});

test('painted art is flagged for simulated process (or index), with a spot draft and a reason', async () => {
  const res = await separate();
  assert.notEqual(res.method, 'spot');
  assert.equal(res.needsManual, true);
  assert.ok(res.methodReason.length > 20);
  assert.ok(res.warnings.some((w) => (w.code === 'needs_sim_process' || w.code === 'needs_index') && w.severity === 'review'));
  const lowRes = res.warnings.find((w) => w.code === 'low_resolution');
  assert.ok(lowRes && lowRes.message.includes('98 ppi'), lowRes?.message);
  const darks = res.sets.find((s) => s.key === 'darks');
  const lights = res.sets.find((s) => s.key === 'lights');
  assert.ok(darks && lights);
  assert.ok(darks.garmentCodes.includes('C002'));
  assert.deepEqual(lights.garmentCodes, ['C001']);
  assert.ok(res.sets.flatMap((s) => s.garmentCodes).sort().join() === 'C001,C002,C727');
  for (const set of res.sets) {
    assert.ok(set.plates.length >= 2 && set.plates.length <= RECIPE.maxScreens, `${set.key}: ${set.plates.length} plates`);
    assert.notEqual(set.method, undefined);
    for (const p of set.plates) {
      const values = [...distinctValues(p.plate.data, 7)].sort((a, b) => a - b);
      assert.deepEqual(values, [0, 255]);
    }
  }
  assert.equal(darks.plates[0].role, 'underbase');
});

test('DTG layers for every garment, alpha strictly binary', async () => {
  const art = await decodeArt(fs.readFileSync(DESIGN));
  const res = await prepareDtg({ art, placement: PLACEMENT, garments: [BLACK, WHITE], recipe: RECIPE });
  assert.equal(res.layers.length, 2);
  for (const l of res.layers) {
    const alpha = new Set<number>();
    for (let i = 3; i < l.raster.data.length; i += 4) alpha.add(l.raster.data[i]);
    assert.deepEqual([...alpha].sort((a, b) => a - b), [0, 255]);
    assert.ok(l.fadeShare > 0);
  }
  assert.equal(res.layers.find((l) => l.garmentCode === 'C001')?.whitesTransparent, true);

  const proof = await renderDtgProof(res.layers[0], request(BLACK, 'PFM0_STTU169_C002.png'));
  const meta = await sharp(proof.image).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(proof.width, 1000);
  assert.equal(proof.technique, 'dtg_dtf');

  const loupe = await renderDtgLoupe(res.layers[0], BLACK.hex);
  const lm = await sharp(loupe.image).metadata();
  assert.equal(lm.format, 'png');
  assert.equal(loupe.ppi, 300);
  assert.equal(Math.round(lm.density ?? 0), 300);
  assert.equal(lm.width, Math.round((25 / 25.4) * 300));
});

test('screen proofs on the garment photos, and a true-size loupe', async () => {
  const res = await separate();
  const darks = res.sets.find((s) => s.key === 'darks');
  const lights = res.sets.find((s) => s.key === 'lights');
  assert.ok(darks && lights);
  const black = await renderScreenProof(darks, request(BLACK, 'PFM0_STTU169_C002.png'), DEFAULT_INK_SYSTEM);
  const white = await renderScreenProof(lights, request(WHITE, 'PFM0_STTU169_C001.webp'), DEFAULT_INK_SYSTEM);
  for (const p of [black, white]) {
    const meta = await sharp(p.image).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(p.width, 1000);
    assert.equal(meta.width, 1000);
    assert.equal(p.technique, 'screen');
  }
  // the print shows up inside the box: the proof differs from the bare photo there
  const bare = await sharp(fs.readFileSync(path.join(PACKSHOTS, 'PFM0_STTU169_C002.png'))).resize(1000).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const printed = await sharp(black.image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (buf: Buffer, x: number, y: number): number => buf[(y * 1000 + x) * 3] + buf[(y * 1000 + x) * 3 + 1] + buf[(y * 1000 + x) * 3 + 2];
  const cy = Math.round((BOX.y + 0.03) * bare.info.height);
  let changed = 0;
  for (let x = 320; x < 680; x++) if (Math.abs(at(printed.data, x, cy) - at(bare.data, x, cy)) > 30) changed++;
  assert.ok(changed > 50, `changed ${changed}`);

  const loupe = await renderScreenLoupe(darks, 'C002', DEFAULT_INK_SYSTEM);
  const lm = await sharp(loupe.image).metadata();
  assert.equal(loupe.ppi, 300);
  assert.equal(loupe.technique, 'screen');
  assert.equal(Math.round(lm.density ?? 0), 300);
  assert.equal(lm.width, Math.round((25 / 25.4) * 300));
});
