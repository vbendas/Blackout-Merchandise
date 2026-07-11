'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { openAccessibilityMenu } from '@/components/accessibility-widget';
import { ProductDetailLightbox } from '@/components/catalog/ProductDetailLightbox';
import { ShowroomLightbox } from '@/components/catalog/ShowroomLightbox';
import { EshopDashboard } from '@/components/eshop/EshopDashboard';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { SessionHistory } from '@/components/SessionHistory';
import { StickyHeader } from '@/components/StickyHeader';
import { SupportState } from '@/components/SupportState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { type Product, products } from '@/data/products';
import { useChat as useCatChat } from '@/components/chat/CatChatProvider';
import { ChatTakeover } from '@/components/chat/ChatTakeover';
import { HeroEmptyState } from '@/components/hero/HeroEmptyState';
import { useChat } from '@/lib/ChatContext';
import { useHistory } from '@/lib/HistoryContext';
import { LightboxProvider, useLightbox } from '@/lib/LightboxContext';
import { useNavigation } from '@/lib/NavigationContext';
import { useNewChatDialog } from '@/lib/NewChatDialogContext';
import { useNotifications } from '@/lib/NotificationsContext';
import { useProductList } from '@/lib/ProductListContext';
import { ShowroomProvider, useShowroom } from '@/lib/ShowroomContext';
import type { AgentName } from '@/types/expressions';

interface SessionItem {
  id: string;
  title: string;
  agent: AgentName;
  route: string;
  timestamp: Date;
  preview: string;
}

// Empty State Component — Hero with agent avatar + prompt input
function EmptyState({ onSendMessage, onOpenTakeover, onSetLiftingSuggestion, liftingSuggestion }: {
  onSendMessage: (message: string) => void;
  onOpenTakeover: () => void;
  onSetLiftingSuggestion: (suggestion: { text: string; id: string } | null) => void;
  liftingSuggestion?: { text: string; id: string } | null;
}) {
  return (
    <HeroEmptyState
      onSendMessage={onSendMessage}
      onOpenTakeover={onOpenTakeover}
      onSetLiftingSuggestion={onSetLiftingSuggestion}
      liftingSuggestion={liftingSuggestion}
    />
  );
}

// Active State — now redirects to hero (empty state)
function ActiveState({ onSendMessage, onOpenTakeover, onSetLiftingSuggestion, liftingSuggestion }: {
  onSendMessage: (message: string) => void;
  onOpenTakeover: () => void;
  onSetLiftingSuggestion: (suggestion: { text: string; id: string } | null) => void;
  liftingSuggestion?: { text: string; id: string } | null;
}) {
  return (
    <HeroEmptyState
      onSendMessage={onSendMessage}
      onOpenTakeover={onOpenTakeover}
      onSetLiftingSuggestion={onSetLiftingSuggestion}
      liftingSuggestion={liftingSuggestion}
    />
  );
}

