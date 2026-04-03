'use client';

import ScrollBaseAnimation from '@/../components/uilayouts/scroll-text-marque';

const SPECS_ROW1 = [
  'Heavyweight Cotton',
  'Water-Based Inks',
  'Big Print Sizes',
  'Custom Packing',
  '100% Vegan',
  'Wind-Powered Production',
];

const SPECS_ROW2 = [
  'Zero Inventory Risk',
  'Global Fulfillment',
  'No Middleman',
  'AI Design Suite',
  '0% Commission',
  'Instant E-Shop',
];

function MarqueeRow({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-3 pr-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="whitespace-nowrap">{item}</span>
          <span className="relative top-[12px] self-center flex items-center justify-center">*</span>
        </div>
      ))}
    </div>
  );
}

export function FeatureMarquee() {
  return (
    <div className="overflow-x-clip">
      <section
        className="relative z-30 bg-black py-2 md:py-3 pb-[50px] overflow-hidden"
        style={{
          transform: 'rotate(-2deg) scale(1.05)',
          margin: '-45px 0',
          boxShadow: '0 20px 40px 10px rgba(0,0,0,0.8)', // Outer shadow casting onto the section below
        }}
      >
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        {/* Inner bottom shadow removed as requested */}

        {/* Row 1 - Moving Left (very slow) */}
        <div className="mb-1">
          <ScrollBaseAnimation
            baseVelocity={-0.1}
            clasname="text-white font-black uppercase tracking-tight leading-none"
            startOnVisible={true}
          >
            <MarqueeRow items={SPECS_ROW1} />
          </ScrollBaseAnimation>
        </div>

        {/* Row 2 - Moving Right (very slow) */}
        <div>
          <ScrollBaseAnimation
            baseVelocity={0.1}
            clasname="text-zinc-600 font-black uppercase tracking-tight leading-none"
            startOnVisible={true}
          >
            <MarqueeRow items={SPECS_ROW2} />
          </ScrollBaseAnimation>
        </div>
      </section>
    </div>
  );
}
