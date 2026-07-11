import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
const STATUS_CYCLE = ['pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled'];
export function OrderDetailScreen({ maxHeight }) {
    const setScreen = useAppStore((s) => s.setScreen);
    const setStatus = useAppStore((s) => s.setStatus);
    const screenParams = useAppStore((s) => s.screenParams);
    const orderId = screenParams.orderId;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRow, setSelectedRow] = useState(0);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionResult, setActionResult] = useState(null);
    const loadOrder = useCallback(async () => {
        if (!orderId)
            return;
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load order');
        }
        finally {
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
        if (!order)
            return;
        setActionLoading(true);
        setActionResult(null);
        try {
            const { updateOrderStatus } = await import('@db-root/orders');
            const currentIdx = STATUS_CYCLE.indexOf(order.status);
            const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
            await updateOrderStatus(order.id, nextStatus);
            setActionResult(`✓ Status changed to ${nextStatus}`);
            setStatus(`Order ${order.id.slice(0, 8)}: ${nextStatus}`);
            await loadOrder();
        }
        catch (err) {
            setActionResult(`✗ Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        finally {
            setActionLoading(false);
        }
    };
    useInput((input, key) => {
        if (loading || actionLoading)
            return;
        if (key.upArrow)
            setSelectedRow((r) => Math.max(0, r - 1));
        else if (key.downArrow)
            setSelectedRow((r) => Math.min((order?.items.length ?? 1) - 1, r + 1));
        else if (key.escape)
            setScreen('orders');
        else if (input === 's')
            handleStatusChange();
        else if (input === 'r')
            loadOrder();
    });
    if (loading) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading order...'] }) }));
    }
    if (error || !order) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error || 'Not found'] }), _jsx(Text, { dimColor: true, children: "Press Esc to go back" })] }));
    }
    const typeLabel = (t) => {
        const labels = { individual: 'Individual', bulk_quote: 'Bulk Quote', wholesale: 'Wholesale' };
        return labels[t] ?? t;
    };
    const statusColor = (s) => {
        const colors = {
            pending: 'yellow', paid: 'cyan', processing: 'blue', shipped: 'magenta', fulfilled: 'green', cancelled: 'red',
        };
        return colors[s] ?? 'white';
    };
    const formatAddress = (addr) => {
        if (!addr)
            return '—';
        const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean);
        return parts.join(', ');
    };
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDED2 Order Detail" }), _jsxs(Text, { dimColor: true, children: [order.id.slice(0, 8), "..."] })] }), _jsxs(Box, { flexDirection: "column", paddingLeft: 1, marginBottom: 1, children: [_jsx(Box, { children: _jsxs(Text, { children: ["Customer: ", _jsx(Text, { bold: true, children: order.customerName ?? order.customerEmail })] }) }), _jsx(Box, { children: _jsxs(Text, { children: ["Store: ", _jsx(Text, { bold: true, children: order.storeName })] }) }), _jsxs(Box, { children: [_jsxs(Text, { children: ["Type: ", _jsx(Text, { bold: true, color: "cyan", children: typeLabel(order.orderType) })] }), '  ', _jsxs(Text, { children: ["Status: ", _jsx(Text, { bold: true, color: statusColor(order.status), children: order.status.toUpperCase() })] })] }), _jsx(Box, { children: _jsxs(Text, { dimColor: true, children: ["Date: ", new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })] }) }), _jsx(Box, { children: _jsxs(Text, { dimColor: true, children: ["Shipping: ", formatAddress(order.shippingAddress)] }) })] }), _jsxs(Box, { flexDirection: "column", paddingLeft: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Items:" }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { bold: true, dimColor: true, children: "  Product                          Qty   Price     Line" }) }), _jsx(Text, { dimColor: true, children: "  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2500\u2500\u2500 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500" }), order.items.map((item, i) => {
                        const isSelected = i === selectedRow;
                        return (_jsx(Box, { children: _jsxs(Text, { color: isSelected ? 'green' : 'white', bold: isSelected, children: [isSelected ? '▸ ' : '  ', item.productName.slice(0, 30).padEnd(32), ' ', String(item.quantity).padStart(3), ' ', `€${(item.priceAtPurchase / 100).toFixed(2)}`.padStart(8), ' ', `€${(item.lineTotal / 100).toFixed(2)}`.padStart(8)] }) }, item.id));
                    })] }), _jsx(Box, { marginTop: 1, paddingLeft: 1, children: _jsxs(Text, { bold: true, children: ["Total: \u20AC", (order.totalAmount / 100).toFixed(2)] }) }), actionLoading && (_jsx(Box, { paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Updating status...'] }) })), actionResult && (_jsx(Box, { paddingLeft: 1, children: _jsx(Text, { color: actionResult.startsWith('✓') ? 'green' : 'red', children: actionResult }) })), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u00B7 S: Cycle Status \u00B7 R: Refresh \u00B7 Esc: Back" }) })] }));
}
