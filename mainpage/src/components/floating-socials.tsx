'use client';

import { Link } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { openAccessibilityMenu } from './accessibility-widget';

export const FloatingSocials = () => {
  const socialLinks = [
    { name: 'Instagram', href: 'https://instagram.com', icon: 'simple-icons:instagram' },
    { name: 'TikTok', href: 'https://tiktok.com', icon: 'simple-icons:tiktok' },
  ];

  return (
    <>
      {/* Desktop: Vertical sidebar */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="fixed right-0 top-1/2 -translate-y-1/2 flex-col gap-6 z-50 hidden md:flex bg-black/60 backdrop-blur-md rounded-l-2xl rounded-r-none px-3 py-4"
      >
        {socialLinks.map((social) => (
          <Link
            key={social.name}
            href={social.href}
            target="_blank"
            className="text-zinc-500 hover:text-white transition-colors duration-300"
            title={social.name}
          >
            <Icon icon={social.icon} width={20} />
          </Link>
        ))}
        <div className="w-full h-[1px] bg-zinc-800/50 my-1" />
        <button
          onClick={openAccessibilityMenu}
          className="text-zinc-500 hover:text-white transition-colors duration-300 focus:outline-none"
          title="Accessibility Options"
          aria-label="Open accessibility options"
        >
          <Icon icon="mdi:accessibility" width={22} />
        </button>
      </motion.div>

      {/* Mobile: Horizontal bar at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="fixed left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-4 z-40 md:hidden bg-black/60 backdrop-blur-md rounded-full px-4 py-2"
      >
        {socialLinks.map((social) => (
          <Link
            key={social.name}
            href={social.href}
            target="_blank"
            className="text-zinc-400 hover:text-white transition-colors duration-300"
            title={social.name}
          >
            <Icon icon={social.icon} width={18} />
          </Link>
        ))}
        <div className="w-px h-4 bg-zinc-700" />
        <button
          onClick={openAccessibilityMenu}
          className="text-zinc-400 hover:text-white transition-colors duration-300 focus:outline-none"
          title="Accessibility Options"
          aria-label="Open accessibility options"
        >
          <Icon icon="mdi:accessibility" width={20} />
        </button>
      </motion.div>
    </>
  );
};
