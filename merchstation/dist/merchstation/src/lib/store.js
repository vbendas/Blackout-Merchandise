import { create } from 'zustand';
export const useAppStore = create((set) => ({
    isAuthenticated: false,
    config: null,
    currentScreen: 'login',
    screenParams: {},
    sidebarFocusIndex: 0,
    statusMessage: '',
    dbConnected: false,
    setAuthenticated: (config) => set({ isAuthenticated: true, config, currentScreen: 'catalog' }),
    setScreen: (screen, params = {}) => set({ currentScreen: screen, screenParams: params }),
    setStatus: (message) => set({ statusMessage: message }),
    setDbConnected: (connected) => set({ dbConnected: connected }),
    setSidebarFocus: (index) => set({ sidebarFocusIndex: index }),
    logout: () => set({
        isAuthenticated: false,
        config: null,
        currentScreen: 'login',
        screenParams: {},
        sidebarFocusIndex: 0,
        dbConnected: false,
    }),
}));
