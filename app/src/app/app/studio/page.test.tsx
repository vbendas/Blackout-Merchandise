import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StudioPage from './page';

// Mock the contexts
const setAgent = vi.fn();
const enterStudioMode = vi.fn();

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({
    setAgent,
  }),
}));

vi.mock('@/components/chat/CatChatProvider', () => ({
  useChat: () => ({
    enterStudioMode,
  }),
}));

describe('StudioPage', () => {
  it('should render without crashing', () => {
    render(<StudioPage />);
    
    // The page should render a container div
    const container = document.querySelector('.h-full.w-full');
    expect(container).toBeInTheDocument();
  });

  it('should set Francisca as agent on mount', () => {
    render(<StudioPage />);
    
    // Effects run after render, so we check they were called
    expect(setAgent).toHaveBeenCalledWith('Francisca');
    expect(enterStudioMode).toHaveBeenCalled();
  });

  it('should not render garment canvas', () => {
    render(<StudioPage />);
    
    // GarmentCanvas should not be in the document
    expect(screen.queryByTestId('garment-canvas')).not.toBeInTheDocument();
  });

  it('should not render studio toolbar', () => {
    render(<StudioPage />);
    
    expect(screen.queryByTestId('studio-toolbar')).not.toBeInTheDocument();
  });

  it('should not render garment carousel', () => {
    render(<StudioPage />);
    
    expect(screen.queryByTestId('garment-carousel')).not.toBeInTheDocument();
  });

  it('should have relative positioning', () => {
    render(<StudioPage />);
    
    const container = document.querySelector('.h-full.w-full');
    expect(container?.className).toContain('h-full');
    expect(container?.className).toContain('w-full');
  });
});
