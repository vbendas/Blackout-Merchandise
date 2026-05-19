import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
import { formatDbError } from '../lib/format-error';

interface OrderItem {
  id: string;
  variantSku: string | null;
  productName: string | null;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  unitCostEur: number;
  receivedQuantity: number;
  lineTotal: number;
}

interface SupplierOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  status: string;
  totalCostEur: number;
  notes: string | null;
  items: OrderItem[];
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['placed', 'cancelled'],
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped'],
  shipped: ['received'],
  received: [],
  cancelled: [],
};

export function SupplierOrderDetailScreen({ maxHeight }: { maxHeight: number }) {
  const setScreen = useAppStore((s) => s.setScreen);
  const setStatus = useAppStore((s) => s.setStatus);
  const screenParams = useAppStore((s) => s.screenParams);
  const orderId = screenParams.orderId;

  const [order, setOrder] = useState<SupplierOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError('');
    try {
      const { getSupplierOrderById } = await import('@db-root/supplier-orders');
      const result = await getSupplierOrderById(orderId);
      if (!result) {
        setError('Order not found');
        return;
      }
      setOrder(result);
    } catch (err) {
      setError(formatDbError(err, 'load supplier order'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    setSelectedRow(0);
  }, [order?.items]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setActionLoading(true);
    setActionResult(null);

    try {
      const { updateSupplierOrderStatus, receiveSupplierOrder, cancelSupplierOrder } = await import('@db-root/supplier-orders');

      if (newStatus === 'received') {
        await receiveSupplierOrder(order.id);
      } else if (newStatus === 'cancelled') {
        await cancelSupplierOrder(order.id);
      } else {
        await updateSupplierOrderStatus(order.id, newStatus);
      }

      setActionResult(`✓ Status changed to ${newStatus}`);
      setStatus(`PO ${order.poNumber}: ${newStatus}`);
      await loadOrder();
    } catch (err) {
      setActionResult(`✗ Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;
    if (loading || actionLoading) return;

    if (key.upArrow) setSelectedRow((r) => Math.max(0, r - 1));
    else if (key.downArrow) setSelectedRow((r) => Math.min((order?.items.length ?? 1) - 1, r + 1));
    else if (key.escape) setScreen('supplier-orders');
    else if (input === 'r') loadOrder();
    else if (input === 'n' && order) {
      const transitions = STATUS_TRANSITIONS[order.status] || [];
      if (transitions.length > 0) {
        handleStatusChange(transitions[0]);
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text><Text color="cyan"><Spinner type="dots" /></Text>{' Loading order...'}</Text>
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text color="red">✗ {error || 'Not found'}</Text>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    );
  }

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'gray', placed: 'yellow', confirmed: 'cyan', shipped: 'blue', received: 'green', cancelled: 'red',
    };
    return colors[status] ?? 'white';
  };

  const transitions = STATUS_TRANSITIONS[order.status] || [];

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">📋 Purchase Order</Text>
        <Text dimColor>{order.poNumber}</Text>
      </Box>

      {/* Order header */}
      <Box flexDirection="column" paddingLeft={1} marginBottom={1}>
        <Box>
          <Text>Supplier: <Text bold>{order.supplierName}</Text></Text>
        </Box>
        <Box>
          <Text>Status: <Text bold color={statusColor(order.status)}>{order.status.toUpperCase()}</Text></Text>
        </Box>
        <Box>
          <Text dimColor>Ordered: {new Date(order.orderDate).toLocaleDateString('en-GB')}</Text>
          {order.expectedDeliveryDate && (
            <Text dimColor> · ETA: {new Date(order.expectedDeliveryDate).toLocaleDateString('en-GB')}</Text>
          )}
        </Box>
        {order.notes && <Text dimColor>Notes: {order.notes}</Text>}
      </Box>

      {/* Items table */}
      <Box flexDirection="column" paddingLeft={1}>
        <Text bold color="cyan">Items:</Text>
        <Box marginTop={1}>
          <Text bold dimColor>  SKU              Product          Color/Size     Qty  Unit €    Line €</Text>
        </Box>
        <Text dimColor>  ──────────────── ──────────────── ──────────── ─── ──────── ────────</Text>
        {order.items.map((item, i) => {
          const isSelected = i === selectedRow;
          const received = item.receivedQuantity >= item.quantity;
          return (
            <Box key={item.id}>
              <Text color={isSelected ? 'green' : 'white'} bold={isSelected}>
                {isSelected ? '▸ ' : '  '}
                {(item.variantSku ?? '—').padEnd(16)}
                {' '}
                {(item.productName ?? '—').slice(0, 16).padEnd(16)}
                {' '}
                {`${item.colorName ?? '?'}/${item.sizeName ?? '?'}`.padEnd(12)}
                {' '}
                {String(item.quantity).padStart(3)}
                {' '}
                {`€${(item.unitCostEur / 100).toFixed(2)}`.padStart(8)}
                {' '}
                {`€${(item.lineTotal / 100).toFixed(2)}`.padStart(8)}
              </Text>
              {received && <Text color="green"> ✓</Text>}
            </Box>
          );
        })}
      </Box>

      {/* Total */}
      <Box marginTop={1} paddingLeft={1}>
        <Text bold>Total: €{(order.totalCostEur / 100).toFixed(2)}</Text>
      </Box>

      {/* Actions */}
      {transitions.length > 0 && (
        <Box marginTop={1} paddingLeft={1}>
          <Text color="yellow">N: {order.status} → {transitions[0]}</Text>
        </Box>
      )}

      {actionLoading && (
        <Box paddingLeft={1}>
          <Text><Text color="cyan"><Spinner type="dots" /></Text>{' Updating...'}</Text>
        </Box>
      )}

      {actionResult && (
        <Box paddingLeft={1}>
          <Text color={actionResult.startsWith('✓') ? 'green' : 'red'}>{actionResult}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>↑↓ Navigate · N: Next Status · R: Refresh · Esc: Back</Text>
      </Box>
    </Box>
  );
}
