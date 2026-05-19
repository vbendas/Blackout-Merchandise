import { create } from 'zustand';
import type { MerchStationConfig } from '../lib/config';

export type Screen =
  | 'login'
  | 'setup'
  | 'catalog'
  | 'catalog-detail'
  | 'catalog-add'
  | 'catalog-images'
  | 'categories'
  | 'colors'
  | 'sizes'
  | 'settings'
  | 'stock'
  | 'stock-detail'
  | 'supplier-orders'
  | 'supplier-order-detail'
  | 'supplier-order-create'
  | 'orders'
  | 'order-detail';

// ─── Grouped Navigation Structure ───────────────────────────────────────────

export interface NavGroupDef {
  key: string;
  label: string;
  icon: string;
}

export interface NavItem {
  key: Screen;
  label: string;
  shortcut: string;
  group: string;
}

export const NAV_GROUPS: NavGroupDef[] = [
  { key: 'production', label: 'PRODUCTION', icon: '🏭' },
  { key: 'operations', label: 'OPERATIONS', icon: '🔧' },
  { key: 'sales', label: 'SALES', icon: '💰' },
  { key: 'reference', label: 'REFERENCE DATA', icon: '📋' },
  { key: 'configuration', label: 'CONFIGURATION', icon: '⚙️' },
];

export const NAV_ITEMS: NavItem[] = [
  { key: 'catalog', label: 'Catalog', shortcut: '1', group: 'production' },
  { key: 'stock', label: 'Stock', shortcut: '2', group: 'production' },
  { key: 'supplier-orders', label: 'Supplier Orders', shortcut: '3', group: 'operations' },
  { key: 'orders', label: 'Orders', shortcut: '4', group: 'sales' },
  { key: 'categories', label: 'Categories', shortcut: '5', group: 'reference' },
  { key: 'colors', label: 'Colors', shortcut: '6', group: 'reference' },
  { key: 'sizes', label: 'Sizes', shortcut: '7', group: 'reference' },
  { key: 'settings', label: 'Settings', shortcut: '8', group: 'configuration' },
];

/** Build a flat list of nav entries (group headers + items). */
export function buildFlatNavList(collapsedGroups: Set<string>): Array<
  | { type: 'group'; groupKey: string; label: string; icon: string; collapsed: boolean }
  | { type: 'item'; key: Screen; label: string; shortcut: string; groupKey: string }
> {
  const entries: Array<
    | { type: 'group'; groupKey: string; label: string; icon: string; collapsed: boolean }
    | { type: 'item'; key: Screen; label: string; shortcut: string; groupKey: string }
  > = [];
  for (const group of NAV_GROUPS) {
    const isCollapsed = collapsedGroups.has(group.key);
    entries.push({
      type: 'group',
      groupKey: group.key,
      label: group.label,
      icon: group.icon,
      collapsed: isCollapsed,
    });
    if (!isCollapsed) {
      for (const item of NAV_ITEMS) {
        if (item.group === group.key) {
          entries.push({
            type: 'item',
            key: item.key,
            label: item.label,
            shortcut: item.shortcut,
            groupKey: item.group,
          });
        }
      }
    }
  }
  return entries;
}

/** Get visible nav items, filtering out items from collapsed groups */
export function getVisibleItems(collapsedGroups: Set<string>): NavItem[] {
  return NAV_ITEMS.filter((item) => !collapsedGroups.has(item.group));
}

/** Get the group key for a given screen */
export function getGroupForItem(itemKey: Screen): string | null {
  const item = NAV_ITEMS.find((i) => i.key === itemKey);
  return item?.group ?? null;
}

/** Get the flat index of a screen key within visible items */
export function getVisibleIndex(screenKey: Screen, collapsedGroups: Set<string>): number {
  const visible = getVisibleItems(collapsedGroups);
  const idx = visible.findIndex((i) => i.key === screenKey);
  return idx >= 0 ? idx : 0;
}

// ─── App State ──────────────────────────────────────────────────────────────

export type FocusMode = 'sidebar' | 'content';

export interface AppState {
  // Auth
  isAuthenticated: boolean;
  config: MerchStationConfig | null;

  // Navigation
  currentScreen: Screen;
  screenParams: Record<string, string>;
  sidebarFocusIndex: number;

  // Focus mode
  focusMode: FocusMode;

  // Collapsed groups
  collapsedGroups: Set<string>;

  // Status
  statusMessage: string;
  dbConnected: boolean;

  // Actions
  setAuthenticated: (config: MerchStationConfig) => void;
  setScreen: (screen: Screen, params?: Record<string, string>) => void;
  setStatus: (message: string) => void;
  setDbConnected: (connected: boolean) => void;
  setSidebarFocus: (index: number | ((prev: number) => number)) => void;
  setFocusMode: (mode: FocusMode) => void;
  focusSidebar: () => void;
  focusContent: () => void;
  toggleGroup: (groupKey: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  config: null,
  currentScreen: 'login',
  screenParams: {},
  sidebarFocusIndex: 0,
  focusMode: 'sidebar',
  collapsedGroups: new Set<string>(),
  statusMessage: '',
  dbConnected: false,

  setAuthenticated: (config) =>
    set({ isAuthenticated: true, config, currentScreen: 'catalog', focusMode: 'content' }),

  setScreen: (screen, params = {}) =>
    set({ currentScreen: screen, screenParams: params }),

  setStatus: (message) => set({ statusMessage: message }),

  setDbConnected: (connected) => set({ dbConnected: connected }),

  setSidebarFocus: (index: number | ((prev: number) => number)) => {
    set((state) => ({
      sidebarFocusIndex: typeof index === 'function' ? index(state.sidebarFocusIndex) : index,
    }));
  },

  setFocusMode: (mode) => set({ focusMode: mode }),

  focusSidebar: () => set({ focusMode: 'sidebar' }),

  focusContent: () => set({ focusMode: 'content' }),

  toggleGroup: (groupKey: string) => {
    const { collapsedGroups, sidebarFocusIndex } = get();
    const next = new Set(collapsedGroups);
    if (next.has(groupKey)) {
      next.delete(groupKey);
    } else {
      next.add(groupKey);
    }

    // After toggling, ensure sidebarFocusIndex points to a visible item
    const visible = getVisibleItems(next);
    const clampedIndex = visible.length > 0 ? Math.min(sidebarFocusIndex, visible.length - 1) : 0;

    set({ collapsedGroups: next, sidebarFocusIndex: clampedIndex });
  },

  logout: () =>
    set({
      isAuthenticated: false,
      config: null,
      currentScreen: 'login',
      screenParams: {},
      sidebarFocusIndex: 0,
      focusMode: 'sidebar',
      collapsedGroups: new Set(),
      dbConnected: false,
    }),
}));
