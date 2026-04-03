'use client';

import { Link } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { openAccessibilityMenu } from './accessibility-widget';

export const FloatingSocials = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1, duration: 0.8 }}
      className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50 hidden md:flex"
    >
      {/* Instagram */}
      <Link
        href="https://instagram.com"
        target="_blank"
        className="text-zinc-500 hover:text-white transition-colors duration-300"
        title="Instagram"
      >
        <Icon icon="simple-icons:instagram" width={20} />
      </Link>
      {/* TikTok */}
      <Link
        href="https://tiktok.com"
        target="_blank"
        className="text-zinc-500 hover:text-white transition-colors duration-300"
        title="TikTok"
      >
        <Icon icon="simple-icons:tiktok" width={20} />
      </Link>
      {/* Accessibility Trigger */}
      <div className="w-full h-[1px] bg-zinc-800/50 my-1" /> {/* Divider */}
      <button
        onClick={openAccessibilityMenu}
        className="text-zinc-500 hover:text-white transition-colors duration-300 focus:outline-none"
        title="Accessibility Options"
        aria-label="Open accessibility options"
      >
        <Icon icon="mdi:accessibility" width={22} />
      </button>
    </motion.div>
  );
};
