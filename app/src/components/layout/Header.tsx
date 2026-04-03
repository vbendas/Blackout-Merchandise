'use client';

import Link from 'next/link';
import { CartButton } from '@/components/cart/CartButton';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          Merch From
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/merchshops" className="text-zinc-400 hover:text-white transition-colors">
            Shop
          </Link>
          <Link href="/waitlist" className="text-zinc-400 hover:text-white transition-colors">
            Join Waitlist
          </Link>
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
