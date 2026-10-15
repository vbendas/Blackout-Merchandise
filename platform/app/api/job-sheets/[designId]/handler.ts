// What GET /api/job-sheets/<design id> does, kept out of route.ts so it can be tested without
// Clerk or a database: everything it needs from the outside arrives through JobSheetRouteDeps.
//
// The job sheet carries Pantone codes and the pressroom's settings, so it is for the people who
// work on the films (Pre-press) or print them (Production): View access to either, or the owner.
// Everyone else is turned away before anything is read: 401 when nobody is signed in, 403 for an
// artist, a suspended employee, or staff with neither area. Answers are never cached: a sheet
// is made from what the design, its files and its open orders say right now.
import { PermissionError, type Actor } from '@/lib/auth/permissions';
import { canOpenJobSheets, isDesignId } from '@/lib/print/job-sheet-link';
import { contentDisposition } from '@/lib/services/print-storage';

export interface JobSheetRouteDeps {
  /** who is asking, or null when nobody is signed in */
  getActor: () => Promise<Actor | null>;
  /** the design's sheet, or null when there is no such design */
  getSheet: (actor: Actor, designId: string) => Promise<{ bytes: Buffer; filename: string } | null>;
}

function refuse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { 'cache-control': 'private, no-store' } });
}

export async function handleJobSheetRequest(req: Request, designId: string, deps: JobSheetRouteDeps): Promise<Response> {
  const actor = await deps.getActor();
  if (!actor) return refuse(401, 'unauthorised');
  if (!canOpenJobSheets(actor)) return refuse(403, 'forbidden');
  if (!isDesignId(designId)) return refuse(404, 'not_found');

  let sheet: Awaited<ReturnType<JobSheetRouteDeps['getSheet']>>;
  try {
    sheet = await deps.getSheet(actor, designId);
  } catch (err) {
    // The service checks access too; its refusal is the same answer.
    if (err instanceof PermissionError) return refuse(403, 'forbidden');
    console.error('[job sheet] could not make the sheet:', err instanceof Error ? err.message : err);
    return refuse(500, 'failed');
  }
  if (!sheet) return refuse(404, 'not_found');

  // Opens in the browser's PDF viewer, to read and print; ?download=1 saves it instead.
  const download = new URL(req.url).searchParams.get('download') === '1';
  return new Response(new Uint8Array(sheet.bytes), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': contentDisposition(sheet.filename, download ? 'attachment' : 'inline'),
      'content-length': String(sheet.bytes.length),
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
