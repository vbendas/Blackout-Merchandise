'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

export function TopGearNav() {
  const [open, setOpen] = useState(false);

  const items = [
    { icon: 'lucide:user', label: 'My Account' },
    { icon: 'lucide:settings', label: 'Settings' },
    { icon: 'lucide:credit-card', label: 'Billing' },
    { icon: 'lucide:help-circle', label: 'Help Center' },
  ];

  return (
    <div className="fixed left-4 top-4 z-[110]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/70 backdrop-blur-xl text-zinc-400 transition-colors hover:border-white/20 hover:bg-zinc-800/80 hover:text-zinc-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
        aria-label="Settings"
      >
        <Icon icon="lucide:settings" className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-0"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute left-0 top-11 z-10 w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
            >
              <div className="p-1.5">
                {items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white"
                  >
                    <Icon icon={item.icon} className="h-4 w-4 shrink-0 text-zinc-500" />
                    {item.label}
                  </button>
                ))}

                <div className="my-1 border-t border-white/10" />

                <button
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Icon icon="lucide:log-out" className="h-4 w-4 shrink-0" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
