// Where a design's job sheet is downloaded and who may open it. Client-safe
// (no server imports): the pre-press pack page, the production table and the
// order cards all build their links from here.
import { can, type AccessHolder } from '@/lib/auth/permissions';

export const JOB_SHEET_ROUTE = '/api/job-sheets';

const DESIGN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDesignId(value: string): boolean {
  return DESIGN_ID.test(value);
}

/** The download address of a design's job sheet (one sheet per design). */
export function jobSheetPath(designId: string): string {
  return `${JOB_SHEET_ROUTE}/${encodeURIComponent(designId)}`;
}

/** The sheet carries Pantone codes and the pressroom's settings, so only people who work on
 * the films (Pre-press) or print them (Production) may open it, at View level or above. */
export function canOpenJobSheets(actor: AccessHolder): boolean {
  return can(actor, 'prepress', 'view') || can(actor, 'production', 'view');
}

/** A design with a job sheet, as an order or production row links to it. */
export interface JobSheetLink {
  designId: string;
  name: string;
}
