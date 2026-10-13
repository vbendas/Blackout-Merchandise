import { requireRegistered } from '@/lib/auth';
import { getMonthFigures, listRecentPayouts, waitingOnYou } from '@/lib/services/billing';
import { listRunsForStore } from '@/lib/services/runs';
import { getStripeAccountStatus } from '@/lib/services/stripe';
import { Figures } from '@/components/studio/billing/Figures';
import { PageSection } from '@/components/studio/billing/PageSection';
import { PayoutSetup } from '@/components/studio/billing/PayoutSetup';
import { PayoutsList } from '@/components/studio/billing/PayoutsList';
import { RunsList } from '@/components/studio/billing/RunsList';
import '@/components/studio/billing/billing.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Billing' };

export default async function BillingPage() {
  const { store } = await requireRegistered();

  return (
    <main className="bl">
      <h1 className="mf-display bl-title">Billing</h1>
      {store ? (
        <StoreBilling storeId={store.id} />
      ) : (
        <PageSection id="payouts" label="Payouts">
          <p className="mf-dimmed bl-empty">This account has no shop, so there are no payouts or runs to show.</p>
        </PageSection>
      )}
    </main>
  );
}

async function StoreBilling({ storeId }: { storeId: string }) {
  const [stripe, payouts, month, runs] = await Promise.all([
    getStripeAccountStatus(storeId),
    listRecentPayouts(storeId),
    getMonthFigures(storeId),
    listRunsForStore(storeId),
  ]);

  const ready = stripe.connected && stripe.chargesEnabled && stripe.payoutsEnabled;

  return (
    <>
      {!ready ? (
        <div className="bl-setup">
          <p>
            {stripe.connected
              ? 'Your payout details are not finished yet. Complete them to receive your earnings.'
              : 'Set up payouts so we can send you your earnings after each sale.'}
          </p>
          <PayoutSetup label={stripe.connected ? 'Finish setup' : 'Set up payouts'} />
        </div>
      ) : null}
      <Figures month={month} waiting={waitingOnYou(runs)} />
      <PayoutsList payouts={payouts} />
      <RunsList runs={runs} />
    </>
  );
}
