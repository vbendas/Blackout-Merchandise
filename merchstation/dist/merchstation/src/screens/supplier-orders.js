import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { Table } from '../../components/table';
import { useAppStore } from '../../lib/store';
const STATUS_OPTIONS = ['all', 'draft', 'placed', 'confirmed', 'shipped', 'received', 'cancelled'];
export function SupplierOrdersScreen({ maxHeight }) {
    const { stdout } = useStdout();
    const contentWidth = (stdout?.columns ?? 100) - 26;
    const setScreen = useAppStore((s) => s.setScreen);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedRow, setSelectedRow] = useState(0);
    const [statusFilter, setStatusFilter] = useState('all');
    const PAGE_SIZE = 20;
    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { getAllSupplierOrders } = await import('@db-root/supplier-orders');
            const result = await getAllSupplierOrders(page, PAGE_SIZE, {
                status: statusFilter === 'all' ? undefined : statusFilter,
            });
            setOrders(result.data.map((d) => ({
                ...d,
                orderDate: d.orderDate ? new Date(d.orderDate).toLocaleDateString('en-GB') : '—',
                expectedDeliveryDate: d.expectedDeliveryDate ? new Date(d.expectedDeliveryDate).toLocaleDateString('en-GB') : null,
                totalCostEur: d.totalCostEur ?? 0,
                itemCount: Number(d.itemCount) || 0,
            })));
            setTotalItems(result.total);
            setTotalPages(result.totalPages);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load supplier orders');
        }
        finally {
            setLoading(false);
        }
    }, [page, statusFilter]);
    useEffect(() => {
        loadOrders();
    }, [loadOrders]);
    useEffect(() => {
        setSelectedRow(0);
    }, [orders]);
    useInput((input, key) => {
        if (key.upArrow)
            setSelectedRow((r) => Math.max(0, r - 1));
        else if (key.downArrow)
            setSelectedRow((r) => Math.min(orders.length - 1, r + 1));
        else if (key.leftArrow || input === 'p')
            setPage((p) => Math.max(1, p - 1));
        else if (key.rightArrow || input === 'n')
            setPage((p) => Math.min(totalPages, p + 1));
        else if (key.return && orders[selectedRow]) {
            setScreen('supplier-order-detail', { orderId: orders[selectedRow].id });
        }
        else if (input === 'a') {
            setScreen('supplier-order-create');
        }
        else if (input === 's') {
            const idx = STATUS_OPTIONS.indexOf(statusFilter);
            setStatusFilter(STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length]);
            setPage(1);
        }
        else if (input === 'r') {
            loadOrders();
        }
    });
    const columns = [
        { key: 'po', label: 'PO#', width: 14, render: (r) => r.poNumber },
        { key: 'supplier', label: 'Supplier', width: 18, render: (r) => r.supplierName },
        { key: 'date', label: 'Ordered', width: 10, render: (r) => r.orderDate },
        { key: 'eta', label: 'ETA', width: 10, render: (r) => r.expectedDeliveryDate ?? '—' },
        { key: 'status', label: 'Status', width: 12, render: (r) => {
                const icons = {
                    draft: '📝', placed: '📤', confirmed: '✅', shipped: '🚚', received: '📦', cancelled: '❌',
                };
                return `${icons[r.status] ?? ''} ${r.status}`;
            } },
        { key: 'items', label: 'Items', width: 6, render: (r) => String(r.itemCount) },
        { key: 'total', label: 'Total €', width: 10, render: (r) => `€${(r.totalCostEur / 100).toFixed(2)}` },
    ];
    if (loading && orders.length === 0) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading supplier orders...'] }) }));
    }
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error] }), _jsx(Text, { dimColor: true, children: "Press R to retry" })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDCCB Supplier Orders" }), _jsxs(Text, { dimColor: true, children: ["Status: ", _jsx(Text, { bold: true, children: statusFilter })] })] }), _jsx(Table, { columns: columns, data: orders, selectedRow: selectedRow, page: page, totalPages: totalPages, totalItems: totalItems, availableWidth: contentWidth, footerRight: "A: Create \u00B7 S: Status \u00B7 R: Refresh \u00B7 Esc: Back", maxHeight: maxHeight - 3 })] }));
}
