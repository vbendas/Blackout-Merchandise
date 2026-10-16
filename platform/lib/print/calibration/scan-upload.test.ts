// The rules of uploading a scan: names, keys, sizes and the words for what goes wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidKey, uploadPolicyFor } from '@/lib/services/print-storage';
import {
  CALIBRATION_ERRORS,
  DEFAULT_SCAN_MAX_BYTES,
  HARD_SCAN_MAX_BYTES,
  describeCalibrationFailure,
  isScanUploadKey,
  parseScanFilename,
  scanMaxBytes,
  scanUploadKey,
} from './scan-upload';

const NONCE = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('a scan name is an image name, made safe: no folders, no control characters, a lower-case extension', () => {
  assert.equal(parseScanFilename('scan.png'), 'scan.png');
  assert.equal(parseScanFilename('Chart 3 (front).TIFF'), 'Chart 3 (front).tiff');
  assert.equal(parseScanFilename('C:\\Users\\me\\Desktop\\scan.JPG'), 'scan.jpg');
  assert.equal(parseScanFilename('../../etc/scan.jpeg'), 'scan.jpeg');
  assert.equal(parseScanFilename('caf%C3%A9.tif'), 'café.tif');
  assert.equal(parseScanFilename('a\u0000b\u001f.png'), 'ab.png');
  for (const bad of ['corrected.psd', 'scan.pdf', 'scan', '.png', 'scan.', '   .png', null, undefined, '']) assert.equal(parseScanFilename(bad), null, String(bad));
  const long = parseScanFilename(`${'x'.repeat(300)}.png`);
  assert.ok(long && long.length <= 120 && long.endsWith('.png'));
});

test('a scan waits under a key that print storage lets Pre-press sign an upload to, and that only this module’s keys pass', () => {
  const key = scanUploadKey(NONCE, 'Chart 3 (front).tiff');
  assert.equal(key, `uploads/prepress/calibration/${NONCE}/Chart-3-front.tiff`);
  assert.ok(isValidKey(key));
  assert.deepEqual(uploadPolicyFor(key), { area: 'prepress', level: 'work' });
  assert.ok(isScanUploadKey(key));
  assert.ok(isScanUploadKey(scanUploadKey(NONCE, 'ünïcode.png')));
  assert.equal(scanUploadKey(NONCE, 'ünïcode.png'), `uploads/prepress/calibration/${NONCE}/unicode.png`);

  for (const other of [
    'uploads/prepress/calibration/short/scan.png',
    `uploads/prepress/calibration/${NONCE}/scan.psd`,
    `uploads/prepress/calibration/${NONCE}/sub/scan.png`,
    `uploads/prepress/other/${NONCE}/scan.png`,
    `prepress-uploads/${NONCE}/scan.png`,
    `print/${NONCE}/v1/scan.png`,
    `uploads/prepress/calibration/${NONCE}`,
    '',
  ]) {
    assert.equal(isScanUploadKey(other), false, other);
  }
});

test('the largest scan taken: 300 MB, or CALIBRATION_SCAN_MAX_MB, never past a gigabyte', () => {
  assert.equal(scanMaxBytes({}), DEFAULT_SCAN_MAX_BYTES);
  assert.equal(scanMaxBytes({ CALIBRATION_SCAN_MAX_MB: '' }), DEFAULT_SCAN_MAX_BYTES);
  assert.equal(scanMaxBytes({ CALIBRATION_SCAN_MAX_MB: 'lots' }), DEFAULT_SCAN_MAX_BYTES);
  assert.equal(scanMaxBytes({ CALIBRATION_SCAN_MAX_MB: '-4' }), DEFAULT_SCAN_MAX_BYTES);
  assert.equal(scanMaxBytes({ CALIBRATION_SCAN_MAX_MB: '50' }), 50 * 1024 * 1024);
  assert.equal(scanMaxBytes({ CALIBRATION_SCAN_MAX_MB: '99999' }), HARD_SCAN_MAX_BYTES);
});

test('a failed request is in words: the route’s own message first, then its code, then the status', () => {
  assert.deepEqual(describeCalibrationFailure(422, { error: 'unreadable', message: 'Could not find the four corner squares.' }), { code: 'unreadable', message: 'Could not find the four corner squares.' });
  assert.deepEqual(describeCalibrationFailure(413, { error: 'too_large' }), { code: 'too_large', message: CALIBRATION_ERRORS.too_large });
  assert.deepEqual(describeCalibrationFailure(413, null), { code: 'too_large', message: CALIBRATION_ERRORS.too_large }, 'a gateway’s 413 has no JSON');
  assert.equal(describeCalibrationFailure(401, {}).code, 'unauthorised');
  assert.equal(describeCalibrationFailure(403, {}).code, 'forbidden');
  assert.equal(describeCalibrationFailure(500, 'oops').code, 'failed');
  assert.equal(describeCalibrationFailure(400, { error: 'not-a-code', message: '   ' }).message, CALIBRATION_ERRORS.failed);
});
