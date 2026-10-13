import type { Card } from '@/lib/ui-cards/schemas';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, Plate, SpecRows, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type ProofCardType = Extract<Card, { kind: 'proof' }>;

const statusLabel: Record<ProofCardType['status'], string> = {
  pending: 'Waiting for your OK',
  approved: 'Approved',
  changes_requested: 'Changes requested',
};

const statusTone: Record<ProofCardType['status'], StatusTone> = {
  pending: 'warning',
  approved: 'positive',
  changes_requested: 'neutral',
};

const statusSentence: Record<ProofCardType['status'], string> = {
  pending: 'Check the mockups and the details, then approve it or ask for changes.',
  approved: 'You approved this proof.',
  changes_requested: 'You asked for changes.',
};

/** The title repeats 'Proof v2 — ' in front of the product's name; the label already says it. */
function proofName(title: string | undefined): string | undefined {
  const name = title?.replace(/^(?:bulk\s+)?proof\s+v\d+\s*(?:[—–-]\s*)?/i, '').trim();
  return name ? name : undefined;
}

/** 'Cruiser 2.0 (STSU177)' becomes the blank's name; a supplier code never shows. */
function specValue(value: string): string {
  return value.replace(/^(.*?)\s*\((ST[A-Z]{2}\d{3})\)/, (_match, name: string, code: string) => blankDisplayName(code, name.trim()));
}

export function ProofCard({ card, ctx }: { card: ProofCardType; ctx: CardActionContext }) {
  const rows: SpecRowData[] = card.spec.map((row, index) => ({ key: `${row.label}-${index}`, label: row.label, value: specValue(row.value) }));

  return (
    <CardFrame>
      <CardHead
        label={`Proof v${card.version}`}
        title={proofName(card.title)}
        sentence={statusSentence[card.status]}
        aside={<StatusPill label={statusLabel[card.status]} tone={statusTone[card.status]} />}
      />
      {card.mockupUrls.length > 0 ? (
        <div className="mfc-strip">
          {card.mockupUrls.map((url, index) => (
            <Plate key={`${url}-${index}`} src={url} alt={`Proof mockup ${index + 1}`} />
          ))}
        </div>
      ) : null}
      <SpecRows rows={rows} variant="plain" />
      {/* Approve is a confirm-gated tool call, so it arrives as a separate
          confirm card — this card only renders whatever actions it was given. */}
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
