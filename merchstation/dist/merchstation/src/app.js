import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { useAppStore } from './lib/store';
import { LoginScreen } from './screens/login';
import { Sidebar } from './components/sidebar';
import { StatusBar } from './components/status-bar';
import { CatalogListScreen } from './screens/catalog/list';
import { CatalogDetailScreen } from './screens/catalog/detail';
import { CatalogAddScreen } from './screens/catalog/add';
import { CatalogImagesScreen } from './screens/catalog/images';
import { CategoriesScreen } from './screens/categories';
import { ColorsScreen } from './screens/colors';
import { SizesScreen } from './screens/sizes';
import { SettingsPlaceholder } from './screens/settings';
import { StockScreen } from './screens/stock';
import { StockDetailScreen } from './screens/stock-detail';
import { SupplierOrdersScreen } from './screens/supplier-orders';
import { SupplierOrderDetailScreen } from './screens/supplier-order-detail';
import { SupplierOrderCreateScreen } from './screens/supplier-order-create';
import { OrdersScreen } from './screens/orders';
import { OrderDetailScreen } from './screens/order-detail';
const NAV_SCREENS = ['catalog', 'stock', 'supplier-orders', 'orders', 'categories', 'colors', 'sizes', 'settings'];
const VERSION = 'v0.2.0';
// Fixed rows: top border(1) + header(1) + status(1) + bottom border(1) = 4
const FIXED_ROWS = 4;
function MainContent({ maxHeight }) {
    const currentScreen = useAppStore((s) => s.currentScreen);
    switch (currentScreen) {
        case 'catalog':
            return _jsx(CatalogListScreen, { maxHeight: maxHeight });
        case 'catalog-detail':
            return _jsx(CatalogDetailScreen, { maxHeight: maxHeight });
        case 'catalog-add':
            return _jsx(CatalogAddScreen, { maxHeight: maxHeight });
        case 'catalog-images':
            return _jsx(CatalogImagesScreen, { maxHeight: maxHeight });
        case 'stock':
            return _jsx(StockScreen, { maxHeight: maxHeight });
        case 'stock-detail':
            return _jsx(StockDetailScreen, { maxHeight: maxHeight });
        case 'supplier-orders':
            return _jsx(SupplierOrdersScreen, { maxHeight: maxHeight });
        case 'supplier-order-detail':
            return _jsx(SupplierOrderDetailScreen, { maxHeight: maxHeight });
        case 'supplier-order-create':
            return _jsx(SupplierOrderCreateScreen, { maxHeight: maxHeight });
        case 'orders':
            return _jsx(OrdersScreen, { maxHeight: maxHeight });
        case 'order-detail':
            return _jsx(OrderDetailScreen, { maxHeight: maxHeight });
        case 'categories':
            return _jsx(CategoriesScreen, { maxHeight: maxHeight });
        case 'colors':
            return _jsx(ColorsScreen, { maxHeight: maxHeight });
        case 'sizes':
            return _jsx(SizesScreen, { maxHeight: maxHeight });
        case 'settings':
            return _jsx(SettingsPlaceholder, { maxHeight: maxHeight });
        default:
            return _jsx(CatalogListScreen, { maxHeight: maxHeight });
    }
}
function HeaderBar() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    return (_jsxs(Box, { justifyContent: "space-between", paddingX: 1, children: [_jsxs(Text, { children: [_jsx(Text, { bold: true, color: "cyan", children: "MerchStation" }), _jsxs(Text, { dimColor: true, children: [" ", VERSION] })] }), _jsx(Text, { dimColor: true, children: dateStr })] }));
}
function AuthenticatedApp() {
    const { exit } = useApp();
    const { stdout } = useStdout();
    const rows = stdout?.rows ?? 24;
    const cols = stdout?.columns ?? 80;
    const contentHeight = Math.max(10, rows - FIXED_ROWS); // at least 10 rows for content
    const currentScreen = useAppStore((s) => s.currentScreen);
    const setScreen = useAppStore((s) => s.setScreen);
    const sidebarFocusIndex = useAppStore((s) => s.sidebarFocusIndex);
    const setSidebarFocus = useAppStore((s) => s.setSidebarFocus);
    const logout = useAppStore((s) => s.logout);
    const SUB_SCREENS = ['catalog-detail', 'catalog-add', 'catalog-images', 'stock-detail', 'supplier-order-detail', 'supplier-order-create', 'order-detail'];
    useInput((input, key) => {
        const inSubScreen = SUB_SCREENS.includes(currentScreen);
        // Arrow keys for sidebar navigation (only on top-level screens)
        if (!inSubScreen) {
            if (key.upArrow) {
                setSidebarFocus((sidebarFocusIndex - 1 + NAV_SCREENS.length) % NAV_SCREENS.length);
                return;
            }
            if (key.downArrow) {
                setSidebarFocus((sidebarFocusIndex + 1) % NAV_SCREENS.length);
                return;
            }
            if (key.return) {
                setScreen(NAV_SCREENS[sidebarFocusIndex]);
                return;
            }
        }
        // Number keys for navigation (only on top-level screens)
        if (!inSubScreen && input >= '1' && input <= '5') {
            const idx = parseInt(input) - 1;
            if (idx < NAV_SCREENS.length) {
                setScreen(NAV_SCREENS[idx]);
                setSidebarFocus(idx);
            }
            return;
        }
        // Letter shortcuts for new sections (only on top-level screens)
        if (!inSubScreen) {
            if (input === 's' && !key.ctrl) {
                setScreen('stock');
                setSidebarFocus(1);
                return;
            }
            if (input === 'u') {
                setScreen('supplier-orders');
                setSidebarFocus(2);
                return;
            }
            if (input === 'o') {
                setScreen('orders');
                setSidebarFocus(3);
                return;
            }
        }
        // Escape: go back to catalog
        if (key.escape) {
            if (currentScreen !== 'catalog') {
                setScreen('catalog');
            }
            return;
        }
        // Ctrl+Q: quit
        if (input === 'q' && key.ctrl) {
            exit();
            return;
        }
        // Ctrl+L: logout
        if (input === 'l' && key.ctrl) {
            logout();
            return;
        }
    });
    return (_jsxs(Box, { flexDirection: "column", height: rows, width: cols, borderStyle: "double", borderColor: "gray", children: [_jsx(HeaderBar, {}), _jsxs(Box, { flexDirection: "row", height: contentHeight, children: [_jsx(Sidebar, { height: contentHeight }), _jsx(Box, { flexDirection: "column", borderStyle: "single", borderColor: "gray", borderLeft: false, height: contentHeight, overflow: "hidden", children: _jsx(Box, { flexDirection: "column", height: contentHeight - 2, paddingX: 1, paddingTop: 1, overflow: "hidden", children: _jsx(MainContent, { maxHeight: contentHeight - 2 }) }) })] }), _jsx(StatusBar, {})] }));
}
export function App() {
    const isAuthenticated = useAppStore((s) => s.isAuthenticated);
    if (!isAuthenticated) {
        return _jsx(LoginScreen, {});
    }
    return _jsx(AuthenticatedApp, {});
}
