'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';

interface NewChatDialogContextType {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const NewChatDialogContext = createContext<NewChatDialogContextType | undefined>(undefined);

export function NewChatDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  return (
    <NewChatDialogContext.Provider value={{ isOpen, openDialog, closeDialog }}>
      {children}
    </NewChatDialogContext.Provider>
  );
}

export function useNewChatDialog() {
  const context = useContext(NewChatDialogContext);
  if (!context) {
    throw new Error('useNewChatDialog must be used within a NewChatDialogProvider');
  }
  return context;
}
