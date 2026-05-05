import type { Metadata } from 'next';
import { AvatarTrio } from '@/components/AvatarTrio';
import { FeatureMarquee } from '@/components/FeatureMarquee';
import MasonryGrid from '@/components/MasonryGrid';
import { SocialProof } from '@/components/SocialProof';
import { WaitlistCTA } from '@/components/sections/cta/WaitlistCTA';
import { ProductionQuality } from '@/components/sections/quality/ProductionQuality';
import HorizontalScroll from '@/components/uilayouts/horizontal-scroll';
import { ValuePropositionCarousel } from '@/components/ValuePropositionCarousel';
import { WordReveal } from '@/components/WordReveal';

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
      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center z-10">
        {/* Background gradient effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Avatar Trio Container - Pinned to viewport height */}
        <div className="absolute top-0 left-0 w-full h-screen max-[389px]:h-[85vh] overflow-hidden">
          <AvatarTrio />

          {/* Gradient Mask for fading bottom into black - Full Width */}
          <div className="absolute top-0 left-0 w-full h-[85vh] pointer-events-none z-0">
            <div className="absolute bottom-0 left-0 w-full h-[40vh] bg-gradient-to-t from-black via-black/90 to-transparent" />
          </div>
        </div>

        {/* Social Proof - Absolute Position Aligned with Grid - Tablet optimized */}
        <div className="absolute top-[122px] md:top-[100px] lg:top-[122px] left-0 w-full z-[55] pointer-events-none hidden md:block">
          <div className="max-w-7xl mx-auto px-6">
            <div className="pointer-events-auto inline-block scale-90 md:scale-85 lg:scale-90 origin-left">
              <SocialProof />
            </div>
          </div>
        </div>

        {/* Mobile Social Proof - Centered */}
        <div className="absolute top-[110px] max-[389px]:top-[75px] left-1/2 -translate-x-1/2 z-[55] md:hidden scale-90 opacity-90 pointer-events-auto w-full flex justify-center">
          <SocialProof />
        </div>

        {/* Reordered Slogan Container - relative flow with padding push */}
        <div className="relative z-10 w-full min-h-screen flex flex-col items-center pt-[calc(40vh+90px)] md:pt-[calc(45vh+90px)] lg:pt-[calc(50vh+90px)] pb-[60px] pointer-events-none">
          {/* Gradient Overlay - Contained within hero */}
          <div className="absolute top-[50vh] left-0 w-full h-[50vh] bg-gradient-to-b from-transparent via-black/80 to-black -z-10" />

          <div className="text-center max-w-7xl mx-auto flex flex-col items-center gap-4 pointer-events-auto">
            {/* Main Slogan - Progressive sizing for mobile → tablet → desktop */}
            <div className="space-y-1 -mt-[39px] max-[389px]:-mt-[59px] md:mt-2.5 mt-[60px] md:mt-0 w-full">
              <div className="block space-y-1 px-6 w-full max-[389px]:scale-[0.85] max-[389px]:origin-top">
                <WordReveal
                  text="We help artists, creators and brands"
                  className="text-3xl md:text-4xl lg:text-6xl font-medium text-zinc-300 tracking-wide text-balance"
                  range={[0, 100]}
                />

                <WordReveal
                  text="design, source and sell merchandise hassle-free."
                  className="text-3xl md:text-4xl lg:text-6xl font-semibold text-zinc-100 tracking-tight leading-[0.9] text-balance pb-3"
                  range={[50, 200]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition - Between Hero and Gallery */}
      <section className="relative z-40 bg-black py-10 max-[389px]:pt-0 max-[389px]:pb-6 -mt-[150px] max-[389px]:-mt-[160px] md:-mt-[130px]">
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
