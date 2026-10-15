import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TabNavItem {
  href: string;
  label: string;
  /** shown after the label when there is something to count */
  count?: number | null;
  current: boolean;
}

/** A row of tabs under the top bar: the white bar under the current one, a
 * hairline under the row. Each tab is a link to a page of its own (a queue
 * state, a pack's production file), so Back works and a tab can be shared. */
export function TabNav({ label, items, spaced = false }: { label: string; items: TabNavItem[]; spaced?: boolean }) {
  return (
    <nav aria-label={label} className={cn('pp-tabs', spaced && 'pp-tabs-spaced')}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="pp-tab" aria-current={item.current ? 'page' : undefined}>
          {item.count ? `${item.label} · ${item.count}` : item.label}
        </Link>
      ))}
    </nav>
  );
}
