'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Shop {
  id: string;
  slug: string;
  name: string;
  coverImage?: string;
  productCount: number;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShops() {
      try {
        const res = await fetch('/api/shops');
        if (res.ok) {
          const data = await res.json();
          setShops(data.shops || []);
        }
      } catch (error) {
        console.error('Failed to fetch shops:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchShops();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-pulse text-white">Loading shops...</div>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <h1 className="text-3xl font-bold text-white mb-4">No Shops Yet</h1>
        <p className="text-zinc-400 mb-8">Be the first to create your merch store!</p>
        <Link
          href="/waitlist"
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
        >
          Join Waitlist
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Discover Artists</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/merchshops/${shop.slug}`}
              className="group block bg-zinc-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-amber-500 transition-all"
            >
              <div className="relative aspect-video bg-zinc-800">
                {shop.coverImage ? (
                  <Image
                    src={shop.coverImage}
                    alt={shop.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                    <span className="text-4xl">🎨</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-xl font-bold mb-1 group-hover:text-amber-400 transition-colors">{shop.name}</h2>
                <p className="text-zinc-400 text-sm">
                  {shop.productCount} {shop.productCount === 1 ? 'product' : 'products'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
