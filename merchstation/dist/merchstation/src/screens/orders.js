import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Table } from '../../components/table';
import { useAppStore } from '../../lib/store';
const TYPE_OPTIONS = ['all', 'individual', 'bulk_quote', 'wholesale'];
const STATUS_OPTIONS = ['all', 'pending', 'paid', 'processing', 'shipped', 'fulfilled', 'cancelled'];
export function OrdersScreen({ maxHeight }) {
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
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
            setOrders(result.data.map((d) => ({
                ...d,
                createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB') : '—',
                itemCount: Number(d.itemCount) || 0,
            })));
            setTotalItems(result.total);
            setTotalPages(result.totalPages);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load orders');
        }
        finally {
            setLoading(false);
        }
    }, [page, typeFilter, statusFilter, searchQuery]);
    useEffect(() => {
        loadOrders();
    }, [loadOrders]);
    useEffect(() => {
        setSelectedRow(0);
    }, [orders]);
    useInput((input, key) => {
        if (isSearching) {
            if (key.escape)
                setIsSearching(false);
            else if (key.return) {
                setIsSearching(false);
                setPage(1);
            }
            return;
        }
        if (key.upArrow)
            setSelectedRow((r) => Math.max(0, r - 1));
        else if (key.downArrow)
            setSelectedRow((r) => Math.min(orders.length - 1, r + 1));
        else if (key.leftArrow || input === 'p')
            setPage((p) => Math.max(1, p - 1));
        else if (key.rightArrow || input === 'n')
            setPage((p) => Math.min(totalPages, p + 1));
        else if (key.return && orders[selectedRow]) {
            setScreen('order-detail', { orderId: orders[selectedRow].id });
        }
        else if (input === '/') {
            setIsSearching(true);
        }
        else if (input === 't') {
            const idx = TYPE_OPTIONS.indexOf(typeFilter);
            setTypeFilter(TYPE_OPTIONS[(idx + 1) % TYPE_OPTIONS.length]);
            setPage(1);
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
    const typeLabel = (t) => {
        const labels = { individual: 'Individual', bulk_quote: 'Bulk Quote', wholesale: 'Wholesale' };
        return labels[t] ?? t;
    };
    const columns = [
        { key: 'id', label: 'Order ID', width: 10, render: (r) => r.id.slice(0, 8) },
        { key: 'customer', label: 'Customer', width: 18, render: (r) => (r.customerName ?? r.customerEmail ?? '?').slice(0, 18) },
        { key: 'store', label: 'Store', width: 16, render: (r) => (r.storeName ?? '?').slice(0, 16) },
        { key: 'type', label: 'Type', width: 12, render: (r) => typeLabel(r.orderType) },
        { key: 'status', label: 'Status', width: 12, render: (r) => r.status },
        { key: 'total', label: 'Total €', width: 10, render: (r) => `€${(r.totalAmount / 100).toFixed(2)}` },
        { key: 'date', label: 'Date', width: 10, render: (r) => r.createdAt },
    ];
    if (loading && orders.length === 0) {
        return (_jsx(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), ' Loading orders...'] }) }));
    }
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", height: maxHeight, paddingLeft: 1, children: [_jsxs(Text, { color: "red", children: ["\u2717 ", error] }), _jsx(Text, { dimColor: true, children: "Press R to retry" })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", height: maxHeight, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\uD83D\uDED2 Customer Orders" }), _jsxs(Text, { dimColor: true, children: ["Type: ", _jsx(Text, { bold: true, children: typeLabel(typeFilter) }), ' · ', "Status: ", _jsx(Text, { bold: true, children: statusFilter })] })] }), isSearching && (_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { children: "Search: " }), _jsx(TextInput, { value: searchQuery, onChange: setSearchQuery, onSubmit: () => { setIsSearching(false); setPage(1); }, placeholder: "order ID, customer, store...", showCursor: true })] })), _jsx(Table, { columns: columns, data: orders, selectedRow: selectedRow, page: page, totalPages: totalPages, totalItems: totalItems, availableWidth: contentWidth, footerRight: "/ : Search \u00B7 T: Type \u00B7 S: Status \u00B7 R: Refresh \u00B7 Esc: Back", maxHeight: maxHeight - 4 })] }));
}
