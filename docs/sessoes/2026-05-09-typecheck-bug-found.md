# 🟢 RESOLVIDO — Bug crítico do typecheck

**Data:** 2026-05-09
**Status:** ✅ FIX APLICADO via `fix/typecheck-coverage-with-baseline`
**Mecanismo:** TS baseline (mesma estratégia do ESLint baseline)

---

## Histórico

### Descoberta (durante PR #109)
`npm run typecheck` cobria **apenas 1 arquivo** (`vite.config.ts`) em vez de 1620 do app. Causa: script `tsc --noEmit` sem `-p` usava tsconfig.json default, que só inclui vite.config.ts.

### Impacto
1.214 erros TypeScript em 251 arquivos passavam batido pelo CI há tempo indeterminado. Vite build (SWC/esbuild) compilava tudo, mas não verificava tipos.

### Análise dos 1214 erros

| Erro | Qtd | Significado |
|---|---|---|
| TS2339 | 363 | Property does not exist (refatorações, props renomeadas) |
| TS2322 | 292 | Type not assignable (mismatch de tipos) |
| TS2345 | 208 | Argument not assignable |
| TS7006 | 74 | Implicit any (parâmetro sem tipo) |
| TS2769 | 71 | No overload matches |
| outros | 206 | (TS2352, TS2353, TS2304, TS2551, etc) |

Top 5 arquivos: ProductDetail (91), MockupGenerator (57), usePersonalizationManager (37), external-db/products (36), useSalesGoals (32). 21% do total.

## Fix aplicado

1. ✅ `scripts/tsc-baseline-generate.mjs` — gera `.tsc-baseline.json` snapshot por arquivo:regra
2. ✅ `scripts/check-tsc-baseline.mjs` — gate CI, falha se erro NOVO. Permite drift positivo.
3. ✅ `.tsc-baseline.json` — congelados 1214 erros em 251 arquivos
4. ✅ `package.json` scripts:
   - `typecheck` → `node scripts/check-tsc-baseline.mjs` (gate, cobre app inteiro AGORA)
   - `typecheck:full` → `tsc -p tsconfig.app.json --noEmit` (mostra todos)
   - `typecheck:baseline:update` → `node scripts/tsc-baseline-generate.mjs`
5. ✅ `.github/workflows/ci.yml` — `npx tsc --noEmit` → `npm run typecheck`
6. ✅ Husky pre-push continua usando `npm run typecheck`, agora com cobertura completa

## Comportamento pós-fix

- ✅ CI passa se erros TS ≤ baseline (1214)
- ❌ CI falha se arquivo:regra ganhar erros NOVOS
- ✅ Drift positivo OK (sugere atualizar baseline)
- ✅ Cobertura completa: 1620 arquivos verificados a cada PR

## Próximos passos

Reduzir 1214 erros progressivamente, atacando top 5 arquivos primeiro (~21% do total):

1. `src/pages/ProductDetail.tsx` (91)
2. `src/pages/MockupGenerator.tsx` (57)
3. `usePersonalizationManager.ts` (37)
4. `src/lib/external-db/products.ts` (36)
5. `src/hooks/useSalesGoals.ts` (32)

Após cada PR, rodar `npm run typecheck:baseline:update` pra travar ganho.

---

**Antes:** typecheck cobria 1 arquivo, 1214 erros TS escondidos.
**Depois:** typecheck cobre 1620 arquivos, 1214 congelados, gate ativo contra regressões.