// Catalog State Component (with header inside LightboxProvider)
function CatalogPageContent({
  _activeAgent,
  _onSelectPrompt,
  _onNewChatClick,
  onHistoryClick,
  onNotificationsClick,
  onListClick,
  listItemCount,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedCategory,
  selectedColor,
  selectedSize,
  selectedFit,
  onCategoryChange,
  onColorChange,
  onSizeChange,
  onFitChange,
  onClearFilters,
  hasActiveFilters,
  filteredProducts,
}: any) {
  const { isOpen: isLightboxOpen } = useLightbox();
  const { openShowroom } = useShowroom();

  // Convert products to LightboxProduct format for showroom
  const handleOpenShowroom = () => {
    const lightboxProducts = filteredProducts.map((product: Product) => ({
      id: product.id,
      name: product.name,
      brand: undefined,
      category: product.category,
      imageUrls: product.imageUrls,
      colors: product.colors.map((c: { name: string; hex: string }) => ({ name: c.name, hex: c.hex, available: true })),
      sizes: product.sizes.map((s: string) => ({ size: s, minQuantity: 1 })),
      specs: { material: 'Premium fabric', care: 'Wash in cold water' },
      baseCost: Math.round(product.price * 100 * 0.5),
      suggestedRetail: Math.round(product.price * 100 * 5),
      sustainabilityBadges: ['Vegan', 'Fair-trade'],
    }));
    openShowroom(lightboxProducts, 0);
  };

  return (
    <>
      {/* Hide header when lightbox is open */}
      {!isLightboxOpen && (
        <StickyHeader
          onHistoryClick={onHistoryClick}
          onNotificationsClick={onNotificationsClick}
          onListClick={onListClick}
          listItemCount={listItemCount}
          showFilters={true}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
          selectedCategory={selectedCategory}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          selectedFit={selectedFit}
          onCategoryChange={onCategoryChange}
          onColorChange={onColorChange}
          onSizeChange={onSizeChange}
          onFitChange={onFitChange}
          onClearFilters={onClearFilters}
          hasActiveFilters={hasActiveFilters}
          onShowroomClick={handleOpenShowroom}
        />
      )}

      <div className="flex flex-col flex-1 min-h-0 h-full w-full px-3 sm:px-4 md:px-6 lg:px-8 relative">
        {/* Catalog Grid */}
        <div
          id="catalog-grid"
          className="flex-1 overflow-y-auto relative mt-[10px]"
          style={{
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <p>No products match your filters</p>
              {hasActiveFilters && (
                <button
                  onClick={onClearFilters}
                  className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product: Product) => (
                <CatalogProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductDetailLightbox />
    </>
  );
}

// Catalog Product Card
function CatalogProductCard({ product }: { product: Product }) {
  const { openLightbox } = useLightbox();

  const handleClick = () => {
    openLightbox({
      id: product.id,
      name: product.name,
      category: product.category,
      imageUrls: product.imageUrls,
      colors: product.colors.map((c: any) => ({ name: c.name, hex: c.hex, available: true })),
      sizes: product.sizes.map((s: string) => ({ size: s, minQuantity: 1 })),
      specs: { material: 'Premium fabric', care: 'Wash in cold water' },
      baseCost: Math.round(product.price * 100 * 0.5),
      suggestedRetail: Math.round(product.price * 100 * 5),
      sustainabilityBadges: ['Vegan', 'Fair-trade'],
    });
  };

  return (
    <button
      onClick={handleClick}
      className="group relative bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-lg text-left"
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-zinc-800">
        {product.imageUrls && product.imageUrls.length > 0 ? (
          <Image
            src={product.imageUrls[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
            <Icon icon="lucide:image" className="w-12 h-12" />
          </div>
        )}
        <span className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-medium uppercase tracking-wider text-white">
          {product.category}
        </span>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full">Configure</span>
        </div>
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-medium text-sm truncate text-white">{product.name}</h3>
        <p className="text-xs text-zinc-400">{product.description}</p>
        <p className="font-semibold text-white">${product.price}</p>
        <p className="text-xs text-zinc-500">
          {product.colors.length} colors • {product.sizes.length} sizes
        </p>
      </div>
    </button>
  );
}

export default function WorkspacePage() {
  const { chatState, setChatState, activeAgent, setAgent } = useNavigation();
  const { isHistoryOpen, setIsHistoryOpen } = useHistory();
  const { isNotificationsOpen, setIsNotificationsOpen, notifications, markAsRead, clearAll } = useNotifications();
  const { setDesignFlowStep, designFlowStep } = useChat();
  const { toggleChat, sendMessage: sendCatChatMessage } = useCatChat();
  const {
    isOpen: isNewChatDialogOpen,
    openDialog: openNewChatDialog,
    closeDialog: closeNewChatDialog,
  } = useNewChatDialog();
  const { totalItems: listItemCount } = useProductList();

  const [_isListPanelOpen, setIsListPanelOpen] = useState(false);

  // Chat takeover state (hero → expanded chat)
  const [isTakeoverOpen, setIsTakeoverOpen] = useState(false);
  const [liftingSuggestion, setLiftingSuggestion] = useState<{ text: string; id: string } | null>(null);

  // Close all slide-out panels to prevent stacking
  const closeAllPanels = () => {
    setIsHistoryOpen(false);
    setIsNotificationsOpen(false);
    setIsListPanelOpen(false);
  };

  // Filter state for catalog
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedFit, setSelectedFit] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedColor !== 'all' || selectedSize !== 'all' || selectedFit !== 'all' || searchQuery !== '';

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = products.filter((product: Product) => {
      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Color filter
      if (selectedColor !== 'all') {
        const hasColor = product.colors.some((color: { name: string }) => color.name === selectedColor);
        if (!hasColor) return false;
      }

      // Size filter
      if (selectedSize !== 'all' && !product.sizes.includes(selectedSize)) {
        return false;
      }

      // Fit filter
      if (selectedFit !== 'all' && product.fit !== selectedFit) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDescription = product.description?.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesCategory) {
          return false;
        }
      }

      return true;
    });

    // Sort
    switch (sortBy) {
      case 'price-low':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return result;
  }, [selectedCategory, selectedColor, selectedSize, selectedFit, searchQuery, sortBy]);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory('all');
    setSelectedColor('all');
    setSelectedSize('all');
    setSelectedFit('all');
    setSearchQuery('');
    setSortBy('default');
  }, []);

  // Session management
  const [_sessions] = useState<SessionItem[]>([
    {
      id: 'session-1',
      title: 'Product Design Review',
      agent: 'Francisca',
      route: 'design',
      timestamp: new Date(Date.now() - 3600000),
      preview: "Let's discuss the new collection design",
    },
    {
      id: 'session-2',
      title: 'Store Setup Guide',
      agent: 'Leopoldo',
      route: 'setup',
      timestamp: new Date(Date.now() - 7200000),
      preview: "Welcome! Let's get your store configured",
    },
    {
      id: 'session-3',
      title: 'Bulk Order Discussion',
      agent: 'Antônia',
      route: 'orders',
      timestamp: new Date(Date.now() - 10800000),
      preview: 'Let me help you with your bulk order inquiries',
    },
  ]);

  const handleSelectSession = useCallback((sessionId: string) => {
    console.log('Loading session:', sessionId);
  }, []);

  // Check for studio redirect message (from NavigationMenu when user has no products)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const needsProducts = sessionStorage.getItem('studio_redirect_no_products');
      if (needsProducts === 'true' && chatState === 'catalog' && activeAgent === 'Francisca') {
        sessionStorage.removeItem('studio_redirect_no_products');
        // Open CatChat with Francisca's message
        toggleChat();
        sendCatChatMessage("Hey! You'll need some products selected before we can start designing. Let me take you to the catalog!");
      }
    }
  }, [chatState, activeAgent, toggleChat, sendCatChatMessage]);

  const handlePromptClick = useCallback(
    (promptText: string) => {
      toggleChat();
      sendCatChatMessage(promptText);
    },
    [toggleChat, sendCatChatMessage]
  );

  // Hero → Takeover handlers
  const handleHeroSendMessage = useCallback(
    (message: string) => {
      setIsTakeoverOpen(true);
      sendCatChatMessage(message);
    },
    [sendCatChatMessage]
  );

  const handleOpenTakeover = useCallback(() => {
    setIsTakeoverOpen(true);
  }, []);

  const handleCloseTakeover = useCallback(() => {
    setIsTakeoverOpen(false);
  }, []);

  return (
    <div className="relative h-full bg-background">
      {/* Session History */}
      <SessionHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadSession={handleSelectSession}
      />

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onClearAll={clearAll}
      />

      {/* Floating Socials */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50 hidden md:flex"
      >
        <Link href="https://instagram.com" target="_blank" className="text-zinc-500 hover:text-white transition-colors">
          <Icon icon="simple-icons:instagram" width={20} />
        </Link>
        <Link href="https://tiktok.com" target="_blank" className="text-zinc-500 hover:text-white transition-colors">
          <Icon icon="simple-icons:tiktok" width={20} />
        </Link>
        <div className="w-full h-[1px] bg-zinc-800/50 my-1" />
        <button onClick={openAccessibilityMenu} className="text-zinc-500 hover:text-white transition-colors">
          <Icon icon="mdi:accessibility" width={22} />
        </button>
      </motion.div>

      {/* Main Content */}
      <div
        className={`flex flex-col flex-1 min-h-0 h-full w-full px-3 sm:px-4 md:px-6 lg:px-8 relative ${chatState === 'catalog' || chatState === 'eshop' || chatState === 'support' ? 'pt-[72px]' : 'pt-5'}`}
      >
        {/* Design Mode Overlay - shown during design flow */}
        {designFlowStep !== 'idle' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none z-20" />
        )}

        {/* Hide all states during design flow, only show chat */}
        {designFlowStep === 'idle' ? (
          <>
            {chatState === 'empty' && (
              <EmptyState
                onSendMessage={handleHeroSendMessage}
                onOpenTakeover={handleOpenTakeover}
                onSetLiftingSuggestion={setLiftingSuggestion}
                liftingSuggestion={liftingSuggestion}
              />
            )}

            {chatState === 'active' && (
              <ActiveState
                onSendMessage={handleHeroSendMessage}
                onOpenTakeover={handleOpenTakeover}
                onSetLiftingSuggestion={setLiftingSuggestion}
                liftingSuggestion={liftingSuggestion}
              />
            )}

            {chatState === 'catalog' && (
              <ShowroomProvider>
                <LightboxProvider>
                  <CatalogPageContent
                    _activeAgent={activeAgent}
                    _onSelectPrompt={handlePromptClick}
                    onNewChatClick={openNewChatDialog}
                    onHistoryClick={() => {
                      closeAllPanels();
                      setIsHistoryOpen(!isHistoryOpen);
                    }}
                    onNotificationsClick={() => {
                      closeAllPanels();
                      setIsNotificationsOpen(!isNotificationsOpen);
                    }}
                    onListClick={() => {
                      closeAllPanels();
                      setIsListPanelOpen(true);
                    }}
                    listItemCount={listItemCount}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    selectedCategory={selectedCategory}
                    selectedColor={selectedColor}
                    selectedSize={selectedSize}
                    selectedFit={selectedFit}
                    onCategoryChange={setSelectedCategory}
                    onColorChange={setSelectedColor}
                    onSizeChange={setSelectedSize}
                    onFitChange={setSelectedFit}
                    onClearFilters={handleClearFilters}
                    hasActiveFilters={hasActiveFilters}
                    filteredProducts={filteredProducts}
                  />
                  <ShowroomLightbox
                    onStartDesign={() => {
                      // Start design flow via chat with Francisca
                      setChatState('active');
                      setAgent('Francisca');
                      setDesignFlowStep('product-selected');
                    }}
                  />
                </LightboxProvider>
              </ShowroomProvider>
            )}

            {chatState === 'eshop' && <EshopDashboard />}

            {chatState === 'support' && <SupportState activeAgent={activeAgent} onSelectPrompt={handlePromptClick} />}
          </>
        ) : (
          // Design flow active: background hidden, only chat visible
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-zinc-600 text-sm">Design workflow in progress...</p>
          </div>
        )}
      </div>

      {/* Chat Takeover Overlay */}
      <ChatTakeover
        isOpen={isTakeoverOpen}
        onClose={handleCloseTakeover}
        liftingSuggestion={liftingSuggestion}
      />

      {/* New Chat Dialog */}
      <AlertDialog
        open={isNewChatDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeNewChatDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your current conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeNewChatDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setChatState('empty');
                closeNewChatDialog();
              }}
            >
              Clear Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
