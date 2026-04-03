'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import type React from 'react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChat } from '@/lib/ChatContext';
import { useNavigation } from '@/lib/NavigationContext';

// Navigation items
interface NavItem {
  icon: string;
  label: string;
  route: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'solar:gallery-linear', label: 'Catalog', route: 'catalog', description: 'Browse products' },
  { icon: 'solar:palette-linear', label: 'Design', route: 'design', description: 'Create designs' },
  { icon: 'solar:cart-large-2-linear', label: 'E-Shop', route: 'eshop', description: 'Manage your store' },
  { icon: 'solar:headphones-round-linear', label: 'Support', route: 'support', description: 'Get help' },
];

interface CollapsibleNavProps {
  className?: string;
}

export function CollapsibleNav({ className = '' }: CollapsibleNavProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { navigate, currentRoute } = useNavigation();
  const { openChat } = useChat();

  const toggleExpanded = () => setIsExpanded(!isExpanded);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const handleNavigate = (route: string) => {
    navigate(route as any);
    setMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    navigate('catalog');
  };

  return (
    <>
      {/* Desktop Navigation */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 200 : 64 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-zinc-800 bg-zinc-950 md:flex ${className}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Toggle button + Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-4">
          <button
            onClick={toggleExpanded}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
          >
            <Icon icon={isExpanded ? 'lucide:panel-left-close' : 'lucide:panel-left-open'} className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <button onClick={handleLogoClick} className="cursor-pointer">
                  <Image
                    src="/logo/short.png"
                    alt="MerchFrom"
                    width={100}
                    height={36}
                    className="object-contain opacity-90 hover:opacity-100 transition-opacity"
                    priority
                  />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.route;

            return (
              <motion.button
                key={item.route}
                onClick={() => handleNavigate(item.route)}
                whileTap={{ scale: 0.95 }}
                className={`
                  group flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200
                  ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
                `}
                title={item.description}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
                    isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                >
                  <Icon icon={item.icon} className="h-5 w-5" />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && isExpanded && (
                  <motion.div layoutId="navIndicator" className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Chat button */}
        <div className="p-3">
          <motion.button
            onClick={() => openChat()}
            whileTap={{ scale: 0.95 }}
            className={`
              group flex w-full items-center gap-3 rounded-lg bg-zinc-800 px-3 py-3
              text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white
            `}
            title="Open chat"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center text-zinc-500 group-hover:text-zinc-300">
              <Icon icon="lucide:message-circle" className="h-5 w-5" />
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap text-sm font-medium"
                >
                  Chat
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* User menu */}
        <div className="border-t border-zinc-800 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                  <Icon icon="lucide:user" className="h-4 w-4 text-zinc-400" />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-1 items-center justify-between"
                    >
                      <span className="whitespace-nowrap text-sm font-medium">User</span>
                      <Icon icon="lucide:chevron-down" className="h-4 w-4 text-zinc-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 border-zinc-800 bg-zinc-900">
              <DropdownMenuItem className="text-zinc-300 hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white cursor-pointer">
                <Icon icon="lucide:user" className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-zinc-300 hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white cursor-pointer">
                <Icon icon="lucide:settings" className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-400 hover:bg-red-950/50 cursor-pointer focus:bg-red-950/50 focus:text-red-400">
                <Icon icon="lucide:log-out" className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Mobile Navigation */}
      <>
        {/* Mobile toggle button */}
        <motion.button
          initial={false}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMobileMenu}
          className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 md:hidden"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
        >
          <Icon icon="lucide:menu" className="h-5 w-5 text-zinc-300" />
        </motion.button>

        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleMobileMenu}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              />

              {/* Slide-in menu */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 z-50 h-screen w-[280px] border-r border-zinc-800 bg-zinc-950 md:hidden"
              >
                {/* Header */}
                <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
                  <Image
                    src="/logo/short.png"
                    alt="MerchFrom"
                    width={120}
                    height={44}
                    className="object-contain"
                    priority
                  />

                  <button
                    onClick={toggleMobileMenu}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    aria-label="Close menu"
                  >
                    <Icon icon="lucide:x" className="h-5 w-5" />
                  </button>
                </div>

                {/* Navigation items */}
                <nav className="space-y-1 p-4">
                  {NAV_ITEMS.map((item) => {
                    const isActive = currentRoute === item.route;

                    return (
                      <motion.button
                        key={item.route}
                        onClick={() => handleNavigate(item.route)}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          flex w-full items-center gap-3 rounded-lg px-4 py-4
                          ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
                        `}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center ${
                            isActive ? 'text-white' : 'text-zinc-500'
                          }`}
                        >
                          <Icon icon={item.icon} className="h-5 w-5" />
                        </div>

                        <span className="text-base font-medium">{item.label}</span>

                        {isActive && <div className="ml-auto h-2 w-2 rounded-full bg-white" />}
                      </motion.button>
                    );
                  })}
                </nav>

                {/* Chat button */}
                <div className="p-4">
                  <motion.button
                    onClick={() => {
                      openChat();
                      setMobileMenuOpen(false);
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-4 text-white"
                  >
                    <Icon icon="lucide:message-circle" className="h-5 w-5" />
                    <span className="font-medium">Open Chat</span>
                  </motion.button>
                </div>

                {/* User menu */}
                <div className="border-t border-zinc-800 p-4">
                  <button className="flex w-full items-center gap-3 rounded-lg px-4 py-4 text-zinc-300 hover:bg-zinc-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                      <Icon icon="lucide:user" className="h-5 w-5 text-zinc-400" />
                    </div>
                    <span className="font-medium">User</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    </>
  );
}
