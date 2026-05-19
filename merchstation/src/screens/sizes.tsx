import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
import { sanitizeText } from '../lib/sanitize';
import { formatDbError } from '../lib/format-error';

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

interface SizeRow {
  id: string;
  name: string;
  categoryId: string;
  displayOrder: number | null;
  measurements: Record<string, string> | null;
  isActive: boolean;
}

type Mode = 'list' | 'add-name' | 'add-category' | 'add-measurements';

function pad(str: string, len: number): string {
  const s = String(str);
  if (s.length >= len) return s.slice(0, len - 1) + '…';
  return s + ' '.repeat(len - s.length);
}

export function SizesScreen({ maxHeight }: { maxHeight: number }) {
  const { stdout } = useStdout();
  const contentWidth = (stdout?.columns ?? 100) - 26; // sidebar(22) + content border(2) + padding(2)
  const setStatus = useAppStore((s) => s.setStatus);

  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRow, setSelectedRow] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mode, setMode] = useState<Mode>('list');
  const [inputValue, setInputValue] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [pendingCategory, setPendingCategory] = useState('');

  const getCategoryName = useCallback((id: string) => {
    return categories.find((c) => c.id === id)?.name ?? '—';
  }, [categories]);

  const loadSizes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { db, sql } = await import('@db-root/index');
      const { sizes } = await import('@db-root/schema');
      const result = await db.select().from(sizes).orderBy(sql`${sizes.displayOrder} asc nulls last`);
      setSizes(result as SizeRow[]);
    } catch (err) {
      setError(formatDbError(err, 'load sizes'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { getAllCategories } = await import('@db-root/catalog');
      const cats = await getAllCategories();
      setCategories(cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug })));
      await loadSizes();
    } catch (err) {
      setError(formatDbError(err, 'load categories'));
      setLoading(false);
    }
  }, [loadSizes]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredSizes = categoryFilter === 'all'
    ? sizes
    : sizes.filter((s) => s.categoryId === categoryFilter);

  useEffect(() => {
    setSelectedRow(0);
  }, [filteredSizes.length]);

  const getMaxOrder = useCallback((catId: string) => {
    let max = 0;
    for (const s of sizes) {
      if (s.categoryId === catId && s.displayOrder != null && s.displayOrder > max) max = s.displayOrder;
    }
    return max + 1;
  }, [sizes]);

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;
    if (mode !== 'list') return;

    if (key.upArrow) {
      setSelectedRow((r) => Math.max(0, r - 1));
    } else if (key.downArrow) {
      setSelectedRow((r) => Math.min(filteredSizes.length - 1, r + 1));
    } else if (input === 'a') {
      setMode('add-name');
      setInputValue('');
    } else if (input === 'd' && filteredSizes[selectedRow]) {
      toggleActive(filteredSizes[selectedRow]);
    } else if (input === 'c' && categories.length > 0) {
      if (categoryFilter === 'all') {
        setCategoryFilter(categories[0].id);
      } else {
        const idx = categories.findIndex((c) => c.id === categoryFilter);
        if (idx >= categories.length - 1) {
          setCategoryFilter('all');
        } else {
          setCategoryFilter(categories[idx + 1].id);
        }
      }
    } else if (input === 'r') {
      loadAll();
    }
  });

  const toggleActive = async (item: SizeRow) => {
    try {
      const { db, eq } = await import('@db-root/index');
      const { sizes } = await import('@db-root/schema');
      await db.update(sizes).set({ isActive: !item.isActive }).where(eq(sizes.id, item.id));
      setStatus(`${item.isActive ? 'Deactivated' : 'Activated'}: ${item.name}`);
      await loadAll();
    } catch (err) {
      setError(formatDbError(err, 'toggle size'));
    }
  };

  const handleAddName = () => {
    if (!inputValue.trim()) return;
    setPendingName(inputValue.trim());
    setInputValue('');
    setMode('add-category');
  };

  const handleAddCategory = () => {
    const cat = categories[parseInt(inputValue) - 1];
    if (!cat) return;
    setPendingCategory(cat.id);
    setInputValue('');
    setMode('add-measurements');
  };

  const handleAddMeasurements = async () => {
    let measurements: Record<string, string> | null = null;
    if (inputValue.trim()) {
      try {
        const parsed = JSON.parse(inputValue);
        if (typeof parsed === 'object' && parsed !== null) {
          measurements = parsed;
        }
      } catch {
        setError('Invalid JSON. Use {"chest": "50cm"} format or leave empty.');
        return;
      }
    }
    try {
      const { db } = await import('@db-root/index');
      const { sizes } = await import('@db-root/schema');
      await db.insert(sizes).values({
        name: sanitizeText(pendingName),
        categoryId: pendingCategory,
        displayOrder: getMaxOrder(pendingCategory),
        measurements,
      } as any);
      setStatus(`Created size: ${pendingName}`);
      setMode('list');
      setInputValue('');
      setPendingName('');
      setPendingCategory('');
      await loadAll();
    } catch (err) {
      setError(formatDbError(err, 'create size'));
      setMode('list');
    }
  };

  const cancelForm = () => {
    setMode('list');
    setInputValue('');
    setPendingName('');
    setPendingCategory('');
  };

  if (loading && sizes.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text>
          <Text color="cyan"><Spinner type="dots" /></Text>
          {' Loading sizes...'}
        </Text>
      </Box>
    );
  }

  if (error && sizes.length === 0) {
    return (
      <Box flexDirection="column" height={maxHeight} paddingLeft={1}>
        <Text color="red">✗ {error}</Text>
        <Text dimColor>Press R to retry</Text>
      </Box>
    );
  }

  // Dynamic column widths: Measurements gets all remaining space
  const NAME_W = 8;
  const CAT_W = 16;
  const ORDER_W = 8;
  const STATUS_W = 8;
  const fixedTotal = NAME_W + CAT_W + ORDER_W + STATUS_W;
  const separatorChars = 4 * 3; // 4 separators " │ "
  const prefixChars = 2;
  const indicatorChars = 2;
  const MEAS_W = Math.max(20, contentWidth - fixedTotal - separatorChars - prefixChars - indicatorChars);

  const header = `  ${pad('Size', NAME_W)} │ ${pad('Category', CAT_W)} │ ${pad('Order', ORDER_W)} │ ${pad('Measurements', MEAS_W)} │ ${pad('Status', STATUS_W)}`;
  const separator = `  ${'─'.repeat(NAME_W)}─┼─${'─'.repeat(CAT_W)}─┼─${'─'.repeat(ORDER_W)}─┼─${'─'.repeat(MEAS_W)}─┼─${'─'.repeat(STATUS_W)}`;

  const rows = filteredSizes.map((item, idx) => {
    const isSel = idx === selectedRow;
    const measStr = item.measurements ? JSON.stringify(item.measurements) : '—';
    const row = `${pad(item.name, NAME_W)} │ ${pad(getCategoryName(item.categoryId), CAT_W)} │ ${pad(String(item.displayOrder ?? 0), ORDER_W)} │ ${pad(measStr, MEAS_W)} │ ${pad(item.isActive ? 'Active' : 'Inactive', STATUS_W)}`;
    return (
      <Text key={item.id} color={isSel ? 'green' : 'white'} bold={isSel}>
        {isSel ? '▸ ' : '  '}{row}
      </Text>
    );
  });

  const currentCat = categoryFilter === 'all' ? 'All' : getCategoryName(categoryFilter);

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">📏 Sizes</Text>
        <Text dimColor>
          Category: <Text bold>{currentCat}</Text>
          {` · ${filteredSizes.length} shown`}
        </Text>
      </Box>

      {mode === 'list' && (
        <>
          <Text bold color="cyan">{header}</Text>
          <Text dimColor>{separator}</Text>
          {rows.length > 0 ? rows : <Text dimColor>  No sizes found</Text>}
          <Text dimColor></Text>
          <Text dimColor>A: Add · D: Toggle active · C: Filter category · R: Refresh · Esc: Back</Text>
        </>
      )}

      {mode === 'add-name' && (
        <Box flexDirection="column">
          <Text bold color="cyan">Add Size — Name</Text>
          <Box>
            <Text>Name: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleAddName} placeholder="e.g. M, XL, 3XL" showCursor />
          </Box>
          <Text dimColor>Enter to continue · Esc to cancel</Text>
        </Box>
      )}

      {mode === 'add-category' && (
        <Box flexDirection="column">
          <Text bold color="cyan">Add Size — Select Category</Text>
          <Text dimColor>{`For size: ${pendingName}`}</Text>
          {categories.map((cat, idx) => (
            <Text key={cat.id}>{`  ${idx + 1}. ${cat.name} (${cat.slug})`}</Text>
          ))}
          <Box>
            <Text>Category #: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleAddCategory} placeholder="1" showCursor />
          </Box>
          <Text dimColor>Enter number to select · Esc to cancel</Text>
        </Box>
      )}

      {mode === 'add-measurements' && (
        <Box flexDirection="column">
          <Text bold color="cyan">Add Size — Measurements</Text>
          <Text dimColor>{`${pendingName} → ${getCategoryName(pendingCategory)}`}</Text>
          <Box>
            <Text>JSON: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleAddMeasurements} placeholder='{"chest":"50cm","length":"70cm"}' showCursor />
          </Box>
          <Text dimColor>Enter to create (empty = skip) · Esc to cancel</Text>
        </Box>
      )}

      {error && <Text color="red">✗ {error}</Text>}
    </Box>
  );
}
