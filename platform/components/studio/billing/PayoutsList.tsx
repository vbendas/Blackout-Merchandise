import type { PayoutRow } from '@/lib/services/billing';
import { PageSection } from './PageSection';
import { Cell, HeadRow } from './Rows';
import { euro, payoutSplit, payoutStatusLabel, shortDate } from './format';

/** Fan sales and what reached the artist. Each row opens to its split. */
export function PayoutsList({ payouts }: { payouts: PayoutRow[] }) {
  return (
    <PageSection id="payouts" label="Payouts">
      {payouts.length === 0 ? (
        <p className="mf-dimmed bl-empty">No sales yet. Your first sale shows up here.</p>
      ) : (
        <>
          <HeadRow labels={['Date', 'Sale', 'To you', 'Status']} />
          <ul className="bl-list">
            {payouts.map((payout) => (
              <PayoutItem key={payout.id} payout={payout} />
            ))}
          </ul>
        </>
      )}
    </PageSection>
  );
}

function PayoutItem({ payout }: { payout: PayoutRow }) {
  const { lines } = payoutSplit(payout);
  return (
    <li className="bl-row">
      <details>
        <summary className="bl-cells">
          <Cell label="Date" main>
            {shortDate(payout.createdAt)}
          </Cell>
          <Cell label="Sale">{euro(payout.grossCents)}</Cell>
          <Cell label="To you">{euro(payout.transferCents)}</Cell>
          <Cell label="Status">{payoutStatusLabel(payout.status)}</Cell>
          <span className="bl-link bl-slot">
            <span className="bl-if-closed">Details</span>
            <span className="bl-if-open">Hide</span>
          </span>
        </summary>
        <dl className="bl-split">
          {lines.map((line) => (
            <div key={line.label}>
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </li>
  );
}
