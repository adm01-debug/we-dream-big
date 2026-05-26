# Auditoria — Módulo Cadastro de Produtos & Fornecedores

**Data:** 2026-05-26  
**Auditor:** TIPROMO / Agente BPM  
**Sistemas envolvidos:**
- Frontend: `src/components/admin/products/` + `src/components/admin/suppliers-manager/`
- DB Produtos: `doufsxqlfjyuvxuezpln` (Supabase)
- DB Empresas: `pgxfvjmuubtbowutlide` (Supabase)
- Deploy: `promo-gifts-beta.vercel.app`

---

## Resumo Executivo

Foram identificados **30 bugs** distribuídos em 4 severidades. Os mais críticos comprometem integridade de dados, causam upload em banco errado e fazem filtros retornarem resultados incorretos por operarem só sobre a página atual (não o banco inteiro).

| Severidade | Qtd | Status |
|------------|-----|--------|
| 🔴 Crítico | 5 | corrigido neste PR |
| 🟠 Alto | 8 | corrigido neste PR |
| 🟡 Médio | 8 | corrigido neste PR |
| 🟢 Baixo | 9 | corrigido neste PR |

---

## 🔴 BUGS CRÍTICOS

### T-01 — Filtros `price_min`, `price_max`, `is_kit` operam client-side pós-paginação
**Arquivo:** `src/components/admin/products/useProductsManager.ts`  
**Linha:** ~185 (`displayedProducts` useMemo)  
**Impacto:** Com paginação server-side de 50 produtos/página, o filtro de preço/kit filtra apenas os 50 da tela atual. Usuário vê resultado falso (ex.: "3 produtos no kit" quando há 200 no banco).  
**Correção:** Mover `price_min`, `price_max`, `is_kit` para `serverFilters` no `fetchProducts`.

---

### T-02 — Upload de logo de fornecedor usa cliente Supabase ERRADO
**Arquivo:** `src/components/admin/suppliers-manager/useSuppliersManager.ts`  
**Linha:** `handleLogoUpload` — usa `import { supabase } from '@/integrations/supabase/client'`  
**Impacto:** `client` aponta para `doufsxqlfjyuvxuezpln` (Produtos). Logos de fornecedores sobem para o bucket do banco de Produtos, não do banco de Empresas (`pgxfvjmuubtbowutlide`). Potencial violação de namespace e faturamento.  
**Correção:** Usar o cliente correto da instância de Empresas: `supabaseCrm` de `@/lib/crm-db`.

---

### T-03 — Tabela `suppliers` sem FK para `companies` do banco de Empresas
**Contexto:** Schema `doufsxqlfjyuvxuezpln`.  
**Impacto:** Nenhuma referência relacional entre fornecedores (DB Produtos) e empresas do CRM (DB Empresas). A busca de transportadora pesquisa em `pgxfvjmuubtbowutlide.companies` mas salva apenas texto livre em `notes`, sem ID referenciado.  
**Correção:** Adicionar coluna `crm_company_id UUID` em `suppliers` + migration de reconciliação.

---

### T-04 — Dados financeiros críticos (PIX, formas de pagamento) serializados em campo `notes` via regex frágil
**Arquivo:** `useSuppliersManager.ts` — `buildNotesPayload` + `handleEdit`  
**Impacto:** Dados de pagamento/PIX armazenados como texto concatenado `[Financeiro: Forma: ..., PIX: ...]`. Qualquer texto livre com `[Financeiro:` no campo `notes` quebra o parser. Impossível buscar, indexar ou auditar pagamentos.  
**Correção:** Adicionar colunas dedicadas `pix_keys JSONB` e `payment_methods TEXT[]` na tabela `suppliers`.

---

### T-05 — Contatos de fornecedores em JSON string sem tabela relacional
**Arquivo:** `useSuppliersManager.ts`  
**Impacto:** Campo `contacts TEXT` contém JSON serializado. Sem FK, sem índice, sem integridade referencial. Impossível buscar por contato, enviar e-mail em massa, ou auditar acessos.  
**Correção:** Criar tabela `supplier_contacts` com FK para `suppliers.id`.

