import Link from 'next/link';

export type TeamTab = 'people' | 'invites' | 'activity';

/** The team pages' sub-navigation: horizontal tabs, one page each. */
export function TeamTabs({ current, pendingInvites }: { current: TeamTab; pendingInvites?: number }) {
  const tabs: { id: TeamTab; href: string; label: string }[] = [
    { id: 'people', href: '/admin/team', label: 'People' },
    { id: 'invites', href: '/admin/team/invites', label: pendingInvites ? `Invites · ${pendingInvites}` : 'Invites' },
    { id: 'activity', href: '/admin/team/activity', label: 'Activity' },
  ];
  return (
    <nav aria-label="Team" className="tm-tabs">
      {tabs.map((tab) => (
        <Link key={tab.id} href={tab.href} className="tm-tab" aria-current={tab.id === current ? 'page' : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
