'use client';

import { motion } from 'framer-motion';
import { useChat } from '@/context/ChatContext';
import Image from 'next/image';

const agentAvatars: Record<string, string> = {
  Leopoldo: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/leopoldo/neutral_attr1_subject.png',
  Francisca: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/francisca/neutral_attr1_subject.png',
  Antônia: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/antonia/neutral_attr1_subject.png',
};

export function FloatingButton() {
  const { isOpen, toggleChat, currentAgent } = useChat();

  if (isOpen) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleChat}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl overflow-hidden border-2 border-white/20 bg-zinc-900"
      aria-label="Open chat"
    >
      <Image
        src={agentAvatars[currentAgent]}
        alt={currentAgent}
        width={64}
        height={64}
        className="w-full h-full object-cover"
      />
    </motion.button>
  );
}