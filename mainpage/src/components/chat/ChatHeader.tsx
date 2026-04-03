'use client';

import { useChat } from '@/context/ChatContext';
import { getAgentRole } from '@/lib/chat/agentRouter';
import Image from 'next/image';

export function ChatHeader() {
  const { currentAgent, closeChat, isVoiceMode, setVoiceMode } = useChat();

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
        {/* Voice/Text Toggle */}
        <button
          onClick={() => setVoiceMode(!isVoiceMode)}
          className={`p-2 rounded-lg transition-colors ${
            isVoiceMode ? 'bg-rose-500 text-white' : 'text-zinc-400 hover:text-white'
          }`}
          aria-label={isVoiceMode ? 'Switch to text' : 'Switch to voice'}
        >
          {isVoiceMode ? (
            // Keyboard icon
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ) : (
            // Waveform icon
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          )}
        </button>

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