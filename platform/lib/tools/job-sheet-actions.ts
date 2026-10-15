import { type AccessHolder } from '@/lib/auth/permissions';
import { canOpenJobSheets, jobSheetPath } from '@/lib/print/job-sheet-link';
import { designsForOrders } from '@/lib/services/job-sheets';
import { appBaseUrl } from '@/lib/services/stripe';
import type { CardAction } from '@/lib/ui-cards/schemas';

// "Job sheet" buttons for an order card: one per design the order prints (the job sheet is one
// per design, covering every garment that uses it). Only for the people who may open a sheet
// (Pre-press or Production View, or the owner): an artist reading their own order gets none, since
// the sheet carries Pantone codes. Card links are web addresses, so these are absolute.

const MAX_ACTIONS = 4;
/** a card action's label is 32 characters at most ('Job sheet · ' leaves 20 for the name) */
const NAME_ROOM = 20;

/** Never throws: a card is worth showing without its sheet links. */
export async function jobSheetActions(ctx: AccessHolder, orderId: string): Promise<CardAction[]> {
  if (!canOpenJobSheets(ctx)) return [];
  try {
    const designs = (await designsForOrders([orderId])).get(orderId) ?? [];
    const several = designs.length > 1;
    return designs.slice(0, MAX_ACTIONS).map((design) => ({
      label: several ? `Job sheet · ${design.name.length > NAME_ROOM ? `${design.name.slice(0, NAME_ROOM - 1)}…` : design.name}` : 'Job sheet',
      href: `${appBaseUrl()}${jobSheetPath(design.designId)}`,
    }));
  } catch (err) {
    console.error('[job sheet] could not link the order to its job sheets:', err instanceof Error ? err.message : err);
    return [];
  }
}
