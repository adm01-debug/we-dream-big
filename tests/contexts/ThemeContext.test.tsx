import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ThemeContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    vi.clearAllMocks();
  });

  it('deve inicializar com o tema light por padrão se não houver preferência', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider defaultTheme="light">{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.actualTheme).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('deve permitir trocar o tema manualmente', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider defaultTheme="light">{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.actualTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('gifts-store-theme')).toBe('dark');
  });

  it('deve alternar entre light e dark ao chamar toggleTheme', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider defaultTheme="light">{children}</ThemeProvider>,
    });

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.actualTheme).toBe('dark');
    
    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.actualTheme).toBe('light');
  });

  it('deve usar o tema do sistema quando configurado como auto', () => {
    // Simular que o sistema prefere dark
    (window.matchMedia as any).mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider defaultTheme="auto">{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe('auto');
    expect(result.current.actualTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('deve retornar fallback se usado fora do provider sem quebrar', () => {
    // Silenciar o console.warn para o teste de fallback
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const { result } = renderHook(() => useTheme());

    expect(result.current.isFallback).toBe(true);
    expect(result.current.theme).toBe('light');
    
    spy.mockRestore();
  });
});
