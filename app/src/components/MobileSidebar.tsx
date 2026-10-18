'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion, type PanInfo, useAnimation } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { NavigationMenu } from '@/components/NavigationMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigation } from '@/lib/NavigationContext';

export function MobileSidebar(): React.ReactElement {
  const { mobileSidebarOpen, closeMobileSidebar, navigate, setChatState } = useNavigation();
  const controls = useAnimation();
  const sidebarRef = useRef<HTMLElement>(null);
  const SWIPE_THRESHOLD = 100; // Minimum swipe distance to close
  const VELOCITY_THRESHOLD = 500; // Minimum velocity to trigger close

  const handleNewChat = (): void => {
    navigate('chat');
    setChatState('empty');
    closeMobileSidebar();
  };

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
      controls.start({ x: 0 });
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen, controls]);

  // Handle swipe to close
  const handleDragEnd = useCallback(
    async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const swipeDistance = info.offset.x;
      const swipeVelocity = info.velocity.x;

      // Close if swiped left past threshold or with significant velocity
      if (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -VELOCITY_THRESHOLD) {
        await controls.start({
          x: '-100%',
          transition: { type: 'tween', duration: 0.2 },
        });
        closeMobileSidebar();
      } else {
        // Snap back to open position
        controls.start({
          x: 0,
          transition: { type: 'spring', stiffness: 400, damping: 30 },
        });
      }
    },
    [controls, closeMobileSidebar]
  );

  // Handle edge swipe to open (optional enhancement)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only detect edge swipes from left edge when sidebar is closed
      if (!mobileSidebarOpen && e.touches[0].clientX < 20) {
        // Could implement edge swipe to open here
        // For now, we keep the toggle button as the primary open method
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, [mobileSidebarOpen]);

  return (
    <AnimatePresence>
      {mobileSidebarOpen && (
        <>
          {/* Backdrop with tap to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden touch-manipulation"
            aria-hidden="true"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />

          {/* Sidebar Drawer with swipe support */}
          <motion.aside
            ref={sidebarRef}
            initial={{ x: '-100%' }}
            animate={controls}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: -280, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            dragDirectionLock
            className="fixed left-0 top-0 z-50 h-screen w-[280px] bg-zinc-950 flex flex-col md:hidden touch-manipulation"
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'pan-y', // Allow vertical scroll, handle horizontal in component
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation sidebar"
          >
            {/* Swipe Handle Indicator */}
            <div
              className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center touch-none"
              aria-hidden="true"
            >
              <div className="w-1 h-12 bg-gray-300 rounded-full" />
            </div>

            {/* Header with Logo and Close Button */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Icon icon="lucide:sparkles" className="w-4 h-4 text-zinc-400" />
                </div>
                <span className="font-semibold text-white">Blackout Merchandise</span>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={closeMobileSidebar}
                className="
                  p-2 
                  rounded-lg 
                  hover:bg-zinc-800 
                  text-zinc-400 
                  transition-colors
                  touch-manipulation
                  min-w-[44px]
                  min-h-[44px]
                  flex items-center justify-center
                "
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Close sidebar"
              >
                <Icon icon="lucide:x" className="w-5 h-5" />
              </motion.button>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleNewChat}
                className="
                  w-full 
                  min-h-[48px]
                  bg-zinc-700 hover:bg-zinc-600 
                  active:bg-zinc-500
                  text-white 
                  transition-all duration-200 
                  rounded-lg 
                  flex items-center justify-center gap-2 
                  font-medium
                  touch-manipulation
                  shadow-sm
                "
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Icon icon="lucide:plus" className="w-5 h-5" />
                New Chat
              </motion.button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto px-3 py-2 overscroll-contain">
              <NavigationMenu collapsed={false} onItemClick={closeMobileSidebar} />
            </nav>

            {/* User Menu */}
            <div className="p-4 border-t border-zinc-800 pb-safe">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="
                      w-full 
                      min-h-[48px]
                      flex items-center justify-between 
                      px-3 py-2.5 
                      rounded-lg 
                      hover:bg-zinc-800 
                      active:bg-zinc-700
                      text-zinc-300 
                      transition-colors
                      touch-manipulation
                    "
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Icon icon="lucide:user" className="w-4 h-4 text-zinc-400" />
                      </div>
                      <span className="text-sm font-medium text-white">User</span>
                    </div>
                    <Icon icon="lucide:chevron-down" className="w-4 h-4 text-zinc-500" />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border border-zinc-800 shadow-lg">
                  <DropdownMenuItem
                    className="
                    text-zinc-300 hover:bg-zinc-800 hover:text-white
                    active:bg-zinc-700
                    cursor-pointer
                    min-h-[40px]
                  "
                  >
                    <Icon icon="lucide:user" className="mr-2 w-4 h-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="
                    text-zinc-300 hover:bg-zinc-800 hover:text-white
                    active:bg-zinc-700
                    cursor-pointer
                    min-h-[40px]
                  "
                  >
                    <Icon icon="lucide:settings" className="mr-2 w-4 h-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="
                    text-red-400 hover:bg-red-950/50 
                    active:bg-red-900/30
                    cursor-pointer
                    min-h-[40px]
                  "
                  >
                    <Icon icon="lucide:log-out" className="mr-2 w-4 h-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default MobileSidebar;
