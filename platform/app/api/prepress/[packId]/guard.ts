// What every pre-press API handler does first, before it reads anything from the
// request: who is asking, may they do this, is it a real pack. And the shape of an
// answer: errors are short codes the page words, as in the other routes (see
// app/api/studio/runs/[id]/pay/route.ts), with a `message` only when a service
// gave its own words. Every answer is uncached.
import { can, type Actor, type Level } from '@/lib/auth/permissions';
import { isPackId, type UploadErrorCode } from '@/components/admin/prepress/rules';

const STATUS: Record<UploadErrorCode, number> = {
  unauthorised: 401,
  forbidden: 403,
  not_found: 404,
  bad_request: 400,
  too_large: 413,
  not_a_psd: 415,
  empty: 400,
  incomplete: 400,
  storage: 502,
  rejected: 422,
  failed: 500,
  network: 400,
};

export function refuse(code: UploadErrorCode, message?: string): Response {
  return Response.json({ error: code, ...(message ? { message } : {}) }, { status: STATUS[code], headers: { 'cache-control': 'no-store' } });
}

export function ok(body: Record<string, unknown>): Response {
  return Response.json(body, { headers: { 'cache-control': 'no-store' } });
}

/** Who may do this: signed in, Pre-press at `level`, a real pack id. A Response is the refusal. */
export async function authorise(packId: string, getActor: () => Promise<Actor | null>, level: Level): Promise<Actor | Response> {
  const actor = await getActor();
  if (!actor) return refuse('unauthorised');
  if (!can(actor, 'prepress', level)) return refuse('forbidden');
  if (!isPackId(packId)) return refuse('not_found');
  return actor;
}
