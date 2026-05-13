import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OptionChips } from '@/components/chat/messages/OptionChips';
import type { StudioOption } from '@/types/chat';

const mockOptions: StudioOption[] = [
  { id: '1', label: 'Option 1' },
  { id: '2', label: 'Option 2' },
  { id: '3', label: 'Option 3', imageUrl: 'https://example.com/img.jpg' },
];

describe('OptionChips', () => {
  it('should render all options', () => {
    render(<OptionChips options={mockOptions} onSelect={vi.fn()} />);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('should call onSelect when option is clicked', () => {
    const onSelect = vi.fn();
    render(<OptionChips options={mockOptions} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Option 1'));
    
    expect(onSelect).toHaveBeenCalledWith(mockOptions[0]);
  });

  it('should render image for option with imageUrl', () => {
    render(<OptionChips options={mockOptions} onSelect={vi.fn()} />);
    
    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('should disable all options after selection', () => {
    render(<OptionChips options={mockOptions} onSelect={vi.fn()} />);
    
    fireEvent.click(screen.getByText('Option 1'));
    
    // All buttons should now be disabled
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('should highlight selected option', () => {
    render(<OptionChips options={mockOptions} onSelect={vi.fn()} />);
    
    const option1Button = screen.getByText('Option 1').closest('button');
    fireEvent.click(option1Button!);
    
    // Selected option should have different styling
    expect(option1Button?.className).toContain('purple');
  });

  it('should not allow multiple selections', () => {
    const onSelect = vi.fn();
    render(<OptionChips options={mockOptions} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Option 1'));
    fireEvent.click(screen.getByText('Option 2'));
    
    // onSelect should only be called once
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should handle empty options array', () => {
    render(<OptionChips options={[]} onSelect={vi.fn()} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render chips in a flex wrap container', () => {
    const { container } = render(<OptionChips options={mockOptions} onSelect={vi.fn()} />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.className).toContain('flex');
    expect(wrapper?.className).toContain('wrap');
  });
});
