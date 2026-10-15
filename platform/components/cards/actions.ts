import type { CardAction } from '@/lib/ui-cards/schemas';

/** A web address: it opens in a new tab. */
export function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** A page of the Studio ('/studio/approve/<designId>'): it opens in the same tab, so the thread is still
 * there when the artist comes back. A path only: never '//host' or a backslash form, which a browser
 * would read as another site. */
export function isSitePath(value: string): boolean {
  return /^\/(?![/\\])/.test(value);
}

export interface CardActionContext {
  onPrompt: (text: string) => void;
  onConfirm: (toolCallId: string, approve: boolean) => void;
  /** opens the shared image picker (composer attach button, upload card, 'Upload artwork' quick action) */
  onUploadClick: () => void;
}

export function runCardAction(action: CardAction, ctx: CardActionContext): void {
  if (action.confirmToolCallId) {
    ctx.onConfirm(action.confirmToolCallId, action.variant !== 'danger');
    return;
  }
  if (action.href) {
    window.open(action.href, '_blank', 'noopener,noreferrer');
    return;
  }
  ctx.onPrompt(action.prompt ?? action.label);
}
