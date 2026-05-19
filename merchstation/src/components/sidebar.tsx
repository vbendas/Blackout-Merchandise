import React, { memo } from 'react';
import { Box, Text } from 'ink';
import {
  useAppStore,
  type Screen,
  type FocusMode,
  NAV_GROUPS,
  NAV_ITEMS,
  getGroupForItem,
} from '../lib/store';

// ─── Flat navigation list (group headers + items) ───────────────────────────

type NavEntry =
  | { type: 'group'; groupKey: string; label: string; icon: string; collapsed: boolean }
  | { type: 'item'; key: Screen; label: string; shortcut: string; groupKey: string };

/**
 * Build a flat list of nav entries (group headers + items).
 * Items from collapsed groups are excluded; group headers always appear.
 */
function buildFlatNavList(collapsedGroups: Set<string>): NavEntry[] {
  const entries: NavEntry[] = [];
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

// ─── Sidebar Component ──────────────────────────────────────────────────────

interface SidebarProps {
  height: number;
  focusMode: FocusMode;
}

export const Sidebar = memo(function Sidebar({ height, focusMode }: SidebarProps) {
  const currentScreen = useAppStore((s) => s.currentScreen);
  const sidebarFocusIndex = useAppStore((s) => s.sidebarFocusIndex);
  const collapsedGroups = useAppStore((s) => s.collapsedGroups);
  const toggleGroup = useAppStore((s) => s.toggleGroup);

  const entries = buildFlatNavList(collapsedGroups);

  // Clamp focus index to valid range
  const safeIndex = entries.length > 0 ? Math.min(sidebarFocusIndex, entries.length - 1) : 0;

  // Determine which nav item's group is "active" (for highlighting)
  const activeGroupKey = getGroupForItem(currentScreen);

  // Map sub-screens to their parent nav item group
  const SUB_SCREEN_MAP: Record<string, Screen> = {
    'catalog-detail': 'catalog',
    'catalog-add': 'catalog',
    'catalog-images': 'catalog',
    'stock-detail': 'stock',
    'supplier-order-detail': 'supplier-orders',
    'supplier-order-create': 'supplier-orders',
    'order-detail': 'orders',
  };
  const effectiveScreen = (SUB_SCREEN_MAP[currentScreen] ?? currentScreen) as Screen;
  const effectiveGroupKey = getGroupForItem(effectiveScreen);

  const isSidebarFocused = focusMode === 'sidebar';
  const borderColor = isSidebarFocused ? 'cyan' : 'gray';

  return (
    <Box flexDirection="column" width={24} height={height} borderStyle="single" borderColor={borderColor}>
      {/* Section header */}
      <Box paddingX={1}>
        <Text bold color="cyan">NAVIGATION</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>────────────────</Text>
      </Box>

      {/* Nav entries — fill available space */}
      <Box flexDirection="column" flexGrow={1}>
        {entries.map((entry, idx) => {
          const isFocused = idx === safeIndex;

          if (entry.type === 'group') {
            // Group header row
            const arrow = entry.collapsed ? '▸' : '▾';
            const isActiveGroup = entry.groupKey === effectiveGroupKey;
            const color = isFocused
              ? 'yellow'
              : isActiveGroup
                ? 'green'
                : 'white';
            const bold = isFocused || isActiveGroup;

            return (
              <Box key={entry.groupKey} paddingX={1}>
                <Text color={color} bold={bold}>
                  {isFocused ? '▸ ' : '  '}
                  {entry.icon} {entry.label}
                </Text>
              </Box>
            );
          }

          // Nav item row
          const isActive = entry.key === effectiveScreen;
          const color = isActive ? 'green' : isFocused ? 'yellow' : 'white';
          const bold = isActive || isFocused;

          return (
            <Box key={entry.key} paddingX={1}>
              <Text color={color} bold={bold}>
                {isFocused ? '▸ ' : isActive ? '▸ ' : '  '}
                {'  '}{entry.label}
              </Text>
              <Text dimColor> {entry.shortcut}</Text>
            </Box>
          );
        })}
      </Box>

      <Box paddingX={1}>
        <Text dimColor>────────────────</Text>
      </Box>

      {/* Keyboard hints — pinned to bottom */}
      {isSidebarFocused ? (
        <>
          <Box paddingX={1}>
            <Text color="cyan">→ Content</Text>
          </Box>
          <Box paddingX={1}>
            <Text dimColor>Enter Open/Toggle</Text>
          </Box>
          <Box paddingX={1}>
            <Text dimColor>Esc Back</Text>
          </Box>
          <Box paddingX={1}>
            <Text dimColor>Ctrl+Q Quit</Text>
          </Box>
        </>
      ) : (
        <>
          <Box paddingX={1}>
            <Text dimColor>← Sidebar</Text>
          </Box>
          <Box paddingX={1}>
            <Text dimColor>1-8 Quick Switch</Text>
          </Box>
        </>
      )}
    </Box>
  );
});
