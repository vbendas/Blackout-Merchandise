import { randomUUID } from 'crypto';
import { z } from 'zod';
import { PermissionError, type Actor } from '@/lib/auth/permissions';
import { defineTool, type Tool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import { getActiveInkSystem, updateInkSystem } from '@/lib/services/ink-system';
import { assignPantone, listPantoneLibrary } from '@/lib/services/pantone-library';
import { approvePack, getPackDetail, listPrepressQueue, rerunPack, sendBackToArtist, type PrepressTab } from '@/lib/services/prepress';
import type { RerunSettings } from '@/lib/print/types';
import type { Card, ToolUi } from '@/lib/ui-cards/schemas';

// Staff pre-press tools (WP7): list the queue, open a pack, approve, re-run,
// send back, enter a Pantone code, and read or change the ink system. Every
// tool declares `access` in the Pre-press area; the registry only offers it to
// someone who may use it, and each service checks again. Pantone codes appear
// here because this is the pre-press team's chat; they never go to an artist.

function actorOf(ctx: ToolContext): Actor {
  return { userId: ctx.userId, role: ctx.role, permissions: ctx.permissions ?? null, suspended: ctx.suspended };
}

function failure(idPrefix: string, error: string): { data: { ok: false; error: string }; ui: ToolUi } {
  return { data: { ok: false, error }, ui: { cards: [{ id: `${idPrefix}_err_${randomUUID()}`, kind: 'notice', tone: 'warning', text: error }] } };
}

/** A read the caller may not make comes back as a plain refusal, not a thrown error. */
async function guarded(idPrefix: string, work: () => Promise<ToolResult<unknown>>): Promise<ToolResult<unknown>> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof PermissionError) return failure(idPrefix, err.message);
    throw err;
  }
}

const packId = z.string().uuid().describe('The pack id from the queue or from a pack the staff member has open.');

const TAB_TITLES: Record<PrepressTab, string> = {
  waiting: 'Waiting for audit',
  being_fixed: 'Being fixed',
  approved: 'Approved',
  sent_back: 'Sent back to the artist',
};

// -- list_prepress_queue -------------------------------------------------

export const listPrepressQueueTool = defineTool({
  name: 'list_prepress_queue',
  description:
    "List the packs in the pre-press queue: the production files an order needs, waiting for a person to check them before production can start. Tabs: waiting, being_fixed, approved, sent_back. Search matches the design, shop, garment colours or order. Call this when staff ask what is waiting in pre-press.",
  input: z.object({ tab: z.enum(['waiting', 'being_fixed', 'approved', 'sent_back']).optional(), search: z.string().max(80).optional() }).strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'view' },
  readOnly: true,
  run: (ctx, input) =>
    guarded('list_prepress_queue', async () => {
      const tab = input.tab ?? 'waiting';
      const { rows, counts } = await listPrepressQueue(actorOf(ctx), { tab, search: input.search });
      const card: Card = {
        id: `prepress_queue_${randomUUID()}`,
        kind: 'admin_queue',
        title: 'Pre-press queue',
        generatedAt: new Date().toISOString(),
        sections: [
          {
            key: tab,
            title: TAB_TITLES[tab],
            count: rows.length,
            items: rows.slice(0, 8).map((r) => ({
              id: r.packId,
              text: `${r.designName} · ${r.fileLabel}`,
              meta: [r.garmentsLabel, r.screensLabel !== '–' ? `${r.screensLabel} screens` : null, r.checks.label, r.neededForLabel].filter(Boolean).join(' · '),
              prompt: `Open pre-press pack ${r.packId}`,
            })),
          },
        ],
      };
      return {
        data: {
          ok: true,
          tab,
          counts,
          packs: rows.slice(0, 15).map((r) => ({ packId: r.packId, design: r.designName, shop: r.shopName, file: r.fileLabel, garments: r.garmentsLabel, screens: r.screensLabel, method: r.methodLabel, checks: r.checks, neededFor: r.neededForLabel, waitingSince: r.waitingSince })),
        },
        ui: { cards: [card] },
      };
    }),
});

// -- get_prepress_pack ---------------------------------------------------

