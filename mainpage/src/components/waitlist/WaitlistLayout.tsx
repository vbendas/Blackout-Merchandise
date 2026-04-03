'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@heroui/react';

interface WaitlistLayoutProps {
  children: React.ReactNode;
}

export function WaitlistLayout({ children }: WaitlistLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 opacity-50" />
      
      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header with Logo */}
        <header className="flex justify-center mb-8">
          <img 
            src="/logo/full.png" 
            alt="Merch From" 
            className="h-8 w-auto"
          />
        </header>

        {/* Leopoldo Avatar - Always visible */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <Avatar
              src="https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/leopoldo/neutral_attr1_subject.png"
              className="w-24 h-24 border-2 border-rose-500/30"
              isBordered
              color="danger"
            />
            {/* Glow effect */}
            <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full -z-10" />
          </motion.div>
        </div>

        {/* Main content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-zinc-500 text-sm">
          <p>© 2026 Merch From. Premium merch for artists who care.</p>
        </footer>
      </div>
    </div>
  );
}
