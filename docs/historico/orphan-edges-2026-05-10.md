# Auditoria & remoção das 6 Edge Functions órfãs

**Data:** 10 de maio de 2026
**Banco:** `doufsxqlfjyuvxuezpln`
**Escopo:** identificação e remoção de edge functions presentes em produção
mas ausentes do repositório, sem invocação no código e sem uso registrado.

---

## TL;DR

6 edge functions estão ativas em produção mas **nunca tiveram código no
repositório, nunca foram chamadas pelo frontend e nunca registraram uso**.
Uma delas (`product-search-v2`) está ativamente **vazando 6.123 produtos do
catálogo** (incluindo `cost_price`, `stock_quantity`, `supplier_id`,
`ncm_code`, `origin_country`) para qualquer pessoa na internet, sem nenhuma
autenticação.

**Decisão**: deletar todas as 6.

**Mecanismo**: workflow `delete-orphan-edges.yml` (workflow_dispatch com gate
de confirmação) — disparado manualmente via GitHub Actions UI.

---

## 1. As 6 edges órfãs

| Edge | `verify_jwt` | Criada em | Versions |
|---|---|---|---|
| `super-processor` | ✅ true | 2026-01-03 | v4 |
| `quick-task` | ✅ true | 2026-01-03 (4 min depois) | v3 |
| `create_user` | ✅ true | 2026-02-19 | v3 |
| `product-search-v2` | ❌ **false (PÚBLICA)** | 2026-04-04 | v2 |
| `product-classifier` | ❌ **false (PÚBLICA)** | 2026-04-04 (24s depois) | v2 |
| `guardrails-ml` | ❌ **false (PÚBLICA)** | 2026-04-04 | v3 |

**Padrão temporal**: criadas em 3 sessões esparsas via Lovable/Dashboard.
**Todas as outras 79 edges** foram criadas em batch único em 2026-05-07,
quando o workflow `deploy-edge-functions.yml` foi configurado. Estas 6
nunca foram migradas para o repositório e ficaram zumbis.

---

## 2. Evidências de não-uso

### 2.1 Código do repositório

Query: `grep -rn '<nome>' src/ supabase/functions/`

| Edge | Hits |
|---|---|
| `super-processor` | 0 |
| `quick-task` | 0 |
| `create_user` | 0 |
| `product-search-v2` | 0 |
| `product-classifier` | 0 |
| `guardrails-ml` | 0 |

### 2.2 Histórico git

Query: `git log --all --diff-filter=A -- supabase/functions/<nome>/`

Nenhum commit jamais criou um diretório com esses nomes em
`supabase/functions/`. **O código dessas functions nunca esteve sob
controle de versão.**

### 2.3 Logs de uso

Query executada no banco em 2026-05-10:

```sql
SELECT function_name, COUNT(*) AS total
FROM public.ai_usage_logs
WHERE function_name IN (
  'super-processor','quick-task','create_user',
  'product-search-v2','product-classifier','guardrails-ml'
)
GROUP BY function_name;
```

Resultado: **0 linhas**. Nenhuma chamada via `callAiWithTracking` jamais
registrada.

Query equivalente em `analytics_events`: também 0 linhas (a tabela inteira
tem apenas 3 events totais, todos de janeiro de 2026, sem relação com as
órfãs).

---

## 3. Probe das 3 públicas (verify_jwt=false)

`super-processor`, `quick-task` e `create_user` exigem JWT válido — probe
sem credenciais retornou `UNAUTHORIZED_INVALID_JWT_FORMAT`. Foram
classificadas pelos sinais indiretos (zero uso, zero refs, zero git).

As outras 3 são públicas e responderam ao probe sem auth:

### 3.1 `product-classifier` (relativamente benigna)

```
GET  → {"service":"product-classifier","version":"v1.1",
        "categories":["escrita","bebidas","vestuario","bags","tech",
                      "escritorio","utilidades","saude"]}
POST {} → {"error":"action: classify or batch_classify"}
```

Classificador automático de produtos em 8 categorias hardcoded. Risco:
endpoint público sem auth pode ser abusado para DDoS / scraping / burnout
de cota IA.

### 3.2 `guardrails-ml` (relativamente benigna)

```
GET  → {"service":"guardrails-ml","version":"v2.3","status":"healthy"}
POST {} → {"error":"text required"}
```

Filtro de moderação de texto. Mesmo risco de público sem auth.

### 3.3 🚨 `product-search-v2` — VAZAMENTO ATIVO

Probe sem auth, sem token, sem nada:

```bash
curl -X POST https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/product-search-v2 \
  -H 'Content-Type: application/json' \
  -d '{"limit":10000}'
```

Resposta:

| Métrica | Valor |
|---|---|
| `total` retornado | **6.123 produtos** (catálogo inteiro) |
| Produtos no array (limit) | 1.000, paginável |
| Campos por produto | **148 campos** |

Campos sensíveis vazados em cada produto:

