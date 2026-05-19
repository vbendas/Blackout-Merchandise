import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { Table, type Column } from '../components/table';
import { useAppStore } from '../lib/store';
import { formatDbError } from '../lib/format-error';

interface SupplierOrderRow {
  id: string;
  poNumber: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: string;
  totalCostEur: number;
  itemCount: number;
}

type StatusFilter = 'all' | 'draft' | 'placed' | 'confirmed' | 'shipped' | 'received' | 'cancelled';

const STATUS_OPTIONS: StatusFilter[] = ['all', 'draft', 'placed', 'confirmed', 'shipped', 'received', 'cancelled'];

export function SupplierOrdersScreen({ maxHeight }: { maxHeight: number }) {
  const { stdout } = useStdout();
  const contentWidth = (stdout?.columns ?? 100) - 26;

  const setScreen = useAppStore((s) => s.setScreen);

  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedRow, setSelectedRow] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const PAGE_SIZE = 20;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { getAllSupplierOrders } = await import('@db-root/supplier-orders');
      const result = await getAllSupplierOrders(page, PAGE_SIZE, {
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setOrders(result.data.map((d: any) => ({
        ...d,
        orderDate: d.orderDate ? new Date(d.orderDate).toLocaleDateString('en-GB') : '—',
        expectedDeliveryDate: d.expectedDeliveryDate ? new Date(d.expectedDeliveryDate).toLocaleDateString('en-GB') : null,
        totalCostEur: d.totalCostEur ?? 0,
        itemCount: Number(d.itemCount) || 0,
      })));
      setTotalItems(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(formatDbError(err, 'load supplier orders'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setSelectedRow(0);
  }, [orders]);

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;

    if (key.upArrow) setSelectedRow((r) => Math.max(0, r - 1));
    else if (key.downArrow) setSelectedRow((r) => Math.min(orders.length - 1, r + 1));
    else if (key.leftArrow || input === 'p') setPage((p) => Math.max(1, p - 1));
    else if (key.rightArrow || input === 'n') setPage((p) => Math.min(totalPages, p + 1));
    else if (key.return && orders[selectedRow]) {
      setScreen('supplier-order-detail', { orderId: orders[selectedRow].id });
    } else if (input === 'a') {
      setScreen('supplier-order-create');
    } else if (input === 's') {
      const idx = STATUS_OPTIONS.indexOf(statusFilter);
      setStatusFilter(STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length]);
      setPage(1);
    } else if (input === 'r') {
      loadOrders();
    }
  });

  const columns: Column<SupplierOrderRow>[] = [
    { key: 'po', label: 'PO#', width: 14, render: (r) => r.poNumber },
    { key: 'supplier', label: 'Supplier', width: 18, render: (r) => r.supplierName },
    { key: 'date', label: 'Ordered', width: 10, render: (r) => r.orderDate },
    { key: 'eta', label: 'ETA', width: 10, render: (r) => r.expectedDeliveryDate ?? '—' },
    { key: 'status', label: 'Status', width: 12, render: (r) => {
      const icons: Record<string, string> = {
        draft: '📝', placed: '📤', confirmed: '✅', shipped: '🚚', received: '📦', cancelled: '❌',
      };
      return `${icons[r.status] ?? ''} ${r.status}`;
    }},
    { key: 'items', label: 'Items', width: 6, render: (r) => String(r.itemCount) },
    { key: 'total', label: 'Total €', width: 10, render: (r) => `€${(r.totalCostEur / 100).toFixed(2)}` },
  ];

  if (loading && orders.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text><Text color="cyan"><Spinner type="dots" /></Text>{' Loading supplier orders...'}</Text>
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
        <Text bold color="cyan">📋 Supplier Orders</Text>
        <Text dimColor>Status: <Text bold>{statusFilter}</Text></Text>
      </Box>

      <Table
        columns={columns}
        data={orders}
        selectedRow={selectedRow}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        availableWidth={contentWidth}
        footerRight="A: Create · S: Status · R: Refresh · Esc: Back"
        maxHeight={maxHeight - 3}
      />
    </Box>
  );
}
