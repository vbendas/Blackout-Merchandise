import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type Tool, type ToolResult } from '@/lib/tools/types';
import {
  approvalPath,
  approveDesign,
  changeScreenCount,
  defaultPlacement,
  getApprovalView,
  preparePrint,
  productApproval,
  type ApprovalView,
  type ProductApproval,
} from '@/lib/services/print-prep';
import type { Card, Chip, PrintApprovalState, ToolUi } from '@/lib/ui-cards/schemas';

// Artist print-prep tools: prepare_print, get_print_proof, approve_design
// (confirm-gated), change_screen_count. Thin wrappers over
// lib/services/print-prep.ts; nothing here touches the database. Everything
// the artist reads is in their words: shop products and runs, colour names,
// "print files". Never a Pantone code, and never a word like "separation".

function errorNotice(id: string, text: string): Card {
  return { id, kind: 'notice', tone: 'warning', text };
}

function failure(idPrefix: string, error: string): { data: { ok: false; error: string }; ui: ToolUi } {
  return { data: { ok: false, error }, ui: { cards: [errorNotice(`${idPrefix}_err_${randomUUID()}`, error)] } };
}

function noStore(): { data: { ok: false; error: string } } {
  return { data: { ok: false, error: 'No shop found for this account yet.' } };
}

// -- the card ------------------------------------------------------------

/** Up to four proofs for the thread: each garment colour's DTG proof, then its screen proof. */
function pickProofs(view: ApprovalView): ApprovalView['proofs'] {
  const picked: ApprovalView['proofs'] = [];
  for (const garment of view.garments) {
    for (const technique of ['dtg_dtf', 'screen'] as const) {
      const proof = view.proofs.find((p) => p.garmentCode === garment.code && p.technique === technique);
      if (proof) picked.push(proof);
    }
  }
  return picked.slice(0, 4);
}

function noteFor(view: ApprovalView): string {
  switch (view.status) {
    case 'preparing':
      return 'Preparing the print files. This takes a few minutes.';
    case 'failed':
      return "The print files couldn't be prepared. Try again, or ask support to take a look.";
    case 'approved':
      return 'Approved for shop products and runs, on every colour you picked.';
    case 'ready':
      return view.warnings[0] ?? 'Look over the proofs on each colour, then approve.';
  }
}

/** The thread card for a design's print proofs; the approval page has the full set.
 * The link carries the conversation (?from=), so the page's way back lands in it. */
export function printProofCard(view: ApprovalView, sessionId?: string | null): Card {
  const names = new Map(view.garments.map((g) => [g.code, g.name]));
  const screenCount = view.screenSets.length > 0 ? Math.max(...view.screenSets.map((s) => s.screenCount)) : undefined;
  return {
    id: `print_proof_${view.designId}`,
    kind: 'print_proof',
    title: view.designName,
    designId: view.designId,
    designName: view.designName,
    versionNumber: view.versionNumber,
    status: view.status,
    proofs: pickProofs(view).map((p) => ({ garmentName: names.get(p.garmentCode) ?? p.garmentCode, technique: p.technique, url: p.url })),
    ...(screenCount ? { screenCount } : {}),
    approveHref: `/studio/approve/${view.designId}${sessionId ? `?from=${encodeURIComponent(sessionId)}` : ''}`,
    note: noteFor(view),
  };
}

// -- where a product's artwork stands -----------------------------------

/** What a product's card and project panel say about its artwork: a link to the approval page when there are
 * print files to approve, or the step as a message for the assistant (prepare them, add artwork). Nothing for a
 * product that needs no approval (embroidery) or null (not found). Never a Pantone code: the sentence names
 * the product and its colours only. */
export function printApprovalState(approval: ProductApproval | null, conversationId?: string | null): PrintApprovalState | undefined {
  if (!approval || approval.exempt) return undefined;
  if (approval.covered) return { covered: true };
  const step = approval.step;
  const toApprovalPage = step?.kind === 'approve' && approval.designId;
  return {
    covered: false,
    sentence: approval.sentence ?? undefined,
    action: step
      ? toApprovalPage
        ? { label: step.label, href: approvalPath(approval.designId as string, conversationId) }
        : { label: step.label, prompt: step.prompt }
      : undefined,
  };
}

/** The chip for a product's next step towards publishing: tapped, it sends the assistant on. */
export function approvalChip(approval: ProductApproval): Chip | null {
  const step = approval.step;
  if (!step) return null;
  return { label: step.kind === 'approve' ? 'Look over the proofs' : step.label, prompt: step.prompt, primary: true };
}

/** A stored product project with its artwork's standing read again. The artist may have approved (or undone it)
 * on the approval page since the tool call that stored it, and the panel must not show the old answer. Only a
 * product that can still go live carries one; anything else comes back as it was. */
