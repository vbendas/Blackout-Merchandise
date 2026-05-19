import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
import { formatDbError } from '../lib/format-error';

interface SizeRow {
  variantId: string;
  variantSku: string;
  sizeName: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityOnOrder: number;
  status: string;
  eta: string | null;
}

interface ColorGroup {
  colorId: string;
  colorName: string;
  colorHex: string | null;
  totalAvailable: number;
  totalReserved: number;
  totalOnOrder: number;
  sizes: SizeRow[];
}

interface StockDetail {
  product: { id: string; sku: string; name: string; categoryName: string | null };
  summary: { totalAvailable: number; totalReserved: number; totalOnOrder: number; variantCount: number };
  colorGroups: ColorGroup[];
}

export function StockDetailScreen({ maxHeight }: { maxHeight: number }) {
  const setScreen = useAppStore((s) => s.setScreen);
  const screenParams = useAppStore((s) => s.screenParams);
  const productId = screenParams.productId;

  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
  const [cursorPos, setCursorPos] = useState(0); // Position in flattened list

  const loadDetail = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const { getStockByProduct } = await import('@db-root/inventory-ops');
      const result = await getStockByProduct(productId);
      if (!result) {
        setError('Product not found');
        return;
      }
      setDetail(result);
      // Expand all colors by default
      setExpandedColors(new Set(result.colorGroups.map(g => g.colorId)));
    } catch (err) {
      setError(formatDbError(err, 'load stock detail'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Build flattened list of navigable items for cursor
  const flatItems: Array<{ type: 'color'; colorId: string } | { type: 'size'; colorId: string; sizeIdx: number }> = [];
  if (detail) {
    for (const group of detail.colorGroups) {
      flatItems.push({ type: 'color', colorId: group.colorId });
      if (expandedColors.has(group.colorId)) {
        for (let i = 0; i < group.sizes.length; i++) {
          flatItems.push({ type: 'size', colorId: group.colorId, sizeIdx: i });
        }
      }
    }
  }

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;
    if (loading) return;

    if (key.upArrow) {
      setCursorPos((p) => Math.max(0, p - 1));
    } else if (key.downArrow) {
      setCursorPos((p) => Math.min(flatItems.length - 1, p + 1));
    } else if (key.return) {
      const item = flatItems[cursorPos];
      if (item && item.type === 'color') {
        setExpandedColors((prev) => {
          const next = new Set(prev);
          if (next.has(item.colorId)) next.delete(item.colorId);
          else next.add(item.colorId);
          return next;
        });
      }
    } else if (input === 'e') {
      // Expand/collapse all
      if (expandedColors.size === detail?.colorGroups.length) {
        setExpandedColors(new Set());
      } else {
        setExpandedColors(new Set(detail?.colorGroups.map(g => g.colorId) ?? []));
      }
    } else if (key.escape) {
      setScreen('stock');
    } else if (input === 'r') {
      loadDetail();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text><Text color="cyan"><Spinner type="dots" /></Text>{' Loading stock detail...'}</Text>
      </Box>
    );
  }

  if (error || !detail) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text color="red">✗ {error || 'Not found'}</Text>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    );
  }

  const statusIcon = (avail: number, onOrder: number) => {
    if (avail === 0 && onOrder === 0) return '🔴';
    if (avail === 0 && onOrder > 0) return '🟡';
    if (avail <= 5) return '🟡';
    return '🟢';
  };

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">📦 Stock Detail</Text>
        <Text dimColor>{detail.product.sku}</Text>
      </Box>

      {/* Summary bar */}
      <Box marginBottom={1} paddingX={1} borderStyle="single" borderColor="gray">
        <Text>
          <Text bold>{detail.product.name}</Text>
          {' · '}
          <Text color="green">Avail: {detail.summary.totalAvailable}</Text>
          {' · '}
          <Text color="yellow">Reserved: {detail.summary.totalReserved}</Text>
          {' · '}
          <Text color="cyan">On Order: {detail.summary.totalOnOrder}</Text>
          {' · '}
          <Text dimColor>{detail.summary.variantCount} variants</Text>
        </Text>
      </Box>

      {/* Color groups */}
      <Box flexDirection="column" paddingLeft={1}>
        {detail.colorGroups.map((group) => {
          const isExpanded = expandedColors.has(group.colorId);
          const cursorOnColor = flatItems[cursorPos]?.type === 'color' && flatItems[cursorPos]?.colorId === group.colorId;

          return (
            <Box key={group.colorId} flexDirection="column">
              {/* Color header */}
              <Box>
                <Text bold={cursorOnColor} color={cursorOnColor ? 'green' : 'white'}>
                  {cursorOnColor ? '▸ ' : '  '}
                  {isExpanded ? '▼' : '▶'} {group.colorName}
                </Text>
                {group.colorHex && <Text dimColor> {group.colorHex}</Text>}
                <Text dimColor> ({group.totalAvailable} avail</Text>
                {group.totalOnOrder > 0 && <Text color="cyan">, {group.totalOnOrder} on order</Text>}
                <Text dimColor>)</Text>
              </Box>

              {/* Size rows */}
              {isExpanded && group.sizes.map((size, idx) => {
                const sizeFlatIdx = flatItems.findIndex(
                  (item) => item.type === 'size' && item.colorId === group.colorId && item.sizeIdx === idx
                );
                const cursorOnSize = sizeFlatIdx === cursorPos;

                return (
                  <Box key={size.variantId} paddingLeft={4}>
                    <Text bold={cursorOnSize} color={cursorOnSize ? 'green' : 'white'}>
                      {cursorOnSize ? '▸ ' : '  '}
                      {size.sizeName.padEnd(5)}
                    </Text>
                    <Text>
                      {' '}
                      {statusIcon(size.quantityAvailable, size.quantityOnOrder)}
                      {' '}
                      <Text dimColor>Avail:</Text>
                      <Text color={size.quantityAvailable === 0 ? 'red' : size.quantityAvailable <= 5 ? 'yellow' : 'green'}>
                        {' '}{size.quantityAvailable}
                      </Text>
                      {' '}
                      <Text dimColor>Resvd:</Text>
                      <Text> {size.quantityReserved}</Text>
                      {' '}
                      <Text dimColor>OnOrd:</Text>
                      <Text color="cyan"> {size.quantityOnOrder > 0 ? size.quantityOnOrder : '—'}</Text>
                      {size.eta && (
                        <Text dimColor> · ETA: {size.eta}</Text>
                      )}
                      {' '}
                      <Text dimColor>({size.variantSku})</Text>
                    </Text>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>↑↓ Navigate · Enter: Expand/Collapse · E: Toggle All · R: Refresh · Esc: Back</Text>
      </Box>
    </Box>
  );
}
