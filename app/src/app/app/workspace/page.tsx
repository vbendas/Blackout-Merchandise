'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { Mic, Send } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { openAccessibilityMenu } from '@/components/accessibility-widget';
import { ChatAvatar } from '@/components/ChatAvatar';
import { ProductDetailLightbox } from '@/components/catalog/ProductDetailLightbox';
import { ShowroomLightbox } from '@/components/catalog/ShowroomLightbox';
import { EshopDashboard } from '@/components/eshop/EshopDashboard';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { QuickActionsGrid } from '@/components/QuickActionsGrid';

import { SessionHistory } from '@/components/SessionHistory';
import { StickyHeader } from '@/components/StickyHeader';
import { SupportState } from '@/components/SupportState';
import { TypingIndicator } from '@/components/TypingIndicator';
import { UserAvatar } from '@/components/UserAvatar';
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Product, products } from '@/data/products';
import { useIdleAnimation } from '@/hooks/useIdleAnimation';
import { useSentimentDetection } from '@/hooks/useSentimentDetection';
import { useSpeakingAnimation } from '@/hooks/useSpeakingAnimation';
import { useSpeechToText } from '@/hooks/useSpeechToText';

import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { useChat } from '@/lib/ChatContext';
import { getExpressionForMessage, getExpressionForPrompt } from '@/lib/expressions/sentiment';
import { useHistory } from '@/lib/HistoryContext';
import { LightboxProvider, useLightbox } from '@/lib/LightboxContext';
import { useNavigation } from '@/lib/NavigationContext';
import { useNewChatDialog } from '@/lib/NewChatDialogContext';
import { useNotifications } from '@/lib/NotificationsContext';
import { useProductList } from '@/lib/ProductListContext';
import { ShowroomProvider, useShowroom } from '@/lib/ShowroomContext';
import type { AgentName, Expression } from '@/types/expressions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent: AgentName;
  expression: Expression;
  timestamp: Date;
}

interface SessionItem {
  id: string;
  title: string;
  agent: AgentName;
  route: string;
  timestamp: Date;
  preview: string;
}

const _CHAT_SESSION_KEY = 'merchfrom_chat_session';
const _CHAT_STATE_KEY = 'merchfrom_chat_state';

// Empty State Component
function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="mb-8">
        <QuickActionsGrid />
      </div>
    </div>
  );
}

