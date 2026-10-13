import type { Card } from '@/lib/ui-cards/schemas';
import { Chip } from '@/components/ui/Chip';
import '@/components/cards/cards.css';
import type { CardActionContext } from '@/components/cards/actions';

type UploadCardType = Extract<Card, { kind: 'upload' }>;

export function UploadCard({ card, ctx }: { card: UploadCardType; ctx: CardActionContext }) {
  return (
    <div className="mfc-drop">
      <p className="mfc-sentence">{card.hint ?? 'Drop your artwork here, or choose a file to upload.'}</p>
      <Chip small primary onClick={ctx.onUploadClick}>
        Choose file
      </Chip>
    </div>
  );
}
