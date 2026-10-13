import type { ReactNode } from 'react';
import { DEV_BYPASS, requireRegistered } from '@/lib/auth';
import { StudioSidebarProvider, type StudioAccount } from '@/components/studio/StudioSidebarProvider';
import { StudioPageBar, StudioSidebar } from '@/components/studio/StudioSidebar';
import { CatalogueProvider } from '@/components/catalogue/CatalogueProvider';
import { CataloguePanel } from '@/components/catalogue/CataloguePanel';

/** Merch Studio shell, shared by every /studio page: the session sidebar on
 * the left (a drawer on phones), the page on the right. */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const { user, store, role } = await requireRegistered();
  const account: StudioAccount = {
    displayName: user.displayName?.trim() || store?.name || user.email,
    imageUrl: user.imageUrl ?? null,
    shopName: store?.name ?? null,
    shopSlug: store?.slug ?? null,
    role,
    showClerk: !DEV_BYPASS,
  };

  return (
    <StudioSidebarProvider account={account}>
      <CatalogueProvider panel={<CataloguePanel />}>
        <div className="mf-app mf-shell">
          <StudioSidebar />
          <div className="mf-shell-main">
            <StudioPageBar />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
          </div>
        </div>
      </CatalogueProvider>
    </StudioSidebarProvider>
  );
}

