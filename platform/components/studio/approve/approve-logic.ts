// Pure helpers behind the artwork approval page (/studio/approve/<designId>):
// which proof, loupe and screen set go with the chosen tab and garment colour,
// the copy that depends on the view, and the rules for the approve action and
// the auto-refresh. No React and nothing that only runs on the server, so the
// client components, the server action and the tests all share it.
//
// Types come from the print-prep service with `import type` only: a value
// import would pull the service (and, once it is real, the database) into the
// client bundle.
import type { PrintTechnique } from '@/lib/print/types';
import type { ApprovalArea, ApprovalGarment, ApprovalLoupe, ApprovalProof, ApprovalScreenSet, ApprovalView } from '@/lib/services/print-prep';

// ---------------------------------------------------------------------------
// Tabs

export type ApproveTab = 'shop' | 'runs';

/** Shop products first: every shop sale prints DTG/DTF, screen print is for runs. */
export const TABS: readonly { id: ApproveTab; label: string; technique: PrintTechnique }[] = [
  { id: 'shop', label: 'Shop products · DTG/DTF', technique: 'dtg_dtf' },
  { id: 'runs', label: 'Runs · screen print', technique: 'screen' },
];

export const DEFAULT_TAB: ApproveTab = 'shop';

export function techniqueOf(tab: ApproveTab): PrintTechnique {
  return tab === 'runs' ? 'screen' : 'dtg_dtf';
}

/** ?tab=runs (or screen) opens the runs tab; anything else is the default. */
export function parseTab(value: string | string[] | undefined): ApproveTab {
  const first = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase();
  return first === 'runs' || first === 'screen' ? 'runs' : DEFAULT_TAB;
}

// ---------------------------------------------------------------------------
// Ids from the address and the client

/** A design, version or session id: word characters and dashes, like the
 * catalogue's own check. */
const ID = /^[\w-]{1,100}$/;

export function cleanId(value: string | string[] | null | undefined): string | null {
  const first = (Array.isArray(value) ? value[0] : value)?.trim();
  return first && ID.test(first) ? first : null;
}

/** Where "back to the conversation" goes: the session the artist came from
 * (?from=), else a fresh one. */
export function chatHref(sessionId: string | null): string {
  return sessionId ? `/studio/s/${encodeURIComponent(sessionId)}` : '/studio';
}

// ---------------------------------------------------------------------------
// What the chosen tab and colour show

/** The print areas a view shows. A view with one placement (or the mock) may carry none: it then shows its one print. */
export function viewAreas(view: Pick<ApprovalView, 'areas'>): readonly ApprovalArea[] {
  return view.areas ?? [];
}

/** The area chosen, else the first (the front, when there is one). */
export function pickArea(areas: readonly ApprovalArea[], key: string | null): ApprovalArea | null {
  return areas.find((area) => area.key === key) ?? areas[0] ?? null;
}

/** Whether a proof or a loupe is of the area on show: one that names no area belongs to every area (a view with one). */
function ofArea(item: { areaKey?: string }, areaKey: string | null | undefined): boolean {
  return !areaKey || !item.areaKey || item.areaKey === areaKey;
}

export function pickProof(proofs: readonly ApprovalProof[], technique: PrintTechnique, garmentCode: string | undefined, areaKey?: string | null): ApprovalProof | null {
  if (!garmentCode) return null;
  return proofs.find((proof) => proof.technique === technique && proof.garmentCode === garmentCode && ofArea(proof, areaKey)) ?? null;
}

/** The loupe of this colour (and area); failing that the technique's own (the
 * approved mock keeps one per technique and says which colour it was drawn on). */
export function pickLoupe(loupes: readonly ApprovalLoupe[], technique: PrintTechnique, garmentCode: string | undefined, areaKey?: string | null): ApprovalLoupe | null {
  const ofTechnique = loupes.filter((loupe) => loupe.technique === technique && ofArea(loupe, areaKey));
  return ofTechnique.find((loupe) => loupe.garmentCode === garmentCode) ?? ofTechnique[0] ?? null;
}

/** What a sleeve shows until its flat proof is drawn: that it is coming, and the print's size. */
export function sleevePlaceholder(area: Pick<ApprovalArea, 'label' | 'size'>): { title: string; size: string; note: string } {
  return {
    title: 'Sleeve proof coming',
    size: `${area.label} · ${area.size}`,
    note: 'A sleeve has no garment photo: its proof is drawn flat at true size on a sleeve outline, with its measurements. Its print files are ready.',
  };
}

export function pickGarment(garments: readonly ApprovalGarment[], code: string | null): ApprovalGarment | null {
  return garments.find((garment) => garment.code === code) ?? garments[0] ?? null;
}

/** The screen set that prints this colour. */
export function pickScreenSet(sets: readonly ApprovalScreenSet[], garment: ApprovalGarment | null): ApprovalScreenSet | null {
  if (!garment) return null;
  return sets.find((set) => set.key === garment.screenSetKey) ?? sets.find((set) => set.garmentCodes.includes(garment.code)) ?? null;
}

export function loupeAlt(technique: PrintTechnique): string {
  return technique === 'screen' ? 'Halftone dots of the screen print at true size' : 'DTG print detail at true size';
}

/** The DTG/DTF facts for a colour. The view carries them; this only fills in
 * when a colour has none, so the list is never empty on screen. */
