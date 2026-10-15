// The real session, storage and services behind the pre-press API routes
// (upload-handlers.ts and pack-status.ts hold the logic and take these as
// stand-ins in tests).
import { randomUUID } from 'node:crypto';
import { getSession } from '@/lib/auth';
import type { Actor } from '@/lib/auth/permissions';
import { createUploadUrl, deleteObject, isNotFound, openObject, statObject } from '@/lib/services/print-storage';
import { getPackDetail, uploadCorrectedPsd } from '@/lib/services/prepress';
import { uploadMaxBytes } from '@/components/admin/prepress/rules';
import type { StatusDeps } from './pack-status';
import type { UploadDeps } from './upload-handlers';

/** Who is asking, or null when nobody is signed in. Not requireUser(): an API
 * answers 401 and 403 itself instead of redirecting to a page. A suspended
 * employee is still returned, and can() gives them nothing. */
async function sessionActor(): Promise<Actor | null> {
  return (await getSession())?.actor ?? null;
}

/** The first `length` bytes of a stored object, read as a range so a PSD of hundreds of MB is never pulled. */
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

export function uploadDeps(): UploadDeps {
  return {
    getActor: sessionActor,
    maxBytes: uploadMaxBytes(process.env),
    nonce: () => randomUUID(),
    createUploadUrl,
    statUpload: async (key) => {
      const info = await statObject(key);
      return info ? { bytes: info.bytes } : null;
    },
    readHead,
    removeUpload: deleteObject,
    uploadCorrectedPsd,
  };
}

export function statusDeps(): StatusDeps {
  return { getActor: sessionActor, getPackDetail };
}
