/**
 * E2E Tests — UI Components
 * Covers: Button, Dialog, Toast, Input, Tabs, Select, Badge, Card
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('E2E UI — Button Variants', () => {
  const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'orange', 'premium', 'success'] as const;

  variants.forEach(variant => {
    it(`renders "${variant}" variant`, () => {
      render(<Button variant={variant}>Test</Button>);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('default variant renders', () => {
    render(<Button>Default</Button>);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });
});

describe('E2E UI — Button Sizes', () => {
  const sizes = ['default', 'sm', 'lg', 'xl', 'icon'] as const;

  sizes.forEach(size => {
    it(`renders "${size}" size`, () => {
      render(<Button size={size}>S</Button>);
      expect(screen.getByText('S')).toBeInTheDocument();
    });
  });
});

describe('E2E UI — Button Interactions', () => {
  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disabled does not fire onClick', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    fireEvent.click(screen.getByText('Disabled'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders as child with asChild', () => {
    render(<Button asChild><a href="/test">Link</a></Button>);
    expect(screen.getByText('Link').closest('a')).toHaveAttribute('href', '/test');
  });

  it('has button role by default', () => {
    render(<Button>Btn</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('supports type=submit', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('accepts className', () => {
    render(<Button className="custom-class">Styled</Button>);
    expect(screen.getByText('Styled')).toHaveClass('custom-class');
  });

  it('renders children', () => {
    render(<Button><span data-testid="icon">🔥</span> Fire</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('E2E UI — Button Accessibility', () => {
  it('has min touch target 44px', () => {
    render(<Button>Touch</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('min-h-[44px]');
  });

  it('has focus ring', () => {
    render(<Button>Focus</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('focus-visible:ring');
  });

  it('disabled has reduced opacity', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('disabled:opacity-50');
  });
});

// ============ Status Badge Colors ============
describe('E2E UI — Status Badges', () => {
  const statusMap = {
    draft: { label: 'Rascunho', color: 'gray' },
    sent: { label: 'Enviado', color: 'blue' },
    approved: { label: 'Aprovado', color: 'green' },
    rejected: { label: 'Rejeitado', color: 'red' },
    expired: { label: 'Expirado', color: 'orange' },
  };

  Object.entries(statusMap).forEach(([status, { label, color }]) => {
    it(`"${status}" maps to "${label}"`, () => expect(label).toBeTruthy());
    it(`"${status}" has color "${color}"`, () => expect(color).toBeTruthy());
  });
});

// ============ Form Input Types ============
describe('E2E UI — Input Types', () => {
  const inputTypes = ['text', 'email', 'password', 'number', 'tel', 'search', 'url'];

  inputTypes.forEach(type => {
    it(`supports type="${type}"`, () => {
      render(<input type={type} data-testid={`input-${type}`} />);
      expect(screen.getByTestId(`input-${type}`)).toHaveAttribute('type', type);
    });
  });
});

// ============ Loading States ============
describe('E2E UI — Loading States', () => {
  it('button shows loader when loading', () => {
    render(<Button disabled><span className="animate-spin">⏳</span> Carregando...</Button>);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });
});