// Active State Component
function ActiveState({
  messages,
  isTyping,
  activeAgent,
  inputValue,
  setInputValue,
  handleSendMessage,
  scrollRef,
  error,
  setError,
}: {
  messages: Message[];
  isTyping: boolean;
  activeAgent: AgentName;
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  error: string | null;
  setError: (error: string | null) => void;
}) {
  const { chatState, setChatState } = useNavigation();
  const { isRecording, startRecording, stopRecording } = useSpeechToText({
    onTranscript: (text) => {
      setInputValue(text);
    },
    onError: (errorMsg) => {
      setError(errorMsg);
    },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden px-4 min-h-0 relative" ref={scrollRef}>
        <ScrollArea className="h-full" type="auto">
          <div className="space-y-4 pb-4 min-h-full flex flex-col justify-end">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 px-4 py-12 text-zinc-500">
                <Icon icon="lucide:message-square" className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No messages yet. Start a conversation with {activeAgent}!</p>
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ x: message.role === 'assistant' ? -20 : 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`flex gap-4 items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' ? (
                    <>
                      <ChatAvatar agentName={message.agent} expression={message.expression} />
                      <div className="bg-zinc-800 text-white rounded-2xl px-4 py-3 max-w-[60%]">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1" />
                      <div className="bg-zinc-700 text-white rounded-2xl px-4 py-3 max-w-[60%]">
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <UserAvatar userName="User" />
                    </>
                  )}
                </motion.div>
              ))
            )}
            {isTyping && <TypingIndicator agentName={activeAgent} isTyping={true} />}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-shrink-0 px-4 py-4 z-10 relative">
        <div className="flex gap-2 items-center bg-zinc-900/60 rounded-xl p-2 border border-zinc-800/80 focus-within:border-zinc-700 focus-within:shadow-lg transition-all backdrop-blur-sm shadow-lg">
          <Button
            size="icon"
            variant={isRecording ? 'default' : 'ghost'}
            onClick={isRecording ? stopRecording : startRecording}
            className={
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Input
            placeholder={`Message ${activeAgent}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="bg-transparent border-0 focus-visible:ring-0"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setChatState(chatState === 'active' ? 'empty' : 'active')}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            aria-label={chatState === 'active' ? 'Close Chat' : 'Open Chat'}
          >
            <Icon
              icon={chatState === 'active' ? 'lucide:panel-right-close' : 'lucide:message-square'}
              className="w-4 h-4"
            />
          </Button>
          <Button size="icon" onClick={handleSendMessage} disabled={!inputValue.trim()} className="rounded-lg">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    </div>
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
          <img src={product.imageUrls[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
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
  const { setExpression } = useAvatarExpression();
  const { setDesignFlowStep, designFlowStep } = useChat();
  const { start, stop } = useSpeakingAnimation();
  const { resetIdleTimer } = useIdleAnimation({ interval: 8000, duration: 2000, enabled: true });
  const { applySentiment } = useSentimentDetection({ autoApply: true, duration: 3000 });
  const {
    isOpen: isNewChatDialogOpen,
    openDialog: openNewChatDialog,
    closeDialog: closeNewChatDialog,
  } = useNewChatDialog();
  const { totalItems: listItemCount } = useProductList();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [_isListPanelOpen, setIsListPanelOpen] = useState(false);

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

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedColor !== 'all' || selectedSize !== 'all' || selectedFit !== 'all';

  // Filter products based on selected filters
  const filteredProducts = useMemo(() => {
    return products.filter((product: Product) => {
      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Color filter - check if product has the selected color
      if (selectedColor !== 'all') {
        const hasColor = product.colors.some((color: { name: string }) => color.name === selectedColor);
        if (!hasColor) return false;
      }

      // Size filter - check if product has the selected size
      if (selectedSize !== 'all' && !product.sizes.includes(selectedSize)) {
        return false;
      }

      // Fit filter
      if (selectedFit !== 'all' && product.fit !== selectedFit) {
        return false;
      }

      return true;
    });
  }, [selectedCategory, selectedColor, selectedSize, selectedFit]);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory('all');
    setSelectedColor('all');
    setSelectedSize('all');
    setSelectedFit('all');
  }, []);

  // Session management
  const [sessions] = useState<SessionItem[]>([
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
    setMessages([]);
  }, []);

  // Auto-scroll
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  // Check for studio redirect message (from NavigationMenu when user has no products)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const needsProducts = sessionStorage.getItem('studio_redirect_no_products');
      if (needsProducts === 'true' && chatState === 'catalog' && activeAgent === 'Francisca') {
        sessionStorage.removeItem('studio_redirect_no_products');
        // Add Francisca's message
        const message: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            "Hey! You'll need some products selected before we can start designing. Let me take you to the catalog!",
          agent: 'Francisca',
          expression: 'thinking',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, message]);
      }
    }
  }, [chatState, activeAgent]);

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      agent: activeAgent,
      expression: 'neutral',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    applySentiment('user', inputValue);
    resetIdleTimer();
    start();
    setIsTyping(true);

    const predictedExpression = getExpressionForMessage(inputValue, [...messages, newMessage], activeAgent);

    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about "${inputValue}". Let me help you with that.`,
        agent: activeAgent,
        expression: predictedExpression,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
      stop();
      setIsTyping(false);
      applySentiment('assistant', response.content);
    }, 1500);
  }, [inputValue, messages, activeAgent, applySentiment, resetIdleTimer, start, stop]);

  const handlePromptClick = useCallback(
    (promptText: string) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: promptText,
        agent: activeAgent,
        expression: 'neutral',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);

      const promptExpression = getExpressionForPrompt(promptText);
      setExpression(promptExpression);
      resetIdleTimer();

      const predictedExpression = getExpressionForMessage(promptText, [...messages, newMessage], activeAgent);
      start();
      setIsTyping(true);

      setTimeout(() => {
        const response: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I'm ${activeAgent}. Let me help you with ${promptText.toLowerCase()}.`,
          agent: activeAgent,
          expression: predictedExpression,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, response]);
        stop();
        setIsTyping(false);
        applySentiment('assistant', response.content);
      }, 800);
    },
    [activeAgent, applySentiment, resetIdleTimer, setExpression, start, stop, messages]
  );

  return (
    <div className="relative h-full bg-background">
      {/* Session History */}
      <SessionHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        onSelectSession={handleSelectSession}
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
            {chatState === 'empty' && <EmptyState />}

            {chatState === 'active' && (
              <ActiveState
                messages={messages}
                isTyping={isTyping}
                activeAgent={activeAgent}
                inputValue={inputValue}
                setInputValue={setInputValue}
                handleSendMessage={handleSendMessage}
                scrollRef={scrollRef}
                error={error}
                setError={setError}
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
                setMessages([]);
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
