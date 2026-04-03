'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import type { Notification } from '@/components/NotificationsPanel';

interface NotificationsContextType {
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markAsRead: (notificationId: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'notif-1',
      title: 'Order Confirmed',
      message: 'Your recent order has been confirmed and is being processed.',
      type: 'success',
      timestamp: new Date(Date.now() - 300000),
      read: false,
      agent: 'Leopoldo',
    },
    {
      id: 'notif-2',
      title: 'Design Review',
      message: 'Francisca has shared feedback on your product design.',
      type: 'info',
      timestamp: new Date(Date.now() - 600000),
      read: false,
      agent: 'Francisca',
    },
    {
      id: 'notif-3',
      title: 'Shipment Update',
      message: 'Your shipment is on the way and will arrive tomorrow.',
      type: 'info',
      timestamp: new Date(Date.now() - 3600000),
      read: true,
      agent: 'Antônia',
    },
  ]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider
      value={{
        isNotificationsOpen,
        setIsNotificationsOpen,
        notifications,
        addNotification,
        markAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
