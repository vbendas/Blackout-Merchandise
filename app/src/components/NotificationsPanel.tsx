'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  agent?: 'Leopoldo' | 'Francisca' | 'Antônia';
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onClearAll: () => void;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'success':
      return 'solar:check-circle-linear';
    case 'warning':
      return 'solar:info-circle-linear';
    case 'error':
      return 'solar:close-circle-linear';
    default:
      return 'solar:bell-linear';
  }
};

const getColorForType = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-blue-500';
  }
};

export function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

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

      {/* Notifications Panel - Slides from left, full height */}
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
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && <p className="text-xs text-zinc-500 mt-1">{unreadCount} unread</p>}
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

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Icon icon="solar:bell-linear" width={32} height={32} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  whileHover={{ x: 4 }}
                  onClick={() => onMarkAsRead(notification.id)}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    notification.read
                      ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900'
                      : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 mt-1 ${getColorForType(notification.type)}`}>
                      <Icon icon={getIconForType(notification.type)} width={20} height={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm ${notification.read ? 'text-zinc-400' : 'text-white'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{notification.message}</p>
                      {notification.agent && <p className="text-xs text-zinc-600 mt-2">{notification.agent}</p>}
                      <p className="text-xs text-zinc-700 mt-2">
                        {notification.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Footer - Clear All */}
        {notifications.length > 0 && (
          <div className="border-t border-zinc-800 p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="w-full text-zinc-400 hover:text-foreground"
            >
              Clear All
            </Button>
          </div>
        )}
      </motion.div>
    </>
  );
}
