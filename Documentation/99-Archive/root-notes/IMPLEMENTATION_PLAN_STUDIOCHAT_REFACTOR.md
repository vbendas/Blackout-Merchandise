# StudioChat Refactor Implementation Plan

## Overview
Transform StudioChat from step-based workflow to context-aware conversational interface.

**Goal:** Remove visual steps (1-6), implement dynamic quick actions based on current context, integrate transformations, placement management, and real-time pricing.

**Estimated Time:** 2-3 hours
**Priority:** High
**Dependencies:** All transformation and pricing infrastructure is complete

---

## Task 1: Remove Step-Based Logic (30 min)

### 1.1 Delete Step Constants
**File:** `app/src/components/studio/StudioChat.tsx`

**Actions:**
- [ ] Delete `STEP_WELCOME` constant (lines ~47-73)
- [ ] Remove `currentStep` from component logic
- [ ] Remove step-based switch cases in `updateQuickActions`

### 1.2 Simplify State
**Actions:**
- [ ] Remove step-related state if any
- [ ] Keep only essential state: messages, quick actions, loading states

---

## Task 2: Add Context-Aware State Management (20 min)

### 2.1 Define Context Types
**File:** `app/src/components/studio/StudioChat.tsx`

**Add at top of component:**
```typescript
type QuickActionContext = 
  | 'default'           // No selection, general actions
  | 'design-selected'   // Design selected, edit options
  | 'transformations'   // Inside transformation menu
  | 'placement-empty'   // Empty placement warning
  | 'approval-summary'  // Pre-approval validation
  | 'processing';       // Print file generation

const [quickActionContext, setQuickActionContext] = useState<QuickActionContext>('default');
```

### 2.2 Add Required State
**Add after existing state:**
```typescript
const [showTransformationMenu, setShowTransformationMenu] = useState(false);
const [showTransformationPreview, setShowTransformationPreview] = useState(false);
const [pendingTransformation, setPendingTransformation] = useState<{ type: TransformationType; params?: Record<string, string | number> } | null>(null);
const [lastPrice, setLastPrice] = useState<number | null>(null);
```

---

## Task 3: Import Required Dependencies (10 min)

### 3.1 Add Imports
**File:** `app/src/components/studio/StudioChat.tsx`

**Add to imports section:**
```typescript
import { TransformationMenu } from './TransformationMenu';
import { TransformationPreview } from './TransformationPreview';
import { buildTransformedUrl } from '@/lib/cloudinary';
import { getTransformationResponse } from '@/lib/ai/franciscaResponses';
import { usePricing } from '@/hooks/usePricing';
import { generateDesignSummary, formatSummaryForChat, formatPriceChangeMessage } from '@/lib/summaryGenerator';
import type { TransformationType } from '@/types/transformations';
```

### 3.2 Extend useStudio Destructuring
**Find:** `const { ... } = useStudio();`

**Add:**
```typescript
const {
  // ... existing imports ...
  addTransformation,
  removeTransformation,
  undoTransformation,
  redoTransformation,
  clearTransformations,
  selectedDesign,
  setSelectedDesign,
  canRemovePlacement,
  removePrintArea,
  addPrintArea,
  availablePrintAreas,
} = useStudio();
```

### 3.3 Add Pricing Hook
**Add after useStudio:**
```typescript
const { pricing, currentPrice, calculatePrice, formatPriceChange } = usePricing(productId);
```

---

## Task 4: Create Context-Aware Action Generator (60 min)

### 4.1 Replace updateQuickActions Function
**File:** `app/src/components/studio/StudioChat.tsx`

**Replace entire function (~250 lines):**

