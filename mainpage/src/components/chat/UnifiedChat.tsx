'use client';

import { useChat } from '@/context/ChatContext';
import { FloatingButton } from './FloatingButton';
import { ChatWindow } from './ChatWindow';

export function UnifiedChat() {
  const { isOpen } = useChat();

  return (
    <>
      <FloatingButton />
      {isOpen && <ChatWindow />}
    </>
  );
}