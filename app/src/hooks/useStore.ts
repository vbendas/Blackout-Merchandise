import useSWR from 'swr';

export interface StoreData {
  id: string;
  name: string;
  slug: string;
  artistId: string;
  bio: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  isPublished: boolean;
  createdAt: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch store');
  const data = await response.json();
  return data.store ?? null;
};

export function useStore() {
  const { data: store, error, isLoading, mutate } = useSWR<StoreData | null>('/api/stores', fetcher, {
    revalidateOnFocus: false,
  });

  return { store: store ?? null, isLoading, error, mutate };
}