export const getPrepressPackTool = defineTool({
  name: 'get_prepress_pack',
  description:
    "Open one pack: its films in press order (Pantone code, client colour name, base, coverage, mesh), what the engine chose and why, the checks (review and failed ones first), the history and what staff can do next. Use the queue first to find the pack id.",
  input: z.object({ packId }).strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'view' },
  readOnly: true,
  run: (ctx, input) =>
    guarded('get_prepress_pack', async () => {
      const view = await getPackDetail(actorOf(ctx), input.packId);
      if (!view) return failure('get_prepress_pack', 'No pack found with that id.');

      const order = { failed: 0, review: 1, passed: 2 } as const;
      const checks = [...view.checks].sort((a, b) => order[a.state] - order[b.state]);
      const open = checks.filter((c) => c.state !== 'passed').length;
      const films = view.films.map((f) => ({ film: f.n, label: f.label, pantone: f.pantone, clientName: f.clientName, base: f.base, coverage: f.coverage, mesh: f.mesh, needsPantone: f.needsPantone, suggestion: f.suggestion }));
      return {
        data: {
          ok: true,
          packId: view.packId,
          title: view.title,
          meta: view.meta,
          technique: view.technique,
          auditStatus: view.auditStatus,
          buildStatus: view.buildStatus,
          films,
          engine: view.engine,
          checks,
          dtgFiles: view.dtgFiles.map((d) => ({ garment: d.garmentName, file: d.fileName })),
          history: view.history.slice(-8),
          rerunDefaults: view.rerunDefaults,
          canWork: view.canWork,
        },
        ui: {
          cards: [
            {
              id: `prepress_pack_${view.packId}`,
              kind: 'notice',
              tone: open > 0 ? 'warning' : 'info',
              text: `${view.title}: ${view.technique === 'screen' ? `screen print, ${view.films.length} films` : `DTG/DTF, ${view.dtgFiles.length} files`}. ${open > 0 ? `${open} ${open === 1 ? 'check needs' : 'checks need'} a look.` : 'Every check passed.'}`,
            },
          ],
          next: view.canWork && view.auditStatus !== 'approved' ? [{ label: 'Approve the pack', prompt: `Approve pre-press pack ${view.packId}`, primary: true }, { label: 'Run it again', prompt: `Run pre-press pack ${view.packId} again` }] : undefined,
        },
      };
    }),
});

// -- approve_pack --------------------------------------------------------

export const approvePackTool = defineTool({
  name: 'approve_pack',
  description:
    "Approve a pack: the staff member has checked the films, proofs and checks, and orders that need it can go to production. Sensitive action: shows a confirm card and only runs once the staff member clicks confirm. Every colour ink needs its Pantone code first, and a pack with a failed check cannot be approved.",
  input: z.object({ packId, packName: z.string().max(120).optional().describe("The pack's title, for the confirmation, e.g. 'Underwriter · v3 · Front'.") }).strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'work' },
  confirm: true,
  summarize: (input) => `Approve the pre-press pack${input.packName ? ` ${input.packName}` : ''}. Orders that need it can then go to production.`,
  run: async (ctx, input): Promise<ToolResult<{ ok: boolean; error?: string }>> => {
    const result = await approvePack(actorOf(ctx), input.packId);
    if (!result.ok) return failure('approve_pack', result.error);
    return { data: { ok: true }, ui: { cards: [{ id: `approve_pack_${input.packId}`, kind: 'notice', tone: 'success', text: 'Pack approved. Orders that need it can go to production.' }] } };
  },
});

// -- rerun_pack ----------------------------------------------------------

