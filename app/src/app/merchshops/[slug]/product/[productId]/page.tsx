'use client';

import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { formatPrice } from '@/lib/cart/store';

interface Product {
  id: string;
  name: string;
  retailPrice: number;
  mockupUrl: string;
  description?: string;
}

interface ShopData {
  id: string;
  slug: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  products: Product[];
}

export default function ProductPage({ params }: { params: Promise<{ slug: string; productId: string }> }) {
  const { slug, productId } = use(params);
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Black');

  const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  const colors = ['Black', 'White', 'Navy', 'Gray', 'Red'];

  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch(`/api/shop/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setShopData(data);
          const foundProduct = data.products?.find((p: Product) => p.id === productId);
          setProduct(foundProduct || null);
        }
      } catch (error) {
        console.error('Failed to fetch shop:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
  }, [slug, productId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!shopData || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-gray-400">Product not found</p>
        <Link href={`/merchshops/${slug}`} className="mt-4 text-amber-400 hover:text-amber-300">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: shopData.backgroundColor, color: shopData.textColor }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href={`/merchshops/${slug}`}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {shopData.name}
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800">
            <Image src={product.mockupUrl} alt={product.name} fill className="object-cover" priority />
          </div>

          <div className="flex flex-col">
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-2xl text-amber-400 font-semibold mb-6">{formatPrice(product.retailPrice)}</p>

            {product.description && <p className="text-zinc-400 mb-6">{product.description}</p>}

            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">Size</h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedSize === size
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-medium mb-3">Color</h3>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedColor === color
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <AddToCartButton
                product={{
                  id: product.id,
                  storeId: shopData.id,
                  storeName: shopData.name,
                  name: product.name,
                  price: product.retailPrice,
                  mockupUrl: product.mockupUrl,
                }}
                variant={selectedColor}
                size={selectedSize}
                color={selectedColor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
