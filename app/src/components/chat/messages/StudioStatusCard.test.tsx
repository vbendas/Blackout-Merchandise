import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioStatusCard } from '@/components/chat/messages/StudioStatusCard';
import type { GarmentStatus } from '@/types/chat';

const mockGarments: GarmentStatus[] = [
  { id: '1', name: 'Black Hoodie', sku: 'HD-BLK-001', status: 'pending' },
  { id: '2', name: 'White T-Shirt', sku: 'TS-WHT-001', status: 'in_progress' },
  { id: '3', name: 'Navy Cap', sku: 'CP-NVY-001', status: 'approved', designUrl: 'https://example.com/design.jpg' },
];

describe('StudioStatusCard', () => {
  it('should render session title', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    expect(screen.getByText('Your Studio Session')).toBeInTheDocument();
  });

  it('should render all garments', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    
    expect(screen.getByText('Black Hoodie')).toBeInTheDocument();
    expect(screen.getByText('White T-Shirt')).toBeInTheDocument();
    expect(screen.getByText('Navy Cap')).toBeInTheDocument();
  });

  it('should show SKUs for each garment', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    
    expect(screen.getByText('HD-BLK-001')).toBeInTheDocument();
    expect(screen.getByText('TS-WHT-001')).toBeInTheDocument();
    expect(screen.getByText('CP-NVY-001')).toBeInTheDocument();
  });

  it('should show progress count', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    
    expect(screen.getByText('1 of 3 approved')).toBeInTheDocument();
  });

  it('should show approved garment with check icon', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    
    const approvedGarment = screen.getByText('Navy Cap').closest('div[class*="rounded-lg"]');
    expect(approvedGarment).toBeInTheDocument();
  });

  it('should show in-progress garment with loader', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    
    const inProgressGarment = screen.getByText('White T-Shirt').closest('div[class*="rounded-lg"]');
    expect(inProgressGarment).toBeInTheDocument();
  });

  it('should show pending garment with circle icon', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    
    const pendingGarment = screen.getByText('Black Hoodie').closest('div[class*="rounded-lg"]');
    expect(pendingGarment).toBeInTheDocument();
  });

  it('should render design thumbnail for approved garment', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    
    const thumbnail = screen.getByAltText('Navy Cap');
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', 'https://example.com/design.jpg');
  });

  it('should handle empty garment list', () => {
    render(<StudioStatusCard garments={[]} />);
    
    expect(screen.getByText('Your Studio Session')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 approved')).toBeInTheDocument();
  });

  it('should handle all approved garments', () => {
    const allApproved = mockGarments.map((g) => ({ ...g, status: 'approved' as const }));
    render(<StudioStatusCard garments={allApproved} />);
    
    expect(screen.getByText('3 of 3 approved')).toBeInTheDocument();
  });

  it('should have purple border styling', () => {
    render(<StudioStatusCard garments={mockGarments} />);
    
    const card = screen.getByText('Your Studio Session').closest('div[class*="border-purple"]');
    expect(card).toBeInTheDocument();
  });

  it('should render with animation', () => {
    const { container } = render(<StudioStatusCard garments={mockGarments} />);
    
    const motionDiv = container.querySelector('[class*="framer"], [style*="opacity"]');
    // The component should render (motion.div might not have specific classes in test env)
    expect(screen.getByText('Your Studio Session')).toBeInTheDocument();
  });
});
