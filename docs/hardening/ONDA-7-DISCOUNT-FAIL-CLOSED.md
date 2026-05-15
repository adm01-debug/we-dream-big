# Onda 7 — validate_quote_real_discount fail-closed em NULL

**Data:** 14 de maio de 2026  
**PR alvo:** cleanup/onda-7-validate-discount-fail-closed  
**Bloqueador resolvido:** B-4 da auditoria de 10/mai/2026  
**Tempo de execução:** ~30 minutos  
**Risco:** baixo (mudança conservadora que não quebra fluxos existentes)  
**Impacto financeiro:** alto (evita desconto ilimitado para vendedor sem limite cadastrado)

## Contexto

A função trigger `public.validate_quote_real_discount` (chamada antes de INSERT/UPDATE em `quotes`) tinha um bypass NULL:

```sql
SELECT max_discount_percent INTO _max_allowed
FROM public.seller_discount_limits WHERE user_id = NEW.seller_id;

IF _max_allowed IS NOT NULL AND _real_pct > _max_allowed THEN  -- ⚠️ BUG
  -- bloqueia
END IF;
```

**O bug:** quando o vendedor não tinha linha em `seller_discount_limits`, `_max_allowed = NULL`. A condição `_max_allowed IS NOT NULL AND ...` era então FALSA, e o trigger deixava passar **qualquer desconto** sem checagem.

**Cenário real descrito na auditoria:**

1. Admin promove novo vendedor.
2. Esquece de cadastrar limite de desconto.
3. Vendedor cria orçamento com 99% de desconto.
4. Trigger não bloqueia.
5. Cliente fecha negócio. Sistema persiste. Margem evapora.

## Estado pré-fix no banco production

Query executada antes do fix:

| Role | Total | Com limite | Sem limite |
|---|---|---|---|
| `dev` | 1 | 1 | 0 ✅ |
| `admin` | 2 | 1 | **1** ⚠️ |
| `vendedor` | 5 | 5 | 0 ✅ |

Observações:
- Todos os 5 vendedores ativos hoje têm limite cadastrado — fix não quebra ninguém.
- 1 admin não tem limite, mas admins pegam bypass via `_is_admin` (lógica intocada).
- Vendedor novo entrando = vulnerável ao bug B-4.

## Mudanças aplicadas

```diff
   SELECT max_discount_percent INTO _max_allowed
   FROM public.seller_discount_limits WHERE user_id = NEW.seller_id;
 
+  -- Onda 7 (B-4): fail-CLOSED em NULL.
+  _max_allowed := COALESCE(_max_allowed, 0);
+
-  IF _max_allowed IS NOT NULL AND _real_pct > _max_allowed THEN
+  IF _real_pct > _max_allowed THEN
     IF NOT EXISTS (...) THEN
+      IF _max_allowed = 0 THEN
+        RAISE EXCEPTION 'Vendedor sem limite de desconto cadastrado. Solicite ao administrador o cadastro em seller_discount_limits, ou peca aprovacao para o desconto de %%%.', _real_pct
+          USING ERRCODE = 'check_violation';
+      ELSE
         RAISE EXCEPTION 'Desconto real (%%%) excede o limite do vendedor (%%%). Solicite aprovacao antes de salvar.',
           _real_pct, _max_allowed USING ERRCODE = 'check_violation';
+      END IF;
     END IF;
   END IF;
```

## Opções consideradas

A auditoria sugeriu 3 opções:

| Opção | Comportamento | Decisão |
|---|---|---|
| **A (RAISE EXCEPTION em NULL)** | Vendedor sem limite NÃO CONSEGUE criar quote nem com desconto 0% | Rejeitada — muito agressiva, quebra UX |
| **B (COALESCE NULL → 0)** ✅ | Vendedor sem limite não consegue dar desconto > 0% (mas pode criar quote sem desconto) | **Escolhida** |
| C (trigger ao promover) | Auto-criar linha default em seller_discount_limits ao promover papel | Adiada — vai numa Onda futura |

Opção B é a mais conservadora: não quebra fluxo existente (5 vendedores têm limite, continuam funcionando igual), mas fecha a porta pra desconto infinito.

## Escopo intencionalmente limitado

A mesma função tem outro problema mencionado em §3.2 da auditoria: o check de admin usa `role = 'admin'`, enquanto a hierarquia atual é `dev > supervisor > agente`. **Não foi alterado nesta Onda** porque:

1. Verificação no banco mostrou que **existem 2 usuários reais com `role = 'admin'`** (a auditoria assumia 0). O check funciona hoje.
2. Tema do "dual admin pattern" está **deferido** por decisão arquitetural separada (memória do PO sobre PR-A na fase F2 do plano).
3. Foco da Onda 7 é EXCLUSIVAMENTE B-4 (NULL bypass).

## Comparação antes/depois

| Cenário | Antes (com bug) | Depois (Onda 7) |
|---|---|---|
| Vendedor com limite cadastrado, desconto dentro do limite | ✅ Passa | ✅ Passa (idem) |
| Vendedor com limite cadastrado, desconto excede limite | ❌ Bloqueia (msg padrão) | ❌ Bloqueia (msg padrão, idem) |
| Vendedor SEM linha em seller_discount_limits, desconto 0% | ✅ Passa (sem desconto, sem trigger) | ✅ Passa (idem — nem entra no IF) |
| **Vendedor SEM linha, desconto > 0%** | ⚠️ **Passa qualquer desconto** | ✅ **Bloqueia com mensagem clara** |
| Admin (role='admin'), qualquer desconto | ✅ Bypass (idem) | ✅ Bypass (idem) |

## Validação empírica

1. ✅ SELECT em `pg_proc` confirma que `validate_quote_real_discount` tem `COALESCE(_max_allowed, 0)` no corpo
2. ✅ Teste SQL isolado confirma que `COALESCE((SELECT ... WHERE user_id não existe), 0) = 0`
3. ✅ Comment registrado: `Onda 7 (B-4): ... NULL agora trata como 0 (fail-closed em NULL bypass)`

## Próximos passos

- **Opção C** (trigger ao promover papel) pode entrar numa Onda futura, mas não é crítico depois deste fix — o admin agora recebe uma mensagem clara "Vendedor sem limite de desconto cadastrado" e sabe o que fazer.
- **Dual admin pattern** continua deferido para PR-A da fase F2.

## Aplicação em prod

Migration aplicada em prod (`doufsxqlfjyuvxuezpln`) em **14/mai/2026 16:52 UTC** via MCP `apply_migration`. Versão: `20260514165252`.

ADR 0006 respeitada: nenhum `supabase db push` foi executado.

## Riscos / rollback

- **Falso positivo mínimo:** se alguém apagar acidentalmente uma linha de `seller_discount_limits` de um vendedor ativo, o próximo quote com desconto vai bloquear. Mensagem clara guia o admin a recadastrar. Risco aceitável.
- **Rollback:** aplicar nova migration restaurando o código antigo (não recomendado — reabre B-4).
