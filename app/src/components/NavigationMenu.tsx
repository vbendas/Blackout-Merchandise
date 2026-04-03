'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import type React from 'react';
import { useChat } from '@/lib/ChatContext';
import { type CurrentRoute, useNavigation } from '@/lib/NavigationContext';
import { useProductList } from '@/lib/ProductListContext';

// Menu items configuration
const MENU_ITEMS: Array<{
  icon: string;
  label: string;
  route: CurrentRoute;
  description: string;
  isDesign?: boolean;
}> = [
  { icon: 'gallery', label: 'Catalog', route: 'catalog', description: 'Browse products' },
  { icon: 'palette', label: 'Design', route: 'catalog', description: 'Create designs', isDesign: true },
  { icon: 'cart-large-2', label: 'E-Shop', route: 'eshop', description: 'Manage your store' },
  { icon: 'headphones-round', label: 'Support', route: 'support', description: 'Get help from Antônia' },
];

interface NavigationMenuProps {
  collapsed?: boolean;
  onItemClick?: () => void;
}

export function NavigationMenu({ collapsed = false, onItemClick }: NavigationMenuProps): React.ReactElement {
  const { currentRoute, navigate, setChatState, setAgent } = useNavigation();
  const { setDesignFlowStep, closeChat, switchAgent } = useChat();
  const { items: productListItems } = useProductList();

  const handleNavigate = (route: CurrentRoute, isDesign = false): void => {
    try {
      console.log('[NavigationMenu] Navigating to:', route, isDesign ? '(Design)' : '');

      // Handle Design specially
      if (isDesign) {
        // Check if user has products selected
        if (productListItems.length === 0) {
          // No products selected - redirect to catalog with Francisca message
          navigate('catalog');
          setAgent('Francisca');
          setChatState('catalog');
          // Store a flag to show the "need products" message
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('studio_redirect_no_products', 'true');
          }
        } else {
          // Products selected - start design flow via chat
          navigate('catalog');
          setAgent('Francisca');
          setChatState('active');
          setDesignFlowStep('product-selected');
        }
        onItemClick?.();
        return;
      }

      navigate(route);

      // Set agent based on route
      if (route === 'chat') {
        setAgent('Leopoldo');
      } else if (route === 'catalog') {
        setAgent('Francisca');
      } else if (route === 'eshop' || route === 'support') {
        setAgent('Antônia');
      }

      // Set chat state based on route and close chat for eshop/support
      if (route === 'catalog') {
        setChatState('catalog');
        setDesignFlowStep('idle');
      } else if (route === 'eshop') {
        setChatState('eshop');
        closeChat();
        setDesignFlowStep('idle');
      } else if (route === 'support') {
        setChatState('support');
        switchAgent('Antônia');
        closeChat();
        setDesignFlowStep('idle');
      } else if (route === 'chat') {
        setChatState('active');
      } else {
        setChatState('empty');
        setDesignFlowStep('idle');
      }

      // Call onItemClick if provided (for mobile sidebar)
      onItemClick?.();
      console.log('[NavigationMenu] Navigation complete');
    } catch (error) {
      console.error('[NavigationMenu] Error in handleNavigate:', error);
    }
  };

  return (
    <div className="space-y-0.5">
      {MENU_ITEMS.map((item) => {
        const isActive = currentRoute === item.route && !item.isDesign;
        const isDesignActive = item.isDesign && currentRoute === 'catalog'; // Design uses catalog route
        const showActive = isActive || isDesignActive;

        return (
          <motion.button
            key={item.label}
            onClick={() => handleNavigate(item.route, item.isDesign)}
            whileTap={{ scale: 0.98 }}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              transition-all duration-200 group
              ${collapsed ? 'justify-center' : 'justify-start'}
              ${showActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
            `}
            title={item.description}
            aria-current={showActive ? 'page' : undefined}
            aria-label={item.description}
          >
            <div
              className={`
              flex-shrink-0 transition-colors
              ${showActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}
            `}
            >
              <Icon icon={`solar:${item.icon}-linear`} className="w-5 h-5" />
            </div>
            <motion.span
              initial={false}
              animate={{ opacity: collapsed ? 0 : 1 }}
              className={`
                text-sm font-medium whitespace-nowrap overflow-hidden
                ${collapsed ? 'w-0' : 'w-auto'}
              `}
            >
              {item.label}
            </motion.span>
            {showActive && !collapsed && (
              <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
