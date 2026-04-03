'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/lib/ChatContext';
import { type CurrentRoute, useNavigation } from '@/lib/NavigationContext';

// Quick actions configuration - unified grey/white color scheme
const QUICK_ACTIONS = [
  {
    icon: 'lucide:folder-open',
    label: 'Browse Catalog',
    route: 'catalog' as CurrentRoute,
    description: 'View all products',
    gradient: 'from-zinc-700/20 via-zinc-600/10 to-transparent',
    iconBg: 'bg-zinc-700/20',
    iconColor: 'text-zinc-300',
    borderColor: 'border-zinc-700/30',
    glowColor: 'group-hover:shadow-zinc-400/10',
  },
  {
    icon: 'lucide:store',
    label: 'E-shop Dashboard',
    route: 'eshop' as CurrentRoute,
    description: 'Manage your store',
    gradient: 'from-zinc-700/20 via-zinc-600/10 to-transparent',
    iconBg: 'bg-zinc-700/20',
    iconColor: 'text-zinc-300',
    borderColor: 'border-zinc-700/30',
    glowColor: 'group-hover:shadow-zinc-400/10',
  },
  {
    icon: 'lucide:package',
    label: 'Bulk Pricing',
    route: 'chat' as CurrentRoute,
    description: 'Get volume discounts',
    gradient: 'from-zinc-700/20 via-zinc-600/10 to-transparent',
    iconBg: 'bg-zinc-700/20',
    iconColor: 'text-zinc-300',
    borderColor: 'border-zinc-700/30',
    glowColor: 'group-hover:shadow-zinc-400/10',
  },
  {
    icon: 'lucide:help-circle',
    label: 'Get Help',
    route: 'support' as CurrentRoute,
    description: 'Contact support',
    gradient: 'from-zinc-700/20 via-zinc-600/10 to-transparent',
    iconBg: 'bg-zinc-700/20',
    iconColor: 'text-zinc-300',
    borderColor: 'border-zinc-700/30',
    glowColor: 'group-hover:shadow-zinc-400/10',
  },
  {
    icon: 'lucide:settings',
    label: 'Setup Store',
    route: 'settings' as CurrentRoute,
    description: 'Configure your store',
    gradient: 'from-zinc-700/20 via-zinc-600/10 to-transparent',
    iconBg: 'bg-zinc-700/20',
    iconColor: 'text-zinc-300',
    borderColor: 'border-zinc-700/30',
    glowColor: 'group-hover:shadow-zinc-400/10',
  },
];

export function QuickActionsGrid(): React.ReactElement {
  const { navigate, setChatState, setAgent } = useNavigation();
  const { switchAgent } = useChat();

  const handleActionClick = (route: CurrentRoute): void => {
    navigate(route);

    // Set agent based on route
    if (route === 'support') {
      setAgent('Antônia');
      switchAgent('Antônia');
    }

    // Update chat state based on route
    if (route === 'catalog') {
      setChatState('catalog');
    } else if (route === 'eshop') {
      setChatState('eshop');
    } else if (route === 'chat') {
      setChatState('empty');
    } else {
      // For other routes, keep current chat state or set to active
      setChatState('active');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[680px] mx-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300">
        {QUICK_ACTIONS.map((action, index) => (
          <motion.div
            key={action.route}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group"
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleActionClick(action.route)}
              aria-label={action.description}
              tabIndex={0}
              className={`
                relative w-full h-auto flex flex-col items-start gap-3 p-5
                bg-gradient-to-br ${action.gradient}
                ${action.borderColor} border rounded-2xl
                text-left transition-all duration-300 overflow-hidden
                focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950
                hover:border-zinc-600 hover:shadow-2xl ${action.glowColor}
                shadow-lg shadow-black/20
              `}
            >
              {/* Subtle shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              <div className="flex items-center gap-3 w-full relative z-10">
                {/* Icon with circular background */}
                <div
                  className={`
                  w-12 h-12 rounded-xl ${action.iconBg}
                  flex items-center justify-center
                  transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
                `}
                >
                  <Icon icon={action.icon} className={`w-6 h-6 ${action.iconColor}`} />
                </div>
                <span className="font-semibold text-zinc-100 text-sm">{action.label}</span>
              </div>
              <span className="text-xs text-zinc-400 leading-relaxed relative z-10 pl-[60px]">
                {action.description}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default QuickActionsGrid;
