'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SessionItem {
  id: string;
  title: string;
  agent: 'Leopoldo' | 'Francisca' | 'Antônia';
  timestamp: Date;
  preview: string;
}

interface SessionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionItem[];
  onSelectSession: (sessionId: string) => void;
}

export function SessionHistory({ isOpen, onClose, sessions, onSelectSession }: SessionHistoryProps) {
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
          {/* Gradient border - solid on left, fade on right */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(to right, rgb(39, 39, 42) 0%, rgb(39, 39, 42) 60%, transparent 100%)',
            }}
          />
          <h2 className="text-lg font-semibold">Session History</h2>
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
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No sessions yet</p>
              </div>
            ) : (
              sessions.map((session, index) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className="w-full text-left p-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-800 hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{session.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{session.agent}</p>
                      <p className="text-xs text-zinc-600 mt-2 line-clamp-2">{session.preview}</p>
                    </div>
                    <span className="text-xs text-zinc-500 whitespace-nowrap ml-2">
                      {session.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
