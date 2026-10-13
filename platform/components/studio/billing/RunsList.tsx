import { humanStatus } from '@/lib/format/status';
import type { RunSummary } from '@/lib/services/runs';
import { AskStudioLink } from './AskStudioLink';
import { PageSection } from './PageSection';
import { PayRunButton } from './PayRunButton';
import { Cell, HeadRow } from './Rows';
import { euro, shortDate } from './format';

/** The artist's runs (bulk orders), newest first. A run waiting for payment
 * carries its own Pay button; the others open in the Studio. */
export function RunsList({ runs }: { runs: RunSummary[] }) {
  return (
    <PageSection id="runs" label="Runs">
      {runs.length === 0 ? (
        <p className="bl-empty">
          <span className="mf-dimmed">No runs yet. A run is a batch of your own merch, made in one go. </span>
          <AskStudioLink prompt="I want to start a run" className="mf-ulink">
            Start a run
          </AskStudioLink>
        </p>
      ) : (
        <>
          <HeadRow labels={['Run', 'Date', 'Total', 'Status']} />
          <ul className="bl-list">
            {runs.map((run) => (
              <li key={run.id} className="bl-row bl-cells">
                <Cell main>{run.label}</Cell>
                <Cell label="Date">{shortDate(run.createdAt)}</Cell>
                <Cell label="Total">{run.totalCents == null ? '—' : euro(run.totalCents)}</Cell>
                <Cell label="Status">{humanStatus(run.status)}</Cell>
                {run.status === 'awaiting_payment' ? (
                  <PayRunButton runId={run.id} label={run.label} />
                ) : (
                  <AskStudioLink prompt={`Open ${run.label}`} className="bl-link bl-slot" label={`Open ${run.label}`}>
                    Open
                  </AskStudioLink>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </PageSection>
  );
}