export const rerunPackTool = defineTool({
  name: 'rerun_pack',
  description:
    "Run a pack again with changes: method (spot, index, simulated process), screen count (1 to 15), lines per inch, angle, underbase choke, trap, or a different colour for a film (inkChanges, by film number). The new pack replaces this one and comes back for audit. The artist is asked to approve again only if the proof changes. Leave out anything that should stay as it is.",
  input: z
    .object({
      packId,
      method: z.enum(['spot', 'index', 'sim_process']).optional(),
      screens: z.number().int().min(1).max(15).optional(),
      lpi: z.number().min(20).max(100).optional(),
      angleDeg: z.number().min(0).max(90).optional(),
      underbaseChokeMm: z.number().min(0).max(2).optional(),
      trapMm: z.number().min(0).max(2).optional(),
      inkChanges: z
        .array(z.object({ filmNumber: z.number().int().min(1).max(15), hex: z.string().regex(/^#?[0-9a-fA-F]{6}$/) }).strict())
        .max(15)
        .optional()
        .describe('A colour ink replaced by another colour, by its film number and a hex like #5456AC.'),
    })
    .strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'work' },
  run: async (ctx, input): Promise<ToolResult<{ ok: boolean; error?: string; jobId?: string }>> => {
    const settings: RerunSettings = {
      ...(input.method ? { method: input.method } : {}),
      ...(input.screens !== undefined ? { maxScreens: input.screens } : {}),
      ...(input.lpi !== undefined ? { lpi: input.lpi } : {}),
      ...(input.angleDeg !== undefined ? { angleDeg: input.angleDeg } : {}),
      ...(input.underbaseChokeMm !== undefined ? { underbaseChokeMm: input.underbaseChokeMm } : {}),
      ...(input.trapMm !== undefined ? { trapMm: input.trapMm } : {}),
      ...(input.inkChanges?.length ? { inkSubstitutions: input.inkChanges.map((c) => ({ plateIndex: c.filmNumber, hex: c.hex.startsWith('#') ? c.hex : `#${c.hex}` })) } : {}),
    };
    const result = await rerunPack(actorOf(ctx), input.packId, settings);
    if (!result.ok) return failure('rerun_pack', result.error);
    return {
      data: { ok: true, jobId: result.value.jobId },
      ui: { cards: [{ id: `rerun_pack_${input.packId}`, kind: 'notice', tone: 'info', text: 'Running the pack again. The new files will replace this pack in the queue in a few minutes.' }] },
    };
  },
});

// -- send_back_to_artist -------------------------------------------------

export const sendBackToArtistTool = defineTool({
  name: 'send_back_to_artist',
  description:
    "Send a pack back to the artist with a note saying what to change: their approval is withdrawn and they hear from us in their inbox. Sensitive action: shows a confirm card and only runs once the staff member clicks confirm. Write the note for the artist, in plain words: no Pantone codes, no pre-press jargon.",
  input: z.object({ packId, note: z.string().min(1).max(1000).describe('What the artist needs to change, in plain words.') }).strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'work' },
  confirm: true,
  summarize: (input) => `Send the pack back to the artist with this note: "${input.note.length > 140 ? `${input.note.slice(0, 137)}...` : input.note}"`,
  run: async (ctx, input): Promise<ToolResult<{ ok: boolean; error?: string }>> => {
    const result = await sendBackToArtist(actorOf(ctx), input.packId, input.note);
    if (!result.ok) return failure('send_back_to_artist', result.error);
    return { data: { ok: true }, ui: { cards: [{ id: `send_back_${input.packId}`, kind: 'notice', tone: 'success', text: 'Sent back to the artist with your note.' }] } };
  },
});

// -- assign_pantone ------------------------------------------------------

export const assignPantoneTool = defineTool({
  name: 'assign_pantone',
  description:
    "Enter the Pantone code picked in MagnaMix for one colour ink of a pack, by its film number (for example 186 C). The code is remembered for the next close colour, and the files are rebuilt with it. Only colour inks have codes; the white films do not.",
  input: z.object({ packId, filmNumber: z.number().int().min(1).max(15), code: z.string().min(1).max(40).describe("The code as MagnaMix shows it: '186 C' or 'PANTONE 186 C'.") }).strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'work' },
  run: async (ctx, input): Promise<ToolResult<{ ok: boolean; error?: string }>> => {
    const result = await assignPantone(actorOf(ctx), { packId: input.packId, plateIndex: input.filmNumber, code: input.code });
    if (!result.ok) return failure('assign_pantone', result.error);
    return { data: { ok: true }, ui: { cards: [{ id: `assign_pantone_${input.packId}_${input.filmNumber}`, kind: 'notice', tone: 'success', text: `Saved the code for film ${input.filmNumber}.` }] } };
  },
});

// -- list_pantone_library ------------------------------------------------

export const listPantoneLibraryTool = defineTool({
  name: 'list_pantone_library',
  description: 'List the house Pantone library: the codes pre-press picked in MagnaMix, each with the colour it was picked for. Optionally search by code.',
  input: z.object({ search: z.string().max(40).optional() }).strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'view' },
  readOnly: true,
  run: (ctx, input) =>
    guarded('list_pantone_library', async () => {
      const rows = await listPantoneLibrary(actorOf(ctx), { search: input.search, limit: 40 });
      return { data: { ok: true, total: rows.length, codes: rows.map((r) => ({ code: r.code, hex: r.hex, source: r.source })) } };
    }),
});

