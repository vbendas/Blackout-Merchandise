import Link from 'next/link';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardFrame, CardHead, Plate, SpecRows, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type PrintProofCardType = Extract<Card, { kind: 'print_proof' }>;

const STATUS_LABEL: Record<PrintProofCardType['status'], string> = {
  preparing: 'Preparing',
  ready: 'Ready to approve',
  approved: 'Approved',
  failed: 'Needs attention',
};

// What waits on the artist is white; what is finished is filled (StatusPill's grammar).
const STATUS_TONE: Record<PrintProofCardType['status'], StatusTone> = {
  preparing: 'neutral',
  ready: 'warning',
  approved: 'positive',
  failed: 'danger',
};

const STATUS_SENTENCE: Record<PrintProofCardType['status'], string> = {
  preparing: 'We are preparing the print files. This takes a few minutes.',
  ready: 'Look over each colour, true size, then approve.',
  approved: 'Approved for shop products and runs.',
  failed: "The print files couldn't be prepared.",
};

const TECHNIQUE_LABEL = { dtg_dtf: 'DTG/DTF', screen: 'Screen print' } as const;

/** A design's print proofs in the thread, with the way to the approval page,
 * where every colour is shown true size and approved in one go. */
export function PrintProofCard({ card }: { card: PrintProofCardType; ctx: CardActionContext }) {
  const rows: SpecRowData[] = [{ key: 'shop', label: 'Shop products', value: 'DTG/DTF' }];
  if (card.screenCount) rows.push({ key: 'runs', label: 'Runs', value: `Screen print · ${card.screenCount} ${card.screenCount === 1 ? 'screen' : 'screens'}` });

  const primary = card.status === 'ready';
  return (
    <CardFrame role="group" aria-label={`Print proofs for ${card.designName}, ${STATUS_LABEL[card.status]}`}>
      <CardHead
        label={`Print files · version ${card.versionNumber}`}
        title={card.designName}
        sentence={card.note ?? STATUS_SENTENCE[card.status]}
        aside={<StatusPill label={STATUS_LABEL[card.status]} tone={STATUS_TONE[card.status]} />}
      />
      {card.proofs.length > 0 ? (
        <div className="mfc-strip">
          {card.proofs.map((proof, index) => (
            <Plate key={`${proof.url}-${index}`} src={proof.url} alt={`${proof.garmentName}, ${TECHNIQUE_LABEL[proof.technique]} proof`} ratio="4 / 5" />
          ))}
        </div>
      ) : null}
      <SpecRows rows={rows} variant="plain" />
      <div className="mfc-actions">
        {/* A real link to the approval page: it opens in this tab, and the thread is still here when they come back. */}
        <Link href={card.approveHref} className={primary ? 'mf-pill mf-pill-primary min-h-11' : 'mfc-link min-h-11'}>
          {primary ? 'Review and approve' : 'Open the approval page'}
        </Link>
      </div>
    </CardFrame>
  );
}
