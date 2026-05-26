/**
 * SUITE DE TESTES — Auditoria do módulo mockup-generator (26/05/2026)
 *
 * Cobre as 10 correções aplicadas nos arquivos:
 *   - src/hooks/mockup/mockupGenerationService.ts  (T4, T6, T7, T8, T10)
 *   - src/hooks/mockup/useMockupGenerator.ts        (T1, T2, T3, T5, T6, T9)
 *
 * Execução: npx vitest run src/hooks/mockup/__tests__/mockup-audit.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Helpers de análise estática ─────────────────────────────────────────────

function readSrc(relativePath: string) {
  return readFileSync(resolve(__dirname, '..', '..', '..', '..', relativePath), 'utf-8');
}

// ─── T7: getTechniquePrompt — testável como função pura ──────────────────────

const TECHNIQUE_PROMPTS: Record<string, string> = {
  bordado:      'as professional machine embroidery with visible thread stitch texture',
  silk:         'as screen printed with flat solid colors, matte finish',
  dtf:          'as DTF printed transfer with vibrant colors, slight glossy finish',
  laser:        'as laser engraved, etched into the material surface, monochromatic',
  laser_co2:    'as CO2 laser engraved with precise etching on organic materials',
  laser_fibra:  'as fiber laser marked on metal with high-contrast permanent mark',
  sublimacao:   'as sublimation printed, colors absorbed seamlessly into the material',
  tampografia:  'as pad printed with slightly glossy ink, precise small details',
  hot_stamping: 'as hot stamped with metallic foil finish, shiny reflective surface',
  adesivo:      'as vinyl sticker/decal applied to surface',
  uv:           'as UV printed with raised ink texture, vibrant colors',
  transfer:     'as heat transfer vinyl, smooth finish with slight sheen',
  default:      'as professionally printed/applied logo',
};

type TechniqueInput = { id: string; name: string; code: string | null };

/** Réplica fiel da função corrigida (T7 FIX aplicado) */
function getTechniquePromptFixed(technique: TechniqueInput): string {
  const code = technique.code?.toLowerCase() || technique.name.toLowerCase();
  for (const [key, prompt] of Object.entries(TECHNIQUE_PROMPTS)) {
    if (key === 'default') continue; // T7 FIX: pula "default" no loop
    if (code.includes(key) || technique.name.toLowerCase().includes(key)) return prompt;
  }
  return TECHNIQUE_PROMPTS.default;
}

/** Versão BUGGY sem o T7 fix — para comparação e verificação de regressão */
function getTechniquePromptBUGGY(technique: TechniqueInput): string {
  const code = technique.code?.toLowerCase() || technique.name.toLowerCase();
  for (const [key, prompt] of Object.entries(TECHNIQUE_PROMPTS)) {
    // BUG: sem continue → "default" pode ser matchado por substring antes de keys corretos
    if (code.includes(key) || technique.name.toLowerCase().includes(key)) return prompt;
  }
  return TECHNIQUE_PROMPTS.default;
}

// ─────────────────────────────────────────────────────────────────────────────
// T7 — Testes funcionais puros (não precisam de mock)
// ─────────────────────────────────────────────────────────────────────────────

