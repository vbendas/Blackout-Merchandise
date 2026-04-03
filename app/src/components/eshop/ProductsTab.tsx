'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  category: string;
  baseCost: number;
  retailPrice: number;
  status: 'active' | 'inactive' | 'draft';
  imageUrl?: string;
  sales: number;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Band Tee - Black',
    category: 'T-Shirts',
    baseCost: 12,
    retailPrice: 35,
    status: 'active',
    sales: 89,
  },
  {
    id: '2',
    name: 'Band Tee - White',
    category: 'T-Shirts',
    baseCost: 12,
    retailPrice: 35,
    status: 'active',
    sales: 76,
  },
  {
    id: '3',
    name: 'Logo Hoodie - Gray',
    category: 'Hoodies',
    baseCost: 25,
    retailPrice: 65,
    status: 'active',
    sales: 45,
  },
  {
    id: '4',
    name: 'Sticker Pack',
    category: 'Accessories',
    baseCost: 3,
    retailPrice: 12,
    status: 'active',
    sales: 134,
  },
  { id: '5', name: 'Tour Poster', category: 'Posters', baseCost: 8, retailPrice: 25, status: 'inactive', sales: 23 },
  { id: '6', name: 'Enamel Pin Set', category: 'Accessories', baseCost: 5, retailPrice: 18, status: 'draft', sales: 0 },
];

const statusColors: Record<Product['status'], string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export function ProductsTab() {
  const [filter, setFilter] = useState<'active' | 'inactive' | 'draft' | 'all'>('all');

  const filteredProducts = filter === 'all' ? mockProducts : mockProducts.filter((p) => p.status === filter);

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive', 'draft'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === status
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors">
          <Icon icon="lucide:plus" className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-all"
          >
            {/* Product Image */}
            <div className="aspect-[4/3] bg-zinc-800 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon icon="lucide:image" className="w-12 h-12 text-zinc-600" />
              </div>
              <div className="absolute top-3 left-3">
                <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[product.status]}`}>
                  {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                </span>
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button className="p-2 bg-white text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors">
                  <Icon icon="lucide:edit" className="w-4 h-4" />
                </button>
                <button className="p-2 bg-white text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors">
                  <Icon icon="lucide:copy" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="font-medium text-white truncate">{product.name}</h3>
              <p className="text-sm text-zinc-500">{product.category}</p>

              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-lg font-semibold text-white">€{product.retailPrice}</p>
                  <p className="text-xs text-zinc-500">Cost: €{product.baseCost}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-300">{product.sales} sales</p>
                  <p className="text-xs text-green-400">
                    €{(product.retailPrice - product.baseCost) * product.sales} profit
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
