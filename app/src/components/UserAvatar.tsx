'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface UserAvatarProps {
  userName?: string;
  avatarUrl?: string;
}

export function UserAvatar({ userName = 'User', avatarUrl }: UserAvatarProps) {
  // Use provided URL or default silhouette
  if (avatarUrl) {
    return (
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-15 h-15 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800"
      >
        <Image src={avatarUrl} alt={userName} fill className="object-cover" sizes="60px" />
      </motion.div>
    );
  }

  // Default: Generic user silhouette with initial
  const initial = userName.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative w-15 h-15 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-zinc-800 text-zinc-400 font-medium"
    >
      {initial}
    </motion.div>
  );
}
