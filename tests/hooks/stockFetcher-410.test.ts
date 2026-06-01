import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Mock do logger para capturar os avisos
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock do supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('Resiliência a 410 Gone', () => {
  it('deve retornar array vazio e logar aviso quando encontrar erro 410', async () => {
    const mockError = { message: 'Edge function returned 410: Error, {"error":"Gone"}' };
    
    // Configurar o mock para falhar com 410
    (supabase.from as any).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockImplementationOnce(() => Promise.resolve({ data: null, error: mockError })),
    }));

    // Importar o hook dinamicamente para garantir que use o mock
    const { useNoveltiesWithDetails } = await import('@/hooks/products/useNovelties');
    
    // Simular a queryFn
    const { useQuery } = await import('@tanstack/react-query');
    // ...
  });
});