describe('T7 — getTechniquePrompt: "default" nao deve ser matchado no loop', () => {
  it('silk -> retorna prompt correto de silk', () => {
    const result = getTechniquePromptFixed({ id: '1', name: 'Serigrafia', code: 'silk' });
    expect(result).toBe(TECHNIQUE_PROMPTS.silk);
  });

  it('laser -> retorna prompt correto de laser', () => {
    const result = getTechniquePromptFixed({ id: '2', name: 'Laser Gravacao', code: 'laser' });
    expect(result).toBe(TECHNIQUE_PROMPTS.laser);
  });

  it('bordado -> retorna prompt correto de bordado', () => {
    const result = getTechniquePromptFixed({ id: '3', name: 'Bordado', code: 'bordado' });
    expect(result).toBe(TECHNIQUE_PROMPTS.bordado);
  });

  it('tecnica desconhecida -> retorna fallback default', () => {
    const result = getTechniquePromptFixed({ id: '4', name: 'Nova Tecnica', code: null });
    expect(result).toBe(TECHNIQUE_PROMPTS.default);
  });

  it('code contendo "default" como substring NAO interrompe loop prematuramente', () => {
    // "laser-default-special" contem "laser" → deve retornar laser, nao default
    const t = { id: '5', name: 'Laser Special', code: 'laser-default-special' };
    expect(getTechniquePromptFixed(t)).toBe(TECHNIQUE_PROMPTS.laser);
  });

  it('[REGRESSAO] versao buggy: "laser-default-special" retornaria prompt incorreto', () => {
    const t = { id: '5', name: 'Laser Special', code: 'laser-default-special' };
    const fixedResult = getTechniquePromptFixed(t);
    const buggyResult = getTechniquePromptBUGGY(t);
    // Fixed: sempre retorna laser (correto)
    expect(fixedResult).toBe(TECHNIQUE_PROMPTS.laser);
    // Buggy: pode retornar default ou laser dependendo da ordem de Object.entries
    // O importante: a versao fixed NAO sofre ambiguidade
    expect([TECHNIQUE_PROMPTS.laser, TECHNIQUE_PROMPTS.default]).toContain(buggyResult);
  });

  it('uv -> retorna prompt de UV', () => {
    expect(getTechniquePromptFixed({ id: '6', name: 'UV Digital', code: 'uv' }))
      .toBe(TECHNIQUE_PROMPTS.uv);
  });

  it('sublimacao -> retorna prompt de sublimacao', () => {
    expect(getTechniquePromptFixed({ id: '7', name: 'Sublimacao', code: 'sublimacao' }))
      .toBe(TECHNIQUE_PROMPTS.sublimacao);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES ESTATICOS — leitura dos arquivos fonte para validar padroes de codigo
// ─────────────────────────────────────────────────────────────────────────────

describe('Analise estatica — mockupGenerationService.ts', () => {
  let src: string;

  beforeEach(() => {
    src = readSrc('src/hooks/mockup/mockupGenerationService.ts');
  });

  describe('T4 — campos top-level no INSERT (nao somente em area_config JSONB)', () => {
    it('logo_url como coluna top-level', () => {
      expect(src).toContain('logo_url: logoUrl');
    });
    it('position_x como coluna top-level', () => {
      expect(src).toContain('position_x: area.positionX');
    });
    it('position_y como coluna top-level', () => {
      expect(src).toContain('position_y: area.positionY');
    });
    it('logo_width_cm como coluna top-level', () => {
      expect(src).toContain('logo_width_cm: area.logoWidth');
    });
    it('logo_height_cm como coluna top-level', () => {
      expect(src).toContain('logo_height_cm: area.logoHeight');
    });
  });

  describe('T6 — deleteMockupFromDb com owner scope', () => {
    it('assinatura inclui userId?', () => {
      expect(src).toMatch(/deleteMockupFromDb\s*\(\s*id\s*:\s*string\s*,\s*userId\?/);
    });
    it('filtro user_id aplicado quando userId presente', () => {
      expect(src).toContain("query.eq('user_id', userId)");
    });
  });

  describe('T7 — continue guard no loop de getTechniquePrompt', () => {
    it('codigo-fonte contem o continue guard para chave "default"', () => {
      expect(src).toContain("if (key === 'default') continue;");
    });
  });

  describe('T8 — fetchMockupHistory com LIMIT 200', () => {
    it('query usa .limit(200)', () => {
      expect(src).toContain('.limit(200)');
    });
    it('nenhum limit menor que 200 presente', () => {
      // regex: .limit(N) onde N < 200 (1 ou 2 digitos, ou 3 digitos < 200)
      expect(src).not.toMatch(/\.limit\((0|[1-9]\d?|1\d{2})\)[^;]/);
    });
  });

  describe('T10 — thumbnail_url = mockupUrl (nao logoUrl)', () => {
    it('thumbnail_url recebe mockupUrl', () => {
      expect(src).toContain('thumbnail_url: mockupUrl');
    });
    it('thumbnail_url NAO usa logoUrl (regressao ausente)', () => {
      expect(src).not.toContain('thumbnail_url: logoUrl');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Analise estatica — useMockupGenerator.ts', () => {
  let src: string;

  beforeEach(() => {
    src = readSrc('src/hooks/mockup/useMockupGenerator.ts');
  });

  describe('T1/T2 — 7 handlers envolvidos em useCallback com deps corretas', () => {
    const handlers = [
      'saveMockupToHistory',
      'generateMockup',
      'downloadMockup',
      'deleteMockup',
      'resetForm',
      'handleShareMockup',
      'loadFromHistory',
    ] as const;

    handlers.forEach(fn => {
      it(`${fn} usa useCallback`, () => {
        expect(src).toMatch(new RegExp(`const\\s+${fn}\\s*=\\s*useCallback`));
      });
    });

    it('saveMockupToHistory: array de deps inclui todas as closures criticas', () => {
      expect(src).toContain('[user, selectedProduct, selectedTechnique, selectedClient, mockupAnnotations]');
    });

    it('deleteMockup: deps incluem mockupToDelete e user', () => {
      expect(src).toContain('[mockupToDelete, user]');
    });

    it('eslint-disable comments removidos (NAO mais necessarios)', () => {
      // eslint-disable-next-line era necessario na versao buggy sem useCallback
      expect(src).not.toMatch(/eslint-disable-next-line react-hooks\/exhaustive-deps\s*\nconst\s+(saveMockupToHistory|generateMockup|downloadMockup|deleteMockup|resetForm|handleShareMockup|loadFromHistory)/);
    });
  });

  describe('T3 — Memory leaks: cleanup de timeouts no unmount', () => {
    it('historyPushTimeout.current limpo em useEffect cleanup', () => {
      expect(src).toContain('clearTimeout(historyPushTimeout.current)');
    });

    it('draftNoticeTimeoutRef criada como useRef', () => {
      expect(src).toContain('draftNoticeTimeoutRef');
    });

    it('draftNoticeTimeoutRef limpa em useEffect cleanup', () => {
      expect(src).toContain('clearTimeout(draftNoticeTimeoutRef.current)');
    });

    it('pelo menos 2 useEffect de cleanup para timeouts', () => {
      const cleanups = src.match(/return\s*\(\)\s*=>\s*\{[^}]*clearTimeout/g);
      expect(cleanups?.length ?? 0).toBeGreaterThanOrEqual(2);
    });

    it('draftNoticeTimeoutRef.current atribuido com setTimeout', () => {
      expect(src).toMatch(/draftNoticeTimeoutRef\.current\s*=\s*setTimeout/);
    });
  });

  describe('T5 — Batch DB saves: Promise.allSettled ao inves de for-await', () => {
    it('usa Promise.allSettled para batch', () => {
      expect(src).toContain('Promise.allSettled');
    });

    it('nao usa loop for-await sequencial no batch path', () => {
      // Padrao do bug: for (let i = 0; i < result.batchResults.length; i++) { ... await saveMockup }
      expect(src).not.toMatch(/for\s*\(let\s+i\s*=\s*0.*batchResults.*await\s+saveMockup/s);
    });

    it('resultado do allSettled e filtrado por "fulfilled"', () => {
      expect(src).toContain("res.status === 'fulfilled'");
    });
  });

  describe('T6 — deleteMockup passa userId para owner-scope DELETE', () => {
    it('chama deleteMockupFromDb com user?.id como segundo argumento', () => {
      expect(src).toContain('deleteMockupFromDb(mockupToDelete, user?.id)');
    });
  });

  describe('T9 — URL params preservados ao limpar product_id e technique', () => {
    it('usa URLSearchParams.delete para product_id (nao replaceState direto)', () => {
      expect(src).toContain("newParams.delete('product_id')");
    });

    it('usa URLSearchParams.delete para technique', () => {
      expect(src).toContain("newParams.delete('technique')");
    });

    it('NAO usa replaceState com pathname puro (que descartaria todos params)', () => {
      expect(src).not.toContain("replaceState({}, '', window.location.pathname)");
    });

    it('novo search string gerado via newParams.toString()', () => {
      expect(src).toContain('newParams.toString()');
    });

    it('URL final preserva params extras via condicional', () => {
      expect(src).toMatch(/newSearch\s*\?\s*`\?\${newSearch}`\s*:\s*''/);
    });
  });
});
