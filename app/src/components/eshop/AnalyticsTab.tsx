'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

const weeklyData = [
  { day: 'Mon', revenue: 320 },
  { day: 'Tue', revenue: 450 },
  { day: 'Wed', revenue: 280 },
  { day: 'Thu', revenue: 590 },
  { day: 'Fri', revenue: 480 },
  { day: 'Sat', revenue: 620 },
  { day: 'Sun', revenue: 340 },
];

const topProducts = [
  { name: 'Band Tee - Black', sales: 89, revenue: 3115 },
  { name: 'Sticker Pack', sales: 134, revenue: 1608 },
  { name: 'Logo Hoodie - Gray', sales: 45, revenue: 2925 },
  { name: 'Band Tee - White', sales: 76, revenue: 2660 },
  { name: 'Enamel Pin Set', sales: 23, revenue: 414 },
];

const payoutHistory = [
  { date: '2026-02-07', amount: 1250, orders: 42, status: 'completed' },
  { date: '2026-01-31', amount: 980, orders: 35, status: 'completed' },
  { date: '2026-01-24', amount: 1450, orders: 48, status: 'completed' },
  { date: '2026-01-17', amount: 890, orders: 31, status: 'completed' },
];

export function AnalyticsTab() {
  const maxRevenue = Math.max(...weeklyData.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Weekly Revenue</h2>
            <p className="text-2xl font-bold text-white mt-1">€3,080</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Icon icon="lucide:trending-up" className="w-3.5 h-3.5" />
              +15%
            </span>
            <span className="text-xs text-zinc-500">vs last week</span>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-48 flex items-end justify-between gap-2">
          {weeklyData.map((day, index) => (
            <motion.div
              key={day.day}
              initial={{ height: 0 }}
              animate={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div
                className="w-full bg-gradient-to-t from-zinc-700 to-zinc-600 rounded-t-md relative group cursor-pointer"
                style={{ height: '100%' }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                  €{day.revenue}
                </div>
              </div>
              <span className="text-xs text-zinc-500">{day.day}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300">Top Products</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {topProducts.map((product, index) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-400">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{product.name}</p>
                    <p className="text-xs text-zinc-500">{product.sales} sales</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">€{product.revenue.toLocaleString()}</p>
                  <p className="text-xs text-green-400">
                    €{(product.revenue - product.sales * 12).toLocaleString()} profit
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Payout History */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300">Payout History</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {payoutHistory.map((payout, index) => (
              <motion.div
                key={payout.date}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{payout.date}</p>
                  <p className="text-xs text-zinc-500">{payout.orders} orders</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">€{payout.amount}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                      payout.status === 'completed'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}
                  >
                    <Icon icon={payout.status === 'completed' ? 'lucide:check' : 'lucide:clock'} className="w-3 h-3" />
                    {payout.status === 'completed' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