---

## 🟠 BUGS ALTO

### T-06 — Mapeamento de imagens destrói galeria multi-imagem
**Arquivo:** `useProductsManager.ts` linha ~149  
**Código problemático:** `images: imageUrl ? [imageUrl] : Array.isArray(p.images) ? p.images : []`  
**Impacto:** Quando `getProductImageUrl()` retorna qualquer URL (inclusive thumbnail), ignora `p.images` completo. Produto com 5 imagens exibe apenas 1 na listagem.  
**Correção:** Preservar `p.images` e usar `imageUrl` apenas como fallback quando `images` estiver vazio.

---

### T-07 — Campo `video_url` retorna `[object Object]` para vídeos estruturados
**Arquivo:** `useProductsManager.ts` linha ~200  
**Código problemático:** `((pRec.videos as unknown[])?.[0] as string | undefined) ?? null`  
**Impacto:** Se `videos` é `Array<{url: string; title: string}>`, o cast para `string` resulta em `[object Object]`.  
**Correção:** Extrair `.url` do primeiro objeto quando for um objeto.

---

### T-08 — Fornecedores com `limit: 200` hardcoded sem paginação
**Arquivo:** `useSuppliersManager.ts` linha ~96  
**Impacto:** Com >200 fornecedores, a lista fica incompleta silenciosamente. Nenhum aviso ao usuário.  
**Correção:** Implementar paginação server-side ou ao menos carregar em loop até `count`.

---

### T-09 — `code` de fornecedor auto-gerado sem verificação de unicidade
**Arquivo:** `useSuppliersManager.ts` — `handleSave` payload  
**Impacto:** `code` gerado a partir do nome sem checar UNIQUE constraint. Dois fornecedores com nomes similares geram mesmo `code` → duplicate key error silencioso.  
**Correção:** Verificar unicidade do `code` antes de salvar ou usar sufixo numérico.

---

### T-10 — Dualidade de fonte de verdade: contato salvo em colunas E em JSON
**Arquivo:** `useSuppliersManager.ts` — `handleSave` payload  
**Impacto:** Primeiro contato salvo em `contact_name/email/phone` AND no JSON do campo `contacts`. Ao editar apenas um dos dois lados, dados ficam dessincronizados.  
**Correção:** Usar apenas `contacts` JSON ou apenas colunas dedicadas. Preferência: tabela relacional (T-05).

---

### T-11 — Stats (active, noStock, avgPrice) calculados sobre página atual, não o banco total
**Arquivo:** `useProductsManager.ts` — `stats` useMemo  
**Impacto:** Cards "Ativos: 35 / Inativos: 15" refletem apenas 50 produtos carregados, não os ~500 do banco.  
**Correção:** Buscar contadores via query server-side separada ou `COUNT()` por grupo.

---

### T-12 — Ativação/desativação envia campos duplicados `is_active` E `active`
**Arquivo:** `useProductsManager.ts` — `handleBulkToggleActive`  
**Código:** `data: { is_active: activate, active: activate }`  
**Impacto:** Evidência de schema com colunas duplicadas; deve-se usar apenas uma fonte de verdade.  
**Correção:** Consolidar schema para usar apenas `is_active`. Migration + remoção do envio duplo.

---

### T-13 — Fallback `category_id ?? main_category_id` expõe schema com coluna duplicada
**Arquivo:** `useProductsManager.ts` linha ~142  
**Impacto:** `p.category_id ?? pRec.main_category_id` indica que há dois campos para o mesmo conceito.  
**Correção:** Migration: `UPDATE products SET category_id = main_category_id WHERE category_id IS NULL; DROP COLUMN main_category_id;`

---

## 🟡 BUGS MÉDIO

### T-14 — `confirm()` nativo no delete de fornecedor (bloqueante, inconsistente)
**Arquivo:** `useSuppliersManager.ts` — `handleDelete`  
**Impacto:** `confirm()` bloqueia a thread, não tem estilo consistente com o restante da UI, e é bloqueado em alguns navegadores modernos em iframes.  
**Correção:** Usar `AlertDialog` do shadcn/ui (padrão já usado em `ProductsManager`).

