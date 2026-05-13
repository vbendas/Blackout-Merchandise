'use client';

import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { GarmentStatus } from '@/types/chat';

interface StudioStatusCardProps {
  garments: GarmentStatus[];
}

export function StudioStatusCard({ garments }: StudioStatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 backdrop-blur-xl"
    >
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-purple-300">
        Your Studio Session
      </h4>
      
      <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto">
        {garments.map((garment) => (
          <div
            key={garment.id}
            className="flex items-center gap-3 rounded-lg bg-zinc-900/60 px-3 py-2.5"
          >
            <div className="flex-shrink-0">
              {garment.status === 'approved' && (
                <Icon icon="lucide:check-circle" className="h-5 w-5 text-green-400" />
              )}
              {garment.status === 'in_progress' && (
                <Icon icon="lucide:loader-2" className="h-5 w-5 animate-spin text-purple-400" />
              )}
              {garment.status === 'pending' && (
                <Icon icon="lucide:circle" className="h-5 w-5 text-zinc-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {garment.name}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {garment.sku}
              </p>
            </div>
            
            {garment.designUrl && (
              <div className="flex-shrink-0 h-8 w-8 rounded-md overflow-hidden bg-zinc-800">
                <img 
                  src={garment.designUrl} 
                  alt={garment.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {garments.filter(g => g.status === 'approved').length} of {garments.length} approved
        </span>
      </div>
    </motion.div>
  );
}