// -- get_ink_system ------------------------------------------------------

export const getInkSystemTool = defineTool({
  name: 'get_ink_system',
  description: "Read the shop's ink system profile: the colour bases, the underbase and its flash, mesh counts, cure, press heads, and whether the inks have been measured.",
  input: z.object({}).strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'view' },
  readOnly: true,
  run: async (): Promise<ToolResult<{ ok: boolean; profile: Awaited<ReturnType<typeof getActiveInkSystem>>['profile']; updatedAt: string | null }>> => {
    const active = await getActiveInkSystem();
    return { data: { ok: true, profile: active.profile, updatedAt: active.updatedAt } };
  },
});

// -- update_ink_system ---------------------------------------------------

const inkChanges = z
  .object({
    name: z.string().min(1).max(80),
    pressHeads: z.number().int().min(1).max(15),
    measured: z.boolean(),
    pigmentMaxPct: z.number().min(0).max(100),
    squeegee: z.string().max(120),
    offContactMm: z.tuple([z.number().min(0).max(20), z.number().min(0).max(20)]),
    cure: z.object({ minutesMin: z.number(), minutesMax: z.number(), celsius: z.number() }).partial().strict(),
    mesh: z.object({ min: z.number(), max: z.number(), halftone: z.number(), solid: z.number(), underbase: z.number() }).partial().strict(),
    underbaseFlash: z.object({ seconds: z.number(), celsius: z.number() }).partial().strict(),
    opacity: z.record(z.string(), z.number().min(0).max(1)),
  })
  .partial()
  .strict();

export const updateInkSystemTool = defineTool({
  name: 'update_ink_system',
  description:
    "Change the ink system profile: pass only the fields that change (name, press heads, measured, pigment limit, squeegee, off-contact, cure, mesh counts, the underbase flash, base opacities). Manage access to Pre-press. Sensitive action: shows a confirm card and only runs once the staff member clicks confirm. A change applies to packs prepared from then on.",
  input: z.object({ changes: inkChanges }).strict(),
  scope: 'staff',
  access: { area: 'prepress', level: 'manage' },
  confirm: true,
  summarize: (input) => `Change the ink system: ${Object.keys(input.changes).join(', ') || 'nothing'}. It applies to packs prepared from now on.`,
  run: async (ctx, input): Promise<ToolResult<{ ok: boolean; error?: string }>> => {
    const { profile: current } = await getActiveInkSystem();
    const c = input.changes;
    const next = {
      ...current,
      ...(c.name !== undefined ? { name: c.name } : {}),
      ...(c.pressHeads !== undefined ? { pressHeads: c.pressHeads } : {}),
      ...(c.measured !== undefined ? { measured: c.measured } : {}),
      ...(c.pigmentMaxPct !== undefined ? { pigmentMaxPct: c.pigmentMaxPct } : {}),
      ...(c.squeegee !== undefined ? { squeegee: c.squeegee } : {}),
      ...(c.offContactMm !== undefined ? { offContactMm: c.offContactMm } : {}),
      cure: { ...current.cure, ...(c.cure ?? {}) },
      mesh: { ...current.mesh, ...(c.mesh ?? {}) },
      underbase: { ...current.underbase, flash: { ...current.underbase.flash, ...(c.underbaseFlash ?? {}) } },
      opacity: { ...current.opacity, ...(c.opacity ?? {}) },
    };
    const result = await updateInkSystem(actorOf(ctx), next);
    if (!result.ok) return failure('update_ink_system', result.error);
    return { data: { ok: true }, ui: { cards: [{ id: `ink_system_${randomUUID()}`, kind: 'notice', tone: 'success', text: 'Ink system saved. Packs prepared from now on use it.' }] } };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PREPRESS_TOOLS: Tool<any, any>[] = [
  listPrepressQueueTool,
  getPrepressPackTool,
  approvePackTool,
  rerunPackTool,
  sendBackToArtistTool,
  assignPantoneTool,
  listPantoneLibraryTool,
  getInkSystemTool,
  updateInkSystemTool,
];
