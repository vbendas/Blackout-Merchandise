import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Table, type Column } from '../components/table';
import { useAppStore } from '../lib/store';
import { formatDbError } from '../lib/format-error';

interface OrderRow {
  id: string;
  orderType: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  storeName: string | null;
  itemCount: number;
}

type TypeFilter = 'all' | 'individual' | 'bulk_quote' | 'wholesale';
type StatusFilter = 'all' | 'pending' | 'paid' | 'processing' | 'shipped' | 'fulfilled' | 'cancelled';

const TYPE_OPTIONS: TypeFilter[] = ['all', 'individual', 'bulk_quote', 'wholesale'];
const STATUS_OPTIONS: StatusFilter[] = ['all', 'pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled'];

export function OrdersScreen({ maxHeight }: { maxHeight: number }) {
  const { stdout } = useStdout();
  const contentWidth = (stdout?.columns ?? 100) - 26;

  const setScreen = useAppStore((s) => s.setScreen);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRow, setSelectedRow] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const PAGE_SIZE = 20;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { getAllOrders } = await import('@db-root/orders');
      const result = await getAllOrders(page, PAGE_SIZE, {
        orderType: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setOrders(result.data.map((d: any) => ({
        ...d,
        createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB') : '—',
        itemCount: Number(d.itemCount) || 0,
      })));
      setTotalItems(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(formatDbError(err, 'load orders'));
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setSelectedRow(0);
  }, [orders]);

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;

    if (isSearching) {
      if (key.escape) setIsSearching(false);
      else if (key.return) { setIsSearching(false); setPage(1); }
      return;
    }

    if (key.upArrow) setSelectedRow((r) => Math.max(0, r - 1));
    else if (key.downArrow) setSelectedRow((r) => Math.min(orders.length - 1, r + 1));
    else if (key.leftArrow || input === 'p') setPage((p) => Math.max(1, p - 1));
    else if (key.rightArrow || input === 'n') setPage((p) => Math.min(totalPages, p + 1));
    else if (key.return && orders[selectedRow]) {
      setScreen('order-detail', { orderId: orders[selectedRow].id });
    } else if (input === '/') {
      setIsSearching(true);
    } else if (input === 't') {
      const idx = TYPE_OPTIONS.indexOf(typeFilter);
      setTypeFilter(TYPE_OPTIONS[(idx + 1) % TYPE_OPTIONS.length]);
      setPage(1);
    } else if (input === 's') {
      const idx = STATUS_OPTIONS.indexOf(statusFilter);
      setStatusFilter(STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length]);
      setPage(1);
    } else if (input === 'r') {
      loadOrders();
    }
  });

  const typeLabel = (t: string) => {
    const labels: Record<string, string> = { individual: 'Individual', bulk_quote: 'Bulk Quote', wholesale: 'Wholesale' };
    return labels[t] ?? t;
  };

  const columns: Column<OrderRow>[] = [
    { key: 'id', label: 'Order ID', width: 10, render: (r) => r.id.slice(0, 8) },
    { key: 'customer', label: 'Customer', width: 18, render: (r) => (r.customerName ?? r.customerEmail ?? '?').slice(0, 18) },
    { key: 'store', label: 'Store', width: 16, render: (r) => (r.storeName ?? '?').slice(0, 16) },
    { key: 'type', label: 'Type', width: 12, render: (r) => typeLabel(r.orderType) },
    { key: 'status', label: 'Status', width: 12, render: (r) => r.status },
    { key: 'total', label: 'Total €', width: 10, render: (r) => `€${(r.totalAmount / 100).toFixed(2)}` },
    { key: 'date', label: 'Date', width: 10, render: (r) => r.createdAt },
  ];

  if (loading && orders.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text><Text color="cyan"><Spinner type="dots" /></Text>{' Loading orders...'}</Text>
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
        <Text bold color="cyan">🛒 Customer Orders</Text>
        <Text dimColor>
          Type: <Text bold>{typeLabel(typeFilter)}</Text>
          {' · '}
          Status: <Text bold>{statusFilter}</Text>
        </Text>
      </Box>

      {isSearching && (
        <Box marginBottom={1}>
          <Text>Search: </Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={() => { setIsSearching(false); setPage(1); }}
            placeholder="order ID, customer, store..."
            showCursor={true}
          />
        </Box>
      )}

      <Table
        columns={columns}
        data={orders}
        selectedRow={selectedRow}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        availableWidth={contentWidth}
        footerRight="/ : Search · T: Type · S: Status · R: Refresh · Esc: Back"
        maxHeight={maxHeight - 4}
      />
    </Box>
  );
}
