'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useStore } from '@/hooks/useStore';
type StatusFilter = 'all' | 'active' | 'inactive';

const statusColors: Record<'active' | 'inactive', string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export function ProductsTab() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const { store } = useStore();
  const { products, isLoading, error, updateProduct, deleteProduct } = useProducts(store?.id);

  const filteredProducts = products.filter((p) => {
    if (filter === 'all') return true;
    return filter === 'active' ? p.isActive : !p.isActive;
  });

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateProduct(id, { isActive: !isActive });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Icon icon="lucide:loader-2" className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500">
        <p className="text-sm">Failed to load products.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
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

      {filteredProducts.length === 0 && (
        <div className="flex items-center justify-center h-40 text-zinc-500">
          <p className="text-sm">No {filter !== 'all' ? filter : ''} products yet.</p>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product, index) => {
          const status = product.isActive ? 'active' : 'inactive';
          const baseCostEur = product.baseCost / 100;
          const retailPriceEur = product.retailPrice / 100;
          const profit = retailPriceEur - baseCostEur;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-all"
            >
              {/* Product Image */}
              <div className="aspect-[4/3] bg-zinc-800 relative overflow-hidden">
                {product.mockupUrl ? (
                  <img src={product.mockupUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon icon="lucide:image" className="w-12 h-12 text-zinc-600" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[status]}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleToggleActive(product.id, product.isActive)}
                    className="p-2 bg-white text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
                    title={product.isActive ? 'Deactivate' : 'Activate'}
                  >
                    <Icon icon={product.isActive ? 'lucide:eye-off' : 'lucide:eye'} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this product?')) {
                        deleteProduct(product.id);
                      }
                    }}
                    className="p-2 bg-white text-zinc-900 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete product"
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-medium text-white truncate">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-zinc-500 truncate mt-0.5">{product.description}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-lg font-semibold text-white">€{retailPriceEur.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500">Cost: €{baseCostEur.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>€{profit.toFixed(2)} margin</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
