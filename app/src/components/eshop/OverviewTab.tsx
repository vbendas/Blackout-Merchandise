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

interface OverviewTabProps {
  stats: DashboardStats;
}

const quickActions = [
  { label: 'Add Product', icon: 'lucide:plus', href: '#', color: 'bg-blue-500/10 text-blue-400' },
  { label: 'View Orders', icon: 'lucide:shopping-bag', href: '#', color: 'bg-purple-500/10 text-purple-400' },
  { label: 'Share Store', icon: 'lucide:share-2', href: '#', color: 'bg-green-500/10 text-green-400' },
  { label: 'Get Help', icon: 'lucide:help-circle', href: '#', color: 'bg-orange-500/10 text-orange-400' },
];

const recentOrders = [
  {
    id: '#1234',
    customer: 'Sarah M.',
    product: 'Band Tee - Black',
    status: 'shipped',
    amount: 35,
    date: '2 hours ago',
  },
  {
    id: '#1233',
    customer: 'Mike R.',
    product: 'Hoodie - Gray',
    status: 'in_production',
    amount: 65,
    date: '5 hours ago',
  },
  {
    id: '#1232',
    customer: 'Emma L.',
    product: 'Band Tee - White',
    status: 'in_production',
    amount: 35,
    date: '1 day ago',
  },
  { id: '#1231', customer: 'John D.', product: 'Sticker Pack', status: 'shipped', amount: 12, date: '2 days ago' },
  {
    id: '#1230',
    customer: 'Anna K.',
    product: 'Band Tee - Black',
    status: 'delivered',
    amount: 35,
    date: '3 days ago',
  },
];

const statusColors: Record<string, string> = {
  shipped: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_production: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  delivered: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const statusLabels: Record<string, string> = {
  shipped: 'Shipped',
  in_production: 'In Production',
  delivered: 'Delivered',
  pending: 'Pending',
};

export function OverviewTab({ stats }: OverviewTabProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

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
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Icon icon="lucide:package" className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{order.product}</p>
                    <p className="text-xs text-zinc-500">
                      {order.customer} • {order.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{formatCurrency(order.amount)}</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statusColors[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>
              </div>
            ))}
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
                  animate={{ width: `${(stats.ordersInProduction / stats.totalOrders) * 100}%` }}
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
