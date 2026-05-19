import React from 'react';
import { Box, Text, useStdout } from 'ink';

export interface Column<T> {
  key: string;
  label: string;
  width: number;
  render: (item: T) => string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  selectedRow: number;
  page: number;
  totalPages: number;
  totalItems: number;
  /** Available content width (auto-detected if not provided) */
  availableWidth?: number;
  /** Extra footer text shown on the right side (e.g. keyboard shortcuts) */
  footerRight?: string;
  /** Maximum height for the table area */
  maxHeight?: number;
}

export function Table<T>({ columns, data, selectedRow, page, totalPages, totalItems, availableWidth, footerRight, maxHeight }: TableProps<T>) {
  const { stdout } = useStdout();
  const terminalWidth = availableWidth ?? stdout?.columns ?? 100;

  // Calculate dynamic widths: find the "name" (or first text-heavy) column and give it remaining space
  const nameCol = columns.find((c) => c.key === 'name');
  // Fallback: if no 'name' column, use the first column with width >= 12 (text-heavy)
  const flexibleCol = nameCol ?? columns.find((c) => c.width >= 12);

  const fixedCols = columns.filter((c) => c !== flexibleCol);

  const fixedTotal = fixedCols.reduce((sum, c) => sum + c.width, 0);
  const separatorChars = (columns.length - 1) * 3; // " │ " between columns
  const prefixChars = 2; // "  " prefix
  const indicatorChars = 2; // "▸ " or "  "
  const flexibleWidth = flexibleCol
    ? Math.max(12, terminalWidth - fixedTotal - separatorChars - prefixChars - indicatorChars)
    : 0;

  // Resolve columns with dynamic width
  const resolvedColumns = columns.map((col) =>
    col === flexibleCol ? { ...col, width: flexibleWidth } : col
  );

  // Header
  const header = resolvedColumns.map((col) => pad(col.label, col.width)).join(' │ ');
  const separator = resolvedColumns.map((col) => '─'.repeat(col.width)).join('─┼─');

  const rows = data.map((item, idx) => {
    const isSelected = idx === selectedRow;
    const row = resolvedColumns.map((col) => {
      const val = col.render(item);
      return pad(val, col.width);
    }).join(' │ ');

    return (
      <Text key={idx} color={isSelected ? 'green' : 'white'} bold={isSelected}>
        {isSelected ? '▸ ' : '  '}{row}
      </Text>
    );
  });

  // Footer: left = pagination, right = shortcuts
  const pageInfo = `Page ${page}/${totalPages} · ${totalItems} items · ↑↓ Navigate · Enter: View · A: Add`;

  return (
    <Box flexDirection="column" width="100%" height={maxHeight}>
      <Text bold color="cyan">  {header}</Text>
      <Text dimColor>  {separator}</Text>
      {rows.length > 0 ? rows : <Text dimColor>  No data found</Text>}
      <Text dimColor></Text>
      <Box width="100%" justifyContent="space-between">
        <Text dimColor>{'  '}{pageInfo}</Text>
        {footerRight && <Text dimColor>{footerRight}</Text>}
      </Box>
    </Box>
  );
}

function pad(str: string, len: number): string {
  if (len <= 0) return '';
  if (str.length >= len) return str.slice(0, len - 1) + '…';
  return str + ' '.repeat(len - str.length);
}
