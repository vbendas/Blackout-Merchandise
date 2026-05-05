'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const cards = [
  {
    id: 1,
    title: 'LEOPOLDO',
    subtitle: 'The Curator',
    description:
      "Your personal AI stylist. Chat with him to discover garments that match your vision, even if you can't quite describe them yet.",
    gradient: 'from-purple-900/20 to-blue-900/20',
    border: 'border-purple-500/20',
    image: 'https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_800/merch-from/avatars/leopoldo/1_-_neutral_attr1_subject',
  },
  {
    id: 2,
    title: 'FRANCISCA',
    subtitle: 'The Architect',
    description:
      'The design studio. Customize every stitch, fabric, and placement. Visualize your creation in real-time before it exists.',
    gradient: 'from-emerald-900/20 to-teal-900/20',
    border: 'border-emerald-500/20',
    image: 'https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_800/merch-from/avatars/francisca/1_-_neutral_attr1_subject',
  },
  {
    id: 3,
    title: 'ANTONIA',
    subtitle: 'The Merchant',
    description:
      'Your global storefront. Set up your fully functional E-shop in seconds and start selling to the world immediately.',
    gradient: 'from-orange-900/20 to-red-900/20',
    border: 'border-orange-500/20',
    image: 'https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_800/merch-from/avatars/antonia/1_-_neutral_attr1_subject',
  },
];

export default function HorizontalScroll() {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  // Background is now static Deep Black for the "Underground" vibe
  // We will rely on the Noise Texture to give it the "Rebel" grit

  const x = useTransform(scrollYProgress, [0, 1], ['1%', '-75%']);

  return (
    <section ref={targetRef} className="relative h-[300vh] bg-black -mt-[25px]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* Underground/Rebel Aesthetic - Background Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-black">
          {/* "Silkscreen Mesh" - High precision dot matrix */}
          <div
            className="absolute inset-0 opacity-[0.2]"
            style={{
              backgroundImage: `radial-gradient(circle, #FFFFFF 1px, transparent 1px)`,
              backgroundSize: '4px 4px',
              maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
            }}
          />

          {/* Overlay Vignette for focus */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)] opacity-80" />
        </div>

        {/* Content Layer */}
        <motion.div style={{ x }} className="flex gap-12 px-12 md:px-24 relative z-10">
          {/* Title Card - The Intro */}
          <div className="flex h-[70vh] w-[80vw] md:w-[40vw] flex-col justify-center shrink-0">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-6">
              The <span className="text-zinc-500">Process</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-md">
              From a vague idea to a global brand in three steps. Experience the power of our AI triumvirate.
            </p>
            <div className="mt-12 flex gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
            </div>
          </div>

          {cards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const Card = ({ card }: { card: (typeof cards)[0] }) => {
  return (
    <div
      className={`group relative h-[70vh] w-[90vw] md:w-[75vw] lg:w-[60vw] overflow-hidden rounded-xl border ${card.border} bg-black/40 backdrop-blur-md shrink-0 transition-all duration-300 hover:border-white/20`}
    >
      {/* Background Image - Subtle */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none grayscale mix-blend-luminosity"
        style={{ backgroundImage: `url(${card.image})` }}
      />

      {/* Background Gradient Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-20 group-hover:opacity-30 transition-opacity`}
      />

      {/* Mock Interface Layer */}
      <div className="absolute inset-0 z-0 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-[80%] h-[60%] border border-white/5 bg-black/40 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden relative">
          {/* Window Controls */}
          <div className="h-6 md:h-8 border-b border-white/5 flex items-center px-3 md:px-4 gap-2 bg-white/5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>

          {/* Mock Content based on ID */}
          <div className="p-3 md:p-6 h-full relative">
            {card.id === 1 && ( // Leopoldo (Chat)
              <div className="flex flex-col gap-2 md:gap-4">
                <div className="self-end bg-zinc-800/80 rounded-2xl rounded-tr-sm p-2 md:p-3 max-w-[80%] text-[8px] md:text-[10px] text-zinc-400">
                  I need something avant-garde for the gala. Dark tones.
                </div>
                <div className="self-start bg-purple-900/20 border border-purple-500/20 rounded-2xl rounded-tl-sm p-2 md:p-3 max-w-[80%] text-[8px] md:text-[10px] text-zinc-300">
                  I've generated 3 concepts. The "Void Silk" draped blazer would function perfectly.
                </div>
                <div className="mt-2 md:mt-4 flex gap-2">
                  <div className="h-10 md:h-16 w-10 md:w-12 bg-zinc-800 rounded-md animate-pulse" />
                  <div className="h-10 md:h-16 w-10 md:w-12 bg-zinc-800 rounded-md" />
                  <div className="h-10 md:h-16 w-10 md:w-12 bg-zinc-800 rounded-md" />
                </div>
              </div>
            )}

            {card.id === 2 && ( // Francisca (Editor)
              <div className="flex gap-2 md:gap-4 h-full">
                <div className="w-8 md:w-12 border-r border-white/5 flex flex-col gap-2 items-center pt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-4 md:w-6 h-4 md:h-6 rounded-md bg-zinc-800" />
                  ))}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-20 md:w-32 h-20 md:h-32 rounded-lg border border-dashed border-emerald-500/30 flex items-center justify-center">
                    <div className="w-14 md:w-20 h-18 md:h-24 bg-zinc-800/50" />
                  </div>
                </div>
                <div className="w-20 md:w-32 border-l border-white/5 p-1 md:p-2 space-y-1 md:space-y-2">
                  <div className="h-1 md:h-2 w-8 md:w-12 bg-zinc-800 rounded" />
                  <div className="h-1 w-full bg-zinc-800/50 rounded-full" />
                  <div className="h-6 md:h-8 w-full bg-emerald-900/10 border border-emerald-500/20 rounded mt-2 md:mt-4" />
                </div>
              </div>
            )}

            {card.id === 3 && ( // Antonia (Store)
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border border-white/5 rounded-lg p-2 md:p-3 space-y-1 md:space-y-2">
                    <div className="aspect-[3/4] bg-zinc-800/30 rounded-md w-full" />
                    <div className="h-1 md:h-2 w-10 md:w-16 bg-zinc-800 rounded" />
                    <div className="h-1 md:h-2 w-6 md:w-8 bg-orange-500/20 rounded" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 p-8 z-10 h-full w-full flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent">
        <div className="uppercase tracking-widest text-xs font-medium text-white/40 mb-2">{card.subtitle}</div>
        <h3 className="text-4xl md:text-5xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60 mb-4">
          {card.title}
        </h3>
        <p className="text-base md:text-lg text-zinc-400 max-w-lg md:max-w-xl leading-relaxed">{card.description}</p>
        <div className="mt-8 w-12 h-1 bg-white/20 rounded-full group-hover:w-24 group-hover:bg-white transition-all duration-500" />
      </div>
    </div>
  );
};
