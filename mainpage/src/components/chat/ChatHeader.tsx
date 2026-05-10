'use client';

import { useChat } from '@/context/ChatContext';
import { getAgentRole } from '@/lib/chat/agentRouter';
import Image from 'next/image';

export function ChatHeader() {
  const { currentAgent, closeChat } = useChat();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
          <Image
            src={`https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/${currentAgent.toLowerCase()}/neutral_attr1_subject.png`}
            alt={currentAgent}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-semibold text-white">{currentAgent}</h3>
          <p className="text-xs text-zinc-400">{getAgentRole(currentAgent)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Close button */}
        <button
          onClick={closeChat}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          aria-label="Close chat"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
