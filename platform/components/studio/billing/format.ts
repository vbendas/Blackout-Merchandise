import { humanStatus } from '@/lib/format/status';
import type { PayoutRow } from '@/lib/services/billing';

// Words and numbers for the Billing page. Pure, so it can be tested without
// the database (the type import above is erased at build time).

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** 3950 -> '€39.50' */
export const euro = (cents: number) => money.format(cents / 100);

/** '6 Sept 2026' */
export const shortDate = (date: Date) => day.format(date);

const MINUS = '−';

/** The ledger's status words, as the artist should read them. */
const PAYOUT_STATUS: Record<string, string> = {
  // markPaid writes 'recorded' once the sale's share has been transferred.
  recorded: 'Sent to your payout account',
  // An admin looked at a flagged row and cleared it; the money had moved already.
  reviewed: 'Sent to your payout account',
  held: 'On hold while we check it',
  refunded: 'Refunded',
};

export function payoutStatusLabel(status: string): string {
  return PAYOUT_STATUS[status.trim().toLowerCase()] ?? humanStatus(status);
}

export interface SplitLine {
  label: string;
  value: string;
}

export interface PayoutSplit {
  lines: SplitLine[];
  /** gross - tax - fee equals what was transferred, to the cent */
  exact: boolean;
}

/**
 * How a sale became the artist's share, from the stored numbers only:
 * Sale, then Tax (when the order carried any), then Production and shipping,
 * then To you. Deductions carry a minus sign only when the parts add up
 * exactly; otherwise the stored amounts are shown as they are, without an
 * equation and without a made-up balancing line. A line of 0 is left out.
 */
export function payoutSplit(p: Pick<PayoutRow, 'grossCents' | 'feeCents' | 'taxCents' | 'transferCents'>): PayoutSplit {
  const exact = p.grossCents - p.taxCents - p.feeCents === p.transferCents;
  const take = (cents: number) => (exact ? `${MINUS}${euro(cents)}` : euro(cents));

  const lines: SplitLine[] = [{ label: 'Sale', value: euro(p.grossCents) }];
  if (p.taxCents > 0) lines.push({ label: 'Tax', value: take(p.taxCents) });
  if (p.feeCents > 0) lines.push({ label: 'Production and shipping', value: take(p.feeCents) });
  lines.push({ label: 'To you', value: euro(p.transferCents) });
  return { lines, exact };
}
