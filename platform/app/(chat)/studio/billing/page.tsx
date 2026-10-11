import { requireRegistered } from '@/lib/auth';
import { humanStatus } from '@/lib/format/status';
import { listBulkOrders } from '@/lib/services/bulk';
import { listRecentPayouts } from '@/lib/services/billing';
import { getStripeAccountStatus } from '@/lib/services/stripe';
import { PageSection } from '@/components/studio/billing/PageSection';
import { PayoutSetup } from '@/components/studio/billing/PayoutSetup';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Billing' };

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });
const euro = (cents: number) => money.format(cents / 100);
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const th: React.CSSProperties = { textAlign: 'left', fontWeight: 600, padding: '0 12px 10px 0' };
const td: React.CSSProperties = { padding: '12px 12px 12px 0', borderTop: 'var(--hairline)', fontSize: 14, whiteSpace: 'nowrap' };

export default async function BillingPage() {
  const { store } = await requireRegistered();

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px', width: '100%' }}>
      <h1 className="mf-display" style={{ fontSize: 'clamp(30px, 5vw, 44px)', lineHeight: 1.05, margin: '0 0 32px' }}>
        Billing
      </h1>
      {store ? <StoreBilling storeId={store.id} /> : (
        <PageSection label="Payouts">
          <p className="mf-dimmed" style={{ margin: 0, fontSize: 14 }}>This account has no shop, so there are no payouts or bulk orders to show.</p>
        </PageSection>
      )}
    </main>
  );
}

async function StoreBilling({ storeId }: { storeId: string }) {
  const [stripe, payouts, bulk] = await Promise.all([getStripeAccountStatus(storeId), listRecentPayouts(storeId), listBulkOrders(storeId)]);

  const ready = stripe.connected && stripe.chargesEnabled && stripe.payoutsEnabled;
  const statusText = ready
    ? 'Payouts are set up. Your earnings are sent to your bank account automatically.'
    : stripe.connected
      ? 'Your payout details are not finished yet. Complete them to receive your earnings.'
      : 'Set up payouts so we can send you your earnings after each sale.';

  return (
    <>
      <PageSection label="Payouts">
        <p style={{ margin: '0 0 16px', fontSize: 14 }}>{statusText}</p>
        {!ready ? <PayoutSetup label={stripe.connected ? 'Finish setup' : 'Set up payouts'} /> : null}
      </PageSection>

      <PageSection label="Payout history">
        {payouts.length === 0 ? (
          <p className="mf-dimmed" style={{ margin: 0, fontSize: 14 }}>No payouts yet. They appear here after your first sale.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="mf-label mf-dimmed">
                  <th style={th}>Date</th>
                  <th style={th}>Gross</th>
                  <th style={th}>Paid to you</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>{day.format(p.createdAt)}</td>
                    <td style={td}>{euro(p.grossCents)}</td>
                    <td style={td}>{euro(p.transferCents)}</td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>{humanStatus(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection label="Bulk orders">
        {bulk.length === 0 ? (
          <p className="mf-dimmed" style={{ margin: 0, fontSize: 14 }}>No bulk orders yet. Ask in the Studio for a quote on a larger run.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="mf-label mf-dimmed">
                  <th style={th}>Reference</th>
                  <th style={th}>Date</th>
                  <th style={th}>Total</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bulk.map((b) => (
                  <tr key={b.id}>
                    <td style={td}>#{b.id.slice(0, 8).toUpperCase()}</td>
                    <td style={td}>{day.format(b.createdAt)}</td>
                    <td style={td}>{euro(b.totalCents)}</td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>{humanStatus(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </>
  );
}
