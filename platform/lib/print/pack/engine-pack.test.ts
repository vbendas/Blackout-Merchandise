// The seam with the engine (WP1): real separations and DTG layers go through
// the writers, the reader and the checks. Small flat art at 600 ppi keeps it
// quick; nothing here touches the database.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import type { CheckResult, PackFile, ScreenSet } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE, mergeRecipe } from '@/lib/print/defaults';
import { prepareDtg, separateScreen } from '@/lib/print/engine';
import { BLACK, LABEL, NAVY, WHITE, drawArt } from '@/lib/print/engine/testing';
import { buildPackManifest, describePackFile, readScreenPsd, runChecks, screenSetPrints, writeDtgPng, writeDtgPsd, writeScreenPsd } from './index';

const PLACEMENT = { position: 'front', widthMm: 60, offsetYMm: 80 };
const RECIPE = mergeRecipe(DEFAULT_RECIPE, {});
const garments = [BLACK, NAVY, WHITE];

function art() {
  return drawArt(600, 720, [
    { kind: 'circle', cx: 300, cy: 260, r: 190, colour: [237, 144, 220] },
    { kind: 'ring', cx: 300, cy: 260, r: 150, width: 22, colour: [84, 86, 172] },
    { kind: 'rect', x: 90, y: 520, w: 420, h: 110, colour: [62, 14, 97] },
    { kind: 'rect', x: 140, y: 555, w: 320, h: 40, colour: [250, 250, 250] },
  ]);
}

async function original() {
  const a = art();
  const bytes = await sharp(Buffer.from(a.data), { raw: { width: a.width, height: a.height, channels: 4 } }).png().toBuffer();
  return { bytes, filename: 'mf-test-v1.png', mime: 'image/png', widthPx: a.width, heightPx: a.height };
}

function byId(checks: CheckResult[]): Record<string, CheckResult> {
  return Object.fromEntries(checks.map((c) => [c.id, c]));
}

test('engine screen sets go through the PSD writer, the reader and the checks', async () => {
  const result = await separateScreen({ art: art(), placement: PLACEMENT, garments, recipe: RECIPE, inks: DEFAULT_INK_SYSTEM, label: LABEL });
  const printing = result.sets.filter(screenSetPrints);
  assert.ok(printing.length >= 1, 'at least one set prints');
  const orig = await original();
  for (const set of printing as ScreenSet[]) {
    const setGarments = garments.filter((g) => set.garmentCodes.includes(g.code));
    const psd = await writeScreenPsd({ set, garments: setGarments, original: orig, label: LABEL, inks: DEFAULT_INK_SYSTEM });
    const files: { file: PackFile; bytes: Buffer }[] = [{ file: describePackFile({ kind: 'screen_psd', name: `${set.key}.psd`, key: set.key, bytes: psd }), bytes: psd }];
    const manifest = buildPackManifest({
      designId: 'd',
      designVersionId: 'v',
      versionNumber: 1,
      placement: PLACEMENT,
      technique: 'screen',
      screenSetKey: set.key,
      garmentCodes: set.garmentCodes,
      method: set.method,
      files: files.map((f) => f.file),
      inputHash: 'h',
      label: LABEL,
      set,
      garments: setGarments,
      inkSystem: DEFAULT_INK_SYSTEM,
    });
    const checks = byId(await runChecks({ technique: 'screen', manifest, files, recipe: RECIPE, inks: DEFAULT_INK_SYSTEM, garments: setGarments, expected: { set } }));
    for (const id of ['size', 'structure', 'plates', 'marks', 'screens']) {
      assert.equal(checks[id].state, 'passed', `${set.key} ${id}: ${checks[id].detail}`);
    }
    assert.notEqual(checks.features.state, 'failed', checks.features.detail);

    const parsed = await readScreenPsd(psd);
    assert.equal(parsed.plates.length, set.plates.length);
    assert.equal(parsed.effectsOn, false);
    for (const p of parsed.plates) {
      const engine = set.plates.find((x) => x.index === p.index)!;
      assert.ok(Buffer.from(p.plate.data).equals(Buffer.from(engine.plate.data)), `${set.key} film ${p.index} reads back exactly`);
    }
  }
});

test('engine DTG/DTF layers go through the PSD and PNG writers and the checks', async () => {
  const dtg = await prepareDtg({ art: art(), placement: PLACEMENT, garments, recipe: RECIPE });
  const orig = await original();
  const psd = await writeDtgPsd({ layers: dtg.layers, garments, original: orig, label: LABEL });
  const files: { file: PackFile; bytes: Buffer }[] = [{ file: describePackFile({ kind: 'dtg_psd', name: 'dtg.psd', key: 'dtg', bytes: psd }), bytes: psd }];
  for (const layer of dtg.layers) {
    const png = await writeDtgPng(layer);
    files.push({ file: describePackFile({ kind: 'dtg_png', name: `${layer.garmentCode}.png`, key: layer.garmentCode, bytes: png, garmentCode: layer.garmentCode }), bytes: png });
  }
  const manifest = buildPackManifest({
    designId: 'd',
    designVersionId: 'v',
    versionNumber: 1,
    placement: PLACEMENT,
    technique: 'dtg_dtf',
    screenSetKey: null,
    garmentCodes: dtg.layers.map((l) => l.garmentCode),
    method: 'dtg',
    files: files.map((f) => f.file),
    inputHash: 'h',
    label: LABEL,
    dtgLayers: dtg.layers,
    garments,
  });
  const checks = byId(await runChecks({ technique: 'dtg_dtf', manifest, files, recipe: RECIPE, inks: DEFAULT_INK_SYSTEM, garments, expected: { dtgLayers: dtg.layers } }));
  for (const id of ['size', 'structure', 'dtg_alpha', 'whites']) {
    assert.equal(checks[id].state, 'passed', `${id}: ${checks[id].detail}`);
  }
});
