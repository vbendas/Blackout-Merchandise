'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface Order {
  id: string;
  customer: string;
  email: string;
  items: { product: string; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  trackingNumber?: string;
}

const mockOrders: Order[] = [
  {
    id: '#1234',
    customer: 'Sarah Martinez',
    email: 'sarah@example.com',
    items: [{ product: 'Band Tee - Black', quantity: 2, price: 35 }],
    total: 70,
    status: 'shipped',
    date: '2026-02-08',
    trackingNumber: 'IE123456789',
  },
  {
    id: '#1233',
    customer: 'Mike Rodriguez',
    email: 'mike@example.com',
    items: [{ product: 'Logo Hoodie - Gray', quantity: 1, price: 65 }],
    total: 65,
    status: 'in_production',
    date: '2026-02-07',
  },
  {
    id: '#1232',
    customer: 'Emma Lewis',
    email: 'emma@example.com',
    items: [{ product: 'Band Tee - White', quantity: 1, price: 35 }],
    total: 35,
    status: 'in_production',
    date: '2026-02-07',
  },
  {
    id: '#1231',
    customer: 'John Davis',
    email: 'john@example.com',
    items: [{ product: 'Sticker Pack', quantity: 3, price: 12 }],
    total: 36,
    status: 'shipped',
    date: '2026-02-06',
    trackingNumber: 'IE987654321',
  },
  {
    id: '#1230',
    customer: 'Anna Kim',
    email: 'anna@example.com',
    items: [{ product: 'Band Tee - Black', quantity: 1, price: 35 }],
    total: 35,
    status: 'delivered',
    date: '2026-02-05',
  },
  {
    id: '#1229',
    customer: 'Tom Wilson',
    email: 'tom@example.com',
    items: [{ product: 'Enamel Pin Set', quantity: 2, price: 18 }],
    total: 36,
    status: 'paid',
    date: '2026-02-05',
  },
  {
    id: '#1228',
    customer: 'Lisa Chen',
    email: 'lisa@example.com',
    items: [
      { product: 'Band Tee - Black', quantity: 1, price: 35 },
      { product: 'Sticker Pack', quantity: 1, price: 12 },
    ],
    total: 47,
    status: 'in_production',
    date: '2026-02-04',
  },
];

const statusConfig: Record<Order['status'], { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: 'lucide:clock' },
  paid: { label: 'Paid', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: 'lucide:credit-card' },
  in_production: {
    label: 'In Production',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    icon: 'lucide:printer',
  },
  shipped: { label: 'Shipped', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: 'lucide:truck' },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    icon: 'lucide:check-circle',
  },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: 'lucide:x-circle' },
};

export function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const filteredOrders = statusFilter === 'all' ? mockOrders : mockOrders.filter((o) => o.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            statusFilter === 'all' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          All Orders
        </button>
        {Object.entries(statusConfig).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as Order['status'])}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
              statusFilter === status ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Icon icon={config.icon} className="w-3.5 h-3.5" />
            {config.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Order</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Items</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Total</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrder === order.id;
                const config = statusConfig[order.status];

                return (
                  <>
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-white">{order.id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-white">{order.customer}</p>
                          <p className="text-xs text-zinc-500">{order.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-zinc-300">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-white">€{order.total}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${config.color}`}
                        >
                          <Icon icon={config.icon} className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-zinc-400">{order.date}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-zinc-800/20">
                        <td colSpan={6} className="py-4 px-4">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-medium text-zinc-500 mb-2">Order Items</h4>
                                <div className="space-y-1">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-zinc-300">
                                        {item.quantity}x {item.product}
                                      </span>
                                      <span className="text-zinc-400">€{item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-medium text-zinc-500 mb-2">Production Timeline</h4>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                      <Icon icon="lucide:check" className="w-3 h-3 text-green-400" />
                                    </div>
                                    <span className="text-sm text-zinc-300">Order Received</span>
                                  </div>
                                  {order.status !== 'pending' && order.status !== 'cancelled' && (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                          ['in_production', 'shipped', 'delivered'].includes(order.status)
                                            ? 'bg-green-500/10'
                                            : 'bg-zinc-700'
                                        }`}
                                      >
                                        <Icon
                                          icon="lucide:check"
                                          className={`w-3 h-3 ${
                                            ['in_production', 'shipped', 'delivered'].includes(order.status)
                                              ? 'text-green-400'
                                              : 'text-zinc-500'
                                          }`}
                                        />
                                      </div>
                                      <span className="text-sm text-zinc-300">Paid</span>
                                    </div>
                                  )}
                                  {(order.status === 'in_production' ||
                                    order.status === 'shipped' ||
                                    order.status === 'delivered') && (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                          order.status !== 'in_production' ? 'bg-green-500/10' : 'bg-yellow-500/10'
                                        }`}
                                      >
                                        <Icon
                                          icon={order.status !== 'in_production' ? 'lucide:check' : 'lucide:printer'}
                                          className={`w-3 h-3 ${
                                            order.status !== 'in_production' ? 'text-green-400' : 'text-yellow-400'
                                          }`}
                                        />
                                      </div>
                                      <span className="text-sm text-zinc-300">
                                        {order.status === 'in_production' ? 'In Production' : 'Production Complete'}
                                      </span>
                                    </div>
                                  )}
                                  {(order.status === 'shipped' || order.status === 'delivered') && (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                          order.status === 'delivered' ? 'bg-green-500/10' : 'bg-purple-500/10'
                                        }`}
                                      >
                                        <Icon
                                          icon="lucide:truck"
                                          className={`w-3 h-3 ${
                                            order.status === 'delivered' ? 'text-green-400' : 'text-purple-400'
                                          }`}
                                        />
                                      </div>
                                      <span className="text-sm text-zinc-300">
                                        {order.status === 'delivered' ? 'Delivered' : 'Shipped'}
                                      </span>
                                      {order.trackingNumber && (
                                        <span className="text-xs text-zinc-500 ml-2">({order.trackingNumber})</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
