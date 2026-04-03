'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  x?: string;
  threads?: string;
  youtube?: string;
  spotify?: string;
  appleMusic?: string;
}

interface ShopData {
  id: string;
  slug: string;
  name: string;
  isLive: boolean;
  sliderImages: string[];
  backgroundColor: string;
  textColor: string;
  aboutText: string;
  socialLinks: SocialLinks;
  products: {
    id: string;
    name: string;
    retailPrice: number;
    mockupUrl: string;
  }[];
}

const SOCIAL_ICONS: Record<string, string> = {
  instagram: 'ri:instagram-fill',
  facebook: 'ri:facebook-fill',
  tiktok: 'ri:tiktok-fill',
  x: 'ri:twitter-x-fill',
  threads: 'ri:threads-fill',
  youtube: 'ri:youtube-fill',
  spotify: 'ri:spotify-fill',
  appleMusic: 'ri:apple-music-fill',
};

function parseMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-amber-400 underline hover:text-amber-300">$1</a>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br/>');
}

export default function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch(`/api/shop/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setShopData(data);
        }
      } catch (error) {
        console.error('Failed to fetch shop:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
  }, [slug]);

  const nextSlide = () => {
    if (shopData?.sliderImages) {
      setCurrentSlide((prev) => (prev + 1) % shopData.sliderImages.length);
    }
  };

  const prevSlide = () => {
    if (shopData?.sliderImages) {
      setCurrentSlide((prev) => (prev - 1 + shopData.sliderImages.length) % shopData.sliderImages.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-gray-400">Shop not found</p>
      </div>
    );
  }

  const hasSocialLinks = shopData.socialLinks && Object.values(shopData.socialLinks).some(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: shopData.backgroundColor, color: shopData.textColor }}>
      {/* Hero Slider */}
      {shopData.sliderImages && shopData.sliderImages.length > 0 && (
        <div className="relative w-full aspect-video max-h-[60vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <Image
                src={shopData.sliderImages[currentSlide]}
                alt={`${shopData.name} - Slide ${currentSlide + 1}`}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          </AnimatePresence>

          {/* Slider Controls */}
          {shopData.sliderImages.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Slide Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {shopData.sliderImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentSlide ? 'bg-white' : 'bg-white/50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Shop Name Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end">
            <div className="p-8 w-full">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{shopData.name}</h1>
              {hasSocialLinks && (
                <div className="flex gap-4 mt-4">
                  {Object.entries(SOCIAL_ICONS).map(([platform, icon]) => {
                    const link = shopData.socialLinks?.[platform as keyof SocialLinks];
                    if (!link) return null;
                    return (
                      <a
                        key={platform}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/80 hover:text-white transition-colors"
                      >
                        <Icon icon={icon} className="w-6 h-6" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      {shopData.aboutText && (
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">About</h2>
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(shopData.aboutText) }}
          />
        </section>
      )}

      {/* Products Grid */}
      {shopData.products && shopData.products.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8">Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {shopData.products.map((product) => (
              <Link key={product.id} href={`/merchshops/${slug}/product/${product.id}`} className="group">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-3">
                  <Image
                    src={product.mockupUrl}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-medium text-sm mb-1 truncate">{product.name}</h3>
                <p className="text-amber-400 font-semibold">€{(product.retailPrice / 100).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>Powered by Merch From</p>
        </div>
      </footer>
    </div>
  );
}
