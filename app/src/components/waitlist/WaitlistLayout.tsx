'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface WaitlistLayoutProps {
  children: ReactNode;
}

export function WaitlistLayout({ children }: WaitlistLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-zinc-300 transition-colors">
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Icon icon="lucide:sparkles" className="w-4 h-4 text-zinc-400" />
            </div>
            <span className="font-semibold text-lg">Blackout Merchandise</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/app" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-500">
          <p>© 2026 Blackout Merchandise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