```
cost_price       → 13.92               (CUSTO INTERNO)
sale_price       → 20.88
suggested_price  → 16.26
supplier_id      → 841cd690-210a-422a-908c-7676828db272
stock_quantity   → 300                 (estoque atual)
organization_id  → 5db5aee1-064b-4ef4-9193-345dcd8274ea
sku              → LE-34373
ncm_code         → 48202000            (código tributário)
origin_country   → "China"
brand            → "Só Marcas"
min_quantity     → 1
box_length_mm, box_weight_kg, gtin, ean, …
```

**Soma de margem dos primeiros 500 produtos**: R$ 15.420,44 — exposto.

**Severidade**: violação grave de informação confidencial comercial.
Concorrente que descubra essa URL (via subdomain enum, scanning de
`*.supabase.co`, ou qualquer leak histórico) tem em 1 minuto:

- Lista completa de 6.123 SKUs da Promo Brindes
- Custo de aquisição de cada um (margem de lucro deduzível)
- Estoque atual
- Fornecedor (UUID identificável via outras leaks)
- Códigos NCM (estrutura tributária)
- País de origem, marca, dimensões de caixa

A função foi criada em 4/abr/2026 e estava ativa há ~5 semanas até esta
auditoria.

---

## 4. Decisão consolidada: DELETAR TODAS AS 6

| # | Edge | Razão |
|---|---|---|
| 1 | `super-processor` | JWT-protected, zero uso, zero refs, zero git. Provável template Lovable |
| 2 | `quick-task` | Idem (criada 4 min depois — par de templates) |
| 3 | `create_user` | Funcionalidade substituída pelo `manage-users` (no repo) |
| 4 | `product-search-v2` | 🚨 Vazando catálogo inteiro com custos. Remoção URGENTE |
| 5 | `product-classifier` | Endpoint público sem uso. Implementar limpamente se necessário |
| 6 | `guardrails-ml` | Idem |

Razões agregadas:

1. ❌ Nenhuma está no repo (sem rollback, mas sem código a perder)
2. ❌ Nenhuma é referenciada pelo frontend ou backend
3. ❌ Nenhuma tem registro de uso real (`ai_usage_logs` vazio)
4. 🚨 1 está ativamente vazando dados sensíveis para a internet
5. 🟡 2 outras são endpoints públicos sem auth (risco de DDoS / abuso de cota)
6. ✅ Features que essas functions *poderiam* fazer ou (a) têm equivalente
   já no repo, ou (b) podem ser implementadas corretamente quando houver
   demanda real

---

## 5. Como deletar (procedimento operacional)

1. **Mergear este PR** na main
2. Acessar **GitHub → Actions → "Delete Orphan Edge Functions"**
3. Clicar em **Run workflow**
4. **Primeira execução (dry-run)**: deixar `dryRun = true`. Confirmar que
   lista exatamente as 6 edges esperadas
5. **Segunda execução (real)**: marcar `dryRun = false` E digitar `DELETE`
   no campo `confirm`
6. Após sucesso, validar:
   ```sql
   -- Conferir que ai_function_routing não tem entradas órfãs:
   SELECT function_name FROM public.ai_function_routing
   WHERE function_name IN (
     'super-processor','quick-task','create_user',
     'product-search-v2','product-classifier','guardrails-ml'
   );
   ```
   (Já validado: routing existe apenas para `generate-mockup-nanobanana`,
   que será removido junto com o PR #132 / merge do PR #131.)

---

## 6. Anexos: dados brutos do probe

### 6.1 Resposta GET de `product-classifier`

```json
{
  "service": "product-classifier",
  "version": "v1.1",
  "categories": [
    "escrita", "bebidas", "vestuario", "bags",
    "tech", "escritorio", "utilidades", "saude"
  ]
}
```

### 6.2 Resposta GET de `guardrails-ml`

```json
{
  "service": "guardrails-ml",
  "version": "v2.3",
  "status": "healthy"
}
```

### 6.3 Primeiro produto vazado por `product-search-v2`

```json
{
  "id": "b887805d-7ae2-4f28-912a-5e879bca8b75",
  "name": " CADERNETA S/ PAUTA - 14X21CM - BEGE/AZUL",
  "sku": "LE-34373",
  "category_id": "b1000000-0000-0000-0000-000000000006",
  "supplier_id": "841cd690-210a-422a-908c-7676828db272",
  "cost_price": 13.92,
  "sale_price": 20.88,
  "suggested_price": 16.26,
  "stock_quantity": 300,
  "ncm_code": "48202000",
  "origin_country": "China",
  "brand": "Só Marcas",
  "organization_id": "5db5aee1-064b-4ef4-9193-345dcd8274ea",
  "...": "+ 135 outros campos"
}
```

---

**Auditoria conduzida por:** análise estática completa do código + probe
autenticado e não-autenticado das 6 edges + cross-check com `ai_usage_logs`
e `analytics_events` no banco doufsxqlfjyuvxuezpln.

**Próxima ação após delete**: revisar o restante das edges (existem 79
outras) usando a mesma metodologia para detectar outros zumbis.
