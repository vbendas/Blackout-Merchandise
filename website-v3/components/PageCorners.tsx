import { RegisterMark } from '@/components/RegisterMark';

interface PageCornersProps {
  /** which top-right link is the current page — rendered blurred, per the site's active-state convention */
  current: 'about' | 'contact' | 'waitlist';
}

// Static corner anchors for subpages: same frame as the home Corners but
// without the view switcher. The current page's own link is blurred, the
// same signifier the home switcher uses for the active view.
export function PageCorners({ current }: PageCornersProps) {
  const links = [
    { href: '/about', label: 'About', key: 'about' as const },
    { href: '/contact', label: 'Contact', key: 'contact' as const },
  ];

  const nav = (size: string) => (
    <>
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          aria-current={current === l.key ? 'page' : undefined}
          className={`flex items-center ${size}`}
          style={{ filter: current === l.key ? 'blur(3px)' : 'none', minHeight: '40px' }}
        >
          {l.label}
        </a>
      ))}
    </>
  );

  return (
    <div className="text-[color:var(--signal)]" style={{ fontWeight: 500 }}>
      {/* Desktop */}
      <div className="hidden md:block">
        <a
          href="/"
          aria-label="MerchFrom — home"
          className="fixed z-10 flex items-center text-sm"
          style={{ top: '24px', left: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          <RegisterMark className="h-6 w-6" />
        </a>

        <nav
          className="fixed z-10 flex items-center gap-6 text-sm"
          style={{ top: '24px', right: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          {nav('')}
        </nav>

        <div
          className="fixed z-10 text-sm opacity-60"
          style={{ bottom: '24px', left: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          Merch for artists — Barcelos, PT
        </div>

        <a
          href="/waitlist"
          aria-current={current === 'waitlist' ? 'page' : undefined}
          className="fixed z-10 text-sm"
          style={{
            bottom: '24px',
            right: 'var(--gutter)',
            mixBlendMode: 'difference',
            filter: current === 'waitlist' ? 'blur(3px)' : 'none',
          }}
        >
          Waitlist
        </a>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div
          className="fixed z-10 top-0 left-0 right-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px]"
          style={{
            paddingLeft: 'var(--gutter)',
            paddingRight: 'var(--gutter)',
            paddingTop: '8px',
            paddingBottom: '8px',
            background: 'var(--paper)',
          }}
        >
          <a
            href="/"
            aria-label="MerchFrom — home"
            className="flex items-center"
            style={{ minHeight: '40px' }}
          >
            <RegisterMark className="h-5 w-5" />
          </a>

          <nav className="flex items-center gap-3">{nav('')}</nav>
        </div>

        <div
          className="fixed z-10 bottom-0 left-0 right-0 flex items-center justify-between text-[12px]"
          style={{
            paddingLeft: 'var(--gutter)',
            paddingRight: 'var(--gutter)',
            paddingTop: '8px',
            paddingBottom: '8px',
            background: 'var(--paper)',
          }}
        >
          <span className="opacity-60" style={{ lineHeight: '40px' }}>
            Merch for artists — Barcelos, PT
          </span>
          <a
            href="/waitlist"
            aria-current={current === 'waitlist' ? 'page' : undefined}
            className="flex items-center"
            style={{ minHeight: '40px', filter: current === 'waitlist' ? 'blur(3px)' : 'none' }}
          >
            Waitlist
          </a>
        </div>
      </div>
    </div>
  );
}
