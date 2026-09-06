import type { CardAction } from '@/lib/ui-cards/schemas';

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
