'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import type { ApiOrder } from '@/hooks/useOrders';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/eshop/status-config';

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

interface OverviewTabProps {
  stats: DashboardStats;
  recentOrders?: ApiOrder[];
}

const quickActions = [
  { label: 'Add Product', icon: 'lucide:plus', href: '#', color: 'bg-blue-500/10 text-blue-400' },
  { label: 'View Orders', icon: 'lucide:shopping-bag', href: '#', color: 'bg-purple-500/10 text-purple-400' },
  { label: 'Share Store', icon: 'lucide:share-2', href: '#', color: 'bg-green-500/10 text-green-400' },
  { label: 'Get Help', icon: 'lucide:help-circle', href: '#', color: 'bg-orange-500/10 text-orange-400' },
];

export function OverviewTab({ stats, recentOrders = [] }: OverviewTabProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const displayOrders = recentOrders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <motion.a
              key={action.label}
              href={action.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors ${action.color}`}
            >
              <Icon icon={action.icon} className="w-5 h-5" />
              <span className="text-sm font-medium">{action.label}</span>
            </motion.a>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300">Recent Orders</h2>
            <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">View all</button>
          </div>
          <div className="divide-y divide-zinc-800">
            {displayOrders.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">No orders yet.</div>
            ) : (
              displayOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Icon icon="lucide:package" className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {order.customerName ?? order.customerEmail}
                      </p>
                      <p className="text-xs text-zinc-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(order.totalAmount / 100)}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? ORDER_STATUS_COLORS['pending']}`}
                    >
                      {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Production Timeline */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300">Production Status</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Icon icon="lucide:check" className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Order Received</p>
                <p className="text-xs text-zinc-500">{stats.totalOrders} orders</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Icon icon="lucide:printer" className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">In Production</p>
                <p className="text-xs text-zinc-500">{stats.ordersInProduction} orders being printed</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Icon icon="lucide:truck" className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Shipped</p>
                <p className="text-xs text-zinc-500">{stats.ordersShipped} orders delivered</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Production Pipeline</span>
                <span>{stats.ordersInProduction} active</span>
              </div>
              <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: stats.totalOrders > 0
                      ? `${(stats.ordersInProduction / stats.totalOrders) * 100}%`
                      : '0%',
                  }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
