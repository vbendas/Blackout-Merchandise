'use client';

import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { RowMenu, type MenuEntry } from '@/components/studio/RowMenu';
import { useStudioSidebar, type StudioAccount } from '@/components/studio/StudioSidebarProvider';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function Avatar({ account }: { account: StudioAccount }) {
  return (
    <span className="mf-hairline flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[2px] text-[12px] font-semibold tracking-[0.04em]">
      {account.imageUrl ? (
        // Clerk-hosted avatar; a plain img avoids an images.remotePatterns entry.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={account.imageUrl} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(account.displayName)}</span>
      )}
    </span>
  );
}

function AccountMenuInner({ signOut }: { signOut?: () => void }) {
  const router = useRouter();
  const { account, setDrawerOpen } = useStudioSidebar();

  const go = (href: string) => () => {
    setDrawerOpen(false);
    router.push(href);
  };

  const items: MenuEntry[] = [
    { label: 'Settings', href: '/studio/settings', onSelect: go('/studio/settings') },
    { label: 'Billing', href: '/studio/billing', onSelect: go('/studio/billing') },
  ];
  if (signOut) items.push('separator', { label: 'Sign out', onSelect: signOut });

  return (
    <RowMenu
      label={`Account: ${account.displayName}`}
      items={items}
      placement="above-start"
      triggerClassName="mf-side-row w-full gap-3 px-2 py-2 text-left !text-[color:var(--signal)]"
      triggerContent={
        <>
          <Avatar account={account} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] leading-[18px]">{account.displayName}</span>
            {account.shopName ? (
              <span className="mf-dimmed truncate text-[12px] leading-[16px]">{account.shopName}</span>
            ) : null}
          </span>
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden className="mf-dimmed shrink-0">
            <path d="M1.5 6.5 5 3l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </>
      }
    />
  );
}

function ClerkAccountMenu() {
  const { signOut } = useClerk();
  return <AccountMenuInner signOut={() => void signOut({ redirectUrl: '/' })} />;
}

/** Sidebar footer: avatar, name and shop, opening a drop-up with Settings,
 * Billing and (with Clerk) Sign out. */
export function AccountMenu() {
  const { account } = useStudioSidebar();
  return account.showClerk ? <ClerkAccountMenu /> : <AccountMenuInner />;
}
