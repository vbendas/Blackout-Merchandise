import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Table, type Column } from '../../components/table';
import { useAppStore } from '../../lib/store';
import { formatDbError } from '../../lib/format-error';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  brand: string;
  baseCostEur: number;
  suggestedRetailEur: number | null;
  status: string;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

type StatusFilter = 'all' | 'active' | 'archived' | 'discontinued';

const STATUS_OPTIONS: StatusFilter[] = ['all', 'active', 'archived', 'discontinued'];

export function CatalogListScreen({ maxHeight }: { maxHeight: number }) {
  const { stdout } = useStdout();
  const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)

  const setScreen = useAppStore((s) => s.setScreen);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRow, setSelectedRow] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const PAGE_SIZE = 20;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Use shared catalog functions via dynamic import
      const { searchProducts } = await import('@db-root/catalog');
      const result = await searchProducts(searchQuery, page, PAGE_SIZE, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
      });

      setProducts(result.data);
      setTotalItems(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(formatDbError(err, 'load products'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, searchQuery]);

  // Load categories for filter
  useEffect(() => {
    (async () => {
      try {
        const { getAllCategories } = await import('@db-root/catalog');
        const cats = await getAllCategories();
        setCategories(cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug })));
      } catch {
        // Categories are optional for filtering
      }
    })();
  }, []);

  // Load products on mount and filter changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset selected row when data changes
  useEffect(() => {
    setSelectedRow(0);
  }, [products]);

  // Find category name for a product
  const getCategoryName = useCallback((categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name ?? '—';
  }, [categories]);

  const focusMode = useAppStore((s) => s.focusMode);

  // Keyboard navigation
  useInput((input, key) => {
    // When sidebar is focused, skip arrow key handling
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) {
      return;
    }

    if (isSearching) {
      if (key.escape) {
        setIsSearching(false);
      } else if (key.return) {
        setIsSearching(false);
        setPage(1);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedRow((r) => Math.max(0, r - 1));
    } else if (key.downArrow) {
      setSelectedRow((r) => Math.min(products.length - 1, r + 1));
    } else if (key.leftArrow || input === 'p') {
      setPage((p) => Math.max(1, p - 1));
    } else if (key.rightArrow || input === 'n') {
      setPage((p) => Math.min(totalPages, p + 1));
    } else if (key.return && products[selectedRow]) {
      setScreen('catalog-detail', { productId: products[selectedRow].id });
    } else if (input === 'a') {
      setScreen('catalog-add');
    } else if (input === '/') {
      setIsSearching(true);
    } else if (input === 's') {
      const idx = STATUS_OPTIONS.indexOf(statusFilter);
      setStatusFilter(STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length]);
      setPage(1);
    } else if (input === 'c' && categories.length > 0) {
      if (categoryFilter === 'all') {
        setCategoryFilter(categories[0].id);
      } else {
        const idx = categories.findIndex((c) => c.id === categoryFilter);
        if (idx >= categories.length - 1) {
          setCategoryFilter('all');
        } else {
          setCategoryFilter(categories[idx + 1].id);
        }
      }
      setPage(1);
    } else if (input === 'r') {
      loadProducts();
    }
  });

  const columns: Column<ProductRow>[] = [
    { key: 'sku', label: 'SKU', width: 10, render: (p) => p.sku },
    { key: 'name', label: 'Name', width: 28, render: (p) => p.name },
    { key: 'category', label: 'Category', width: 14, render: (p) => getCategoryName(p.categoryId) },
    { key: 'brand', label: 'Brand', width: 16, render: (p) => p.brand },
    { key: 'baseCost', label: 'Base €', width: 9, render: (p) => (p.baseCostEur / 100).toFixed(2) },
    { key: 'retail', label: 'Retail €', width: 9, render: (p) => p.suggestedRetailEur ? (p.suggestedRetailEur / 100).toFixed(2) : '—' },
    { key: 'status', label: 'Status', width: 12, render: (p) => p.status },
  ];

  if (loading && products.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Loading products...'}
        </Text>
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
        <Text bold color="cyan">📦 Product Catalog</Text>
        <Text dimColor>
          Status: <Text bold>{statusFilter}</Text>
          {' · '}
          Category: <Text bold>{categoryFilter === 'all' ? 'All' : categories.find((c) => c.id === categoryFilter)?.name ?? '?'}</Text>
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
        data={products}
        selectedRow={selectedRow}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        availableWidth={contentWidth}
        footerRight="/ : Search · S: Status · C: Category · R: Refresh · Esc: Back"
        maxHeight={maxHeight - 4} // header(1) + search(1) + footer(2)
      />
    </Box>
  );
}
