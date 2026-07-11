import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useAppStore } from '../../lib/store';
const STATUS_TRANSITIONS = {
    draft: ['placed', 'cancelled'],
    placed: ['confirmed', 'cancelled'],
    confirmed: ['shipped'],
    shipped: ['received'],
    received: [],
    cancelled: [],
};
export function SupplierOrderDetailScreen({ maxHeight }) {
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
            const { getSupplierOrderById } = await import('@db-root/supplier-orders');
            const result = await getSupplierOrderById(orderId);
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
    const handleStatusChange = async (newStatus) => {
        if (!order)
            return;
        setActionLoading(true);
        setActionResult(null);
        try {
            const { updateSupplierOrderStatus, receiveSupplierOrder, cancelSupplierOrder } = await import('@db-root/supplier-orders');
            if (newStatus === 'received') {
                await receiveSupplierOrder(order.id);
            }
            else if (newStatus === 'cancelled') {
                await cancelSupplierOrder(order.id);
            }
            else {
                await updateSupplierOrderStatus(order.id, newStatus);
            }
            setActionResult(`✓ Status changed to ${newStatus}`);
            setStatus(`PO ${order.poNumber}: ${newStatus}`);
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
            setScreen('supplier-orders');
        else if (input === 'r')
            loadOrder();
        else if (input === 'n' && order) {
            const transitions = STATUS_TRANSITIONS[order.status] || [];
            if (transitions.length > 0) {
                handleStatusChange(transitions[0]);
            }
        }
    });
    if (loading) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading order...'] }) }));
    }
    if (error || !order) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error || 'Not found'] }), _jsx(Text, { dimColor: true, children: "Press Esc to go back" })] }));
    }
    const statusColor = (status) => {
        const colors = {
            draft: 'gray', placed: 'yellow', confirmed: 'cyan', shipped: 'blue', received: 'green', cancelled: 'red',
        };
        return colors[status] ?? 'white';
    };
    const transitions = STATUS_TRANSITIONS[order.status] || [];
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCCB Purchase Order" }), _jsx(Text, { dimColor: true, children: order.poNumber })] }), _jsxs(Box, { flexDirection: "column", paddingLeft: 1, marginBottom: 1, children: [_jsx(Box, { children: _jsxs(Text, { children: ["Supplier: ", _jsx(Text, { bold: true, children: order.supplierName })] }) }), _jsx(Box, { children: _jsxs(Text, { children: ["Status: ", _jsx(Text, { bold: true, color: statusColor(order.status), children: order.status.toUpperCase() })] }) }), _jsxs(Box, { children: [_jsxs(Text, { dimColor: true, children: ["Ordered: ", new Date(order.orderDate).toLocaleDateString('en-GB')] }), order.expectedDeliveryDate && (_jsxs(Text, { dimColor: true, children: [" \u00B7 ETA: ", new Date(order.expectedDeliveryDate).toLocaleDateString('en-GB')] }))] }), order.notes && _jsxs(Text, { dimColor: true, children: ["Notes: ", order.notes] })] }), _jsxs(Box, { flexDirection: "column", paddingLeft: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "Items:" }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { bold: true, dimColor: true, children: "  SKU              Product          Color/Size     Qty  Unit \u20AC    Line \u20AC" }) }), _jsx(Text, { dimColor: true, children: "  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2500\u2500\u2500 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500" }), order.items.map((item, i) => {
                        const isSelected = i === selectedRow;
                        const received = item.receivedQuantity >= item.quantity;
                        return (_jsxs(Box, { children: [_jsxs(Text, { color: isSelected ? 'green' : 'white', bold: isSelected, children: [isSelected ? '▸ ' : '  ', (item.variantSku ?? '—').padEnd(16), ' ', (item.productName ?? '—').slice(0, 16).padEnd(16), ' ', `${item.colorName ?? '?'}/${item.sizeName ?? '?'}`.padEnd(12), ' ', String(item.quantity).padStart(3), ' ', `€${(item.unitCostEur / 100).toFixed(2)}`.padStart(8), ' ', `€${(item.lineTotal / 100).toFixed(2)}`.padStart(8)] }), received && _jsx(Text, { color: "green", children: " \u2713" })] }, item.id));
                    })] }), _jsx(Box, { marginTop: 1, paddingLeft: 1, children: _jsxs(Text, { bold: true, children: ["Total: \u20AC", (order.totalCostEur / 100).toFixed(2)] }) }), transitions.length > 0 && (_jsx(Box, { marginTop: 1, paddingLeft: 1, children: _jsxs(Text, { color: "yellow", children: ["N: ", order.status, " \u2192 ", transitions[0]] }) })), actionLoading && (_jsx(Box, { paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Updating...'] }) })), actionResult && (_jsx(Box, { paddingLeft: 1, children: _jsx(Text, { color: actionResult.startsWith('✓') ? 'green' : 'red', children: actionResult }) })), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "\u2191\u2193 Navigate \u00B7 N: Next Status \u00B7 R: Refresh \u00B7 Esc: Back" }) })] }));
}
