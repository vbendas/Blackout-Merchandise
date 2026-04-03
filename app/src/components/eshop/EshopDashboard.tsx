'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { AnalyticsTab } from './AnalyticsTab';
import { DashboardTabs } from './DashboardTabs';
import { OrdersTab } from './OrdersTab';
import { OverviewTab } from './OverviewTab';
import { ProductsTab } from './ProductsTab';
import { StatsOverview } from './StatsOverview';

type TabType = 'overview' | 'products' | 'orders' | 'analytics';

interface DashboardStats {
  totalRevenue: number;
  weeklyRevenue: number;
  pendingPayout: number;
  totalOrders: number;
  ordersInProduction: number;
  ordersShipped: number;
  totalProducts: number;
  activeProducts: number;
}

interface EshopDashboardProps {
  stats?: DashboardStats;
}

const defaultStats: DashboardStats = {
  totalRevenue: 12580,
  weeklyRevenue: 2340,
  pendingPayout: 1890,
  totalOrders: 156,
  ordersInProduction: 8,
  ordersShipped: 142,
  totalProducts: 12,
  activeProducts: 10,
};

export function EshopDashboard({ stats = defaultStats }: EshopDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <div className="flex h-full bg-zinc-950">
      {/* Main Dashboard Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Stats Overview - Always visible */}
        <StatsOverview stats={stats} />

        {/* Tab Navigation */}
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'overview' && <OverviewTab stats={stats} />}
            {activeTab === 'products' && <ProductsTab />}
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
