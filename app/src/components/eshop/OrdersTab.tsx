'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { Fragment, useState } from 'react';
import { type ApiOrder, type OrderStatus, useOrders } from '@/hooks/useOrders';
import { useStore } from '@/hooks/useStore';
import { ORDER_STATUS_CONFIG } from '@/lib/eshop/status-config';

interface OrdersTabProps {
  storeId?: string;
}

export function OrdersTab({ storeId }: OrdersTabProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { orders, isLoading, error } = useOrders(storeId);

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter((o: ApiOrder) => o.status === statusFilter);

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
        <p className="text-sm">Failed to load orders.</p>
      </div>
    );
  }

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
        {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as OrderStatus)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
              statusFilter === status ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Icon icon={config.icon} className="w-3.5 h-3.5" />
            {config.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-40 text-zinc-500">
          <p className="text-sm">No {statusFilter !== 'all' ? ORDER_STATUS_CONFIG[statusFilter as OrderStatus]?.label.toLowerCase() : ''} orders yet.</p>
        </div>
      )}

      {/* Orders Table */}
      {filteredOrders.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Order</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrder === order.id;
                  const config = ORDER_STATUS_CONFIG[order.status];
                  const totalEur = (order.totalAmount / 100).toFixed(2);
                  const shortId = order.id.slice(0, 8).toUpperCase();
                  const date = new Date(order.createdAt).toLocaleDateString('en-IE');
                  const customerDisplay = order.customerName ?? order.customerEmail;

                  return (
                    <Fragment key={order.id}>
                      <tr
                        className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-white">#{shortId}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm text-white">{customerDisplay}</p>
                            {order.customerName && (
                              <p className="text-xs text-zinc-500">{order.customerEmail}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-white">€{totalEur}</span>
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
                          <span className="text-sm text-zinc-400">{date}</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-zinc-800/20">
                          <td colSpan={5} className="py-4 px-4">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-xs font-medium text-zinc-500 mb-2">Order Details</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-zinc-400">Order ID</span>
                                      <span className="text-zinc-300 font-mono text-xs">{order.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-400">Customer</span>
                                      <span className="text-zinc-300">{order.customerEmail}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-400">Total</span>
                                      <span className="text-white font-medium">€{totalEur}</span>
                                    </div>
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
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                          ['in_production', 'shipped', 'delivered'].includes(order.status)
                                            ? 'bg-green-500/10'
                                            : 'bg-zinc-700'
                                        }`}>
                                          <Icon icon="lucide:check" className={`w-3 h-3 ${
                                            ['in_production', 'shipped', 'delivered'].includes(order.status)
                                              ? 'text-green-400'
                                              : 'text-zinc-500'
                                          }`} />
                                        </div>
                                        <span className="text-sm text-zinc-300">Paid</span>
                                      </div>
                                    )}
                                    {(['in_production', 'shipped', 'delivered'] as const).includes(order.status as 'in_production' | 'shipped' | 'delivered') && (
                                      <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                          order.status !== 'in_production' ? 'bg-green-500/10' : 'bg-yellow-500/10'
                                        }`}>
                                          <Icon
                                            icon={order.status !== 'in_production' ? 'lucide:check' : 'lucide:printer'}
                                            className={`w-3 h-3 ${order.status !== 'in_production' ? 'text-green-400' : 'text-yellow-400'}`}
                                          />
                                        </div>
                                        <span className="text-sm text-zinc-300">
                                          {order.status === 'in_production' ? 'In Production' : 'Production Complete'}
                                        </span>
                                      </div>
                                    )}
                                    {(order.status === 'shipped' || order.status === 'delivered') && (
                                      <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                          order.status === 'delivered' ? 'bg-green-500/10' : 'bg-purple-500/10'
                                        }`}>
                                          <Icon icon="lucide:truck" className={`w-3 h-3 ${
                                            order.status === 'delivered' ? 'text-green-400' : 'text-purple-400'
                                          }`} />
                                        </div>
                                        <span className="text-sm text-zinc-300">
                                          {order.status === 'delivered' ? 'Delivered' : 'Shipped'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