```typescript
const generateQuickActions = useCallback((): QuickActionDef[] => {
  const actions: QuickActionDef[] = [];
  const designsOnArea = designInstances[activePrintArea] || [];
  const hasSelectedDesign = selectedDesign?.designIds.length > 0;
  const selectedDesignData = hasSelectedDesign 
    ? designsOnArea.find(d => d.id === selectedDesign.designIds[0])
    : null;
  const hasTransformations = selectedDesignData?.transformations?.length > 0;
  const totalDesigns = Object.values(designInstances).flat().length;

  switch (quickActionContext) {
    case 'default': {
      // No designs on this placement
      if (designsOnArea.length === 0) {
        actions.push(
          {
            id: 'upload-design',
            label: 'Upload Design',
            handler: () => onRequestUpload?.(),
            isPrimary: true,
          },
          {
            id: 'generate-design',
            label: 'Generate with AI',
            handler: () => {
              setAwaitingStyleSelection(true);
              addFranciscaMessage("Great! What style are you looking for?", 'thinking');
            },
          }
        );
        
        // Only show remove if not the last placement
        if (canRemovePlacement(activePrintArea)) {
          actions.push({
            id: 'remove-placement',
            label: 'Remove This Area',
            handler: () => handleRemovePlacement(),
          });
        }

        // Warning about empty placement
        if (availablePrintAreas.length > 1) {
          addFranciscaMessage(
            `The ${activePrintArea.replace('_', ' ')} is empty. Would you like to add a design here, remove this placement, or leave it blank?`,
            'thinking'
          );
        }
      }
      
      // Has designs but none selected
      else if (!hasSelectedDesign) {
        actions.push(
          {
            id: 'select-design',
            label: 'Select a Design to Edit',
            handler: () => {
              addFranciscaMessage('Click on any design to select it. You can then transform it, move it, or adjust its size.', 'neutral');
            },
          },
          {
            id: 'add-another',
            label: 'Add Another Design',
            handler: () => onRequestUpload?.(),
          }
        );
        
        if (canRemovePlacement(activePrintArea)) {
          actions.push({
            id: 'remove-placement',
            label: 'Remove This Area',
            handler: () => handleRemovePlacement(),
          });
        }
      }
      
      // Design selected - show edit options
      else {
        actions.push(
          {
            id: 'transform-design',
            label: 'Transform Image',
            handler: () => {
              setQuickActionContext('transformations');
              setShowTransformationMenu(true);
              addFranciscaMessage('What would you like to do with this design? Choose a category:', 'thinking');
            },
            isPrimary: true,
          },
          {
            id: 'adjust-position',
            label: 'Move/Resize',
            handler: () => {
              addFranciscaMessage('Drag the design to move it. Use the corner handles to resize. Press R to rotate 90°.', 'happy');
            },
          },
          {
            id: 'deselect',
            label: 'Back',
            handler: () => {
              setSelectedDesign(null);
              addFranciscaMessage('What would you like to do next?', 'neutral');
            },
          }
        );
      }

      // Always show approval if has any designs
      if (totalDesigns > 0) {
        actions.push({
          id: 'approve-design',
          label: 'Review & Approve',
          handler: () => handleApprovalRequest(),
          isPrimary: designsOnArea.length > 0 && !hasSelectedDesign,
        });
      }
      
      break;
    }

    case 'transformations': {
      actions.push(
        {
          id: 'apply-transformations',
          label: 'Apply & Continue',
          handler: () => {
            setShowTransformationMenu(false);
            setQuickActionContext('default');
            addFranciscaMessage('Transformations applied! Your design looks great. What next?', 'happy');
          },
          isPrimary: true,
        },
        {
          id: 'clear-transformations',
          label: 'Clear All Effects',
          handler: () => handleClearAllTransformations(),
          disabled: !hasTransformations,
        },
        {
          id: 'back-to-design',
          label: 'Back',
          handler: () => {
            setShowTransformationMenu(false);
            setQuickActionContext('default');
            addFranciscaMessage('No problem! What would you like to do with this design?', 'neutral');
          },
        }
      );
      break;
    }

    case 'approval-summary': {
      actions.push(
        {
          id: 'confirm-approval',
          label: 'Confirm & Process',
          handler: () => initiatePrintProcessing(),
          isPrimary: true,
        },
        {
          id: 'make-changes',
          label: 'Make Changes',
          handler: () => {
            setQuickActionContext('default');
            addFranciscaMessage('No problem! Take your time. Let me know what you want to adjust.', 'neutral');
          },
        }
      );
      break;
    }
  }

  return actions;
}, [quickActionContext, designInstances, activePrintArea, selectedDesign, availablePrintAreas, pricing]);
```

