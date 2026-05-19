import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
import { sanitizeText } from '../lib/sanitize';

interface ColorRow {
  id: string;
  name: string;
  hexCode: string | null;
  displayOrder: number | null;
  isActive: boolean;
}

type Mode = 'list' | 'add-name' | 'add-hex';

function pad(str: string, len: number): string {
  const s = String(str);
  if (s.length >= len) return s.slice(0, len - 1) + '…';
  return s + ' '.repeat(len - s.length);
}

export function ColorsScreen({ maxHeight }: { maxHeight: number }) {
  const { stdout } = useStdout();
  const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)
  const setStatus = useAppStore((s) => s.setStatus);

  const [items, setItems] = useState<ColorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [inputValue, setInputValue] = useState('');
  const [pendingName, setPendingName] = useState('');

  const loadColors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { getAllColors } = await import('@db-root/catalog');
      const result = await getAllColors();
      setItems(result as ColorRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load colors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadColors();
  }, [loadColors]);

  useEffect(() => {
    setSelectedRow(0);
  }, [items]);

  const reload = useCallback(async () => {
    await loadColors();
  }, [loadColors]);

  const getMaxOrder = useCallback(() => {
    let max = 0;
    for (const item of items) {
      if (item.displayOrder != null && item.displayOrder > max) max = item.displayOrder;
    }
    return max + 1;
  }, [items]);

  useInput((input, key) => {
    if (mode !== 'list') return;

    if (key.upArrow) {
      setSelectedRow((r) => Math.max(0, r - 1));
    } else if (key.downArrow) {
      setSelectedRow((r) => Math.min(items.length - 1, r + 1));
    } else if (input === 'a') {
      setMode('add-name');
      setInputValue('');
    } else if (input === 'd' && items[selectedRow]) {
      toggleActive(items[selectedRow]);
    } else if (input === 'r') {
      reload();
    }
  });

  const toggleActive = async (item: ColorRow) => {
    try {
      const { db, eq } = await import('@db-root/index');
      const { colors } = await import('@db-root/schema');
      await db.update(colors).set({ isActive: !item.isActive }).where(eq(colors.id, item.id));
      setStatus(`${item.isActive ? 'Deactivated' : 'Activated'}: ${item.name}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleAddName = () => {
    if (!inputValue.trim()) return;
    setPendingName(inputValue.trim());
    setInputValue('#');
    setMode('add-hex');
  };

  const handleAddHex = async () => {
    const hexMatch = inputValue.match(/^#?([0-9a-fA-F]{6})$/);
    if (!hexMatch) {
      setError('Invalid hex code. Use #RRGGBB format.');
      return;
    }
    const hex = hexMatch[1].toUpperCase();
    try {
      const { db } = await import('@db-root/index');
      const { colors } = await import('@db-root/schema');
      await db.insert(colors).values({
        name: sanitizeText(pendingName),
        hexCode: `#${hex}`,
        displayOrder: getMaxOrder(),
      } as any);
      setStatus(`Created color: ${pendingName}`);
      setMode('list');
      setInputValue('');
      setPendingName('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
      setMode('list');
    }
  };

  const cancelForm = () => {
    setMode('list');
    setInputValue('');
    setPendingName('');
  };

  if (loading && items.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Loading colors...'}
        </Text>
      </Box>
    );
  }

  if (error && items.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text color="red">✗ {error}</Text>
        <Text dimColor>Press R to retry</Text>
      </Box>
    );
  }

  // Dynamic column widths: Name gets all remaining space
  const HEX_W = 10;
  const ORDER_W = 8;
  const STATUS_W = 8;
  const fixedTotal = HEX_W + ORDER_W + STATUS_W;
  const separatorChars = 3 * 3; // 3 separators " │ "
  const prefixChars = 2;
  const indicatorChars = 2;
  const NAME_W = Math.max(20, contentWidth - fixedTotal - separatorChars - prefixChars - indicatorChars);

  const header = `  ${pad('Name', NAME_W)} │ ${pad('Hex Code', HEX_W)} │ ${pad('Order', ORDER_W)} │ ${pad('Status', STATUS_W)}`;
  const separator = `  ${'─'.repeat(NAME_W)}─┼─${'─'.repeat(HEX_W)}─┼─${'─'.repeat(ORDER_W)}─┼─${'─'.repeat(STATUS_W)}`;

  const rows = items.map((item, idx) => {
    const isSel = idx === selectedRow;
    const row = `${pad(item.name, NAME_W)} │ ${pad(item.hexCode || '—', HEX_W)} │ ${pad(String(item.displayOrder ?? 0), ORDER_W)} │ ${pad(item.isActive ? 'Active' : 'Inactive', STATUS_W)}`;
    return (
      <Text key={item.id} color={isSel ? 'green' : 'white'} bold={isSel}>
        {isSel ? '▸ ' : '  '}{row}
      </Text>
    );
  });

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box marginBottom={1}>
        <Text bold color="cyan">🎨 Colors</Text>
        <Text dimColor>{` · ${items.length} total`}</Text>
      </Box>

      {mode === 'list' && (
        <>
          <Text bold color="cyan">{header}</Text>
          <Text dimColor>{separator}</Text>
          {rows.length > 0 ? rows : <Text dimColor>  No colors found</Text>}
          <Text dimColor></Text>
          <Text dimColor>A: Add · D: Toggle active · R: Refresh · Esc: Back</Text>
        </>
      )}

      {mode === 'add-name' && (
        <Box flexDirection="column">
          <Text bold color="cyan">Add Color — Name</Text>
          <Box>
            <Text>Name: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleAddName} placeholder="e.g. Navy" showCursor />
          </Box>
          <Text dimColor>Enter to continue · Esc to cancel</Text>
        </Box>
      )}

      {mode === 'add-hex' && (
        <Box flexDirection="column">
          <Text bold color="cyan">Add Color — Hex Code</Text>
          <Text dimColor>{`For: ${pendingName}`}</Text>
          <Box>
            <Text>Hex (#RRGGBB): </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleAddHex} placeholder="#000000" showCursor />
          </Box>
          <Text dimColor>Enter to create · Esc to cancel</Text>
        </Box>
      )}

      {error && <Text color="red">✗ {error}</Text>}
    </Box>
  );
}
