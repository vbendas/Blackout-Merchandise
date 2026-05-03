/**
 * Shared order status configuration
 * Centralized to ensure consistency across the e-shop dashboard
 */

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface StatusConfig {
  label: string;
  color: string;
  icon: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    icon: 'lucide:clock',
  },
  paid: {
    label: 'Paid',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: 'lucide:credit-card',
  },
  in_production: {
    label: 'In Production',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    icon: 'lucide:printer',
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: 'lucide:truck',
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    icon: 'lucide:check-circle',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    icon: 'lucide:x-circle',
  },
};

/** Derived color map for simple usage */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => [status, config.color])
) as Record<OrderStatus, string>;

/** Derived label map for simple usage */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => [status, config.label])
) as Record<OrderStatus, string>;