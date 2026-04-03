'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

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

interface StatsOverviewProps {
  stats: DashboardStats;
}

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const colorVariants = {
  blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
  green: 'from-green-500/10 to-green-600/5 border-green-500/20',
  purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
  orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
};

const iconColors = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
};

function StatCard({ label, value, subValue, icon, trend, trendValue, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorVariants[color]} p-4`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subValue && <p className="text-xs text-zinc-500 mt-0.5">{subValue}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-zinc-800/50 ${iconColors[color]}`}>
          <Icon icon={icon} className="w-5 h-5" />
        </div>
      </div>
      {trend && trendValue && (
        <div className="flex items-center gap-1 mt-3">
          <Icon
            icon={trend === 'up' ? 'lucide:trending-up' : trend === 'down' ? 'lucide:trending-down' : 'lucide:minus'}
            className={`w-3.5 h-3.5 ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400'
            }`}
          />
          <span
            className={`text-xs ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400'
            }`}
          >
            {trendValue}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      {/* Sticky Header */}
      <div className="fixed top-0 left-16 right-0 z-[60] h-[72px] flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 bg-zinc-900/70 backdrop-blur-xl border-b border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <Icon icon="solar:shop-2-linear" className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Store Dashboard</h1>
            <p className="text-xs text-zinc-400">Track your sales, orders, and payouts</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 transition-colors">
          <Icon icon="lucide:external-link" className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">View Store</span>
        </button>
      </div>

      <div className="pt-[72px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            subValue={`${formatCurrency(stats.weeklyRevenue)} this week`}
            icon="lucide:euro"
            trend="up"
            trendValue="+15% from last week"
            color="green"
          />
          <StatCard
            label="Pending Payout"
            value={formatCurrency(stats.pendingPayout)}
            subValue="Next payout: Friday"
            icon="lucide:wallet"
            color="blue"
          />
          <StatCard
            label="Total Orders"
            value={stats.totalOrders}
            subValue={`${stats.ordersInProduction} in production`}
            icon="lucide:shopping-bag"
            trend="up"
            trendValue="+8 new this week"
            color="purple"
          />
          <StatCard
            label="Active Products"
            value={`${stats.activeProducts}/${stats.totalProducts}`}
            subValue="products live"
            icon="lucide:package"
            color="orange"
          />
        </div>
      </div>
    </div>
  );
}
