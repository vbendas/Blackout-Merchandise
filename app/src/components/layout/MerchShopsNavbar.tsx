'use client';

import Link from 'next/link';
import { CartButton } from '@/components/cart/CartButton';

export function MerchShopsNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex-1">{/* Left side - can be used for back button or shop name */}</div>

        <Link href="/merchshops" className="text-xl font-bold text-white">
          Blackout Merchandise
        </Link>

        <div className="flex-1 flex justify-end">
          <CartButton />
        </div>
      </div>
    </header>
  );
}
