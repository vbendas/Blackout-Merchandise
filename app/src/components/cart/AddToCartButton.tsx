'use client';

import { Check, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '@/lib/cart/store';
import type { CartItem } from '@/lib/cart/types';

interface AddToCartButtonProps {
  product: {
    id: string;
    storeId: string;
    storeName: string;
    name: string;
    price: number;
    mockupUrl: string;
  };
  variant?: string;
  size?: string;
  color?: string;
}

export function AddToCartButton({ product, variant, size, color }: AddToCartButtonProps) {
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    const item: Omit<CartItem, 'id'> = {
      productId: product.id,
      storeId: product.storeId,
      storeName: product.storeName,
      name: product.name,
      price: product.price,
      quantity: 1,
      mockupUrl: product.mockupUrl,
      variant,
      size,
      color,
    };

    addItem(item);
    setIsAdded(true);

    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <button
      onClick={handleAddToCart}
      className={`flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium transition-all ${
        isAdded
          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
          : 'bg-amber-500 hover:bg-amber-400 text-black'
      }`}
    >
      {isAdded ? (
        <>
          <Check className="w-5 h-5" />
          Added to Cart
        </>
      ) : (
        <>
          <ShoppingCart className="w-5 h-5" />
          Add to Cart
        </>
      )}
    </button>
  );
}
