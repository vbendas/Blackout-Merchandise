import type { Metadata } from 'next';
import { FeatureMarquee } from '@/components/FeatureMarquee';
import { HeroSection } from '@/components/HeroSection';
import MasonryGrid from '@/components/MasonryGrid';
import { WaitlistCTA } from '@/components/sections/cta/WaitlistCTA';
import { ProductionQuality } from '@/components/sections/quality/ProductionQuality';
import HorizontalScroll from '@/components/uilayouts/horizontal-scroll';
import { ValuePropositionCarousel } from '@/components/ValuePropositionCarousel';

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
    <main className="min-h-screen bg-background">
      <HeroSection />

      {/* Value Proposition - Between Hero and Gallery */}
      <section className="relative z-40 bg-black py-10 max-[389px]:pt-0 max-[389px]:pb-6 -mt-[60px] max-[389px]:-mt-[80px] md:-mt-[40px]">
        {/* Mobile: Carousel */}
        <div className="md:hidden w-full max-w-md mx-auto px-4">
          <ValuePropositionCarousel />
        </div>

        {/* Desktop: Original Three Values Side-by-Side */}
        <div className="hidden md:flex items-center justify-center gap-6 text-zinc-300 text-sm uppercase tracking-[0.2em] font-medium py-2">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
            Premium&nbsp;Quality
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
            Eco-Friendly
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
            Artist-Owned
          </span>
        </div>
      </section>

      {/* Portfolio Grid Section */}
      <div id="portfolio" className="relative z-30 bg-background scroll-mt-[100px]">
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
