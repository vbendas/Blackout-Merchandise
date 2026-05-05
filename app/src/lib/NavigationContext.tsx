'use client';

import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

// Types
export type CurrentRoute = 'chat' | 'eshop' | 'catalog' | 'settings' | 'support' | 'studio';
export type ChatState = 'empty' | 'active' | 'catalog' | 'eshop' | 'support';
export type ActiveAgent = 'Leopoldo' | 'Francisca' | 'Antônia';
export type AgentName = ActiveAgent;

export interface NavigationState {
  currentRoute: CurrentRoute;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  chatState: ChatState;
  activeAgent: ActiveAgent;
}

// Action types
export interface NavigationActions {
  navigate: (route: CurrentRoute) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setChatState: (state: ChatState) => void;
  setAgent: (agent: ActiveAgent) => void;
}

// Combined context type
export interface NavigationContextType extends NavigationState, NavigationActions {}

// Create context
export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Provider props
interface NavigationProviderProps {
  children: ReactNode;
}

// Provider component
export function NavigationProvider({ children }: NavigationProviderProps): React.ReactElement {
  const [currentRoute, setCurrentRoute] = useState<CurrentRoute>('chat');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [chatState, setChatState] = useState<ChatState>('empty');
  const [activeAgent, setActiveAgent] = useState<ActiveAgent>('Leopoldo');

  const navigate = useCallback((route: CurrentRoute): void => {
    setCurrentRoute(route);
  }, []);

  const toggleSidebar = useCallback((): void => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleSidebarCollapsed = useCallback((): void => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const openMobileSidebar = useCallback((): void => {
    setMobileSidebarOpen(true);
  }, []);

  const closeMobileSidebar = useCallback((): void => {
    setMobileSidebarOpen(false);
  }, []);

  const handleSetChatState = useCallback((state: ChatState): void => {
    setChatState(state);
  }, []);

  const handleSetAgent = useCallback((agent: ActiveAgent): void => {
    setActiveAgent(agent);
  }, []);

  const value = useMemo<NavigationContextType>(
    () => ({
      currentRoute,
      sidebarOpen,
      sidebarCollapsed,
      mobileSidebarOpen,
      chatState,
      activeAgent,
      navigate,
      toggleSidebar,
      toggleSidebarCollapsed,
      openMobileSidebar,
      closeMobileSidebar,
      setChatState: handleSetChatState,
      setAgent: handleSetAgent,
    }),
    [
      currentRoute,
      sidebarOpen,
      sidebarCollapsed,
      mobileSidebarOpen,
      chatState,
      activeAgent,
      navigate,
      toggleSidebar,
      toggleSidebarCollapsed,
      openMobileSidebar,
      closeMobileSidebar,
      handleSetChatState,
      handleSetAgent,
    ]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

// Custom hook
export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }

  return context;
}