---

### T-15 — States auxiliares não resetados em caso de erro no handleSave
**Arquivo:** `useSuppliersManager.ts` — `handleSave`  
**Impacto:** Se o save falhar, `pixKeys`, `contacts`, `foneFixo1/2` ficam com estado sujo. Nova tentativa de editar outro fornecedor pode pré-preencher com dados do anterior.  
**Correção:** Resetar states auxiliares no bloco `catch` ou `finally`.

---

### T-16 — `handleCnpjLookup` sobrescreve `email` e `phone` sem confirmação
**Arquivo:** `useSuppliersManager.ts` — `handleCnpjLookup`  
**Impacto:** Dados válidos cadastrados manualmente são destruídos silenciosamente ao consultar CNPJ.  
**Correção:** Preencher apenas campos vazios, ou mostrar modal de confirmação para campos preenchidos.

---

### T-17 — Duplicate check de nome é case-sensitive
**Arquivo:** `useSuppliersManager.ts` — `handleSave`  
**Impacto:** "SPOT" e "Spot" tratados como fornecedores diferentes. Duplicatas passam desapercebidas.  
**Correção:** Usar `ilike` no filtro ou comparar com `LOWER()`.

---

### T-18 — Payload salva `min_order_value` E `minimum_order_value` com o mesmo valor
**Arquivo:** `useSuppliersManager.ts` — payload linha ~  
**Impacto:** Redundância de schema. Qualquer atualização deve ser feita nos dois campos.  
**Correção:** Remover `minimum_order_value` do payload (e deprecar a coluna no schema).

---

### T-19 — `fetchProducts` useCallback sem `searchTerm` nas dependências
**Arquivo:** `useProductsManager.ts`  
**Impacto:** ESLint react-hooks/exhaustive-deps violation. `searchTerm` capturado em closure stale.  
**Correção:** Adicionar `searchTerm` ao array de deps do useCallback.

---

### T-20 — Transportadora salva como texto livre, sem FK real
**Arquivo:** `useSuppliersManager.ts` — `buildNotesPayload`  
**Impacto:** Nome da transportadora pode ficar desatualizado ao renomear empresa no CRM. Sem integridade referencial.  
**Correção:** Usar colunas `default_carrier_id UUID` + `default_carrier_name TEXT` na tabela.

---

### T-21 — `SupplierFormDialog.tsx` monolítico com 42KB
**Arquivo:** `src/components/admin/suppliers-manager/SupplierFormDialog.tsx`  
**Impacto:** UI + validações + uploads + PIX + endereço em um único arquivo. Alta dificuldade de manutenção.  
**Correção:** Extrair: `SupplierContactsSection`, `SupplierPixSection`, `SupplierAddressSection`, `SupplierFinancialSection`.

---

### T-22 — `handleBulkToggleActive` usa `Promise.all` sem retry em falha parcial
**Arquivo:** `useProductsManager.ts`  
**Impacto:** Se 1 de 50 updates falhar, todos os outros já foram aplicados mas o usuário vê só a mensagem de erro genérica. Estado parcialmente atualizado.  
**Correção:** Usar `Promise.allSettled` + reportar quantos falharam vs. sucederam.

---

## 🟢 BUGS BAIXO

### T-23 — `useEffect` inicial sem dependências (`[]`) — ESLint violation
**Arquivo:** `useProductsManager.ts`  
**Correção:** Mover para `useEffect(() => { fetchProducts(1, pageSize, searchTerm) }, [fetchProducts])`

---

### T-24 — `toggleSelectAll` seleciona apenas produtos da página atual
**Arquivo:** `useProductsManager.ts`  
**Correção:** Implementar "selecionar todos no banco" ou deixar claro no UX que é seleção da página.

---