### 4.2 Update useEffect for Quick Actions
**Find:** Effect that calls `updateQuickActions`

**Replace with:**
```typescript
useEffect(() => {
  const actions = generateQuickActions();
  setQuickActions(actions);
}, [generateQuickActions]);
```

---

## Task 5: Add Handler Functions (40 min)

### 5.1 Add Francisca Message Helper
**Add after generateQuickActions:**

```typescript
const addFranciscaMessage = useCallback((content: string, expression: Expression = 'neutral') => {
  addMessage('assistant', content, expression, 'Francisca');
}, [addMessage]);

const addSystemMessage = useCallback((content: string) => {
  addMessage('system', content, 'neutral', 'system');
}, [addMessage]);
```

### 5.2 Add Placement Management Handlers

```typescript
const handleRemovePlacement = useCallback(() => {
  if (!canRemovePlacement(activePrintArea)) {
    addFranciscaMessage("I can't remove this placement - you need at least one!", 'confused');
    return;
  }
  
  removePrintArea(activePrintArea);
  addFranciscaMessage(`Removed the ${activePrintArea.replace('_', ' ')} placement.`, 'happy');
  
  // Price will update via effect
}, [activePrintArea, canRemovePlacement, removePrintArea, addFranciscaMessage]);
```

### 5.3 Add Transformation Handlers

```typescript
const handleTransformationSelect = useCallback((type: TransformationType) => {
  if (!selectedDesign?.designIds[0]) return;
  
  const needsParams = ['brightness', 'contrast', 'saturation'].includes(type);
  
  if (needsParams) {
    setPendingTransformation({ type, params: { value: 0 } });
  } else {
    setPendingTransformation({ type });
  }
  
  setShowTransformationPreview(true);
  
  const response = getTransformationResponse(type);
  addFranciscaMessage(response.message, response.expression as Expression);
}, [selectedDesign, addFranciscaMessage]);

const handleApplyTransformation = useCallback(() => {
  if (!pendingTransformation || !selectedDesign?.designIds[0]) return;
  
  addTransformation(
    activePrintArea,
    selectedDesign.designIds[0],
    pendingTransformation.type,
    pendingTransformation.params
  );
  
  setPendingTransformation(null);
  setShowTransformationPreview(false);
  
  // Menu stays open for more transformations
  addFranciscaMessage('Transformation applied! You can add more or click "Apply & Continue" when done.', 'happy');
}, [pendingTransformation, selectedDesign, activePrintArea, addTransformation, addFranciscaMessage]);

const handleClearAllTransformations = useCallback(() => {
  if (!selectedDesign?.designIds[0]) return;
  
  clearTransformations(activePrintArea, selectedDesign.designIds[0]);
  addFranciscaMessage('All transformations cleared. Back to the original design!', 'neutral');
}, [selectedDesign, activePrintArea, clearTransformations, addFranciscaMessage]);
```

### 5.4 Add Approval Handler

