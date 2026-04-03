'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

type TabType = 'overview' | 'products' | 'orders' | 'analytics';

interface DashboardTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'lucide:layout-dashboard' },
  { id: 'products', label: 'Products', icon: 'lucide:package' },
  { id: 'orders', label: 'Orders', icon: 'lucide:shopping-bag' },
  { id: 'analytics', label: 'Analytics', icon: 'lucide:bar-chart-3' },
];

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="border-b border-zinc-800 px-4 sm:px-6 lg:px-8">
      <nav className="flex gap-1" aria-label="Dashboard tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon icon={tab.icon} className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
