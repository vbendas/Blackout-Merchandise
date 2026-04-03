'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type React from 'react';
import { NavigationMenu } from '@/components/NavigationMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';
import type { ActiveAgent } from '@/lib/NavigationContext';
import { useNavigation } from '@/lib/NavigationContext';

// Sidebar width constants
const SIDEBAR_EXPANDED_WIDTH = 280;

// Neutral glow colors - grey/white only
const GLOW_COLOR = 'rgba(255, 255, 255, 0.15)';
const RING_COLOR = 'rgba(255, 255, 255, 0.3)';

// Button text by agent
const AGENT_BUTTON_TEXT: Record<ActiveAgent, string> = {
  Leopoldo: 'Talk to Leopoldo',
  Francisca: 'Ask Francisca',
  Antônia: 'Contact Antônia',
};

export function Sidebar(): React.ReactElement {
  const { sidebarCollapsed, setChatState, activeAgent } = useNavigation();
  const { currentExpression, setExpression } = useAvatarExpression();

  // Use the active agent from navigation context
  const currentAgentName = activeAgent || 'Leopoldo';

  // Get button text
  const buttonText = AGENT_BUTTON_TEXT[currentAgentName];

  // Use neutral glow colors for all agents
  const glowColor = GLOW_COLOR;
  const ringColor = RING_COLOR;

  const handleStartChat = (): void => {
    setChatState('active');
  };

  const handleAvatarClick = (): void => {
    setChatState('active');
    // Flash expression on click
    setExpression('happy');
    setTimeout(() => setExpression('neutral'), 500);
  };

  const handleLogoClick = (): void => {
    setChatState('empty');
  };

  // Get avatar image URL
  const avatarUrl = getCloudinaryUrl(currentAgentName, currentExpression, 240);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: SIDEBAR_EXPANDED_WIDTH,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed left-0 top-0 z-40 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-hidden hidden md:flex"
    >
      {/* Logo Section - Centered at top */}
      <div className="flex items-center justify-center py-3 px-4">
        <button onClick={handleLogoClick} className="cursor-pointer">
          <motion.div
            initial={false}
            animate={{
              width: 175,
              height: 'auto',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative overflow-hidden"
          >
            <Image
              src="/logo/short.png"
              alt="MerchFrom"
              width={175}
              height={60}
              className="object-contain opacity-90 hover:opacity-100 transition-opacity"
              priority
            />
          </motion.div>
        </button>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center justify-center -mt-2 pb-4 px-4">
        {/* Full avatar section (160px) */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-col items-center gap-2"
        >
          {/* Avatar with expression glow - Clickable */}
          <motion.div
            className="relative cursor-pointer"
            onClick={handleAvatarClick}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
            title={`Click to chat with ${currentAgentName}`}
          >
            {/* Metallic glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              }}
            />

            {/* Avatar container with metallic ring and glow */}
            <div
              className="relative w-[160px] h-[160px] rounded-full overflow-hidden bg-zinc-900 ring-2 ring-offset-4 ring-offset-zinc-950 transition-all duration-300 animate-avatar-glow"
              style={{ ['--tw-ring-color' as string]: ringColor }}
            >
              <Image
                src={avatarUrl}
                alt={currentAgentName}
                width={160}
                height={160}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Dynamic Chat Button */}
      <div className="p-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleStartChat}
          className="w-full bg-zinc-700 hover:bg-zinc-600 text-white transition-all duration-200 rounded-lg flex items-center justify-center gap-2 font-medium h-10 px-4"
          title={buttonText}
        >
          <Icon icon="lucide:plus" className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap overflow-hidden">{buttonText}</span>
        </motion.button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <NavigationMenu collapsed={sidebarCollapsed} />
      </nav>

      {/* User Menu */}
      <div className="p-3 border-t border-zinc-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors justify-between active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <Icon icon="lucide:user" className="w-4 h-4 text-zinc-400" />
                </div>
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden">User</span>
              </div>
              <Icon icon="lucide:chevron-down" className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 bg-zinc-900 border border-zinc-700 shadow-lg">
            <DropdownMenuItem className="text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white">
              <Icon icon="lucide:user" className="mr-2 w-4 h-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white">
              <Icon icon="lucide:settings" className="mr-2 w-4 h-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-400 hover:bg-red-950/50 cursor-pointer focus:bg-red-950/50 focus:text-red-400">
              <Icon icon="lucide:log-out" className="mr-2 w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.aside>
  );
}

// Mobile toggle button component - only visible on mobile/tablet
export function MobileSidebarToggle(): React.ReactElement {
  const { mobileSidebarOpen, openMobileSidebar } = useNavigation();

  return (
    <motion.button
      initial={false}
      animate={{ scale: 1 }}
      whileTap={{ scale: 0.9 }}
      onClick={openMobileSidebar}
      className="fixed left-4 top-4 z-30 md:hidden bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 shadow-sm rounded-lg p-2"
      aria-label="Open sidebar"
      aria-expanded={mobileSidebarOpen}
    >
      <Icon icon="lucide:menu" className="w-5 h-5 text-zinc-300" />
    </motion.button>
  );
}
