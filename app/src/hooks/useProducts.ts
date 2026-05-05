import useSWR from 'swr';

export interface ApiProduct {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  baseCost: number; // cents
  retailPrice: number; // cents
  mockupUrl: string;
  designFileUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch products');
  const data = await response.json();
  return data.products as ApiProduct[];
};

export function useProducts(storeId?: string | null) {
  const url = storeId ? `/api/products?storeId=${storeId}` : null;

  const {
    data: products,
    error,
    isLoading,
    mutate,
  } = useSWR<ApiProduct[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  const updateProduct = async (id: string, updates: Partial<Pick<ApiProduct, 'isActive' | 'retailPrice' | 'baseCost' | 'name' | 'description'>>) => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update product');
    await mutate();
    return response.json();
  };

  const deleteProduct = async (id: string) => {
    const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete product');
    await mutate();
  };

  return {
    products: products ?? [],
    isLoading,
    error,
    mutate,
    updateProduct,
    deleteProduct,
  };
}
