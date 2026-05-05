'use client';

import Link from 'next/link';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { MorphingText } from '@/components/ui/morphing-text';

const MORPHING_TEXTS = ["We're not for everyone.", "But mom always said... you're not everyone else."];

import { useInView } from 'framer-motion';
import { useRef } from 'react';

export function WaitlistCTA() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.8 });

  return (
    <section className="relative z-[45] bg-black py-16 md:py-24 overflow-hidden -mt-9" ref={containerRef}>
      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

      <div className="relative z-50 max-w-6xl mx-auto px-6 text-center">
        {/* Main Headline - Morphing between two statements with fluid sizing */}
        <div
          className="md:-mt-5"
          style={{
            fontSize: 'clamp(2rem, 8vw, 5rem)',
            minHeight: 'clamp(280px, 45vw, 300px)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <MorphingText
              texts={MORPHING_TEXTS}
              textColors={['#52525b', '#ffffff']}
              start={isInView}
              className="!h-[400px] text-white font-black uppercase tracking-tighter leading-[0.9] text-balance [&>span]:!top-1/2 [&>span]:!-translate-y-1/2"
            />
          </div>
        </div>

        {/* Context copy */}
        <p className="text-zinc-500 text-sm md:text-base max-w-md mx-auto mb-8 -mt-4">
          We handpick artists who care about quality. Apply for access and we'll let you in when it's your turn.
        </p>

        {/* CTA Button - Golden Border Gradient */}
        <div className="flex justify-center md:mt-8">
          <Link href="/waitlist">
            <HoverBorderGradient
              containerClassName="rounded-full"
              className="dark:bg-black bg-black text-white flex flex-col items-center font-bold uppercase tracking-wider px-10 py-4"
              style={{ fontSize: 'clamp(1rem, 3vw, 1.125rem)' }}
            >
              <span>Prove Her&nbsp;Right!</span>
              <span className="opacity-80" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}>
                Join&nbsp;Waitlist
              </span>
            </HoverBorderGradient>
          </Link>
        </div>

        {/* Optional: Subtext */}
        <p className="mt-4 text-zinc-600 text-fluid-sm leading-tight-body">
          No spam. Just an invite when it's your&nbsp;turn.
        </p>
      </div>
    </section>
  );
}
