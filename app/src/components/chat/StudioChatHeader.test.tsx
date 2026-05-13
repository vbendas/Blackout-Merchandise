import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioChatHeader } from '@/components/chat/StudioChatHeader';
import type { GarmentStatus } from '@/types/chat';

const mockGarments: GarmentStatus[] = [
  { id: '1', name: 'Black Hoodie', sku: 'HD-BLK-001', status: 'pending' },
  { id: '2', name: 'White T-Shirt', sku: 'TS-WHT-001', status: 'in_progress' },
  { id: '3', name: 'Navy Cap', sku: 'CP-NVY-001', status: 'approved' },
  { id: '4', name: 'Grey Sweatpants', sku: 'SP-GRY-001', status: 'approved' },
];

describe('StudioChatHeader', () => {
  it('should render studio title', () => {
    render(<StudioChatHeader garmentList={mockGarments} onExit={vi.fn()} />);
    
    expect(screen.getByText('Merch Studio')).toBeInTheDocument();
    expect(screen.getByText('with Francisca')).toBeInTheDocument();
  });

  it('should show progress count', () => {
    const { container } = render(<StudioChatHeader garmentList={mockGarments} onExit={vi.fn()} />);
    
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('of');
    expect(container.textContent).toContain('4');
    expect(container.textContent).toContain('approved');
  });

  it('should show in-progress count', () => {
    const { container } = render(<StudioChatHeader garmentList={mockGarments} onExit={vi.fn()} />);
    
    expect(container.textContent).toContain('1 in progress');
  });

  it('should not show in-progress when none', () => {
    const noProgress = mockGarments.map((g) => ({ ...g, status: 'pending' as const }));
    const { container } = render(<StudioChatHeader garmentList={noProgress} onExit={vi.fn()} />);
    
    expect(container.textContent).not.toContain('in progress');
  });

  it('should call onExit when exit button clicked', () => {
    const onExit = vi.fn();
    render(<StudioChatHeader garmentList={mockGarments} onExit={onExit} />);
    
    const exitButton = screen.getByLabelText('Exit studio');
    fireEvent.click(exitButton);
    
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('should have sticky positioning', () => {
    const { container } = render(<StudioChatHeader garmentList={mockGarments} onExit={vi.fn()} />);
    
    const header = container.firstChild as HTMLElement;
    expect(header?.className).toContain('sticky');
  });

  it('should have backdrop blur', () => {
    const { container } = render(<StudioChatHeader garmentList={mockGarments} onExit={vi.fn()} />);
    
    const header = container.firstChild as HTMLElement;
    expect(header?.className).toContain('backdrop');
  });

  it('should render francisca sparkles icon', () => {
    render(<StudioChatHeader garmentList={mockGarments} onExit={vi.fn()} />);
    
    // The sparkles icon wrapper should be present
    const iconWrapper = document.querySelector('.bg-purple-500\\/20');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('should handle empty garment list', () => {
    const { container } = render(<StudioChatHeader garmentList={[]} onExit={vi.fn()} />);
    
    expect(container.textContent).toContain('0');
    expect(container.textContent).toContain('of');
    expect(container.textContent).toContain('0');
    expect(container.textContent).toContain('approved');
  });

  it('should show all approved state', () => {
    const allApproved = mockGarments.map((g) => ({ ...g, status: 'approved' as const }));
    const { container } = render(<StudioChatHeader garmentList={allApproved} onExit={vi.fn()} />);
    
    expect(container.textContent).toContain('4');
    expect(container.textContent).toContain('of');
    expect(container.textContent).toContain('4');
    expect(container.textContent).toContain('approved');
  });
});
