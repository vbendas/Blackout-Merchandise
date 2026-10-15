import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_UPLOAD_MAX_BYTES,
  HARD_UPLOAD_MAX_BYTES,
  checkPantoneCode,
  checkRerunSettings,
  checkSendBackNote,
  describeUploadFailure,
  isPackId,
  isPsdSignature,
  isUploadKeyFor,
  keySafeFilename,
  parseUploadFilename,
  rerunFormFrom,
  rerunSettingsFromForm,
  settableUploadHeaders,
  uploadKey,
  uploadMaxBytes,
  UPLOAD_ERRORS,
} from './rules';

const UUID = '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44';

test('a pack id is a UUID', () => {
  assert.equal(isPackId(UUID), true);
  assert.equal(isPackId('not-a-uuid'), false);
  assert.equal(isPackId(`${UUID}/../x`), false);
  assert.equal(isPackId(''), false);
});

test('sample pack ids pass only with PRINT_MOCK=1', () => {
  const before = process.env.PRINT_MOCK;
  try {
    process.env.PRINT_MOCK = '';
    assert.equal(isPackId('mock-pack-darks'), false);
    process.env.PRINT_MOCK = '1';
    assert.equal(isPackId('mock-pack-darks'), true);
    assert.equal(isPackId('mock-pack darks'), false);
  } finally {
    if (before === undefined) delete process.env.PRINT_MOCK;
    else process.env.PRINT_MOCK = before;
  }
});

test('the upload limit is 1 GiB unless PREPRESS_UPLOAD_MAX_MB says otherwise, and never past the PSD limit', () => {
  assert.equal(uploadMaxBytes({}), DEFAULT_UPLOAD_MAX_BYTES);
  assert.equal(uploadMaxBytes({ PREPRESS_UPLOAD_MAX_MB: 'lots' }), DEFAULT_UPLOAD_MAX_BYTES);
  assert.equal(uploadMaxBytes({ PREPRESS_UPLOAD_MAX_MB: '-5' }), DEFAULT_UPLOAD_MAX_BYTES);
  assert.equal(uploadMaxBytes({ PREPRESS_UPLOAD_MAX_MB: '300' }), 300 * 1024 * 1024);
  assert.equal(uploadMaxBytes({ PREPRESS_UPLOAD_MAX_MB: '99999' }), HARD_UPLOAD_MAX_BYTES);
});

test('upload names keep a .psd or .psb and nothing else', () => {
  assert.equal(parseUploadFilename('MF-UNDERWRITER-v3-FRONT-DARKS.psd'), 'MF-UNDERWRITER-v3-FRONT-DARKS.psd');
  assert.equal(parseUploadFilename('Big%20file%20%281%29.PSB'), 'Big file (1).psb');
  assert.equal(parseUploadFilename(undefined), 'corrected.psd');
  assert.equal(parseUploadFilename(''), 'corrected.psd');
  assert.equal(parseUploadFilename('notes.txt'), null);
  assert.equal(parseUploadFilename('.psd'), null);
  assert.equal(parseUploadFilename('photo.psd.exe'), null);
});

test('upload names lose folders and control characters', () => {
  assert.equal(parseUploadFilename('../../etc/passwd.psd'), 'passwd.psd');
  assert.equal(parseUploadFilename('C:\\Users\\me\\fix.psd'), 'fix.psd');
  assert.equal(parseUploadFilename('%2e%2e%2fsecret.psd'), 'secret.psd');
  assert.equal(parseUploadFilename('a\u0000b\nc.psd'), 'abc.psd');
  assert.equal(parseUploadFilename('bad%ZZname.psd'), 'bad%ZZname.psd');
  assert.equal(parseUploadFilename('dir/'), null);
});

test('upload names are cut to a sane length', () => {
  const long = `${'a'.repeat(400)}.psd`;
  const name = parseUploadFilename(long);
  assert.ok(name !== null && name.length <= 150 && name.endsWith('.psd'));
});

test('a Photoshop file starts with 8BPS and version 1 or 2', () => {
  assert.equal(isPsdSignature(Uint8Array.from([0x38, 0x42, 0x50, 0x53, 0, 1])), true);
  assert.equal(isPsdSignature(Uint8Array.from([0x38, 0x42, 0x50, 0x53, 0, 2, 9, 9])), true);
  assert.equal(isPsdSignature(Uint8Array.from([0x38, 0x42, 0x50, 0x53, 0, 3])), false);
  assert.equal(isPsdSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 1])), false);
  assert.equal(isPsdSignature(Uint8Array.from([0x38, 0x42, 0x50])), false);
});

