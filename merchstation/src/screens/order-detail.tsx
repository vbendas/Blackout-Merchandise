import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
import { formatDbError } from '../lib/format-error';

interface OrderItem {
  id: string;
  productId: string;
  productName: string | null;
  quantity: number;
  priceAtPurchase: number;
  lineTotal: number;
}

interface OrderDetail {
  id: string;
  orderType: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  customerName: string | null;
  customerEmail: string | null;
  storeName: string | null;
  shippingAddress: any;
  items: OrderItem[];
}

const STATUS_CYCLE = ['pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled'];

export function OrderDetailScreen({ maxHeight }: { maxHeight: number }) {
  const setScreen = useAppStore((s) => s.setScreen);
  const setStatus = useAppStore((s) => s.setStatus);
  const screenParams = useAppStore((s) => s.screenParams);
  const orderId = screenParams.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
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
      const { getOrderWithItems } = await import('@db-root/orders');
      const result = await getOrderWithItems(orderId);
      if (!result) {
        setError('Order not found');
        return;
      }
      setOrder(result);
    } catch (err) {
      setError(formatDbError(err, 'load order'));
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

  const handleStatusChange = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionResult(null);

    try {
      const { updateOrderStatus } = await import('@db-root/orders');
      const currentIdx = STATUS_CYCLE.indexOf(order.status);
      const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length] as 'pending' | 'paid' | 'processing' | 'shipped' | 'fulfilled' | 'cancelled';

      await updateOrderStatus(order.id, nextStatus);
      setActionResult(`✓ Status changed to ${nextStatus}`);
      setStatus(`Order ${order.id.slice(0, 8)}: ${nextStatus}`);
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
    else if (key.escape) setScreen('orders');
    else if (input === 's') handleStatusChange();
    else if (input === 'r') loadOrder();
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

  const typeLabel = (t: string) => {
    const labels: Record<string, string> = { individual: 'Individual', bulk_quote: 'Bulk Quote', wholesale: 'Wholesale' };
    return labels[t] ?? t;
  };

  const statusColor = (s: string) => {
    const colors: Record<string, string> = {
      pending: 'yellow', paid: 'cyan', processing: 'blue', shipped: 'magenta', fulfilled: 'green', cancelled: 'red',
    };
    return colors[s] ?? 'white';
  };

  const formatAddress = (addr: any) => {
    if (!addr) return '—';
    const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">🛒 Order Detail</Text>
        <Text dimColor>{order.id.slice(0, 8)}...</Text>
      </Box>

      {/* Order header */}
      <Box flexDirection="column" paddingLeft={1} marginBottom={1}>
        <Box>
          <Text>Customer: <Text bold>{order.customerName ?? order.customerEmail}</Text></Text>
        </Box>
        <Box>
          <Text>Store: <Text bold>{order.storeName}</Text></Text>
        </Box>
        <Box>
          <Text>Type: <Text bold color="cyan">{typeLabel(order.orderType)}</Text></Text>
          {'  '}
          <Text>Status: <Text bold color={statusColor(order.status)}>{order.status.toUpperCase()}</Text></Text>
        </Box>
        <Box>
          <Text dimColor>Date: {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </Box>
        <Box>
          <Text dimColor>Shipping: {formatAddress(order.shippingAddress)}</Text>
        </Box>
      </Box>

      {/* Items */}
      <Box flexDirection="column" paddingLeft={1}>
        <Text bold color="cyan">Items:</Text>
        <Box marginTop={1}>
          <Text bold dimColor>  Product                          Qty   Price     Line</Text>
        </Box>
        <Text dimColor>  ──────────────────────────────── ─── ──────── ────────</Text>
        {order.items.map((item, i) => {
          const isSelected = i === selectedRow;
          return (
            <Box key={item.id}>
              <Text color={isSelected ? 'green' : 'white'} bold={isSelected}>
                {isSelected ? '▸ ' : '  '}
                {(item.productName ?? '—').slice(0, 30).padEnd(32)}
                {' '}
                {String(item.quantity).padStart(3)}
                {' '}
                {`€${(item.priceAtPurchase / 100).toFixed(2)}`.padStart(8)}
                {' '}
                {`€${(item.lineTotal / 100).toFixed(2)}`.padStart(8)}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Total */}
      <Box marginTop={1} paddingLeft={1}>
        <Text bold>Total: €{(order.totalAmount / 100).toFixed(2)}</Text>
      </Box>

      {actionLoading && (
        <Box paddingLeft={1}>
          <Text><Text color="cyan"><Spinner type="dots" /></Text>{' Updating status...'}</Text>
        </Box>
      )}

      {actionResult && (
        <Box paddingLeft={1}>
          <Text color={actionResult.startsWith('✓') ? 'green' : 'red'}>{actionResult}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>↑↓ Navigate · S: Cycle Status · R: Refresh · Esc: Back</Text>
      </Box>
    </Box>
  );
}
