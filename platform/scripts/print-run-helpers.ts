/**
 * What scripts/print-samples.ts and scripts/local-demo.ts share: running the
 * print queue to empty with the real pipeline (engine, pack writers, checks,
 * print storage), and the placeholder Pantone codes typed for samples and the
 * demo. Neither script duplicates it.
 *
 * Every value import is a dynamic import() inside the functions: a caller sets
 * its environment first (which database, which print storage), and only then
 * does anything load lib/db.ts.
 */
import type { Actor } from '@/lib/auth/permissions';
import type { PackManifestInk } from '@/lib/print/types';

/** Placeholders typed for the samples and the demo, not matches for the colours:
 * in the shop, pre-press picks each code in MagnaMix. */
export const SAMPLE_PANTONE_CODES = ['PANTONE 186 C', 'PANTONE 2685 C', 'PANTONE 7406 C', 'PANTONE 3435 C', 'PANTONE 7621 C', 'PANTONE 300 C', 'PANTONE 1505 C', 'PANTONE 7739 C'];

/** Claims queued print jobs one by one and runs the real handler on each, until the queue is empty
 * (what worker/print-worker.ts does for ever). A job that fails is recorded as failed and the error is
 * thrown: a build that cannot make its files is not something to carry on from. Returns how many ran. */
export async function drainPrintQueue(workerId: string, log: (line: string) => void = console.log): Promise<number> {
  const jobs = await import('@/lib/print/jobs');
  const pipeline = await import('@/lib/print/pipeline');
  let ran = 0;
  for (;;) {
    const job = await jobs.claimNextPrintJob(workerId);
    if (!job) return ran;
    const started = Date.now();
    try {
      const result = await pipeline.handlePrintJob(job);
      await jobs.completePrintJob(job.id, result, workerId);
      log(`job ${job.kind} done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    } catch (err) {
      await jobs.failPrintJob(job.id, err instanceof Error ? err.message : String(err), workerId);
      throw err;
    }
    ran++;
  }
}

export interface InkCodeTarget {
  packId: string;
  /** the film's number in its pack */
  plateIndex: number;
}

/** Picks the inks to leave without a code. */
export type LeaveOut = (target: InkCodeTarget, ink: PackManifestInk) => boolean;

/**
 * Pre-press types a placeholder Pantone code for each colour ink of the given packs (the white films have
 * none), through the real service, so each code is remembered in the house library and the files are
 * queued to be rewritten with it. `leaveOut` picks inks to skip: a pack left with an ink and no code is
 * what pre-press sees while it is still working. Codes run through SAMPLE_PANTONE_CODES in turn, starting
 * at `offset`. Returns what was assigned and what was left.
 */
export async function assignSampleCodes(
  actor: Actor,
  packs: readonly { id: string }[],
  opts: { leaveOut?: LeaveOut; offset?: number } = {},
): Promise<{ assigned: (InkCodeTarget & { code: string })[]; left: InkCodeTarget[] }> {
  const pipeline = await import('@/lib/print/pipeline');
  const pantone = await import('@/lib/services/pantone-library');
  const { db, schema } = await import('@/lib/db');
  const { eq } = await import('drizzle-orm');

  const assigned: (InkCodeTarget & { code: string })[] = [];
  const left: InkCodeTarget[] = [];
  let next = opts.offset ?? 0;
  for (const { id } of packs) {
    const [pack] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, id)).limit(1);
    if (!pack) throw new Error(`Pack ${id} is gone.`);
    for (const ink of (pipeline.storedManifest(pack)?.inks ?? []).filter((i) => i.role === 'ink')) {
      const target = { packId: pack.id, plateIndex: ink.index };
      if (opts.leaveOut?.(target, ink)) {
        left.push(target);
        continue;
      }
      const code = SAMPLE_PANTONE_CODES[next++ % SAMPLE_PANTONE_CODES.length];
      const done = await pantone.assignPantone(actor, { ...target, code });
      if (!done.ok) throw new Error(done.error);
      assigned.push({ ...target, code });
    }
  }
  return { assigned, left };
}