```typescript
const handleApprovalRequest = useCallback(() => {
  if (!pricing) return;
  
  const summary = generateDesignSummary(
    availablePrintAreas,
    designInstances,
    pricing
  );

  // Add formatted summary to chat (system message, not LLM)
  addSystemMessage(formatSummaryForChat(summary, currentItem?.productName));

  // Check for empty placements
  if (summary.emptyPlacements.length > 0) {
    addFranciscaMessage(
      `I see you have ${summary.emptyPlacements.length} empty placement${summary.emptyPlacements.length > 1 ? 's' : ''}. ` +
      `Would you like to add designs to them, remove them, or proceed with blank areas?`,
      'thinking'
    );

    setQuickActions([
      {
        id: 'fill-empty',
        label: 'Add Designs',
        handler: () => {
          setActivePrintArea(summary.emptyPlacements[0]);
          setQuickActionContext('default');
          addFranciscaMessage(`Let's add a design to the ${summary.emptyPlacements[0].replace('_', ' ')}.`, 'happy');
        },
      },
      {
        id: 'remove-empty',
        label: 'Remove Empty',
        handler: () => {
          summary.emptyPlacements.forEach(area => {
            if (canRemovePlacement(area)) {
              removePrintArea(area);
            }
          });
          
          // Recalculate and show updated summary
          const newSummary = generateDesignSummary(
            availablePrintAreas.filter(a => !summary.emptyPlacements.includes(a)),
            designInstances,
            pricing
          );
          
          addSystemMessage(formatSummaryForChat(newSummary, currentItem?.productName));
          addFranciscaMessage('Removed empty placements. Here is your updated summary:', 'happy');
          setQuickActionContext('approval-summary');
        },
      },
      {
        id: 'proceed-blank',
        label: 'Proceed with Blanks',
        handler: () => {
          addFranciscaMessage('Understood! Some areas will be blank on the final product. Ready to process?', 'neutral');
          setQuickActionContext('approval-summary');
        },
      },
    ]);
  } else {
    setQuickActionContext('approval-summary');
    addFranciscaMessage('Everything looks good! Review the summary above and confirm when ready.', 'happy');
  }
}, [availablePrintAreas, designInstances, pricing, currentItem, addFranciscaMessage, addSystemMessage]);

const initiatePrintProcessing = useCallback(() => {
  setShowPrintPreparation(true);
  addFranciscaMessage('Perfect! Let me prepare your design for printing. This will take a moment...', 'excited');
  
  // Trigger print processing
  // processPrintFile().then(() => {
  //   addFranciscaMessage('Your print-ready file is ready! Review it and confirm to proceed.', 'proud');
  // });
}, [addFranciscaMessage]);
```

---

## Task 6: Add Price Change Effect (15 min)

### 6.1 Watch for Price Changes
**Add useEffect after handlers:**

```typescript
useEffect(() => {
  if (lastPrice !== null && currentPrice !== null && lastPrice !== currentPrice) {
    const changeMessage = formatPriceChange(lastPrice, currentPrice);
    if (changeMessage) {
      addSystemMessage(`💰 ${changeMessage}`);
    }
  }
  setLastPrice(currentPrice);
}, [currentPrice, lastPrice, formatPriceChange, addSystemMessage]);
```

---

## Task 7: Render Transformation UI (20 min)

### 7.1 Add Transformation Components to JSX
**Find:** Return statement / JSX

**Add after QuickActionsBar:**

```typescript
{/* Transformation Menu */}
{showTransformationMenu && selectedDesign?.designIds[0] && (
  <div className="mt-4">
    <TransformationMenu
      onSelect={handleTransformationSelect}
      onClose={() => {
        setShowTransformationMenu(false);
        setQuickActionContext('default');
      }}
    />
  </div>
)}

{/* Transformation Preview */}
{showTransformationPreview && pendingTransformation && selectedDesign?.designIds[0] && (
  <TransformationPreview
    isOpen={showTransformationPreview}
    onClose={() => {
      setShowTransformationPreview(false);
      setPendingTransformation(null);
    }}
    onApply={handleApplyTransformation}
    originalUrl={designInstances[activePrintArea]?.find(d => d.id === selectedDesign.designIds[0])?.placement.designUrl || ''}
    transformations={[
      ...(designInstances[activePrintArea]?.find(d => d.id === selectedDesign.designIds[0])?.transformations || []),
      { type: pendingTransformation.type, params: pendingTransformation.params, appliedAt: Date.now() }
    ]}
    designName={designInstances[activePrintArea]?.find(d => d.id === selectedDesign.designIds[0])?.name || 'Design'}
  />
)}

