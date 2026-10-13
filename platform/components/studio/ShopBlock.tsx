'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOptionalCatalogue } from '@/components/catalogue/CatalogueProvider';
import { ExternalArrow } from '@/components/studio/ExternalArrow';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';
import { PRODUCTS } from '@/lib/catalog/products';
import { shopUrl, shopUrlLabel } from '@/lib/format/shop-url';

/** The Shop block at the top of the sidebar: the shop's name and whether it
 * is live, its public address (opens in a new tab) and one row each for Runs,
 * Products, Catalogue and Payouts. Runs and Products start a session about
 * them; Catalogue opens the blank catalogue panel; Payouts goes to Billing.
 * The name and address show at once; the counts fill in when the shop's state
 * has loaded. */
export function ShopBlock() {
  const pathname = usePathname();
  const { account, home, askStudio, setDrawerOpen } = useStudioSidebar();
  const catalogue = useOptionalCatalogue();
  if (!account.shopSlug) return null;

  const shop = home?.shop ?? null;
  const name = shop?.name ?? account.shopName ?? 'Your shop';
  const url = shop?.url ?? shopUrl(account.shopSlug);
  const urlLabel = shop?.urlLabel ?? shopUrlLabel(account.shopSlug);
  const onBilling = pathname === '/studio/billing';

  return (
    <nav aria-label="Shop" className="mf-shop">
      <div className="mf-shop-top">
        <div className="mf-shop-name">
          <span className="min-w-0 truncate">{name}</span>
          {shop ? (
            <span className="mf-meta">
              {shop.live ? <i className="mf-dot" aria-hidden /> : null}
              {shop.live ? 'Live' : 'Draft'}
            </span>
          ) : null}
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="mf-shop-url">
          <span className="min-w-0 truncate">{urlLabel}</span>
          <ExternalArrow />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      <ul className="flex flex-col gap-px px-1">
        <li className="mf-side-row">
          <button type="button" className="mf-side-link justify-between" onClick={() => askStudio('Show my runs')}>
            <span>Runs</span>
            {shop ? (
              <span className="mf-meta">
                {shop.runsOnPress > 0 ? <i className="mf-dot mf-dot-pulse" aria-hidden /> : null}
                {shop.runsOnPress > 0
                  ? `${shop.runsOnPress} on the press`
                  : shop.runsTotal > 0
                    ? `${shop.runsTotal} ${shop.runsTotal === 1 ? 'run' : 'runs'}`
                    : 'None yet'}
              </span>
            ) : null}
          </button>
        </li>
        <li className="mf-side-row">
          <button type="button" className="mf-side-link justify-between" onClick={() => askStudio('Show my products')}>
            <span>Products</span>
            {shop ? <span className="mf-meta">{shop.productsLive > 0 ? `${shop.productsLive} live` : 'None live'}</span> : null}
          </button>
        </li>
        {catalogue ? (
          <li className="mf-side-row">
            <button type="button" className="mf-side-link justify-between" onClick={() => catalogue.open()}>
              <span>Catalogue</span>
              <span className="mf-meta">{`${PRODUCTS.length} blanks`}</span>
            </button>
          </li>
        ) : null}
        <li className="mf-side-row" data-active={onBilling}>
          <Link
            href="/studio/billing"
            className="mf-side-link justify-between"
            aria-current={onBilling ? 'page' : undefined}
            onClick={() => setDrawerOpen(false)}
          >
            <span>Payouts</span>
            {shop ? <span className="mf-meta">{shop.payoutsReady ? 'Ready' : 'Set up'}</span> : null}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
