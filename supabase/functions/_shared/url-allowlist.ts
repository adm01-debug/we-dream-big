/**
 * URL Allowlist — Defesa em profundidade contra SSRF e abuse de URL externa.
 *
 * Onda 14 / item 3.7 da auditoria pré-prod (10/mai/2026).
 *
 * Contexto:
 * - Edges como `generate-mockup` passam URLs externas para a Lovable AI Gateway (Gemini).
 * - O fetch é feito pela Google, não pelo nosso edge — então SSRF clássico (AWS metadata,
 *   localhost) não se materializa diretamente.
 * - Mas: (1) defesa em profundidade contra refactors futuros que façam fetch direto,
 *   (2) bloqueia abuse "proxy via Gemini", (3) reduz superfície para conteúdo arbitrário.
 *
 * Estratégia:
 * - Hostnames com match exato em ALLOWED_HOSTS (catálogo de imagens em produção).
 * - Sufixos em ALLOWED_HOST_SUFFIXES (ex.: *.supabase.co para Storage do usuário).
 * - Rejeitar IPv4 privados/loopback/link-local e IPv6 loopback (defesa adicional).
 * - Aceitar apenas https:// e http:// (não data:, ftp:, file:, javascript:).
 *
 * Atualização do allowlist:
 * - Hosts de catálogo (CDN de fornecedores): adicionar conforme novo fornecedor entra.
 * - Bucket do usuário (logos): cobre via *.supabase.co.
 */

// Hostnames com match EXATO (case-insensitive).
// Validados em prod via: SELECT regexp_replace(url, ...) FROM product_images.
export const ALLOWED_HOSTS = new Set<string>([
  // Cloudflare Images — CDN principal do projeto (57k+ imagens)
  'imagedelivery.net',

  // Fornecedores ativos (catálogo)
  'cdn.xbzbrindes.com.br',
  'www.xbzbrindes.com.br',
  'xbzbrindes.com.br',
  'www.spotgifts.com.br',
  'spotgifts.com.br',
  'cdndeprodutos.azureedge.net',
  's.asiaimport.com.br',
  'asiaimport.com.br',
  'www.88brindes.com.br',
  '88brindes.com.br',
]);

// Sufixos de hostname permitidos. URL bate se hostname === suffix OU
// hostname termina com '.' + suffix.
export const ALLOWED_HOST_SUFFIXES: readonly string[] = [
  'supabase.co',  // Supabase Storage (logos do usuário)
  'supabase.in',  // legacy Supabase domain
];

/**
 * Checa se um IPv4 está em range privado/reservado.
 * Bloqueia: 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, 0/8, 224/4 (multicast).
 */
function isPrivateOrReservedIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, _c, _d] = m.slice(1).map(Number);
  if (a === 0 || a === 127 || a === 10) return true;
  if (a === 169 && b === 254) return true;             // link-local / metadata cloud
  if (a === 172 && b >= 16 && b <= 31) return true;    // 172.16/12
  if (a === 192 && b === 168) return true;             // 192.168/16
  if (a >= 224 && a <= 239) return true;               // multicast 224/4
  if (a >= 240) return true;                            // reserved 240+
  return false;
}

/**
 * Checa se um hostname é IPv6 loopback/link-local.
 * Bloqueia: ::1, fe80::*, fc00::/7.
 */
function isPrivateIPv6(host: string): boolean {
  // hostname IPv6 em URL vem entre colchetes: [::1] → URL parser entrega "[::1]"
  const stripped = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (stripped === '::1') return true;
  if (stripped.startsWith('fe80:')) return true;
  if (stripped.startsWith('fc') || stripped.startsWith('fd')) return true;
  return false;
}

/**
 * Resultado da validação. Sucesso ou erro detalhado.
 */
export type UrlValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Valida URL externa contra o allowlist.
 * Retorna { ok: true } se permitida, { ok: false, reason } se não.
 */
export function validateExternalUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, reason: 'URL vazia ou inválida' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'URL malformada' };
  }

  // Protocolo: apenas https e http
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: `Protocolo não permitido: ${parsed.protocol}` };
  }

  const host = parsed.hostname.toLowerCase();

  // Bloqueio defensivo: IPs privados/loopback
  if (isPrivateOrReservedIPv4(host)) {
    return { ok: false, reason: 'IP privado/reservado não permitido' };
  }
  if (isPrivateIPv6(parsed.host)) {
    return { ok: false, reason: 'IPv6 privado/loopback não permitido' };
  }
  if (host === 'localhost') {
    return { ok: false, reason: 'localhost não permitido' };
  }

  // Allowlist: match exato
  if (ALLOWED_HOSTS.has(host)) return { ok: true };

  // Allowlist: sufixo (ex: bucket-id.supabase.co)
  for (const suffix of ALLOWED_HOST_SUFFIXES) {
    if (host === suffix || host.endsWith('.' + suffix)) return { ok: true };
  }

  return {
    ok: false,
    reason: `Hostname '${host}' não está na lista de origens permitidas`,
  };
}

/**
 * Helper que lança erro estruturado (útil em try/catch dentro de handlers).
 */
export class ExternalUrlError extends Error {
  readonly fieldName: string;
  readonly reason: string;
  constructor(fieldName: string, reason: string) {
    super(`URL externa rejeitada em '${fieldName}': ${reason}`);
    this.name = 'ExternalUrlError';
    this.fieldName = fieldName;
    this.reason = reason;
  }
}

export function assertAllowedExternalUrl(url: string, fieldName: string): void {
  const result = validateExternalUrl(url);
  if (!result.ok) throw new ExternalUrlError(fieldName, result.reason);
}
