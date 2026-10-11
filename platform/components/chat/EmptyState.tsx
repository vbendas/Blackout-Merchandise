import type { ComponentType } from 'react';
import { LayoutGrid, Package, Sparkles, Upload } from 'lucide-react';
import type { Chip as ChipType } from '@/lib/ui-cards/schemas';
import type { Greeting, ResumeTarget } from '@/components/chat/useConversation';
import { StorefrontIcon, TShirtIcon } from '@/components/chat/icons';
import { humanStatus } from '@/lib/format/status';

function iconFor(label: string): ComponentType<{ className?: string }> {
  const text = label.toLowerCase();
  if (text.includes('product')) return TShirtIcon;
  if (text.includes('upload') || text.includes('artwork')) return Upload;
  if (text.includes('blank') || text.includes('browse')) return LayoutGrid;
  if (text.includes('shop') || text.includes('status')) return StorefrontIcon;
  if (text.includes('bulk') || text.includes('order')) return Package;
  return Sparkles;
}

export function EmptyGreeting({ greeting }: { greeting: Greeting }) {
  return (
    <div className="mf-rise mf-rise-d1 flex w-full min-w-0 flex-col items-start gap-3 px-6 text-left md:items-center md:px-0 md:text-center">
      <h1 className="mf-display w-full text-[40px] leading-[1.06] md:text-[56px]">{greeting.headline}</h1>
      {greeting.line ? (
        <p className="mf-dimmed max-w-[30em] text-[18px] leading-[1.35] tracking-[-0.015em] md:text-[22px]">{greeting.line}</p>
      ) : null}
      <p className="mf-mono-note mt-1">Your merch, by application.</p>
    </div>
  );
}

function isUploadAction(label: string): boolean {
  const text = label.toLowerCase();
  return text.includes('upload') || text.includes('artwork');
}

export function QuickActionsRow({
  actions,
  onSend,
  onUploadClick,
}: {
  actions: ChipType[];
  onSend: (text: string) => void;
  /** 'Upload artwork' opens the image picker instead of sending a prompt */
  onUploadClick: () => void;
}) {
  if (actions.length === 0) return null;
  return (
    <div className="flex w-full min-w-0 justify-start gap-2 overflow-x-auto px-6 md:flex-wrap md:justify-center md:overflow-visible md:px-0">
      {actions.map((action, index) => {
        const Icon = iconFor(action.label);
        const upload = isUploadAction(action.label);
        return (
          <button
            key={action.label}
            type="button"
            onClick={() => (upload ? onUploadClick() : onSend(action.prompt ?? action.label))}
            className={`mf-pill mf-rise mf-rise-d${Math.min(index + 2, 6)} h-[38px] shrink-0 text-[13px] md:h-10`}
          >
            <Icon className="mf-icon" />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Under the composer on the Studio home: one line back into the previous
 * conversation (opens /studio/s/<id>), styled like the website's underlined
 * text links. */
export function ResumeLine({ resume, onOpen }: { resume: ResumeTarget; onOpen: (conversationId: string) => void }) {
  return (
    <div className="mf-rise mf-rise-d6 flex w-full min-w-0 items-baseline gap-3 px-6 md:justify-center md:px-0">
      <span className="mf-label mf-dimmed shrink-0">Continue</span>
      <button type="button" onClick={() => onOpen(resume.conversationId)} className="mf-ulink min-w-0 truncate">
        {resume.label}
        {resume.status ? <span className="mf-dimmed"> · {humanStatus(resume.status)}</span> : null}
      </button>
    </div>
  );
}