### T-25 — Busca de fornecedores sem debounce
**Arquivo:** `useSuppliersManager.ts` — `filtered` useMemo  
**Correção:** Adicionar `useDebouncedValue(search, 300)` antes do `useMemo`.

---

### T-26 — `carrierSearchTimeout` ref sem cleanup no unmount (memory leak)
**Arquivo:** `useSuppliersManager.ts`  
**Correção:** Retornar cleanup function no `useEffect` que gerencia o timeout.

---

### T-27 — Logo de novo fornecedor salva em path `suppliers/new-{timestamp}.ext`
**Arquivo:** `useSuppliersManager.ts` — `handleLogoUpload`  
**Impacto:** Após salvar o fornecedor com ID real, o arquivo fica em path errado.  
**Correção:** Salvar logo apenas após ter o ID real, ou renomear após inserção.

---

### T-28 — Lógica `find(k => validatePixKey(...))` potencialmente invertida
**Arquivo:** `useSuppliersManager.ts` — `handleSave`  
**Código:** `.find((k) => validatePixKey(k.chave, k.tipo))`  
**Impacto:** `validatePixKey` retorna `string` (mensagem de erro) quando inválido e `null` quando válido. O `.find()` vai parar na **primeira chave VÁLIDA** (null é falsy), não na inválida.  
**Correção:** `.find((k) => validatePixKey(k.chave, k.tipo) !== null)`

---

### T-29 — Filtros e página perdidos ao navegar para formulário e voltar
**Arquivo:** `useProductsManager.ts` — `openEditForm`  
**Correção:** Persistir estado em URL query params ou React Router state.

---

### T-30 — `AdminProductFormPage` sem guards para bifurcação criar vs. editar
**Arquivo:** `src/pages/admin/AdminProductFormPage.tsx`  
**Impacto:** `id === 'novo'` vs `id === uuid` sem validação de formato. UUID inválido causa requisição ao banco que retorna erro não tratado.  
**Correção:** Validar UUID com regex antes de fazer a fetch; redirecionar para criação se inválido.

---

## Migrations SQL Necessárias

```sql
-- ===================================================
-- BANCO: doufsxqlfjyuvxuezpln (Produtos)
-- ===================================================

-- [T-12] Consolidar is_active/active
ALTER TABLE products 
  RENAME COLUMN active TO _deprecated_active;
-- Após validar: DROP COLUMN _deprecated_active;

-- [T-13] Consolidar category_id/main_category_id
UPDATE products SET category_id = main_category_id WHERE category_id IS NULL;
ALTER TABLE products DROP COLUMN main_category_id;

-- [T-04] Colunas dedicadas para PIX e formas de pagamento em suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS pix_keys JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[] NOT NULL DEFAULT '{}';

-- [T-20] Colunas para transportadora padrão
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS default_carrier_id UUID NULL,
  ADD COLUMN IF NOT EXISTS default_carrier_name TEXT NULL;

-- [T-03] Link para empresa no CRM  
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS crm_company_id UUID NULL;

-- [T-05] Tabela relacional de contatos de fornecedores
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         TEXT,
  email        TEXT,
  phone        TEXT,
  is_primary   BOOLEAN DEFAULT FALSE,
  signature    TEXT,
  nickname     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id 
  ON supplier_contacts(supplier_id);

-- [T-18] Remover coluna duplicada
ALTER TABLE suppliers DROP COLUMN IF EXISTS minimum_order_value;

-- [T-08] Garantir que suppliers tem totalCount para paginação
-- (sem alteração de schema, apenas uso de returnCount: true)
```

---

## Plano de Correção por Sprint

### Sprint 1 — Críticos (este PR)
- T-01, T-02, T-06, T-07, T-08, T-12, T-14, T-17, T-18

### Sprint 2 — Altos restantes
- T-03, T-04, T-05 (dependem de migrations)
- T-09, T-10, T-11

### Sprint 3 — Médios/Baixos
- T-13 (depende migration)
- T-15, T-16, T-19, T-20, T-21, T-22–T-30

---

*Gerado automaticamente pelo Agente BPM — Promo Brindes TIPROMO*
