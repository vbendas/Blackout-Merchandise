import { randomUUID } from 'crypto';
import { z } from 'zod';
import { defineTool, type Tool, type ToolContext, type ToolResult } from '@/lib/tools/types';
import {
  analyzeDesign,
  cleanDesign,
  composeDesign,
  editDesign,
  generateDesign,
  getDesign,
  type CleanOp,
  type DesignSummary,
} from '@/lib/services/designs';
import { listStyleCapsules } from '@/lib/services/style-capsules';
import type { Card, Chip } from '@/lib/ui-cards/schemas';

// Design intake tools: guide the model through the five artist situations —
// (1) print-ready file, (2) file needing cleanup, (3) file needing edits,
// (4) logo-only composition, (5) from scratch — see Platform-Plan.md §4.

function notice(tone: 'info' | 'warning' | 'error', text: string): Card {
  return { id: `design_notice_${randomUUID()}`, kind: 'notice', tone, text };
}

type OwnershipCheck = { ok: true } | { ok: false; result: ToolResult<{ ok: false; error: 'no_store' | 'not_found' }> };

/** Every design tool that touches an existing designId must confirm it
 * belongs to the caller's own store before doing any work. */
async function requireOwnedDesign(ctx: ToolContext, designId: string): Promise<OwnershipCheck> {
  if (!ctx.storeId) {
    return { ok: false, result: { data: { ok: false, error: 'no_store' }, ui: { cards: [notice('warning', 'No shop found for this account yet.')] } } };
  }
  const design = await getDesign(designId);
  if (!design || design.storeId !== ctx.storeId) {
    return { ok: false, result: { data: { ok: false, error: 'not_found' }, ui: { cards: [notice('warning', `No design found with id ${designId}.`)] } } };
  }
  return { ok: true };
}

function summaryData(summary: DesignSummary) {
  return {
    designId: summary.designId,
    readiness: summary.readiness,
    dpiAtPrint: summary.dpiAtPrint,
    hasAlpha: summary.hasAlpha,
    notes: summary.readinessNotes,
  };
}

function designCard(summary: DesignSummary): Card {
  return {
    id: `design_${summary.designId}`,
    kind: 'design',
    designId: summary.designId,
    previewUrl: summary.previewUrl,
    widthPx: summary.widthPx ?? undefined,
    heightPx: summary.heightPx ?? undefined,
    dpiAtPrint: summary.dpiAtPrint ?? undefined,
    hasAlpha: summary.hasAlpha ?? undefined,
    readiness: summary.readiness,
    notes: summary.readinessNotes.length > 0 ? summary.readinessNotes : undefined,
  };
}

function mockupGridCard(id: string, summaries: DesignSummary[]): Card {
  return {
    id,
    kind: 'mockup_grid',
    items: summaries.map((s) => ({ id: s.designId, url: s.previewUrl, designId: s.designId, prompt: `Use design ${s.designId}` })),
    columns: summaries.length > 1 ? 2 : 1,
  };
}

function designNextChips(designId: string): Chip[] {
  return [
    { label: 'Variations', prompt: `Generate variations of design ${designId}` },
    { label: 'Edit', prompt: `Edit design ${designId}` },
    { label: 'Use this on a hoodie', prompt: `Use design ${designId} on a hoodie` },
  ];
}

export const uploadDesignTool = defineTool({
  name: 'upload_design',
  description:
    "Open the artwork upload picker so the artist can attach their own file (PNG, JPEG, WebP or SVG, up to 25MB) — the right first move for case 1 (a print-ready file), case 2 (a file that needs cleanup) and case 3 (a file the artist wants edited). This tool does no server work itself; it only shows the picker. Once the artist picks a file the app uploads it and attaches the resulting design id to the conversation — call analyze_design on that id next.",
  input: z.object({}).strict(),
  scope: 'both',
  readOnly: true,
  run: async () => ({
    data: { ok: true as const },
    ui: {
      cards: [
        {
          id: `upload_${randomUUID()}`,
          kind: 'upload',
          accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
          hint: 'PNG, JPEG, WebP or SVG, up to 25MB.',
        },
      ],
    },
  }),
});

export const analyzeDesignTool = defineTool({
  name: 'analyze_design',
  description:
    "Check a design's print readiness: resolution (DPI at a 28cm print width), transparency, and background type. Call this right after a design is attached or uploaded to tell case 1 (print-ready) apart from case 2 (needs cleanup) and case 3 (needs edits). Never tell the artist a design will print well below 150 dpi — this tool tells you the real number.",
  input: z.object({ designId: z.string().min(1).describe('Design id, e.g. from an attachment or a previous design card.') }).strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult> => {
    const owned = await requireOwnedDesign(ctx, input.designId);
    if (!owned.ok) return owned.result;
    const summary = await analyzeDesign(input.designId);
    return { data: summaryData(summary), ui: { cards: [designCard(summary)], next: designNextChips(summary.designId) } };
  },
});

export const cleanDesignTool = defineTool({
  name: 'clean_design',
  description:
    "Prepare a design for print — case 2 (file needing cleanup). Ops run in the given order and produce one new design version; the artist's original is kept untouched: 'remove_bg' strips a photo or solid-coloured background, 'upscale' sharpens a low-dpi file, 'trim' crops a padded border. Call this after analyze_design reports 'needs_cleanup', picking the op(s) its notes point to.",
  input: z
    .object({
      designId: z.string().min(1),
      ops: z.array(z.enum(['remove_bg', 'upscale', 'trim'])).min(1).max(3).describe('Cleanup operations to run, in order.'),
    })
    .strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult> => {
    const owned = await requireOwnedDesign(ctx, input.designId);
    if (!owned.ok) return owned.result;
    const summary = await cleanDesign(input.designId, input.ops as CleanOp[]);
    return { data: summaryData(summary), ui: { cards: [designCard(summary)], next: designNextChips(summary.designId) } };
  },
});

