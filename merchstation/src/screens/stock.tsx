import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Table, type Column } from '../components/table';
import { useAppStore } from '../lib/store';
import { formatDbError } from '../lib/format-error';

interface StockRow {
  productId: string;
  productSku: string;
  productName: string;
  categoryName: string | null;
  totalAvailable: number;
  totalReserved: number;
  totalOnOrder: number;
  variantCount: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

type StockFilter = 'all' | 'low' | 'out';

const FILTER_OPTIONS: StockFilter[] = ['all', 'low', 'out'];

export function StockScreen({ maxHeight }: { maxHeight: number }) {
  const { stdout } = useStdout();
  const contentWidth = (stdout?.columns ?? 100) - 26;

  const setScreen = useAppStore((s) => s.setScreen);
  const setStatus = useAppStore((s) => s.setStatus);

  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRow, setSelectedRow] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<StockFilter>('all');
  const [summary, setSummary] = useState({ totalOnOrder: 0, openOrders: 0 });

  const PAGE_SIZE = 20;

  const loadStock = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { getStockOverview, getOnOrderSummary } = await import('@db-root/inventory-ops');

      const filters: any = {};
      if (filter === 'low') filters.lowStockOnly = true;
      if (filter === 'out') filters.outOfStockOnly = true;
      if (searchQuery) filters.search = searchQuery;

      const result = await getStockOverview(page, PAGE_SIZE, filters);
      setStock(result.data);
      setTotalItems(result.total);
      setTotalPages(result.totalPages);

      const summaryData = await getOnOrderSummary();
      setSummary(summaryData);
    } catch (err) {
      setError(formatDbError(err, 'load stock'));
    } finally {
      setLoading(false);
    }
  }, [page, filter, searchQuery]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  useEffect(() => {
    setSelectedRow(0);
  }, [stock]);

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;

    if (isSearching) {
      if (key.escape) setIsSearching(false);
      else if (key.return) { setIsSearching(false); setPage(1); }
      return;
    }

    if (key.upArrow) setSelectedRow((r) => Math.max(0, r - 1));
    else if (key.downArrow) setSelectedRow((r) => Math.min(stock.length - 1, r + 1));
    else if (key.leftArrow || input === 'p') setPage((p) => Math.max(1, p - 1));
    else if (key.rightArrow || input === 'n') setPage((p) => Math.min(totalPages, p + 1));
    else if (key.return && stock[selectedRow]) {
      setScreen('stock-detail', { productId: stock[selectedRow].productId });
    } else if (input === '/') {
      setIsSearching(true);
    } else if (input === 'f') {
      const idx = FILTER_OPTIONS.indexOf(filter);
      setFilter(FILTER_OPTIONS[(idx + 1) % FILTER_OPTIONS.length]);
      setPage(1);
    } else if (input === 'r') {
      loadStock();
    }
  });

  const columns: Column<StockRow>[] = [
    { key: 'sku', label: 'SKU', width: 12, render: (r) => r.productSku },
    { key: 'name', label: 'Product', width: 28, render: (r) => r.productName },
    { key: 'category', label: 'Category', width: 12, render: (r) => r.categoryName ?? '—' },
    { key: 'variants', label: 'Vars', width: 6, render: (r) => String(r.variantCount) },
    { key: 'available', label: 'Avail', width: 7, render: (r) => {
      if (r.isOutOfStock) return `0 🔴`;
      if (r.isLowStock) return `${r.totalAvailable} 🟡`;
      return String(r.totalAvailable);
    }},
    { key: 'reserved', label: 'Resvd', width: 7, render: (r) => r.totalReserved > 0 ? String(r.totalReserved) : '—' },
    { key: 'onOrder', label: 'On Ord', width: 7, render: (r) => r.totalOnOrder > 0 ? `📦${r.totalOnOrder}` : '—' },
  ];

  const filterLabel = filter === 'all' ? 'All' : filter === 'low' ? 'Low Stock' : 'Out of Stock';

  if (loading && stock.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text><Text color="cyan"><Spinner type="dots" /></Text>{' Loading stock...'}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text color="red">✗ {error}</Text>
        <Text dimColor>Press R to retry</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">📊 Stock Control</Text>
        <Text dimColor>
          Filter: <Text bold>{filterLabel}</Text>
          {' · '}
          On Order: <Text bold color="yellow">{summary.totalOnOrder}</Text>
          {' · '}
          Open POs: <Text bold>{summary.openOrders}</Text>
        </Text>
      </Box>

      {isSearching && (
        <Box marginBottom={1}>
          <Text>Search: </Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={() => { setIsSearching(false); setPage(1); }}
            placeholder="name or SKU..."
            showCursor={true}
          />
        </Box>
      )}

      <Table
        columns={columns}
        data={stock}
        selectedRow={selectedRow}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        availableWidth={contentWidth}
        footerRight="/ : Search · F: Filter · R: Refresh · Esc: Back"
        maxHeight={maxHeight - 4}
      />
    </Box>
  );
}
