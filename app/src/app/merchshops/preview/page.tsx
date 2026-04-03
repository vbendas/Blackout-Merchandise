'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

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

export default function PreviewPage() {
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch('/api/shop/customize');
        if (res.ok) {
          const data = await res.json();
          // For preview, construct a mock shop data from customization
          setShopData({
            id: data.storeId || 'preview',
            slug: 'preview',
            name: 'Your Shop',
            isLive: true,
            sliderImages: data.sliderImages || [],
            backgroundColor: data.backgroundColor || '#0A0A0A',
            textColor: data.textColor || '#FFFFFF',
            aboutText: data.aboutText || '',
            socialLinks: data.socialLinks || {},
            products: [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch preview:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
  }, []);

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
        <div className="animate-pulse text-white">Loading preview...</div>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <p className="text-gray-400">Configure your shop to see preview</p>
      </div>
    );
  }

  const hasSocialLinks = shopData.socialLinks && Object.values(shopData.socialLinks).some(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: shopData.backgroundColor, color: shopData.textColor }}>
      {/* Hero Slider */}
      {shopData.sliderImages && shopData.sliderImages.length > 0 ? (
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
                alt={`Slide ${currentSlide + 1}`}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          </AnimatePresence>

          {shopData.sliderImages.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {shopData.sliderImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full ${index === currentSlide ? 'bg-white' : 'bg-white/50'}`}
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
                        className="text-white/80 hover:text-white"
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
      ) : (
        <div className="w-full aspect-video bg-zinc-800 flex items-center justify-center">
          <p className="text-zinc-500">Add slider images to see preview</p>
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
      {shopData.products && shopData.products.length > 0 ? (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8">Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {shopData.products.map((product) => (
              <div key={product.id} className="group">
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
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-zinc-500">No products yet. Add products to your shop to see them here.</p>
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
