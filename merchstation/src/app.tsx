import React, { useRef, useEffect, useState, memo } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import {
  useAppStore,
  type Screen,
  type FocusMode,
  NAV_ITEMS,
  buildFlatNavList,
} from './lib/store';
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

const VERSION = 'v0.3.1';

// Fixed rows: top border(1) + header(1) + status(1) + bottom border(1) = 4
const FIXED_ROWS = 4;

// ─── Screen rendering — memoized to prevent flicker ─────────────────────────

interface ScreenRendererProps {
  currentScreen: Screen;
  maxHeight: number;
}

const ScreenRenderer = memo(function ScreenRenderer({ currentScreen, maxHeight }: ScreenRendererProps) {
  switch (currentScreen) {
    case 'catalog':
      return <CatalogListScreen maxHeight={maxHeight} />;
    case 'catalog-detail':
      return <CatalogDetailScreen maxHeight={maxHeight} />;
    case 'catalog-add':
      return <CatalogAddScreen maxHeight={maxHeight} />;
    case 'catalog-images':
      return <CatalogImagesScreen maxHeight={maxHeight} />;
    case 'stock':
      return <StockScreen maxHeight={maxHeight} />;
    case 'stock-detail':
      return <StockDetailScreen maxHeight={maxHeight} />;
    case 'supplier-orders':
      return <SupplierOrdersScreen maxHeight={maxHeight} />;
    case 'supplier-order-detail':
      return <SupplierOrderDetailScreen maxHeight={maxHeight} />;
    case 'supplier-order-create':
      return <SupplierOrderCreateScreen maxHeight={maxHeight} />;
    case 'orders':
      return <OrdersScreen maxHeight={maxHeight} />;
    case 'order-detail':
      return <OrderDetailScreen maxHeight={maxHeight} />;
    case 'categories':
      return <CategoriesScreen maxHeight={maxHeight} />;
    case 'colors':
      return <ColorsScreen maxHeight={maxHeight} />;
    case 'sizes':
      return <SizesScreen maxHeight={maxHeight} />;
    case 'settings':
      return <SettingsPlaceholder maxHeight={maxHeight} />;
    default:
      return <CatalogListScreen maxHeight={maxHeight} />;
  }
});

// ─── Header bar — memoized ──────────────────────────────────────────────────

const HeaderBar = memo(function HeaderBar() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text>
        <Text bold color="cyan">MerchStation</Text>
        <Text dimColor> {VERSION}</Text>
      </Text>
      <Text dimColor>{dateStr}</Text>
    </Box>
  );
});

// ─── Authenticated App ──────────────────────────────────────────────────────

function AuthenticatedApp() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const cols = stdout?.columns ?? 80;
  const contentHeight = Math.max(10, rows - FIXED_ROWS);

  // Subscribe to individual store values to minimize re-renders
  const currentScreen = useAppStore((s) => s.currentScreen);
  const setScreen = useAppStore((s) => s.setScreen);
  const sidebarFocusIndex = useAppStore((s) => s.sidebarFocusIndex);
  const setSidebarFocus = useAppStore((s) => s.setSidebarFocus);
  const focusMode = useAppStore((s) => s.focusMode);
  const focusSidebar = useAppStore((s) => s.focusSidebar);
  const focusContent = useAppStore((s) => s.focusContent);
  const toggleGroup = useAppStore((s) => s.toggleGroup);
  const collapsedGroups = useAppStore((s) => s.collapsedGroups);
  const logout = useAppStore((s) => s.logout);

  useInput((input, key) => {
    // ─── Sidebar focused ──────────────────────────────────────────────
    if (focusMode === 'sidebar') {
      const entries = buildFlatNavList(collapsedGroups);

      if (key.upArrow) {
        setSidebarFocus((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSidebarFocus((i) => Math.min(entries.length - 1, i + 1));
        return;
      }
      if (key.rightArrow) {
        focusContent();
        return;
      }
      if (key.return) {
        const entry = entries[sidebarFocusIndex];
        if (!entry) return;
        if (entry.type === 'group') {
          toggleGroup(entry.groupKey);
        } else {
          setScreen(entry.key);
          focusContent();
        }
        return;
      }
      // Number keys always work
      if (input >= '1' && input <= '8') {
        const idx = parseInt(input) - 1;
        if (idx < NAV_ITEMS.length) {
          setScreen(NAV_ITEMS[idx].key);
          const newEntries = buildFlatNavList(collapsedGroups);
          const newIdx = newEntries.findIndex(
            (e) => e.type === 'item' && e.key === NAV_ITEMS[idx].key
          );
          if (newIdx >= 0) setSidebarFocus(newIdx);
          focusContent();
        }
        return;
      }
      // Escape: go to catalog
      if (key.escape) {
        if (currentScreen !== 'catalog') {
          setScreen('catalog');
          focusContent();
        }
        return;
      }
    }

    // ─── Content focused ──────────────────────────────────────────────
    if (focusMode === 'content') {
      if (key.leftArrow) {
        focusSidebar();
        return;
      }
      if (key.escape) {
        focusSidebar();
        return;
      }
      // Number keys always work
      if (input >= '1' && input <= '8') {
        const idx = parseInt(input) - 1;
        if (idx < NAV_ITEMS.length) {
          setScreen(NAV_ITEMS[idx].key);
          const newEntries = buildFlatNavList(collapsedGroups);
          const newIdx = newEntries.findIndex(
            (e) => e.type === 'item' && e.key === NAV_ITEMS[idx].key
          );
          if (newIdx >= 0) setSidebarFocus(newIdx);
        }
        return;
      }
    }

    // ─── Global shortcuts ─────────────────────────────────────────────
    if (input === 'q' && key.ctrl) {
      exit();
      return;
    }
    if (input === 'l' && key.ctrl) {
      logout();
      return;
    }
  });

  return (
    <Box flexDirection="column" height={rows} width={cols} borderStyle="double" borderColor="gray">
      <HeaderBar />
      <Box flexDirection="row" height={contentHeight}>
        <Sidebar height={contentHeight} focusMode={focusMode} />
        <Box flexDirection="column" borderStyle="single" borderColor="gray" borderLeft={false} height={contentHeight} overflow="hidden">
          <Box flexDirection="column" height={contentHeight - 2} paddingX={1} paddingTop={1} overflow="hidden">
            <ScreenRenderer currentScreen={currentScreen} maxHeight={contentHeight - 2} />
          </Box>
        </Box>
      </Box>
      <StatusBar />
    </Box>
  );
}

export function App() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AuthenticatedApp />;
}
