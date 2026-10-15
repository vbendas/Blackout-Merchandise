// Garment packshots for proofs (WP5): the photo for a blank, colour and print
// position, plus the calibrated print box. Read from PACKSHOT_BASE_URL in
// production and from public/ in development, so the functions never trace
// public/ into their bundle (it is 313 MB: packshots 273, gallery 40).
//
// Where the bytes of '/packshots/<file>' come from, first match wins:
//   1. PACKSHOT_BASE_URL: the URL the contents of public/packshots are served
//      under (R2 public bucket, CDN, or https://<app>/packshots), so
//      '/packshots/a.webp' is fetched from '<base>/a.webp'.
//   2. The local public/ folder (PACKSHOT_PUBLIC_DIR overrides it), for
//      development and tests.
//   3. The app's own origin (NEXT_PUBLIC_APP_URL): public/ still deploys as
//      static files on the CDN even though no function carries it.
// Other public/ paths (a design under /dev, in development) only exist locally.
import { and, eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { db, schema } from '@/lib/db';
import { getTypePlacement, pocketLineFraction, type PrintPosition } from '@/lib/mockups/placements';
import type { FractionRect } from '@/lib/print/types';

export interface LoadedPackshot {
  image: Buffer;
  printBox: FractionRect;
  /** the position actually used ('front_chest', 'back'...) */
  position: string;
  /** physical width of the print box, from lib/mockups/placements.ts */
  widthCm: number;
  /** the photo's size in px, which turns a vertical offset in cm into a fraction of its height (printBoxFor);
   * absent or null when it isn't known (it can't be read, or a test's stand-in), and the standard packshot size is assumed */
  size?: { widthPx: number; heightPx: number } | null;
  /** where a hoodie front's kangaroo pocket starts, as a fraction of the photo's height; absent for any other garment */
  pocketLine?: number;
}

const PACKSHOT_DIR = 'packshots';
const FETCH_TIMEOUT_MS = 20_000;
/** Remote packshots are 0.4 to 1 MB; a proof run reuses the same few. */
const CACHE_MAX_BYTES = 48 * 1024 * 1024;
const CACHE_MAX_ENTRIES = 64;

// Recently fetched packshots, oldest first (a Map keeps insertion order).
const cache = new Map<string, Buffer>();
let cacheBytes = 0;

export function clearPackshotCache(): void {
  cache.clear();
  cacheBytes = 0;
}

function remember(url: string, bytes: Buffer): void {
  if (bytes.length > CACHE_MAX_BYTES / 4) return;
  cache.set(url, bytes);
  cacheBytes += bytes.length;
  for (const [oldest, value] of cache) {
    if (cache.size <= CACHE_MAX_ENTRIES && cacheBytes <= CACHE_MAX_BYTES) break;
    cache.delete(oldest);
    cacheBytes -= value.length;
  }
}

/** 'packshots/a.png' for '/packshots/a.png'. Refuses anything that could leave
 * the folder it is read from. */
function assetPath(url: string): string {
  const rel = url.replace(/^\/+/, '');
  if (!rel || rel.includes('\\') || rel.includes('\0') || rel.split('/').some((segment) => segment === '..' || segment === '')) {
    throw new Error(`Not a public asset path: ${JSON.stringify(url.slice(0, 120))}`);
  }
  return rel;
}

function publicDir(): string {
  if (process.env.PACKSHOT_PUBLIC_DIR) return path.resolve(process.env.PACKSHOT_PUBLIC_DIR);
  // The ignore comment keeps the bundler from tracing the whole project into
  // the server functions because of this one lookup.
  return path.join(/*turbopackIgnore: true*/ process.cwd(), 'public');
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** A fetch that will not get better by asking again (a 404, or a page that is not an image). */
class PackshotMissing extends Error {}

async function fetchPackshot(url: string): Promise<Buffer> {
  const hit = cache.get(url);
  if (hit) return hit;

  let lastError = 'no response';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        const type = res.headers.get('content-type') ?? '';
        // A CDN that answers 200 with an HTML error page would otherwise
        // reach sharp as a confusing decode failure.
        if (type && !/^(image\/|application\/octet-stream|binary\/octet-stream)/i.test(type)) {
          throw new PackshotMissing(`Packshot ${url} came back as ${type}, not an image`);
        }
        const bytes = Buffer.from(await res.arrayBuffer());
        remember(url, bytes);
        return bytes;
      }
      if (res.status < 500) throw new PackshotMissing(`Packshot not found (${res.status}): ${url}`);
      lastError = `status ${res.status}`;
    } catch (err) {
      if (err instanceof PackshotMissing) throw err;
      lastError = err instanceof Error ? err.message : 'network error';
    }
  }
  throw new Error(`Could not fetch packshot ${url}: ${lastError}`);
}

/** The bytes of a site-relative public asset: '/packshots/<file>' from storage
 * or the CDN, anything else from the local public/ folder. Throws when the
 * asset cannot be read. */
export async function readPublicAsset(url: string): Promise<Buffer> {
  const rel = assetPath(url);
  const inPackshots = rel.startsWith(`${PACKSHOT_DIR}/`);
  const name = inPackshots ? rel.slice(PACKSHOT_DIR.length + 1).split('/').map(encodeURIComponent).join('/') : '';

  const base = process.env.PACKSHOT_BASE_URL?.trim();
  if (base && inPackshots) return fetchPackshot(`${trimSlash(base)}/${name}`);

  const root = publicDir();
  const file = path.join(root, ...rel.split('/'));
  try {
    return await readFile(file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (origin && inPackshots) return fetchPackshot(`${trimSlash(origin)}/${PACKSHOT_DIR}/${name}`);

  throw new Error(
    inPackshots
      ? `Packshot ${rel} is not on disk and no PACKSHOT_BASE_URL or NEXT_PUBLIC_APP_URL is set to fetch it from.`
      : `Asset ${rel} is not in the public folder.`,
  );
}

/** The photo of a blank in a colour, for the side the position is printed on,
 * with the calibrated print box. Null when the colour has no photo of that side
 * (a proof is never drawn on another colour's garment) or the blank has no
 * calibrated box for the position (no silent fall back to another position).
 * Throws when the database names a photo that cannot be read. */
export async function loadPackshot(blankCode: string, colourCode: string, position: string): Promise<LoadedPackshot | null> {
  const [blank] = await db.select({ type: schema.blanks.type }).from(schema.blanks).where(eq(schema.blanks.code, blankCode)).limit(1);
  if (!blank) return null;

  const positions = getTypePlacement(blank.type)?.positions;
  const area = positions && Object.hasOwn(positions, position) ? positions[position as PrintPosition] : undefined;
  if (!area) return null;

  const [photo] = await db
    .select({ front: schema.blankColours.frontImageUrl, back: schema.blankColours.backImageUrl })
    .from(schema.blankColours)
    .where(and(eq(schema.blankColours.blankCode, blankCode), eq(schema.blankColours.colourCode, colourCode)))
    .limit(1);
  const url = area.image === 'back' ? photo?.back : photo?.front;
  if (!url) return null;

  const image = await readPublicAsset(url);
  // sharp loads here and not at the top: this runs in the print worker, and the pages that import this module do not need it.
  const meta = await (await import('sharp')).default(image).metadata().catch(() => null);
  const size = meta?.width && meta.height ? { widthPx: meta.width, heightPx: meta.height } : null;
  const pocketLine = pocketLineFraction(blank.type, area);
  return { image, printBox: { x: area.x, y: area.y, w: area.w, h: area.h }, position, widthCm: area.widthCm, size, ...(pocketLine === undefined ? {} : { pocketLine }) };
}
