'use client';

import { useState, useRef, useCallback } from 'react';
import { useChat } from '@/context/ChatContext';
import { VoiceRecorder } from './VoiceRecorder';

export function ChatInput() {
  const { isVoiceMode, addMessage, currentAgent, messages } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    
    setIsSending(true);
    
    // Add user message
    addMessage({
      role: 'user',
      content: inputValue.trim(),
      type: 'text',
      agent: currentAgent,
    });
    
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Send to API
      const history = messages.slice(-10);
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue.trim(),
          agent: currentAgent,
          history,
        }),
      });

      const data = await response.json();
      
      // Add assistant response
      addMessage({
        role: 'assistant',
        content: data.response,
        type: 'text',
        agent: data.agent || currentAgent,
      });

      // Handle agent switch
      if (data.agentChanged && data.agent) {
        // Agent switched - could show notification
      }
    } catch (error) {
      console.error('Send error:', error);
      addMessage({
        role: 'assistant',
        content: 'Desculpe, houve um erro. Tente novamente.',
        type: 'text',
        agent: currentAgent,
      });
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, addMessage, currentAgent, messages]);

  const handleVoiceRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    setIsSending(true);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;
      
      // Add placeholder audio message
      addMessage({
        role: 'user',
        content: '🎤 Voice message',
        type: 'audio',
        audioUrl: URL.createObjectURL(audioBlob),
        duration: Math.floor(duration / 1000),
        agent: currentAgent,
      });

      // Send to voice API
      const response = await fetch('/api/chat/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: undefined,
          audio: base64Audio,
          agent: currentAgent,
          history: messages.slice(-10),
        }),
      });

      const data = await response.json();
      
      // Add assistant response
      if (data.response) {
        addMessage({
          role: 'assistant',
          content: data.response,
          type: data.audioUrl ? 'audio' : 'text',
          audioUrl: data.audioUrl,
          agent: data.agent || currentAgent,
        });
      }
    } catch (error) {
      console.error('Voice error:', error);
      addMessage({
        role: 'assistant',
        content: 'Desculpe, houve um erro com a mensagem de voz. Tente novamente.',
        type: 'text',
        agent: currentAgent,
      });
    } finally {
      setIsSending(false);
    }
  }, [addMessage, currentAgent, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  };

  if (isVoiceMode) {
    return (
      <div className="p-4 border-t border-zinc-800">
        <VoiceRecorder 
          onRecordingComplete={handleVoiceRecordingComplete}
        />
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-zinc-800">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={isSending}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-rose-500 transition-colors max-h-[100px] disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isSending}
          className="p-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}