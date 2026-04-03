'use client';

import { Grid, List } from 'lucide-react';
import { Button } from '../ui/button';

interface ViewToggleProps {
  viewMode: 'grid' | 'slider';
  onViewChange: (mode: 'grid' | 'slider') => void;
}

/**
 * Toggle between grid and slider view modes
 * Part of Phase 3.5.5
 */
export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
      <Button
        onClick={() => onViewChange('grid')}
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        className="gap-1.5"
      >
        <Grid className="w-4 h-4" />
        Grid
      </Button>
      <Button
        onClick={() => onViewChange('slider')}
        variant={viewMode === 'slider' ? 'default' : 'ghost'}
        size="sm"
        className="gap-1.5"
      >
        <List className="w-4 h-4" />
        Slider
      </Button>
    </div>
  );
}
