import type { MonthFigures, WaitingOnYou } from '@/lib/services/billing';
import { PayRunButton } from './PayRunButton';
import { euro } from './format';

/** The three numbers an artist looks for first. */
export function Figures({ month, waiting }: { month: MonthFigures; waiting: WaitingOnYou }) {
  const count = waiting.runs.length;
  const only = waiting.runs[0];

  return (
    <dl className="bl-figs">
      <div className="bl-fig">
        <dt className="bl-lab mf-label">Earned this month</dt>
        <dd className="bl-big">{euro(month.earnedCents)}</dd>
        <dd className="bl-d">{month.sales > 0 ? 'Sent to your payout account' : 'Nothing yet this month'}</dd>
      </div>

      <div className="bl-fig">
        <dt className="bl-lab mf-label">Sales this month</dt>
        <dd className="bl-big">{euro(month.grossCents)}</dd>
        <dd className="bl-d">{month.sales === 0 ? 'No sales yet this month' : month.sales === 1 ? '1 sale' : `${month.sales} sales`}</dd>
      </div>

      <div className="bl-fig">
        <dt className="bl-lab mf-label">Waiting on you</dt>
        {count === 0 ? (
          <>
            <dd className="bl-big">Nothing</dd>
            <dd className="bl-d">No run is waiting for payment</dd>
          </>
        ) : (
          <>
            <dd className="bl-big">{euro(waiting.totalCents)}</dd>
            <dd className="bl-d">
              {count === 1 && only ? (
                <>
                  {only.label} · <PayRunButton runId={only.id} label={only.label} variant="link" />
                </>
              ) : (
                <>
                  {count} runs ·{' '}
                  <a href="#runs" className="mf-ulink">
                    See runs
                  </a>
                </>
              )}
            </dd>
          </>
        )}
      </div>
    </dl>
  );
}
