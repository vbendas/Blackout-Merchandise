'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Agent } from '@/types/chat';

interface TypingIndicatorProps {
  agent: Agent;
}

export function TypingIndicator({ agent }: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-zinc-700">
        <Image
          src={`https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/${agent.toLowerCase()}/neutral_attr1_subject.png`}
          alt={agent}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md bg-zinc-800">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-zinc-500"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
