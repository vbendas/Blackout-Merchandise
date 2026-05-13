'use client';

import { useEffect } from 'react';
import { useNavigation } from '@/lib/NavigationContext';
import { useChat } from '@/components/chat/CatChatProvider';

export default function StudioPage() {
  const { setAgent } = useNavigation();
  const { enterStudioMode } = useChat();

  useEffect(() => {
    setAgent('Francisca');
    enterStudioMode();
  }, [setAgent, enterStudioMode]);

  // The full-screen chat is rendered by CatChat component globally
  // This page intentionally renders nothing — the chat IS the page content
  return (
    <div className="h-full w-full">
      {/* Studio content is the full-screen chat handled by CatChatProvider/CatChat */}
    </div>
  );
}
