'use client';

import { Image, Link } from '@heroui/react';
import { motion } from 'framer-motion';

const AVATARS = [
  {
    name: 'Leopoldo',
    src: 'https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_100/merch-from/avatars/leopoldo/1_-_neutral_attr1_subject',
  },
  {
    name: 'Francisca',
    src: 'https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_100/merch-from/avatars/francisca/1_-_neutral_attr1_subject',
  },
  {
    name: 'Antônia',
    src: 'https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_100/merch-from/avatars/antonia/1_-_neutral_attr1_subject',
  },
];

export function SocialProof() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8, duration: 0.8 }}
      className="flex items-center gap-3 md:gap-4 px-4 py-2"
    >
      <div className="flex -space-x-3">
        {AVATARS.map((avatar) => (
          <Link key={avatar.name} href="#" className="block transition-transform hover:scale-110 hover:z-10">
            <div className="relative w-8 h-8 rounded-full ring-2 ring-black overflow-hidden bg-zinc-800">
              <Image
                src={avatar.src}
                alt={avatar.name}
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
          Meet your <span className="text-zinc-200 group-hover:text-white transition-colors">dedicated team</span>
        </p>
      </Link>
    </motion.div>
  );
}
