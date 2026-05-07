import type { Metadata } from 'next';
import { GrainGradient } from '@paper-design/shaders-react';
import { FeatureMarquee } from '@/components/FeatureMarquee';
import { HeroSection } from '@/components/HeroSection';
import MasonryGrid from '@/components/MasonryGrid';
import { WaitlistCTA } from '@/components/sections/cta/WaitlistCTA';
import { ProductionQuality } from '@/components/sections/quality/ProductionQuality';
import HorizontalScroll from '@/components/uilayouts/horizontal-scroll';

export const metadata: Metadata = {
  title: 'MerchFrom | AI-Powered Premium Merchandise for Creators',
  description:
    'We help artists, creators and brands design, source and sell premium quality merchandise hassle-free. Vegan, eco-friendly, artist-owned.',
  keywords: ['merchandise', 'creators', 'artists', 'premium quality', 'eco-friendly', 'screen printing'],
  openGraph: {
    title: 'MerchFrom | AI-Powered Premium Merchandise',
    description: 'Design, source and sell premium merchandise hassle-free',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Shared GrainGradient across Hero + Gallery */}
      <div className="fixed inset-0 z-0">
        <GrainGradient
          style={{ height: '100%', width: '100%' }}
          colorBack="hsl(0, 0%, 0%)"
          softness={0.76}
          intensity={0.35}
          noise={0}
          shape="corners"
          offsetX={0}
          offsetY={0}
          scale={1}
          rotation={0}
          speed={0.8}
          colors={['hsl(0, 0%, 6%)', 'hsl(0, 0%, 4%)', 'hsl(0, 0%, 8%)']}
        />
      </div>

      <HeroSection />

      {/* Portfolio Grid Section */}
      <div id="portfolio" className="relative z-30 scroll-mt-[100px]">
        <MasonryGrid />
      </div>

      {/* Marquee Specs */}
      <div id="features">
        <FeatureMarquee />
      </div>

      {/* Functionality Showcase */}
      <div id="process">
        <HorizontalScroll />
      </div>

      {/* Production & Quality Specs */}
      <div id="quality">
        <ProductionQuality />
      </div>

      {/* Waitlist CTA - "We're not for everyone" */}
      <div id="waitlist">
        <WaitlistCTA />
      </div>
    </main>
  );
}
