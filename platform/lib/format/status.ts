// Turns raw status enum values (order, product, proof, bulk, ticket, domain,
// supplier and tool-invocation statuses) into plain words for the UI.
// Explicit wording wins where the enum reads badly on its own; everything
// else falls back to sentence case ("AWAITING_PAYMENT" -> "Awaiting payment").

const FRIENDLY: Record<string, string> = {
  quoted: 'Quote ready',
  proof_pending: 'Proof pending',
  paid: 'Paid',
  shipped: 'Shipped',
  pending_confirm: 'Waiting for you',
  in_progress: 'In progress',
  in_production: 'In production',
  changes_requested: 'Changes requested',
  action_required: 'Action required',
  not_started: 'Not started',
  needs_cleanup: 'Needs cleanup',
  ok: 'Done',
};

export function humanStatus(raw: string | null | undefined): string {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  if (!key) return '';
  const friendly = FRIENDLY[key];
  if (friendly) return friendly;
  const words = key.replace(/[_\s]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
