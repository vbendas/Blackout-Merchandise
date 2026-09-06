import type { Card } from '@/lib/ui-cards/schemas';
import { Chip } from '@/components/ui/Chip';
import type { CardActionContext } from '@/components/cards/actions';

type UploadCardType = Extract<Card, { kind: 'upload' }>;

export function UploadCard({ card, ctx }: { card: UploadCardType; ctx: CardActionContext }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center"
      style={{ borderColor: 'color-mix(in srgb, var(--signal) 30%, transparent)' }}
    >
      <p className="mf-dimmed text-[13px] leading-relaxed">
        {card.hint ?? 'Drop your artwork here, or choose a file to upload.'}
      </p>
      <Chip small primary onClick={ctx.onUploadClick}>
        Choose file
      </Chip>
    </div>
  );
}
