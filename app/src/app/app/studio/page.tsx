'use client';

import { useEffect } from 'react';
import { useNavigation } from '@/lib/NavigationContext';
import { useViewportSize } from '@/hooks/useViewportSize';
import { GarmentCanvas } from '@/components/studio/GarmentCanvas';
import { StudioToolbar } from '@/components/studio/StudioToolbar';
import { GarmentCarousel } from '@/components/studio/GarmentCarousel';
import { cn } from '@/lib/utils';

export default function StudioPage() {
  const { setAgent } = useNavigation();
  const { isDesktop } = useViewportSize();

  useEffect(() => {
    setAgent('Francisca');
  }, [setAgent]);

  const isStudioChatOpen = isDesktop; // Chat is open by default on desktop

  return (
    <div className="relative h-full w-full">
      {/* 3D Garment Scene - with right padding on desktop for chat panel */}
      <div
        className={cn(
          'absolute inset-0 transition-all duration-300',
          isDesktop && isStudioChatOpen ? 'right-[380px]' : 'right-0'
        )}
      >
        <GarmentCanvas />
      </div>

      {/* Floating Toolbar */}
      <StudioToolbar />

      {/* Bottom Garment Carousel */}
      <GarmentCarousel />
    </div>
  );
}