{/* Print Preparation Modal */}
{showPrintPreparation && (
  <PrintPreparationModal
    isOpen={showPrintPreparation}
    currentStep={0}
    totalSteps={5}
    stepLabel="Preparing your design..."
    progress={0}
    onClose={() => setShowPrintPreparation(false)}
  />
)}
```

### 7.2 Add Required State
**Add to existing state declarations:**
```typescript
const [showPrintPreparation, setShowPrintPreparation] = useState(false);
```

---

## Task 8: Update DesignOverlay (15 min)

### 8.1 Apply Transformations to Image
**File:** `app/src/components/studio/DesignOverlay.tsx`

**Add import:**
```typescript
import { buildTransformedUrl } from '@/lib/cloudinary';
```

**Modify image rendering (~line 241):**
```typescript
// Build transformed URL if transformations exist
const imageUrl = design.transformations?.length 
  ? buildTransformedUrl(design.placement.designUrl, design.transformations)
  : design.placement.designUrl;

// In JSX:
<img
  src={imageUrl}
  alt={design.name}
  className="w-full h-full object-contain select-none pointer-events-none"
  draggable={false}
/>
```

**Add transformation indicator badge (optional):**
```typescript
{design.transformations && design.transformations.length > 0 && (
  <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
    {design.transformations.length}
  </div>
)}
```

---

## Task 9: Testing & Verification (20 min)

### 9.1 Test Scenarios

**Scenario 1: New User Flow**
- [ ] Enter studio → Francisca welcomes
- [ ] Empty placement → Upload/Generate/Remove options
- [ ] Upload design → Price appears in chat
- [ ] Select design → Transform option appears
- [ ] Click Transform → Menu opens with categories
- [ ] Select transformation → Preview → Apply
- [ ] Menu stays open → Apply more or click "Apply & Continue"
- [ ] Click Review & Approve → Summary in chat
- [ ] Empty placement warning if applicable
- [ ] Confirm → Processing → Complete

**Scenario 2: Placement Management**
- [ ] Remove placement → Price updates immediately
- [ ] Try remove last placement → Blocked with message
- [ ] Add placement back → Price updates

**Scenario 3: Back Navigation**
- [ ] Every submenu has Back button
- [ ] Back returns to previous context
- [ ] Chat history maintained

**Scenario 4: Transformations**
- [ ] Apply multiple transformations
- [ ] Clear all transformations
- [ ] Preview before apply
- [ ] Transformations persist on design

### 9.2 Build Verification
```bash
cd /path/to/blackout-merchandise/app
bun tsc --noEmit
bun run build
```

---

## Summary of Changes

| File | Changes | Lines |
|------|---------|-------|
| `StudioChat.tsx` | Major refactor | ~400 lines modified |
| `DesignOverlay.tsx` | Apply transformations | ~20 lines |
| `StudioHeader.tsx` | Already done | - |
| `StudioProgressBar.tsx` | Already done | - |

---

## Key Features Delivered

✅ **No visual steps** - Pure conversational flow  
✅ **Context-aware actions** - Dynamic based on selection  
✅ **Back buttons everywhere** - Easy navigation  
✅ **Chat summaries** - All info in chat history  
✅ **Real-time pricing** - Immediate price feedback  
✅ **Placement management** - Add/remove with validation  
✅ **Transformation preview** - See before applying  
✅ **Smart approval** - Validates before processing  

---

## Notes

- All transformation infrastructure is complete and tested
- Pricing API is ready (currently using mock data, switch to DB when ready)
- Build passes TypeScript validation
- Francisca responses use pre-written templates (no AI tokens for transformations)

---

**Ready to start implementation!**
