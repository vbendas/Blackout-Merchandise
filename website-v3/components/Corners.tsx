'use client';

import { RegisterMark } from '@/components/RegisterMark';
import type { ViewMode } from '@/lib/clients';

interface CornersProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const VIEW_OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: 'list', label: 'List' },
  { mode: 'grid', label: 'Grid' },
  { mode: 'gallery', label: 'Gallery' },
];

/**
 * The five fixed corner anchors that frame the showcase: brand mark,
 * view switcher, About/Contact, location line, waitlist link. No bars,
 * no backgrounds — just text floating on black, positioned with the
 * shared --gutter token.
 */
export function Corners({ view, onViewChange }: CornersProps) {
  return (
    <div className="text-[color:var(--signal)]">
      {/* Desktop layout */}
      <div className="hidden md:block">
        {/* mix-blend-mode: difference keeps the floating labels legible when
            Grid/Gallery images scroll beneath them — cream stays cream on
            black, and self-inverts to dark over bright photos. */}
        <a
          href="/"
          className="fixed z-10 flex items-center gap-2 text-sm"
          style={{ top: '24px', left: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          <RegisterMark className="h-5 w-5" />
          <span>MerchFrom</span>
        </a>

        <div
          className="fixed z-10 left-1/2 -translate-x-1/2 flex items-center text-sm"
          style={{ top: '24px', mixBlendMode: 'difference' }}
        >
          <ViewSwitcher view={view} onViewChange={onViewChange} />
        </div>

        <nav
          className="fixed z-10 flex items-center gap-6 text-sm"
          style={{ top: '24px', right: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>

        <div
          className="fixed z-10 text-sm opacity-60"
          style={{ bottom: '24px', left: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          Merch for artists — Barcelos, PT
        </div>

        <a
          href="/waitlist"
          className="fixed z-10 text-sm"
          style={{ bottom: '24px', right: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          Waitlist
        </a>
      </div>

      {/* Mobile layout */}
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
            className="flex items-center gap-1.5"
            style={{ minHeight: '40px' }}
          >
            <RegisterMark className="h-4 w-4" />
            <span>MerchFrom</span>
          </a>

          <div className="flex items-center" style={{ minHeight: '40px' }}>
            <ViewSwitcher view={view} onViewChange={onViewChange} />
          </div>

          <nav className="flex items-center gap-3" style={{ minHeight: '40px' }}>
            <a href="/about" className="flex items-center" style={{ minHeight: '40px' }}>
              About
            </a>
            <a href="/contact" className="flex items-center" style={{ minHeight: '40px' }}>
              Contact
            </a>
          </nav>
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
          <a href="/waitlist" className="flex items-center" style={{ minHeight: '40px' }}>
            Waitlist
          </a>
        </div>
      </div>
    </div>
  );
}

function ViewSwitcher({ view, onViewChange }: CornersProps) {
  return (
    <>
      {VIEW_OPTIONS.map(({ mode, label }, index) => (
        <span key={mode} className="flex items-center">
          {index > 0 && <span className="opacity-40 px-1">/</span>}
          <button
            type="button"
            onClick={() => onViewChange(mode)}
            aria-pressed={view === mode}
            className="cursor-pointer transition-[filter] duration-200"
            style={{
              filter: view === mode ? 'blur(3px)' : 'none',
              opacity: view === mode ? 1 : 0.6,
              padding: '10px 2px',
            }}
            onMouseEnter={(e) => {
              if (view !== mode) e.currentTarget.style.filter = 'blur(1.5px)';
            }}
            onMouseLeave={(e) => {
              if (view !== mode) e.currentTarget.style.filter = 'none';
            }}
          >
            {label}
          </button>
        </span>
      ))}
    </>
  );
}
