'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProductListPanel } from '@/components/ProductListPanel';
import { SessionHistory } from '@/components/SessionHistory';
import { useChat } from '@/lib/ChatContext';
import { useHistory } from '@/lib/HistoryContext';
import { useNavigation } from '@/lib/NavigationContext';
import { useNotifications } from '@/lib/NotificationsContext';
import { useProductList } from '@/lib/ProductListContext';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'solar:gallery-linear', label: 'Catalog', route: 'catalog', description: 'Browse products' },
  { icon: 'solar:palette-linear', label: 'MerchStudio', route: 'studio', description: 'Create designs' },
  { icon: 'solar:cart-large-2-linear', label: 'MerchShop', route: 'eshop', description: 'Manage your store' },
  { icon: 'solar:headphones-round-linear', label: 'Support', route: 'support', description: 'Get help' },
];

export function IconStripNav() {
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredBottomItem, setHoveredBottomItem] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isListPanelOpen, setIsListPanelOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [shouldPulseBadge, setShouldPulseBadge] = useState(false);
  const { navigate, currentRoute, setChatState, setAgent } = useNavigation();
  const { isHistoryOpen, setIsHistoryOpen } = useHistory();
  const { isNotificationsOpen, setIsNotificationsOpen, notifications, markAsRead, clearAll } = useNotifications();
  const {
    totalItems: listItemCount,
    hasProducts,
    registerProductAddedCallback,
    unregisterProductAddedCallback,
  } = useProductList();
  const { openChat, setDesignFlowStep, closeChat, switchAgent } = useChat();

  // Close all slide-out panels to prevent stacking
  const closeAllPanels = () => {
    setIsHistoryOpen(false);
    setIsNotificationsOpen(false);
    setIsListPanelOpen(false);
    setProfileMenuOpen(false);
  };

  // Register callback to auto-open panel when product is added
  useEffect(() => {
    const handleProductAdded = () => {
      // Auto-open panel
      setIsListPanelOpen(true);

      // Pulse badge
      setShouldPulseBadge(true);
      setTimeout(() => setShouldPulseBadge(false), 1000);

      // Auto-close after 3 seconds
      setTimeout(() => {
        setIsListPanelOpen(false);
      }, 3000);
    };

    registerProductAddedCallback(handleProductAdded);

    return () => {
      unregisterProductAddedCallback();
    };
  }, [registerProductAddedCallback, unregisterProductAddedCallback]);

  const handleNavigate = (route: string) => {
    // Special handling for studio route
    if (route === 'studio') {
      // Check if user has products selected
      if (!hasProducts()) {
        // Show message in chat and navigate to catalog instead
        setChatState('catalog');
        setAgent('Francisca');
        navigate('catalog' as any);

        // Open chat with custom message
        openChat(
          "Hey! You'll need to select some products from the catalog first before we can start designing. Let me take you there!"
        );
        setMobileDrawerOpen(false);
        return;
      }

      // Navigate to studio page
      router.push('/app/studio');
      setChatState('active');
      setAgent('Francisca');
      setDesignFlowStep('product-selected');
      setMobileDrawerOpen(false);
      return;
    }

    // Navigate and sync chat state + agent
    navigate(route as any);

    switch (route) {
      case 'catalog':
        setChatState('catalog');
        setAgent('Francisca');
        setDesignFlowStep('idle');
        break;
      case 'eshop':
        setChatState('eshop');
        setAgent('Antônia');
        closeChat();
        setDesignFlowStep('idle');
        break;
      case 'support':
        setChatState('support');
        setAgent('Antônia');
        switchAgent('Antônia');
        closeChat();
        setDesignFlowStep('idle');
        break;
      default:
        setChatState('empty');
        setAgent('Leopoldo');
        setDesignFlowStep('idle');
    }

    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop Icon Strip */}
      <nav className="fixed left-0 top-0 z-[110] hidden h-screen w-16 flex-col border-r border-white/10 bg-zinc-900/70 backdrop-blur-xl py-4 md:flex shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {/* Logo */}
        <div className="mb-2 flex justify-center">
          <a href="/" aria-label="Go to mainpage">
            <img src="/logo/short.png" alt="MerchFrom" className="h-12 w-12 object-contain" />
          </a>
        </div>

        {/* Divider */}
        <div className="mb-2 h-px w-full bg-white/10" />

        {/* Nav Items */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.route;
            const isHovered = hoveredItem === item.route;

            return (
              <div key={item.route} className="relative">
                <motion.button
                  onClick={() => handleNavigate(item.route)}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setHoveredItem(item.route)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-md border border-white/10 transition-all duration-200 ${
                    isActive
                      ? 'bg-zinc-800/60 text-white border-white/20'
                      : 'bg-zinc-800/40 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300 hover:border-white/15'
                  }`}
                  aria-label={item.description}
                >
                  <Icon icon={item.icon} className="h-6 w-6" />

                  {/* Active indicator dot */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      />
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Hover label - slides out from icon */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -10, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -5, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap"
                    >
                      <div className="flex items-center">
                        {/* Arrow pointing to icon */}
                        <div className="h-2 w-2 rotate-45 border-b border-l border-zinc-800 bg-zinc-900" />
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-xl">
                          <span className="text-sm font-medium text-white">{item.label}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Bottom - Icons */}
        <div className="mt-auto flex flex-col items-center gap-2 pt-2 mt-2 border-t border-white/10">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                closeAllPanels();
                setIsNotificationsOpen(true);
              }}
              onMouseEnter={() => setHoveredBottomItem('notifications')}
              onMouseLeave={() => setHoveredBottomItem(null)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/40 backdrop-blur-sm border border-white/5 text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-zinc-300 hover:border-white/10"
              aria-label="Notifications"
            >
              <Icon icon="lucide:bell" className="h-4 w-4" />
              {/* Notification dot */}
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            {/* Hover tooltip */}
            <AnimatePresence>
              {hoveredBottomItem === 'notifications' && (
                <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -5, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 whitespace-nowrap"
                >
                  <div className="flex items-center">
                    <div className="h-2 w-2 rotate-45 border-b border-l border-zinc-800 bg-zinc-900" />
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-xl">
                      <span className="text-sm font-medium text-white">Notifications</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* My Selection */}
          <div className="relative">
            <button
              onClick={() => {
                closeAllPanels();
                setIsListPanelOpen(true);
              }}
              onMouseEnter={() => setHoveredBottomItem('selection')}
              onMouseLeave={() => setHoveredBottomItem(null)}
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/40 backdrop-blur-sm border border-white/5 text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-zinc-300 hover:border-white/10',
                shouldPulseBadge && 'animate-pulse'
              )}
              aria-label="My Selection"
            >
              <Icon icon="lucide:shopping-bag" className="h-4 w-4" />
              {listItemCount > 0 && (
                <span
                  className={cn(
                    'absolute -top-1 -right-1 min-w-4 h-4 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1',
                    shouldPulseBadge && 'ring-2 ring-white/50'
                  )}
                >
                  {listItemCount > 9 ? '9+' : listItemCount}
                </span>
              )}
            </button>
            {/* Hover tooltip */}
            <AnimatePresence>
              {hoveredBottomItem === 'selection' && (
                <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -5, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 whitespace-nowrap"
                >
                  <div className="flex items-center">
                    <div className="h-2 w-2 rotate-45 border-b border-l border-zinc-800 bg-zinc-900" />
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-xl">
                      <span className="text-sm font-medium text-white">My Selection</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Session History */}
          <div className="relative">
            <button
              onClick={() => {
                closeAllPanels();
                setIsHistoryOpen(true);
              }}
              onMouseEnter={() => setHoveredBottomItem('history')}
              onMouseLeave={() => setHoveredBottomItem(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/40 backdrop-blur-sm border border-white/5 text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-zinc-300 hover:border-white/10"
              aria-label="Conversation Story"
            >
              <Icon icon="lucide:rotate-ccw" className="h-4 w-4" />
            </button>
            {/* Hover tooltip */}
            <AnimatePresence>
              {hoveredBottomItem === 'history' && (
                <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -5, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 whitespace-nowrap"
                >
                  <div className="flex items-center">
                    <div className="h-2 w-2 rotate-45 border-b border-l border-zinc-800 bg-zinc-900" />
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-xl">
                      <span className="text-sm font-medium text-white">Conversation Story</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Account */}
          <div className="relative">
            <button
              onClick={() => {
                closeAllPanels();
                setProfileMenuOpen(true);
              }}
              onMouseEnter={() => setHoveredBottomItem('account')}
              onMouseLeave={() => setHoveredBottomItem(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/40 backdrop-blur-sm border border-white/5 text-zinc-500 transition-colors hover:bg-zinc-700/60 hover:text-zinc-300 hover:border-white/10"
              aria-label="Account"
            >
              <Icon icon="lucide:user" className="h-4 w-4" />
            </button>
            {/* Hover tooltip */}
            <AnimatePresence>
              {hoveredBottomItem === 'account' && (
                <motion.div
                  initial={{ opacity: 0, x: -10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -5, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 whitespace-nowrap"
                >
                  <div className="flex items-center">
                    <div className="h-2 w-2 rotate-45 border-b border-l border-zinc-800 bg-zinc-900" />
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-xl">
                      <span className="text-sm font-medium text-white">Account</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <>
        {/* Mobile Menu Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setMobileDrawerOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/70 backdrop-blur-xl md:hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          aria-label="Open menu"
        >
          <Icon icon="lucide:menu" className="h-6 w-6 text-zinc-300" />
        </motion.button>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileDrawerOpen(false)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              />

              {/* Drawer */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-white/10 bg-zinc-900/80 backdrop-blur-xl md:hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
              >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="h-1.5 w-12 rounded-full bg-zinc-700" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <span className="text-lg font-semibold text-white">Menu</span>
                  <button
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/60 backdrop-blur-sm border border-white/10 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white hover:border-white/20"
                  >
                    <Icon icon="lucide:x" className="h-5 w-5" />
                  </button>
                </div>

                {/* Nav Items */}
                <div className="grid grid-cols-2 gap-3 p-6">
                  {NAV_ITEMS.map((item) => {
                    const isActive = currentRoute === item.route;

                    return (
                      <motion.button
                        key={item.route}
                        onClick={() => handleNavigate(item.route)}
                        whileTap={{ scale: 0.95 }}
                        className={`flex flex-col items-center gap-3 rounded-2xl border backdrop-blur-md p-6 transition-all ${
                          isActive
                            ? 'border-white/20 bg-zinc-800/60 text-white'
                            : 'border-white/10 bg-zinc-800/40 text-zinc-400 hover:border-white/15 hover:bg-zinc-700/60'
                        }`}
                      >
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl backdrop-blur-sm border ${
                            isActive
                              ? 'bg-zinc-700/60 border-white/15 text-white'
                              : 'bg-zinc-800/60 border-white/10 text-zinc-500'
                          }`}
                        >
                          <Icon icon={item.icon} className="h-7 w-7" />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* User section */}
                <div className="border-t border-white/10 p-6">
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setProfileMenuOpen(true);
                    }}
                    className="flex w-full items-center gap-4 rounded-xl bg-zinc-800/60 backdrop-blur-sm border border-white/10 p-4 hover:bg-zinc-700/60 hover:border-white/20 transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/60 backdrop-blur-sm border border-white/10">
                      <Icon icon="lucide:user" className="h-6 w-6 text-zinc-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Account</div>
                      <div className="text-sm text-zinc-500">Manage your profile</div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="ml-auto h-5 w-5 text-zinc-500" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>

      {/* Panels */}
      <SessionHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadSession={(sessionId) => {
          // Navigate to studio with the session
          navigate('studio');
          setIsHistoryOpen(false);
        }}
      />

      <ProductListPanel
        isOpen={isListPanelOpen}
        onClose={() => setIsListPanelOpen(false)}
        onStartDesign={() => {
          // Design flow starts - ChatContext will auto-open chat
          setChatState('active');
          setAgent('Francisca');
          setDesignFlowStep('product-selected');
        }}
      />

      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onClearAll={clearAll}
      />

      {/* Profile Menu Modal */}
      <AnimatePresence>
        {profileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Profile Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm"
            >
              <div className="rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <span className="text-lg font-semibold text-white">Account</span>
                  <button
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 backdrop-blur-sm border border-white/10 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white hover:border-white/20"
                  >
                    <Icon icon="lucide:x" className="h-4 w-4" />
                  </button>
                </div>

                {/* Menu Items */}
                <div className="p-3">
                  <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white">
                    <Icon icon="lucide:user" className="h-5 w-5" />
                    <span className="text-sm font-medium">My Account</span>
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white">
                    <Icon icon="lucide:settings" className="h-5 w-5" />
                    <span className="text-sm font-medium">Settings</span>
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white">
                    <Icon icon="lucide:credit-card" className="h-5 w-5" />
                    <span className="text-sm font-medium">Billing</span>
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-white">
                    <Icon icon="lucide:help-circle" className="h-5 w-5" />
                    <span className="text-sm font-medium">Help Center</span>
                  </button>
                  <div className="my-2 border-t border-white/10" />
                  <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300">
                    <Icon icon="lucide:log-out" className="h-5 w-5" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