export function dtgFactsFor(facts: Record<string, string[]>, garment: ApprovalGarment | null): string[] {
  const own = garment ? facts[garment.code] : undefined;
  if (own && own.length > 0) return own;
  const light = garment?.isLight ?? false;
  return [
    light ? 'The black background is removed, so only the illustration prints.' : 'The black background is left out, so the garment itself shows through.',
    'Fades and glows print as fine dots, so no white halo shows around them.',
    light ? 'White areas print no ink on a light garment.' : 'White areas print in white ink.',
    'The same file prints DTG on the garment or DTF on film for transfers.',
  ];
}


// ---------------------------------------------------------------------------
// Copy that depends on the view

/** 'Black', 'Black and White', 'Black, French Navy and White'. */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function approvalScope(garments: readonly Pick<ApprovalGarment, 'name'>[], areas: readonly Pick<ApprovalArea, 'label'>[] = []): string {
  const names = joinNames(garments.map((garment) => garment.name));
  const where = names ? ` on ${names}` : '';
  const prints = areas.length > 1 ? ` It covers every print area: ${joinNames(areas.map((area) => area.label.toLowerCase()))}.` : '';
  return `Approving covers both versions${where}: DTG/DTF for your shop products, and screen print for runs.${prints}`;
}

/** 'Front' from 'Front · 28 × 33.6 cm'. */
export function placementPosition(placementLabel: string): string {
  return placementLabel.split('·')[0]?.trim() || placementLabel;
}

/** Where the design prints, in a few words: 'Front chest + Left sleeve', or the one placement's position. */
export function placementSummary(view: Pick<ApprovalView, 'placementLabel' | 'areas'>): string {
  const areas = view.areas ?? [];
  if (areas.length > 1) return [...new Set(areas.map((area) => area.label))].join(' + ');
  return placementPosition(view.placementLabel);
}

/** The top bar's line: 'Underwriter · Version 3 · Front'. */
export function barMeta(view: Pick<ApprovalView, 'designName' | 'versionNumber' | 'placementLabel' | 'areas'>): string {
  return [view.designName, `Version ${view.versionNumber}`, placementSummary(view)].filter(Boolean).join(' · ');
}

const MAX_NAME = 80;

function shortName(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  return clean.length > MAX_NAME ? `${clean.slice(0, MAX_NAME - 1)}…` : clean;
}

/** What "Ask for changes" sends to the chat (the artist's own click). */
export function changesPrompt(view: Pick<ApprovalView, 'designName' | 'versionNumber'>): string {
  return `I want to change the artwork for ${shortName(view.designName) || 'this design'}, version ${view.versionNumber}.`;
}

/** What the failed state sends to the chat. */
export function retryPrompt(view: Pick<ApprovalView, 'designName' | 'versionNumber'>): string {
  return `Prepare the print files for ${shortName(view.designName) || 'this design'}, version ${view.versionNumber}, again.`;
}

const FALLBACK_ERROR = 'That did not go through. Please try again.';

/** Errors are either a sentence for people or a short code; only a sentence
 * is shown (the same rule as the Studio sidebar's requests). */
export function readableError(error: unknown): string {
  return typeof error === 'string' && error.trim().includes(' ') ? error.trim() : FALLBACK_ERROR;
}

// ---------------------------------------------------------------------------
// Where the page is in its life

export type Phase = 'preparing' | 'failed' | 'ready' | 'approved';

export function phaseOf(view: Pick<ApprovalView, 'status' | 'approvedAt'>, approvedHere = false): Phase {
  if (view.status === 'preparing') return 'preparing';
  if (view.status === 'failed') return 'failed';
  if (approvedHere || view.status === 'approved' || view.approvedAt) return 'approved';
  return 'ready';
}

/** While the proofs render the page asks the server again this often... */
export const POLL_MS = 4000;
/** ...for this long, then it stops and offers a button. */
export const POLL_LIMIT_MS = 10 * 60 * 1000;

export function keepPolling(phase: Phase, elapsedMs: number): boolean {
  return phase === 'preparing' && elapsedMs < POLL_LIMIT_MS;
}

// ---------------------------------------------------------------------------
// The approve action's checks (run on the server, against a fresh view)

export type ApproveCheck = { ok: true; already: boolean } | { ok: false; error: string };

/** Whether `versionId` may be approved now. The artist approves what was on
 * screen, so a newer version (or one that is still rendering) is refused
 * rather than approved in their place. Approving twice is not an error. */
export function checkApprovable(view: ApprovalView | null, versionId: string): ApproveCheck {
  if (!view) return { ok: false, error: 'We could not find this artwork.' };
  if (view.versionId !== versionId) {
    return { ok: false, error: 'A newer version of this artwork is ready. Reload the page and look it over before you approve.' };
  }
  if (view.status === 'approved' || view.approvedAt) return { ok: true, already: true };
  if (view.status === 'preparing') return { ok: false, error: 'The proofs are still being prepared. Try again in a moment.' };
  if (view.status === 'failed') {
    return { ok: false, error: 'The proofs could not be prepared for this version, so it cannot be approved. Ask for changes or try again from the chat.' };
  }
  if (!view.canApprove) return { ok: false, error: 'This version cannot be approved yet.' };
  return { ok: true, already: false };
}
