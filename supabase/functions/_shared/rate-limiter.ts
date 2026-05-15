// supabase/functions/_shared/rate-limiter.ts

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

// Cache em memória simples (para Edge Functions)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export class RateLimiter {
  constructor(private config: RateLimitConfig) {}

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: number; suspicious?: boolean }> {
    const key = `${this.config.keyPrefix || 'rl'}:${identifier}`;
    const now = Date.now();
    
    let record = requestCounts.get(key);

    // Resetar se janela expirou
    if (!record || now > record.resetAt) {
      record = {
        count: 0,
        resetAt: now + this.config.windowMs
      };
    }

    record.count++;
    requestCounts.set(key, record);

    // Detecção de tentativas suspeitas: 
    // se o usuário atingir 80% do limite muito rápido (ex: em menos de 10% da janela)
    const usageRatio = record.count / this.config.maxRequests;
    const timeRatio = (now - (record.resetAt - this.config.windowMs)) / this.config.windowMs;
    const suspicious = usageRatio > 0.8 && timeRatio < 0.1;

    // Limpar registros antigos periodicamente
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    const allowed = record.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - record.count);

    return {
      allowed,
      remaining,
      resetAt: record.resetAt,
      suspicious
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of requestCounts.entries()) {
      if (now > record.resetAt) {
        requestCounts.delete(key);
      }
    }
  }
}

// Rate limiters pré-configurados
export const rateLimiters = {
  // IA endpoints: 20 req/min por usuário
  ai: new RateLimiter({
    maxRequests: 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai'
  }),

  // Busca: 100 req/min por usuário
  search: new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'search'
  }),

  // Aprovação: 5 req/min por token (evitar brute force)
  approval: new RateLimiter({
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'approval'
  })
};

// Middleware helper
export async function applyRateLimit(
  req: Request,
  limiter: RateLimiter,
  getIdentifier: (req: Request) => string = (r) => r.headers.get('x-forwarded-for') || 'anonymous'
): Promise<Response | null> {
  const identifier = getIdentifier(req);
  const result = await limiter.check(identifier);

  if (result.suspicious) {
    console.warn(`[suspicious-activity] ID: ${identifier} endpoint: ${limiter['config'].keyPrefix}`);
    // Opcional: registrar no admin_audit_log se for crítico
  }

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        remaining: result.remaining,
        resetAt: new Date(result.resetAt).toISOString()
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString()
        }
      }
    );
  }

  // Adicionar headers de rate limit mesmo quando permitido
  return null; // null = allowed, continue processing
}
