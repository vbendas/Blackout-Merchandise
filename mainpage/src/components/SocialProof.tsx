'use client';

import { Image, Link } from '@heroui/react';
import { motion } from 'framer-motion';

export function SocialProof() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8, duration: 0.8 }}
      className="flex items-center gap-3 md:gap-4 px-4 py-2"
    >
      <div className="flex -space-x-3">
        {[1, 2, 3].map((i) => (
          <Link key={i} href="#" className="block transition-transform hover:scale-110 hover:z-10">
            <div className="relative w-8 h-8 rounded-full ring-2 ring-black overflow-hidden bg-zinc-800">
              <Image
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 13}`}
                alt={`Partner ${i}`}
                classNames={{
                  wrapper: 'w-full h-full',
                  img: 'w-full h-full object-cover',
                }}
              />
            </div>
          </Link>
        ))}
      </div>
      <Link href="#" className="group">
        <p className="text-zinc-400 text-xs md:text-sm font-medium transition-colors group-hover:text-zinc-200">
          Trusted by <span className="text-zinc-200 group-hover:text-white transition-colors">1,282+</span> partners
        </p>
      </Link>
    </motion.div>
  );
}
