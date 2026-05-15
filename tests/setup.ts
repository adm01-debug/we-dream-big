// TZ: forçado via vitest.config.ts test.env (passa aos workers no spawn).
// Setar process.env.TZ aqui NÃO FUNCIONA — Date.prototype.toLocaleString
// cacheia TZ na startup do worker, antes deste setup file rodar.

// CI/local test mode: stub VITE_SUPABASE_URL e KEY pra evitar erro
// "supabaseUrl is required" no IMPORT do supabase client em src/integrations/supabase/client.ts.
// Em produção essas vars vêm do env real (.env / Vercel / GitHub Secrets).
// Mantém fail-fast em prod ao não tocar no client gerado.
import { vi } from 'vitest';
vi.stubEnv('VITE_SUPABASE_URL', process.env.VITE_SUPABASE_URL || 'http://localhost:54321');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

// Mock do window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock do IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;

// Mock do ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock do window.scrollTo (jsdom não implementa)
// Necessário para testes que usam createMemoryRouter + back/forward navigation
// (React Router chama scrollTo internamente para restaurar scroll position).
// Sem este mock, testes de SidebarNavGroup.history/suspense falhavam em CI.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
