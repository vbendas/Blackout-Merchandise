'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/context/ChatContext';

export function ChatInput() {
  const { addMessage, currentAgent, messages } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inline mic hold-to-speak state
  const [isRecording, setIsRecording] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // MediaRecorder helpers
  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });
      
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        const duration = Date.now() - recordingStartTimeRef.current;
        stream.getTracks().forEach(t => t.stop());
        handleVoiceRecordingComplete(blob, duration);
      };
      
      recorder.start(100);
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
    }
  }, [handleVoiceRecordingComplete]);
  
  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Hold-to-speak handlers
  const handleMicMouseDown = useCallback(() => {
    isHoldingRef.current = true;
    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        startMediaRecorder();
      }
    }, 300);
  }, [startMediaRecorder]);
  
  const handleMicMouseUp = useCallback(() => {
    const wasHolding = isHoldingRef.current;
    isHoldingRef.current = false;
    
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    if (isRecording) {
      stopMediaRecorder();
    } else if (wasHolding) {
      // It was a click — show tooltip
      setShowTooltip(true);
      tooltipTimerRef.current = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
    }
  }, [isRecording, stopMediaRecorder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

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

  return (
    <div className="p-4 border-t border-zinc-800">
      <div className="flex items-end gap-2">
        {/* Mic Button with Hold-to-Speak */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseDown={handleMicMouseDown}
            onMouseUp={handleMicMouseUp}
            onMouseLeave={handleMicMouseUp}
            onTouchStart={(e) => {
              e.preventDefault();
              handleMicMouseDown();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleMicMouseUp();
            }}
            className={`flex items-center justify-center rounded-xl transition-all ${
              isRecording
                ? 'bg-rose-600 text-white ring-[3px] ring-rose-400/60 shadow-[0_0_20px_rgba(225,29,72,0.4)] scale-110'
                : 'p-3 text-zinc-400 hover:bg-zinc-800 hover:text-white'
            } ${isRecording ? 'p-3' : ''}`}
            aria-label="Hold to speak"
            disabled={isSending}
          >
            <svg 
              className={`w-5 h-5 ${isRecording ? 'text-white' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            </svg>
          </motion.button>

          {/* Hold to Speak Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-50"
              >
                Hold to speak
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