test('a name with spaces, brackets or accents becomes a storage-safe one', () => {
  assert.equal(keySafeFilename('Big file (1).psb'), 'Big-file-1.psb');
  assert.equal(keySafeFilename('Café front – final.psd'), 'Cafe-front-final.psd');
  assert.equal(keySafeFilename('MF-UNDERWRITER-v3-FRONT-DARKS.psd'), 'MF-UNDERWRITER-v3-FRONT-DARKS.psd');
  assert.equal(keySafeFilename('...hidden.psd'), 'hidden.psd');
  assert.equal(keySafeFilename('日本語.psd'), 'corrected.psd');
  assert.equal(keySafeFilename('a'.repeat(300) + '.psd').length, 104);
});

test('every name a key can end in passes the storage key rules', () => {
  for (const name of ['Big file (1).psb', 'Café front.psd', '日本語.psd', '..%2Fx.psd', 'a'.repeat(300) + '.psd']) {
    const parsed = parseUploadFilename(name) ?? 'corrected.psd';
    assert.match(keySafeFilename(parsed), /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
  }
});

test('an upload key names the pack, a nonce and the file', () => {
  const key = uploadKey(UUID.toUpperCase(), '0d9f7a42-aaaa-4bbb-8ccc-1234567890ab', 'Big file (1).psb');
  assert.equal(key, `prepress-uploads/${UUID}/0d9f7a42-aaaa-4bbb-8ccc-1234567890ab/Big-file-1.psb`);
  assert.equal(isUploadKeyFor(UUID, key), true);
  assert.equal(isUploadKeyFor(UUID.toUpperCase(), key), true);
});

test('only a key made for this pack passes', () => {
  const nonce = '0d9f7a42-aaaa-4bbb-8ccc-1234567890ab';
  const other = '11111111-2222-4333-8444-555555555555';
  const mine = `prepress-uploads/${UUID}/${nonce}/fix.psd`;
  assert.equal(isUploadKeyFor(UUID, mine), true);
  assert.equal(isUploadKeyFor(other, mine), false);
  assert.equal(isUploadKeyFor(UUID, `prepress-uploads/${other}/${nonce}/fix.psd`), false);
  assert.equal(isUploadKeyFor(UUID, `print/${other}/v1/pack/DARKS.psd`), false);
  assert.equal(isUploadKeyFor(UUID, `prepress-uploads/${UUID}/${nonce}/../../secret.psd`), false);
  assert.equal(isUploadKeyFor(UUID, `prepress-uploads/${UUID}/${nonce}/..`), false);
  assert.equal(isUploadKeyFor(UUID, `prepress-uploads/${UUID}/${nonce}/fix.png`), false);
  assert.equal(isUploadKeyFor(UUID, `prepress-uploads/${UUID}/${nonce}/.hidden.psd`), false);
  assert.equal(isUploadKeyFor(UUID, `prepress-uploads/${UUID}/short/fix.psd`), false);
  assert.equal(isUploadKeyFor(UUID, `prepress-uploads/${UUID}/${nonce}`), false);
  assert.equal(isUploadKeyFor(UUID, `/prepress-uploads/${UUID}/${nonce}/fix.psd`), false);
  assert.equal(isUploadKeyFor(UUID, `prepress-uploads/${UUID}/${nonce}/fix.psd/extra`), false);
  assert.equal(isUploadKeyFor(UUID, ''), false);
});

test('the headers of a signed upload are used, less the ones a browser won’t let a page set', () => {
  assert.deepEqual(settableUploadHeaders({ 'Content-Type': 'application/octet-stream', 'x-amz-meta-pack': 'abc', 'Content-Length': '99', Host: 'r2.example', 'content-length': '1' }), {
    'Content-Type': 'application/octet-stream',
    'x-amz-meta-pack': 'abc',
  });
  assert.deepEqual(settableUploadHeaders(null), {});
  assert.deepEqual(settableUploadHeaders('x'), {});
  assert.deepEqual(settableUploadHeaders({ a: 1, b: 'two' }), { b: 'two' });
});

test('a failed upload is worded from the route’s code, else from the status', () => {
  assert.deepEqual(describeUploadFailure(413, { error: 'too_large' }), { code: 'too_large', message: UPLOAD_ERRORS.too_large });
  assert.deepEqual(describeUploadFailure(413, 'Request Entity Too Large'), { code: 'too_large', message: UPLOAD_ERRORS.too_large });
  assert.equal(describeUploadFailure(403, null).code, 'forbidden');
  assert.equal(describeUploadFailure(401, undefined).code, 'unauthorised');
  assert.equal(describeUploadFailure(404, {}).code, 'not_found');
  assert.equal(describeUploadFailure(502, '<html>').code, 'failed');
  // an unknown code never reaches the page as a key
  assert.equal(describeUploadFailure(400, { error: '__proto__' }).code, 'failed');
});

test('the service’s own words win over the stock ones', () => {
  const result = describeUploadFailure(422, { error: 'rejected', message: 'The file has 9 layers; this pack has 6 films.' });
  assert.deepEqual(result, { code: 'rejected', message: 'The file has 9 layers; this pack has 6 films.' });
});

test('a Pantone code needs a few safe characters', () => {
  assert.deepEqual(checkPantoneCode('  186   C '), { ok: true, value: '186 C' });
  assert.deepEqual(checkPantoneCode('PANTONE Black 6 C'), { ok: true, value: 'PANTONE Black 6 C' });
  assert.equal(checkPantoneCode('').ok, false);
  assert.equal(checkPantoneCode('7').ok, false);
  assert.equal(checkPantoneCode('x'.repeat(41)).ok, false);
  assert.equal(checkPantoneCode('186 C; DROP TABLE').ok, false);
  assert.equal(checkPantoneCode(186).ok, false);
});

test('a note to the artist is required and bounded', () => {
  assert.deepEqual(checkSendBackNote('  The lashes are too thin.  '), { ok: true, value: 'The lashes are too thin.' });
  assert.equal(checkSendBackNote('   ').ok, false);
  assert.equal(checkSendBackNote(undefined).ok, false);
  assert.equal(checkSendBackNote('x'.repeat(1001)).ok, false);
  assert.equal(checkSendBackNote('Make it Pantone 186 C').ok, false, 'artists never see Pantone codes');
  assert.equal(checkSendBackNote('PMS 186 please').ok, false);
  assert.equal(checkSendBackNote('2685 C is too dark on navy').ok, false, 'a bare code, as staff type them');
  assert.equal(checkSendBackNote('The deep purple is too close to the navy shirt.').ok, true);
});

const DEFAULTS = { method: 'sim_process', maxScreens: 6, lpi: 55, angleDeg: 22.5, underbaseChokeMm: 0.2, trapMm: 0.25 } as const;

test('run again settings keep only the known fields, in range', () => {
  const result = checkRerunSettings({ method: 'spot', maxScreens: 9, lpi: 45, inkSubstitutions: [{ plateIndex: 3, hex: '#c363da' }] });
  assert.deepEqual(result, { ok: true, value: { method: 'spot', maxScreens: 9, lpi: 45, inkSubstitutions: [{ plateIndex: 3, hex: '#C363DA' }] } });
});

test('run again refuses what a browser could make up', () => {
  assert.equal(checkRerunSettings(null).ok, false);
  assert.equal(checkRerunSettings([]).ok, false);
  assert.equal(checkRerunSettings({ method: 'laser' }).ok, false);
  assert.equal(checkRerunSettings({ maxScreens: 16 }).ok, false);
  assert.equal(checkRerunSettings({ maxScreens: 0 }).ok, false);
  assert.equal(checkRerunSettings({ maxScreens: 6.5 }).ok, false);
  assert.equal(checkRerunSettings({ lpi: '55' }).ok, false);
  assert.equal(checkRerunSettings({ lpi: Number.NaN }).ok, false);
  assert.equal(checkRerunSettings({ trapMm: -1 }).ok, false);
  assert.equal(checkRerunSettings({ extra: 1 }).ok, false);
  assert.equal(checkRerunSettings({ inkSubstitutions: [{ plateIndex: 0, hex: '#000000' }] }).ok, false);
  assert.equal(checkRerunSettings({ inkSubstitutions: [{ plateIndex: 1, hex: 'violet' }] }).ok, false);
  assert.equal(checkRerunSettings({ inkSubstitutions: 'all' }).ok, false);
});

test('run again allows 15 screens, the most a run can have', () => {
  assert.deepEqual(checkRerunSettings({ maxScreens: 15 }), { ok: true, value: { maxScreens: 15 } });
});

test('the form starts from the pack’s own values and sends only what changed', () => {
  const form = rerunFormFrom(DEFAULTS);
  assert.deepEqual(form, { method: 'sim_process', maxScreens: '6', lpi: '55', angleDeg: '22.5', underbaseChokeMm: '0.2', trapMm: '0.25' });

  const same = rerunSettingsFromForm(form, DEFAULTS);
  assert.deepEqual(same, { ok: true, settings: {}, changed: false });

  const changed = rerunSettingsFromForm({ ...form, method: 'spot', maxScreens: '8', trapMm: '0.3' }, DEFAULTS);
  assert.deepEqual(changed, { ok: true, settings: { method: 'spot', maxScreens: 8, trapMm: 0.3 }, changed: true });
});

test('the form names each field that is out of range', () => {
  const result = rerunSettingsFromForm({ ...rerunFormFrom(DEFAULTS), maxScreens: '20', lpi: '', trapMm: '5' }, DEFAULTS);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(Object.keys(result.errors).sort(), ['lpi', 'maxScreens', 'trapMm']);
    assert.match(result.errors.maxScreens ?? '', /1 to 15/);
  }
});
