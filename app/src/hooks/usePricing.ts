import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

export interface PricingData {
  basePrice: number;
  placementPrice: number;
  colorPrice: number;
  maxPlacements: number;
  breakdown: {
    base: number;
    placements: number;
    colors: number;
    total: number;
  };
}

export interface DesignConfig {
  activePlacements: number;
  estimatedColors: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch pricing');
  }
  const data = await response.json();
  return data.data;
};

export function usePricing(productId: string | null) {
  const {
    data: pricing,
    error,
    isLoading,
  } = useSWR<PricingData>(productId ? `/api/pricing?productId=${productId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const calculatePrice = useCallback(
    (config: DesignConfig) => {
      if (!pricing) return null;

      return {
        base: pricing.basePrice,
        placements: config.activePlacements * pricing.placementPrice,
        colors: config.estimatedColors * pricing.colorPrice,
        total:
          pricing.basePrice +
          config.activePlacements * pricing.placementPrice +
          config.estimatedColors * pricing.colorPrice,
      };
    },
    [pricing]
  );

  const formatPriceChange = useCallback((previousPrice: number | null, newPrice: number | null): string | null => {
    if (previousPrice === null || newPrice === null) return null;
    const diff = newPrice - previousPrice;
    if (diff === 0) return null;

    const sign = diff > 0 ? '+' : '';
    return `Price ${sign}$${diff.toFixed(2)} (now $${newPrice.toFixed(2)})`;
  }, []);

  const currentPrice = useMemo(() => {
    if (!pricing) return null;
    return pricing.breakdown.total;
  }, [pricing]);

  return {
    pricing,
    isLoading,
    error,
    currentPrice,
    calculatePrice,
    formatPriceChange,
  };
}
