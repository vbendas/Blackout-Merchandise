import useSWR from 'swr';

type DbOrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'fulfilled' | 'cancelled';
export type OrderStatus = 'pending' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'cancelled';

export interface ApiOrder {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string | null;
  status: OrderStatus;
  totalAmount: number; // cents
  shippingAddress: unknown;
  createdAt: string;
}

const STATUS_MAP: Record<DbOrderStatus, OrderStatus> = {
  pending: 'pending',
  paid: 'paid',
  processing: 'in_production',
  shipped: 'shipped',
  fulfilled: 'delivered',
  cancelled: 'cancelled',
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch orders');
  const data = await response.json();
  return (data.orders as (Omit<ApiOrder, 'status'> & { status: DbOrderStatus })[]).map((o) => ({
    ...o,
    status: STATUS_MAP[o.status],
  })) as ApiOrder[];
};

export function useOrders(storeId: string | null | undefined) {
  const url = storeId ? `/api/orders?storeId=${storeId}` : null;

  const {
    data: orders,
    error,
    isLoading,
    mutate,
  } = useSWR<ApiOrder[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    orders: orders ?? [],
    isLoading,
    error,
    mutate,
  };
}
