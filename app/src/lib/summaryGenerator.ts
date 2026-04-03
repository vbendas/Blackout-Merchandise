import type { PricingData } from '@/hooks/usePricing';
import type { DesignInstance, PrintArea } from '@/lib/StudioContext';

export interface DesignSummary {
  totalPlacements: number;
  activePlacements: number;
  emptyPlacements: PrintArea[];
  totalDesigns: number;
  designsByPlacement: Record<PrintArea, number>;
  estimatedColors: number;
  priceBreakdown: {
    base: number;
    placements: number;
    colors: number;
    total: number;
  } | null;
}

export function generateDesignSummary(
  availablePrintAreas: PrintArea[],
  designInstances: Partial<Record<PrintArea, DesignInstance[]>>,
  pricing: PricingData | null
): DesignSummary {
  const activePlacements = availablePrintAreas.filter((area) => {
    const designs = designInstances[area] || [];
    return designs.length > 0;
  });

  const emptyPlacements = availablePrintAreas.filter((area) => {
    const designs = designInstances[area] || [];
    return designs.length === 0;
  });

  const totalDesigns = Object.values(designInstances).flat().length;

  const designsByPlacement = availablePrintAreas.reduce(
    (acc, area) => {
      acc[area] = (designInstances[area] || []).length;
      return acc;
    },
    {} as Record<PrintArea, number>
  );

  // Estimate colors (rough calculation)
  const estimatedColors = Math.min(8, Math.max(1, totalDesigns));

  const priceBreakdown = pricing
    ? {
        base: pricing.basePrice,
        placements: activePlacements.length * pricing.placementPrice,
        colors: estimatedColors * pricing.colorPrice,
        total:
          pricing.basePrice + activePlacements.length * pricing.placementPrice + estimatedColors * pricing.colorPrice,
      }
    : null;

  return {
    totalPlacements: availablePrintAreas.length,
    activePlacements: activePlacements.length,
    emptyPlacements,
    totalDesigns,
    designsByPlacement,
    estimatedColors,
    priceBreakdown,
  };
}

export function formatSummaryForChat(summary: DesignSummary, productName?: string): string {
  const lines: string[] = [];

  lines.push('📋 **Design Summary**');
  lines.push('');

  if (productName) {
    lines.push(`**Product:** ${productName}`);
    lines.push('');
  }

  lines.push(`**Placements:** ${summary.activePlacements}/${summary.totalPlacements} active`);
  lines.push(`**Total Designs:** ${summary.totalDesigns}`);
  lines.push(`**Estimated Colors:** ${summary.estimatedColors} (for screen printing)`);
  lines.push('');

  lines.push('**Designs by Placement:**');
  Object.entries(summary.designsByPlacement).forEach(([area, count]) => {
    const icon = count > 0 ? '✅' : '⚪';
    const formattedArea = area.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    lines.push(`${icon} ${formattedArea}: ${count} design${count !== 1 ? 's' : ''}`);
  });

  if (summary.emptyPlacements.length > 0) {
    lines.push('');
    lines.push('⚠️ **Empty Placements:**');
    summary.emptyPlacements.forEach((area) => {
      const formattedArea = area.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      lines.push(`   • ${formattedArea}`);
    });
  }

  if (summary.priceBreakdown) {
    lines.push('');
    lines.push('**Price Breakdown:**');
    lines.push(`   Base: $${summary.priceBreakdown.base.toFixed(2)}`);
    lines.push(`   Placements: $${summary.priceBreakdown.placements.toFixed(2)}`);
    lines.push(`   Colors: $${summary.priceBreakdown.colors.toFixed(2)}`);
    lines.push(`   **Total: $${summary.priceBreakdown.total.toFixed(2)}**`);
  }

  return lines.join('\n');
}

export function formatPriceChangeMessage(previousPrice: number, newPrice: number): string {
  const diff = newPrice - previousPrice;
  const sign = diff > 0 ? '+' : '';
  return `💰 Price ${sign}$${diff.toFixed(2)} (now $${newPrice.toFixed(2)})`;
}