export const editDesignTool = defineTool({
  name: 'edit_design',
  description:
    "Make an instruction-based change to a design's artwork — case 3 (file needing edits), e.g. 'make the skull bigger', 'add roses around it', 'make it darker'. It changes the design you pass, as the artist sees it now, so pass the id of the version they are looking at, not an older one. Earlier changes to that artwork are kept and sent along with the new instruction, and the rest of the artwork stays as it is. Produces a new version alongside the original — never overwrites it. The result is a draft preview: the full-size print render is made when the design is prepared for print.",
  input: z.object({ designId: z.string().min(1), instruction: z.string().min(3).max(600) }).strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult> => {
    const owned = await requireOwnedDesign(ctx, input.designId);
    if (!owned.ok) return owned.result;
    const summary = await editDesign(input.designId, input.instruction);
    return {
      data: summaryData(summary),
      ui: { cards: [mockupGridCard(`edit_${summary.designId}`, [summary])], next: designNextChips(summary.designId) },
    };
  },
});

export const composeDesignTool = defineTool({
  name: 'compose_design',
  description:
    "Build a new design around an artist's own logo or mascot — case 4 (logo only, no other artwork). The logo is attached exactly as provided and never altered; a style capsule (see list_style_capsules) optionally guides the look built around it. Use when the artist has just a logo and wants a full design made from it, e.g. 'build a tee design around this logo'. The result is a draft preview: the full-size print render is made when the design is prepared for print.",
  input: z
    .object({
      logoDesignId: z.string().min(1).describe('Design id of the uploaded logo/mascot to build around.'),
      brief: z.string().min(3).max(600).describe("What to build around the logo, e.g. 'a death-metal band tee with the logo on the chest'."),
      capsuleId: z.string().optional().describe('Style capsule id from list_style_capsules.'),
    })
    .strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult> => {
    const owned = await requireOwnedDesign(ctx, input.logoDesignId);
    if (!owned.ok) return owned.result;
    const summary = await composeDesign(input);
    return {
      data: summaryData(summary),
      ui: { cards: [mockupGridCard(`compose_${summary.designId}`, [summary])], next: designNextChips(summary.designId) },
    };
  },
});

export const generateDesignTool = defineTool({
  name: 'generate_design',
  description:
    "Generate brand-new artwork from a text brief — case 5 (from scratch, no existing file). Optionally guided by a style capsule (call list_style_capsules first if the artist hasn't picked one) and/or a few existing designs as visual references. Produces two draft variants to compare, edit further, or use directly. They are previews: the full-size print render is made when the chosen design is prepared for print.",
  input: z
    .object({
      brief: z.string().min(3).max(600),
      capsuleId: z.string().optional().describe('Style capsule id from list_style_capsules.'),
      referenceDesignIds: z.array(z.string()).max(5).optional().describe('Existing design ids to use as visual references.'),
    })
    .strict(),
  scope: 'both',
  run: async (ctx, input): Promise<ToolResult> => {
    if (!ctx.storeId) {
      return { data: { ok: false, error: 'no_store' as const }, ui: { cards: [notice('warning', 'No shop found for this account yet.')] } };
    }
    for (const id of input.referenceDesignIds ?? []) {
      const owned = await requireOwnedDesign(ctx, id);
      if (!owned.ok) return owned.result;
    }
    const summaries = await generateDesign({
      storeId: ctx.storeId,
      brief: input.brief,
      capsuleId: input.capsuleId,
      referenceDesignIds: input.referenceDesignIds,
    });
    return {
      data: { designs: summaries.map(summaryData) },
      ui: { cards: [mockupGridCard(`generate_${randomUUID()}`, summaries)], next: designNextChips(summaries[0]!.designId) },
    };
  },
});

export const listStyleCapsulesTool = defineTool({
  name: 'list_style_capsules',
  description:
    "Show the artist the available style capsules (visual style presets for the metal/tattoo/illustration crowd, e.g. American traditional, Blackletter, Riso 2-colour) they can pick for compose_design or generate_design. Call this when the artist wants to generate or compose a design and hasn't named a style yet, or asks what styles are available.",
  input: z.object({}).strict(),
  scope: 'both',
  readOnly: true,
  run: async (): Promise<ToolResult> => {
    const capsules = listStyleCapsules();
    return {
      data: { capsules: capsules.map((c) => ({ id: c.id, name: c.name, description: c.description })) },
      ui: {
        cards: [
          {
            id: `style_capsules_${randomUUID()}`,
            kind: 'menu',
            title: 'Style capsules',
            sections: [
              {
                title: 'Pick a style',
                chips: capsules.map((c) => ({ label: c.name, prompt: `Generate a design in the ${c.name} style` })),
              },
            ],
          },
        ],
      },
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DESIGN_TOOLS: Tool<any, any>[] = [
  uploadDesignTool,
  analyzeDesignTool,
  cleanDesignTool,
  editDesignTool,
  composeDesignTool,
  generateDesignTool,
  listStyleCapsulesTool,
];
