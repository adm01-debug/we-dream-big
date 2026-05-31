import { render, screen, fireEvent } from '@testing-library/react';
import { OptimizedImage } from '../OptimizedImage';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('OptimizedImage', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    alt: 'Test Image',
    blurAmount: 20,
    zoomAmount: 1.1,
    duration: 500,
  };

  beforeEach(() => {
    // IntersectionObserver mock is usually global in setupFiles, 
    // but we can ensure it exists here if needed.
    vi.clearAllMocks();
  });

  it('renders a shimmer or placeholder when loading', () => {
    render(<OptimizedImage {...defaultProps} />);
    
    // Check for shimmer or placeholder element
    // By default, if no lqip, we show a local placeholder img with blur
    const placeholder = screen.getByRole('img', { hidden: true });
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveStyle('filter: blur(20px)');
  });

  it('applies fade-in and removes blur after onLoad', () => {
    render(<OptimizedImage {...defaultProps} />);
    
    const img = screen.getByAltText('Test Image');
    expect(img).toHaveClass('opacity-0');
    expect(img).toHaveStyle('filter: blur(20px)');

    // Simulate image load
    fireEvent.load(img);

    expect(img).toHaveClass('opacity-100');
    expect(img).toHaveStyle('filter: none');
  });

  it('shows error state when image fails to load', () => {
    render(<OptimizedImage {...defaultProps} />);
    
    const img = screen.getByAltText('Test Image');
    
    // Simulate error
    fireEvent.error(img);

    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
  });

  it('uses lqip if provided', () => {
    const lqip = 'data:image/png;base64,lqip-data';
    render(<OptimizedImage {...defaultProps} lqip={lqip} />);
    
    const placeholder = screen.getByRole('img', { hidden: true });
    expect(placeholder).toHaveAttribute('src', lqip);
  });
});
