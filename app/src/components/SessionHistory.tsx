'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface StudioSession {
  id: string;
  userId?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    agent?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface SessionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (sessionId: string) => void;
}

export function SessionHistory({ isOpen, onClose, onLoadSession }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch sessions when opened
  useEffect(() => {
    if (!isOpen) return;

    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/studio/session?all=true');
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSessionSummary = (session: StudioSession) => {
    const franciscaMessages = session.messages.filter((m) => m.agent === 'francisca');
    const lastMessage = franciscaMessages[franciscaMessages.length - 1];
    // Count status cards from messages (simplified)
    const garmentCount = 3; // Default for now

    return {
      preview: lastMessage?.content || 'No messages yet',
      garmentCount: garmentCount,
      approvedCount: 0,
    };
  };

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />

      {/* Session History Panel - Slides from left */}
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -400, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-16 top-0 h-screen w-96 bg-zinc-950 border-r border-zinc-800 z-[100] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between p-6">
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(to right, rgb(39, 39, 42) 0%, rgb(39, 39, 42) 60%, transparent 100%)',
            }}
          />
          <div>
            <h2 className="text-lg font-semibold">Conversation Story</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Your studio sessions</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-foreground hover:bg-transparent hover:opacity-70"
          >
            <Icon icon="solar:close-circle-linear" width={24} height={24} />
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-zinc-500">
                <Icon icon="lucide:loader-2" className="h-6 w-6 animate-spin mx-auto" />
                <p className="mt-2 text-sm">Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon icon="lucide:sparkles" className="h-8 w-8 mx-auto text-purple-500/50 mb-2" />
                <p>No studio sessions yet</p>
                <p className="text-sm mt-1">Start designing to create your first session</p>
              </div>
            ) : (
              sessions.map((session, index) => {
                const summary = getSessionSummary(session);
                const date = new Date(session.updatedAt);

                return (
                  <motion.button
                    key={session.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      onLoadSession(session.id);
                      onClose();
                    }}
                    className="w-full text-left p-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-800 hover:border-purple-500/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20">
                            <Icon icon="lucide:sparkles" className="h-3 w-3 text-purple-400" />
                          </div>
                          <p className="font-medium text-sm truncate">Merch Studio</p>
                        </div>
                        <p className="text-xs text-purple-400/70 mt-1">Francisca</p>
                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{summary.preview}</p>
                        
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-zinc-600">
                            {summary.approvedCount} of {summary.garmentCount} approved
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap ml-2">
                        {date.toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
