'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useOrders, type ApiOrder } from '@/hooks/useOrders';
import { useProducts, type ApiProduct } from '@/hooks/useProducts';
import { useStore } from '@/hooks/useStore';
import { Icon } from '@iconify/react';
import { AnalyticsTab } from './AnalyticsTab';
import { DashboardTabs } from './DashboardTabs';
import { OrdersTab } from './OrdersTab';
import { OverviewTab } from './OverviewTab';
import { ProductsTab } from './ProductsTab';
import { StatsOverview } from './StatsOverview';
import { StoreOnboarding } from './StoreOnboarding';

type TabType = 'overview' | 'products' | 'orders' | 'analytics';

export interface DashboardStats {
  totalRevenue: number;
  weeklyRevenue: number;
  pendingPayout: number;
  totalOrders: number;
  ordersInProduction: number;
  ordersShipped: number;
  totalProducts: number;
  activeProducts: number;
}

function computeStats(orders: ApiOrder[], products: ApiProduct[]): DashboardStats {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const revenueStatuses: ApiOrder['status'][] = ['paid', 'in_production', 'shipped', 'delivered'];

  const totalRevenue = orders
    .filter((o) => revenueStatuses.includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount / 100, 0);

  const weeklyRevenue = orders
    .filter((o) => revenueStatuses.includes(o.status) && new Date(o.createdAt) >= oneWeekAgo)
    .reduce((sum, o) => sum + o.totalAmount / 100, 0);

  return {
    totalRevenue,
    weeklyRevenue,
    pendingPayout: 0, // TODO: Fetch from Stripe Connect API when onboarding is complete
    totalOrders: orders.length,
    ordersInProduction: orders.filter((o) => o.status === 'in_production').length,
    ordersShipped: orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length,
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.isActive).length,
  };
}

export function EshopDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { store, isLoading, mutate } = useStore();
  const { products } = useProducts(store?.id);
  const { orders } = useOrders(store?.id);

  const stats = computeStats(orders, products);

  return (
    <div className="flex h-full bg-zinc-950">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <Icon icon="lucide:loader-2" className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        )}

        {/* Onboarding gate — artist has no store yet */}
        {!isLoading && store === null && (
          <StoreOnboarding onStoreCreated={() => mutate()} />
        )}

        {/* Full dashboard — store exists */}
        {!isLoading && store !== null && (
          <>
            <StatsOverview stats={stats} />
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-6">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'overview' && <OverviewTab stats={stats} recentOrders={orders} />}
                {activeTab === 'products' && <ProductsTab />}
                {activeTab === 'orders' && <OrdersTab storeId={store.id} />}
                {activeTab === 'analytics' && <AnalyticsTab />}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
