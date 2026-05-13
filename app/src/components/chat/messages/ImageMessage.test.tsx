import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageMessage } from '@/components/chat/messages/ImageMessage';

describe('ImageMessage', () => {
  const mockImageUrl = 'https://example.com/design.jpg';
  const mockCaption = 'My awesome design';

  it('should render image', () => {
    render(<ImageMessage imageUrl={mockImageUrl} />);
    
    const image = screen.getByAltText('Design');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockImageUrl);
  });

  it('should render with caption', () => {
    render(<ImageMessage imageUrl={mockImageUrl} caption={mockCaption} />);
    
    const image = screen.getByAltText(mockCaption);
    expect(image).toBeInTheDocument();
  });

  it('should show tap to expand label after load', async () => {
    render(<ImageMessage imageUrl={mockImageUrl} />);
    
    const image = screen.getByAltText('Design');
    fireEvent.load(image);
    
    await waitFor(() => {
      expect(screen.getByText('Tap to expand')).toBeInTheDocument();
    });
  });

  it('should open lightbox on click', async () => {
    render(<ImageMessage imageUrl={mockImageUrl} />);
    
    const image = screen.getByAltText('Design');
    fireEvent.load(image);
    
    await waitFor(() => {
      expect(screen.getByText('Tap to expand')).toBeInTheDocument();
    });
    
    fireEvent.click(image);
    
    await waitFor(() => {
      const lightboxImage = screen.getAllByAltText('Design')[1];
      expect(lightboxImage).toBeInTheDocument();
    });
  });

  it('should close lightbox on background click', async () => {
    render(<ImageMessage imageUrl={mockImageUrl} />);
    
    const image = screen.getByAltText('Design');
    fireEvent.load(image);
    
    await waitFor(() => {
      expect(screen.getByText('Tap to expand')).toBeInTheDocument();
    });
    
    fireEvent.click(image);
    
    await waitFor(() => {
      expect(screen.getAllByAltText('Design')).toHaveLength(2);
    });
    
    // Click the lightbox overlay (background)
    const overlay = screen.getAllByAltText('Design')[1].closest('div[class*="fixed"]');
    if (overlay) {
      fireEvent.click(overlay);
    }
    
    // Lightbox should be closed
    await waitFor(() => {
      expect(screen.getAllByAltText('Design')).toHaveLength(1);
    });
  });

  it('should show loading skeleton initially', () => {
    const { container } = render(<ImageMessage imageUrl={mockImageUrl} />);
    
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('should hide skeleton after image loads', () => {
    const { container } = render(<ImageMessage imageUrl={mockImageUrl} />);
    
    const image = screen.getByAltText('Design');
    fireEvent.load(image);
    
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeInTheDocument();
  });

  it('should have rounded corners', () => {
    const { container } = render(<ImageMessage imageUrl={mockImageUrl} />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper?.className).toContain('rounded');
  });
});
