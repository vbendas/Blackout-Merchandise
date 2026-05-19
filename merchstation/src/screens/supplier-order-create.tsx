import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppStore } from '../lib/store';
import { formatDbError } from '../lib/format-error';

interface OrderItem {
  variantId: string;
  variantSku: string;
  productName: string;
  colorName: string;
  sizeName: string;
  quantity: number;
  unitCostEur: number;
}

type Step = 'supplier' | 'add-items' | 'review' | 'submitting';

export function SupplierOrderCreateScreen({ maxHeight }: { maxHeight: number }) {
  const setScreen = useAppStore((s) => s.setScreen);
  const setStatus = useAppStore((s) => s.setStatus);

  const [step, setStep] = useState<Step>('supplier');
  const [supplierName, setSupplierName] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);

  // Item selection state
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedProductIdx, setSelectedProductIdx] = useState(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemUnitCost, setItemUnitCost] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [showVariantList, setShowVariantList] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load products for item selection
  useEffect(() => {
    (async () => {
      try {
        const { getAllCatalogProducts } = await import('@db-root/catalog');
        const prods = await getAllCatalogProducts();
        setProducts(prods);
      } catch {
        // Ignore
      }
    })();
  }, []);

  // Load variants when product selected
  useEffect(() => {
    if (!products[selectedProductIdx]) return;
    (async () => {
      try {
        const { getVariantsByProduct } = await import('@db-root/catalog');
        const vars = await getVariantsByProduct(products[selectedProductIdx].id);
        setVariants(vars);
        setSelectedVariantIdx(0);
      } catch {
        setVariants([]);
      }
    })();
  }, [products, selectedProductIdx]);

  const addItem = () => {
    const variant = variants[selectedVariantIdx];
    if (!variant) return;
    const qty = parseInt(itemQuantity);
    const cost = parseFloat(itemUnitCost);
    if (!qty || qty <= 0 || !cost || cost <= 0) return;

    setItems((prev) => [
      ...prev,
      {
        variantId: variant.id,
        variantSku: variant.sku,
        productName: products[selectedProductIdx].name,
        colorName: variant.color?.name ?? '?',
        sizeName: variant.size?.name ?? '?',
        quantity: qty,
        unitCostEur: cost,
      },
    ]);
    setItemQuantity('');
    setItemUnitCost('');
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCostEur, 0);

  const handleSubmit = async () => {
    if (items.length === 0 || !supplierName) return;
    setStep('submitting');
    setError('');

    try {
      const { createSupplierOrder } = await import('@db-root/supplier-orders');

      const deliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined;

      await createSupplierOrder({
        supplierName,
        expectedDeliveryDate: deliveryDate,
        notes: notes || undefined,
        items: items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitCostEur: Math.round(item.unitCostEur * 100), // Convert to cents
        })),
      });

      setSuccess('✓ Purchase order created successfully!');
      setStatus(`PO created: ${supplierName}, ${items.length} items`);

      setTimeout(() => {
        setScreen('supplier-orders');
      }, 1500);
    } catch (err) {
      setError(`✗ ${formatDbError(err, 'create purchase order')}`);
      setStep('review');
    }
  };

  const focusMode = useAppStore((s) => s.focusMode);

  useInput((input, key) => {
    if (focusMode === 'sidebar' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) return;
    if (step === 'submitting') return;

    if (key.escape) {
      setScreen('supplier-orders');
      return;
    }

    if (step === 'supplier') {
      if (key.return && supplierName.trim()) {
        setStep('add-items');
      }
      return;
    }

    if (step === 'add-items') {
      if (input === 'a' && itemQuantity && itemUnitCost) {
        addItem();
        return;
      }
      if (input === 'n' && items.length > 0) {
        setStep('review');
        return;
      }
      if (key.upArrow) {
        if (showProductList) setSelectedProductIdx((i) => Math.max(0, i - 1));
        else if (showVariantList) setSelectedVariantIdx((i) => Math.max(0, i - 1));
      }
      if (key.downArrow) {
        if (showProductList) setSelectedProductIdx((i) => Math.min(products.length - 1, i + 1));
        else if (showVariantList) setSelectedVariantIdx((i) => Math.min(variants.length - 1, i + 1));
      }
      if (key.return) {
        if (showProductList && products[selectedProductIdx]) {
          setShowProductList(false);
        } else if (showVariantList && variants[selectedVariantIdx]) {
          setShowVariantList(false);
        }
      }
      if (input === 'p') setShowProductList((v) => !v);
      if (input === 'v') setShowVariantList((v) => !v);
      return;
    }

    if (step === 'review') {
      if (input === 's') {
        handleSubmit();
        return;
      }
      if (input === 'b') {
        setStep('add-items');
        return;
      }
      // Remove item with number keys
      if (input >= '1' && input <= '9') {
        const idx = parseInt(input) - 1;
        if (idx < items.length) removeItem(idx);
      }
    }
  });

  return (
    <Box flexDirection="column" height={maxHeight}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">📦 Create Purchase Order</Text>
        <Text dimColor>
          Step: {step === 'supplier' ? '1/3' : step === 'add-items' ? '2/3' : '3/3'}
        </Text>
      </Box>

      {step === 'supplier' && (
        <Box flexDirection="column" paddingLeft={1}>
          <Box marginBottom={1}>
            <Text>Supplier Name: </Text>
            <TextInput
              value={supplierName}
              onChange={setSupplierName}
              onSubmit={() => { if (supplierName.trim()) setStep('add-items'); }}
              placeholder="e.g. Stanley Stella"
              showCursor={true}
            />
          </Box>
          <Box marginBottom={1}>
            <Text>Expected Delivery (YYYY-MM-DD): </Text>
            <TextInput
              value={expectedDeliveryDate}
              onChange={setExpectedDeliveryDate}
              onSubmit={() => {}}
              placeholder="e.g. 2026-06-15"
              showCursor={true}
            />
          </Box>
          <Box marginBottom={1}>
            <Text>Notes: </Text>
            <TextInput
              value={notes}
              onChange={setNotes}
              onSubmit={() => {}}
              placeholder="Optional notes..."
              showCursor={true}
            />
          </Box>
          <Text dimColor>Enter: Continue · Esc: Cancel</Text>
        </Box>
      )}

      {step === 'add-items' && (
        <Box flexDirection="column" paddingLeft={1}>
          <Text bold color="cyan">Add Items ({items.length} added)</Text>

          {/* Product selector */}
          <Box marginTop={1} flexDirection="column">
            <Text>
              Product: <Text bold>{products[selectedProductIdx]?.name ?? '—'}</Text>
              <Text dimColor> (P: toggle list)</Text>
            </Text>
            {showProductList && (
              <Box flexDirection="column" paddingLeft={2} height={5}>
                {products.map((p, i) => (
                  <Text key={p.id} color={i === selectedProductIdx ? 'green' : 'white'} bold={i === selectedProductIdx}>
                    {i === selectedProductIdx ? '▸ ' : '  '}{p.sku} {p.name}
                  </Text>
                ))}
              </Box>
            )}
          </Box>

          {/* Variant selector */}
          <Box marginTop={1} flexDirection="column">
            <Text>
              Variant: <Text bold>{variants[selectedVariantIdx] ? `${variants[selectedVariantIdx].color?.name} / ${variants[selectedVariantIdx].size?.name}` : '—'}</Text>
              <Text dimColor> (V: toggle list)</Text>
            </Text>
            {showVariantList && (
              <Box flexDirection="column" paddingLeft={2} height={5}>
                {variants.map((v, i) => (
                  <Text key={v.id} color={i === selectedVariantIdx ? 'green' : 'white'} bold={i === selectedVariantIdx}>
                    {i === selectedVariantIdx ? '▸ ' : '  '}{v.sku} {v.color?.name} / {v.size?.name}
                  </Text>
                ))}
              </Box>
            )}
          </Box>

          {/* Quantity and cost */}
          <Box marginTop={1}>
            <Text>Qty: </Text>
            <TextInput
              value={itemQuantity}
              onChange={setItemQuantity}
              onSubmit={() => {}}
              placeholder="6"
              showCursor={true}
            />
            <Text>  Unit Cost €: </Text>
            <TextInput
              value={itemUnitCost}
              onChange={setItemUnitCost}
              onSubmit={() => {}}
              placeholder="4.50"
              showCursor={true}
            />
          </Box>

          <Text dimColor>A: Add Item · N: Next (review) · Esc: Cancel</Text>

          {/* Current items list */}
          {items.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color="yellow">Items to order:</Text>
              {items.map((item, i) => (
                <Text key={i} dimColor>
                  {i + 1}. {item.productName} - {item.colorName}/{item.sizeName} × {item.quantity} @ €{item.unitCostEur.toFixed(2)} = €{(item.quantity * item.unitCostEur).toFixed(2)}
                </Text>
              ))}
              <Text bold>Total: €{totalCost.toFixed(2)}</Text>
            </Box>
          )}
        </Box>
      )}

      {step === 'review' && (
        <Box flexDirection="column" paddingLeft={1}>
          <Text bold color="cyan">Review Order</Text>
          <Box marginTop={1}>
            <Text>Supplier: <Text bold>{supplierName}</Text></Text>
          </Box>
          {expectedDeliveryDate && (
            <Text>ETA: <Text bold>{expectedDeliveryDate}</Text></Text>
          )}
          {notes && <Text dimColor>Notes: {notes}</Text>}

          <Box flexDirection="column" marginTop={1}>
            <Text bold color="yellow">Items:</Text>
            {items.map((item, i) => (
              <Text key={i}>
                <Text dimColor>{i + 1}.</Text> {item.productName} - {item.colorName}/{item.sizeName}
                {' '}× {item.quantity} @ €{item.unitCostEur.toFixed(2)}
                {' '}= <Text bold>€{(item.quantity * item.unitCostEur).toFixed(2)}</Text>
              </Text>
            ))}
          </Box>

          <Box marginTop={1}>
            <Text bold>Total: €{totalCost.toFixed(2)}</Text>
          </Box>

          <Box marginTop={1}>
            <Text dimColor>S: Submit · B: Back · 1-9: Remove item · Esc: Cancel</Text>
          </Box>
        </Box>
      )}

      {step === 'submitting' && (
        <Box paddingLeft={1}>
          <Text><Text color="cyan"><Spinner type="dots" /></Text>{' Creating purchase order...'}</Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1} paddingLeft={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {success && (
        <Box marginTop={1} paddingLeft={1}>
          <Text color="green">{success}</Text>
        </Box>
      )}
    </Box>
  );
}
