import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SidebarReorganized } from '@/components/layout/SidebarReorganized';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockAuthValue = {
  user: { id: '1', email: 'test@example.com' },
  session: {},
  isAdmin: false,
  isDev: false,
  isSupervisor: false,
  isAgente: true,
  isSupervisorOrAbove: false,
  isLoading: false,
  signOut: vi.fn(),
  refreshSession: vi.fn(),
  isAuthenticated: true,
  roles: ['agente'],
  role: 'agente',
  profile: null,
};

const renderSidebar = (props = { isOpen: true, onToggle: vi.fn() }, authValue = mockAuthValue) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={authValue as any}>
          <BrowserRouter>
            <SidebarReorganized {...props} />
          </BrowserRouter>
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

describe('SidebarReorganized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar os grupos básicos de navegação', () => {
    renderSidebar();
    expect(screen.getAllByText('Orçamentos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Catálogo').length).toBeGreaterThan(0);
  });

  it('não deve mostrar o grupo Admin para usuários comuns', () => {
    renderSidebar();
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('deve mostrar o grupo Admin para administradores', () => {
    renderSidebar({ isOpen: true, onToggle: vi.fn() }, { ...mockAuthValue, isAdmin: true });
    expect(screen.getByText('Admin')).toBeDefined();
  });

  it('deve permitir colapsar a sidebar no desktop', async () => {
    renderSidebar();
    const toggleButton = screen.getByLabelText('Recolher menu');
    
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(screen.getByLabelText('Expandir menu')).toBeDefined();
  });

  it('deve disparar onToggle ao clicar no overlay mobile', () => {
    const onToggle = vi.fn();
    renderSidebar({ isOpen: true, onToggle });
    
    const overlay = document.querySelector('.lg\\:hidden');
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(onToggle).toHaveBeenCalled();
  });

  it('deve navegar ao usar atalhos de teclado (Alt+O)', () => {
    renderSidebar();
    
    const event = new KeyboardEvent('keydown', {
      key: 'o',
      altKey: true,
      bubbles: true,
    });
    
    window.dispatchEvent(event);
    
    // Verifica se a URL mudou (BrowserRouter cuida disso)
    expect(window.location.pathname).toBe('/orcamentos');
  });
});
