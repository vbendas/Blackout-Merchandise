// The real session, storage and calibration libraries behind the routes (handlers.ts holds the logic and takes
// these as stand-ins in tests). The chart and the scan reader load on first use: they pull in sharp, ag-psd and
// pdfkit, which no page ever needs.
import { randomUUID } from 'node:crypto';
import { getSession } from '@/lib/auth';
import type { Actor } from '@/lib/auth/permissions';
import { scanMaxBytes } from '@/lib/print/calibration/scan-upload';
import { createUploadUrl, deleteObject, getObject, isNotFound, openObject, statObject } from '@/lib/services/print-storage';
import { getActiveInkSystem } from '@/lib/services/ink-system';
import type { CalibrationDeps } from './handlers';

/** Who is asking, or null when nobody is signed in. Not requireUser(): an API answers 401 and 403 itself instead of
 * redirecting to a page. A suspended employee is still returned, and can() gives them nothing. */
async function sessionActor(): Promise<Actor | null> {
  return (await getSession())?.actor ?? null;
}

/** The first `length` bytes of a stored object, read as a range so a scan of tens of MB is never pulled just to look at its signature. */
async function readHead(key: string, length: number): Promise<Uint8Array | null> {
  let opened;
  try {
    opened = await openObject(key, { start: 0, end: length - 1 });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
  const reader = opened.stream.getReader();
  const head = new Uint8Array(length);
  let got = 0;
  try {
    while (got < length) {
      const { done, value } = await reader.read();
      if (done) break;
      const take = Math.min(value.byteLength, length - got);
      head.set(value.subarray(0, take), got);
      got += take;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return head.subarray(0, got);
}

export function calibrationDeps(): CalibrationDeps {
  return {
    getActor: sessionActor,
    getInks: async () => (await getActiveInkSystem()).profile,
    buildChart: async (format, settings, inks) => (await import('@/lib/print/calibration/chart')).buildChartFile(format, settings, inks),
    maxScanBytes: scanMaxBytes(process.env),
    nonce: () => randomUUID(),
    createUploadUrl,
    statUpload: async (key) => {
      const info = await statObject(key);
      return info ? { bytes: info.bytes } : null;
    },
    readHead,
    readUpload: async (key) => {
      try {
        return await getObject(key);
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },
    removeUpload: deleteObject,
    readScan: async (bytes, settings) => (await import('@/lib/print/calibration/scan')).readChartScan(bytes, settings),
  };
}