export async function withFreshApproval(
  storeId: string | null,
  conversationId: string,
  project: { kind: string; refId: string | null; state: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const status = project.state.status;
  if (project.kind !== 'product' || !project.refId || !storeId || (status !== 'draft' && status !== 'proof_pending')) return project.state;
  const state = { ...project.state };
  delete state.printApproval;
  const fresh = printApprovalState(await productApproval(storeId, project.refId), conversationId);
  return fresh ? { ...state, printApproval: fresh } : state;
}

function nextChips(view: ApprovalView | null): Chip[] {
  if (!view) return [];
  switch (view.status) {
    case 'preparing':
      return [{ label: 'Check the proofs', prompt: 'Show me the print proofs', primary: true }];
    case 'ready':
      return view.canApprove
        ? [
            { label: 'Approve the design', prompt: 'Approve the design for printing', primary: true },
            { label: 'Use fewer screens', prompt: 'Can the screen print use fewer screens?' },
          ]
        : [{ label: 'Fix the artwork', prompt: 'I want to change the artwork' }];
    case 'approved':
      return [{ label: 'Quote a run', prompt: 'Quote a run of this design' }];
    case 'failed':
      return [{ label: 'Try again', prompt: 'Prepare the print files again', primary: true }];
  }
}

/** What the model is told about a view: status and facts, no images. */
function viewData(view: ApprovalView) {
  return {
    designId: view.designId,
    designName: view.designName,
    versionNumber: view.versionNumber,
    status: view.status,
    canApprove: view.canApprove,
    placement: view.placementLabel,
    garments: view.garments.map((g) => g.name),
    screenSets: view.screenSets.map((s) => ({ name: s.name, garments: s.garmentCodes.length, screens: s.screenCount, headline: s.headline, price: s.priceNote, inks: s.inks.map((i) => i.name) })),
    warnings: view.warnings,
    approvedAt: view.approvedAt,
    approvalPage: `/studio/approve/${view.designId}`,
  };
}

// -- prepare_print -------------------------------------------------------

interface PrepareData {
  ok: boolean;
  error?: string;
  jobId?: string;
  designVersionId?: string;
  status?: string;
  approvalPage?: string;
}

export const preparePrintTool = defineTool({
  name: 'prepare_print',
  description:
    "Prepare the print files for a design, once the artist has picked the blank, the garment colours and where the print goes. It makes both versions at once: DTG/DTF (how every shop product prints) and screen print (for runs), and a proof on every colour. Takes a few minutes. Returns a card with a link to the approval page; then use get_print_proof to show the proofs. Position and width are optional: the blank's usual spot and size are used when you leave them out. Never mention Pantone codes: colours are called by plain names.",
  input: z
    .object({
      designId: z.string().uuid().describe('The design to prepare.'),
      blankCode: z.string().min(2).max(20).describe('Blank code, e.g. STTU169 (for tool calls only; say the blank by its name).'),
      colourCodes: z.array(z.string().min(1).max(12)).min(1).max(20).describe('Garment colour codes the artist picked, e.g. ["C002", "C727"].'),
      position: z.string().max(40).optional().describe("Print position: 'front_chest', 'front_full', 'front_left_chest', 'back', 'centre'. Defaults to the blank's usual spot."),
      widthCm: z.number().min(2).max(60).optional().describe('Print width in cm. Defaults to the size calibrated for that position.'),
    })
    .strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<PrepareData>> => {
    if (!ctx.storeId) return noStore();
    const placement = await defaultPlacement(input.blankCode, { position: input.position, widthCm: input.widthCm });
    if (!placement) return failure('prepare_print', `There is no blank with the code ${input.blankCode}.`);

    const result = await preparePrint({
      storeId: ctx.storeId,
      userId: ctx.userId,
      designId: input.designId,
      blankCode: input.blankCode,
      garmentCodes: input.colourCodes,
      placements: [placement],
    });
    if (!result.ok) return failure('prepare_print', result.error);

    const view = await getApprovalView({ storeId: ctx.storeId, designId: input.designId });
    return {
      data: { ok: true, jobId: result.value.jobId, designVersionId: result.value.designVersionId, status: view?.status ?? 'preparing', approvalPage: `/studio/approve/${input.designId}` },
      ui: { cards: view ? [printProofCard(view, ctx.conversationId)] : undefined, next: nextChips(view) },
    };
  },
});

// -- get_print_proof -----------------------------------------------------

export const getPrintProofTool = defineTool({
  name: 'get_print_proof',
  description:
    "Show where a design's print files stand: the proofs on each garment colour and the link to the approval page, where the artist looks at every colour true size and approves. Returns the status (preparing, ready, approved or failed), the warnings, and for screen print the screens and inks by plain colour name. Call it after prepare_print, and whenever the artist asks how the print files are doing.",
  input: z.object({ designId: z.string().uuid().describe('The design to look at.') }).strict(),
  scope: 'artist',
  readOnly: true,
  run: async (ctx, input): Promise<ToolResult<{ ok: boolean; error?: string } & Partial<ReturnType<typeof viewData>>>> => {
    if (!ctx.storeId) return noStore();
    const view = await getApprovalView({ storeId: ctx.storeId, designId: input.designId });
    if (!view) return failure('get_print_proof', "There are no print files for this design yet. Prepare them first.");
    return { data: { ok: true, ...viewData(view) }, ui: { cards: [printProofCard(view, ctx.conversationId)], next: nextChips(view) } };
  },
});

// -- approve_design ------------------------------------------------------

interface ApproveData {
  ok: boolean;
  error?: string;
  approvalId?: string;
}

export const approveDesignTool = defineTool({
  name: 'approve_design',
  description:
    "Approve a design's print files. One approval covers both ways of printing (DTG/DTF for shop products and screen print for runs) and every garment colour in the proofs. Sensitive action: shows a confirm card and only executes once the artist clicks confirm. Only call it after the artist has seen the proofs and asked to approve. Pass designName and versionNumber (from the print proof card) so the confirmation reads clearly. Omit versionId to approve the latest version.",
  input: z
    .object({
      designId: z.string().uuid(),
      versionId: z.string().uuid().optional(),
      designName: z.string().max(80).optional(),
      versionNumber: z.number().int().optional(),
    })
    .strict(),
  scope: 'artist',
  confirm: true,
  summarize: (input) => `Approve ${input.designName ?? 'this design'}${input.versionNumber ? ` (version ${input.versionNumber})` : ''} for shop products and runs, on every colour in the proofs.`,
  run: async (ctx, input): Promise<ToolResult<ApproveData>> => {
    if (!ctx.storeId) return noStore();
    let versionId = input.versionId;
    if (!versionId) {
      const current = await getApprovalView({ storeId: ctx.storeId, designId: input.designId });
      if (!current) return failure('approve_design', "There are no print files for this design yet. Prepare them first.");
      versionId = current.versionId;
    }

    const result = await approveDesign({ storeId: ctx.storeId, userId: ctx.userId, designId: input.designId, versionId });
    if (!result.ok) return failure('approve_design', result.error);

    const view = await getApprovalView({ storeId: ctx.storeId, designId: input.designId });
    return {
      data: { ok: true, approvalId: result.value.approvalId },
      ui: { cards: view ? [printProofCard(view, ctx.conversationId)] : undefined, next: nextChips(view) },
    };
  },
});

// -- change_screen_count -------------------------------------------------

interface ScreenCountData {
  ok: boolean;
  error?: string;
  jobId?: string;
  screens?: number;
  note?: string;
}

export const changeScreenCountTool = defineTool({
  name: 'change_screen_count',
  description:
    "Change how many screens the screen print uses (1 to 15, the white underbase and the highlight white included) and prepare the screen print again. Fewer screens means fewer colours and a different look, so the artist has to look at the new proof and approve again. Tell them the price effect: 1 to 8 screens is the standard price; on a run, each screen above 8 adds €1 per piece (12 screens add €4 per piece). It never applies to shop products, which print DTG/DTF.",
  input: z.object({ designId: z.string().uuid(), screens: z.number().int().min(1).max(15) }).strict(),
  scope: 'artist',
  run: async (ctx, input): Promise<ToolResult<ScreenCountData>> => {
    if (!ctx.storeId) return noStore();
    const result = await changeScreenCount({ storeId: ctx.storeId, userId: ctx.userId, designId: input.designId, screens: input.screens });
    if (!result.ok) return failure('change_screen_count', result.error);

    const view = await getApprovalView({ storeId: ctx.storeId, designId: input.designId });
    const over = Math.max(0, input.screens - 8);
    return {
      data: {
        ok: true,
        jobId: result.value.jobId,
        screens: input.screens,
        // The separation decides how many screens it uses, up to this many: the price note is a ceiling until the new proof is ready.
        note:
          over === 0
            ? 'No surcharge on a run.'
            : `The new separation uses up to ${input.screens} screens. On a run, each screen above 8 adds €1 per piece, so up to €${over} per piece; the new proof shows the actual count.`,
      },
      ui: { cards: view ? [printProofCard(view, ctx.conversationId)] : undefined, next: nextChips(view) },
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRINT_TOOLS: Tool<any, any>[] = [preparePrintTool, getPrintProofTool, approveDesignTool, changeScreenCountTool];
