# 🔐 Explicação das Policies (RLS)

> **Sistema Multi-tenant Gifts Store**  
> Guia completo de todas as 80+ policies de Row Level Security

---

## 📋 O que são Policies?

**Policies** são regras que controlam **quem pode acessar quais dados** no PostgreSQL.

### **Como funcionam:**

```sql
-- 1. Habilitar RLS na tabela
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 2. Criar policy
CREATE POLICY "org_members_view_products"
ON products FOR SELECT
TO authenticated
USING (
  -- Condição: user deve ser membro da org
  public.user_is_org_member(organization_id)
);

-- 3. Supabase aplica automaticamente
-- Frontend não precisa filtrar manualmente!
```

### **Tipos de Operações:**

- **SELECT** → Ver dados
- **INSERT** → Criar dados
- **UPDATE** → Editar dados
- **DELETE** → Deletar dados
- **ALL** → Todas operações

---

## 🎯 Funções Helper

Antes de explicar as policies, vamos entender as funções usadas:

### **1. user_is_org_member()**

```sql
CREATE FUNCTION user_is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;
```

**O que faz:** Verifica se o usuário atual pertence à organização.

**Uso:**
```sql
USING (user_is_org_member(organization_id))
```

### **2. is_org_admin()**

```sql
CREATE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;
```

**O que faz:** Verifica se o usuário é admin da organização.

### **3. is_org_owner_or_admin()**

```sql
CREATE FUNCTION is_org_owner_or_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql;
```

**O que faz:** Verifica se o usuário é owner OU admin.

---

## 📊 CATEGORIES (Categorias)

### **Policy 1: org_members_view_categories**

```sql
CREATE POLICY "org_members_view_categories"
ON categories FOR SELECT
TO authenticated
USING (user_is_org_member(organization_id));
```

**Quem:** Todos os membros da org  
**O que:** Podem ver categorias  
**Quando:** Da própria org

**Exemplo:**
```typescript
// João (member da Org A)
const { data } = await supabase.from('categories').select('*');
// Retorna apenas categorias da Org A
```

### **Policy 2: org_admins_create_categories**

```sql
CREATE POLICY "org_admins_create_categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (is_org_owner_or_admin(organization_id));
```

**Quem:** Apenas admins/owners  
**O que:** Podem criar categorias  
**Onde:** Na própria org

### **Policy 3: org_admins_update_categories**

```sql
CREATE POLICY "org_admins_update_categories"
ON categories FOR UPDATE
TO authenticated
USING (is_org_owner_or_admin(organization_id))
WITH CHECK (is_org_owner_or_admin(organization_id));
```

**Quem:** Apenas admins/owners  
**O que:** Podem editar categorias  
**Onde:** Da própria org

### **Policy 4: org_admins_delete_categories**

```sql
CREATE POLICY "org_admins_delete_categories"
ON categories FOR DELETE
TO authenticated
USING (is_org_owner_or_admin(organization_id));
```

**Quem:** Apenas admins/owners  
**O que:** Podem deletar categorias

---

## 🏭 SUPPLIERS (Fornecedores)

### **Policy 1: org_members_view_suppliers**

```sql
CREATE POLICY "org_members_view_suppliers"
ON suppliers FOR SELECT
TO authenticated
USING (user_is_org_member(organization_id));
```

**Comportamento:** Mesma lógica de categories - members veem, apenas admins gerenciam.

### **Policy 2: org_admins_manage_suppliers**

```sql
CREATE POLICY "org_admins_manage_suppliers"
ON suppliers FOR ALL
TO authenticated
USING (is_org_owner_or_admin(organization_id))
WITH CHECK (is_org_owner_or_admin(organization_id));
```

**Nota:** Usa `FOR ALL` para permitir INSERT, UPDATE e DELETE em uma única policy.

---

## 📦 PRODUCTS (Produtos)

### **Policy 1: org_members_view_products**

```sql
CREATE POLICY "org_members_view_products"
ON products FOR SELECT
TO authenticated
USING (user_is_org_member(organization_id));
```

**Quem:** Todos membros  
**O que:** Veem produtos da org

### **Policy 2: org_admins_manage_products**

```sql
CREATE POLICY "org_admins_manage_products"
ON products FOR ALL
TO authenticated
USING (is_org_owner_or_admin(organization_id))
WITH CHECK (is_org_owner_or_admin(organization_id));
```

**Quem:** Admins/owners  
**O que:** Gerenciam produtos completamente

---

## 🎨 PRODUCT_VARIANTS (Variantes)

### **Policy 1: org_members_view_variants**

```sql
CREATE POLICY "org_members_view_variants"
ON product_variants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = product_variants.product_id
      AND user_is_org_member(organization_id)
  )
);
```

**Diferencial:** Herda org do produto pai via JOIN!

**Como funciona:**
1. User tenta ver variante
2. Policy verifica se o produto pai pertence à org do user
3. Se sim, permite; se não, bloqueia

### **Policy 2: org_admins_manage_variants**

```sql
CREATE POLICY "org_admins_manage_variants"
ON product_variants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = product_variants.product_id
      AND is_org_owner_or_admin(organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = product_variants.product_id
      AND is_org_owner_or_admin(organization_id)
  )
);
```

**Nota:** Mesmo admin precisa que o produto pai seja da org.

---

## 💰 QUOTES (Orçamentos)

### **Policy 1: org_members_view_quotes**

```sql
CREATE POLICY "org_members_view_quotes"
ON quotes FOR SELECT
TO authenticated
USING (user_is_org_member(organization_id));
```

**Comportamento padrão:** Members veem todos os quotes da org.

### **Policy 2: org_members_create_quotes**

```sql
CREATE POLICY "org_members_create_quotes"
ON quotes FOR INSERT
TO authenticated
WITH CHECK (user_is_org_member(organization_id));
```

**Diferencial:** Até members podem criar quotes!

### **Policy 3: org_members_update_own_quotes**

```sql
CREATE POLICY "org_members_update_own_quotes"
ON quotes FOR UPDATE
TO authenticated
USING (
  user_is_org_member(organization_id) 
  AND (created_by = auth.uid() OR is_org_admin(organization_id))
);
```

**Regra importante:**
- Members podem editar **apenas próprios quotes**
- Admins podem editar **qualquer quote** da org

**Exemplo:**
```typescript
// João (member) criou Quote #001
// João PODE editar Quote #001
// João NÃO PODE editar Quote #002 (criado por Maria)

// Admin PODE editar Quote #001 e #002
```

### **Policy 4: org_admins_delete_quotes**

```sql
CREATE POLICY "org_admins_delete_quotes"
ON quotes FOR DELETE
TO authenticated
USING (is_org_owner_or_admin(organization_id));
```

**Regra:** Apenas admins podem deletar (members não).

---

## 📝 QUOTE_ITEMS (Itens do Orçamento)

### **Policy 1: org_members_view_quote_items**

```sql
CREATE POLICY "org_members_view_quote_items"
ON quote_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE id = quote_items.quote_id
      AND user_is_org_member(organization_id)
  )
);
```

**Herança:** Itens herdam org do quote pai.

### **Policy 2: org_members_manage_quote_items**

```sql
CREATE POLICY "org_members_manage_quote_items"
ON quote_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE id = quote_items.quote_id
      AND (created_by = auth.uid() OR is_org_admin(organization_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE id = quote_items.quote_id
      AND user_is_org_member(organization_id)
  )
);
```

**Lógica:**
- **USING:** Member só edita itens de próprios quotes, admin edita qualquer
- **WITH CHECK:** Ao criar, apenas precisa ser member da org

---

## 🛒 ORDERS (Pedidos)

Mesma lógica de Quotes:

- Members veem todos orders da org
- Members criam orders
- Members editam apenas próprios orders
- Admins editam/deletam qualquer order

---

## 💳 PAYMENTS (Pagamentos)

### **Policy 1: org_members_view_payments**

```sql
CREATE POLICY "org_members_view_payments"
ON payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = payments.order_id
      AND user_is_org_member(organization_id)
  )
);
```

**Herança:** Payments herdam org do order.

### **Policy 2: org_admins_manage_payments**

```sql
CREATE POLICY "org_admins_manage_payments"
ON payments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = payments.order_id
      AND is_org_admin(organization_id)
  )
)
WITH CHECK (...);
```

**Importante:** Apenas **admins** gerenciam payments (não members).

**Motivo:** Payments são financeiramente sensíveis.

---

## 👥 BITRIX_CLIENTS (Clientes)

### **Policy 1: org_members_view_clients**

```sql
CREATE POLICY "org_members_view_clients"
ON bitrix_clients FOR SELECT
TO authenticated
USING (user_is_org_member(organization_id));
```

### **Policy 2: org_admins_manage_clients**

```sql
CREATE POLICY "org_admins_manage_clients"
ON bitrix_clients FOR ALL
TO authenticated
USING (is_org_owner_or_admin(organization_id))
WITH CHECK (is_org_owner_or_admin(organization_id));
```

**Comportamento:** Apenas admins gerenciam clientes.

---

## 🎨 MOCKUP_GENERATION_JOBS

### **Policy 1: org_members_view_mockup_jobs**

```sql
CREATE POLICY "org_members_view_mockup_jobs"
ON mockup_generation_jobs FOR SELECT
TO authenticated
USING (user_is_org_member(organization_id));
```

### **Policy 2: org_members_create_mockup_jobs**

```sql
CREATE POLICY "org_members_create_mockup_jobs"
ON mockup_generation_jobs FOR INSERT
TO authenticated
WITH CHECK (user_is_org_member(organization_id));
```

**Diferencial:** Members podem criar jobs de mockup!

---

## 🖼️ GENERATED_MOCKUPS

```sql
CREATE POLICY "org_members_view_generated_mockups"
ON generated_mockups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mockup_generation_jobs
    WHERE id = generated_mockups.job_id
      AND user_is_org_member(organization_id)
  )
);
```

**Herança:** Mockups herdam org do job.

---

## 📚 COLLECTIONS

### **Policy 1: org_members_view_collections**

```sql
CREATE POLICY "org_members_view_collections"
ON collections FOR SELECT
TO authenticated
USING (user_is_org_member(organization_id));
```

### **Policy 2: org_admins_manage_collections**

```sql
CREATE POLICY "org_admins_manage_collections"
ON collections FOR ALL
TO authenticated
USING (is_org_owner_or_admin(organization_id))
WITH CHECK (is_org_owner_or_admin(organization_id));
```

---

## ⭐ USER_FAVORITES (Favoritos)

### **Diferença:** User-scoped (não org-scoped!)

```sql
CREATE POLICY "users_view_own_favorites"
ON user_favorites FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

**Por quê?** Favoritos são pessoais, não da org.

**Comportamento:**
- João vê apenas seus favoritos
- Maria vê apenas seus favoritos
- Mesmo sendo da mesma org!

### **Outras policies user-scoped:**

```sql
CREATE POLICY "users_create_own_favorites"
ON user_favorites FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_favorites"
ON user_favorites FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

---

## 🔍 USER_FILTER_PRESETS

Mesma lógica de favorites - user-scoped:

```sql
CREATE POLICY "users_view_own_presets"
ON user_filter_presets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_presets"
ON user_filter_presets FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## 💾 SAVED_FILTERS

User-scoped também:

```sql
CREATE POLICY "users_view_own_filters"
ON saved_filters FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

---

## 🔔 PUSH_SUBSCRIPTIONS

User-scoped:

```sql
CREATE POLICY "users_view_own_subscriptions"
ON push_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

---

## ⚙️ NOTIFICATION_PREFERENCES

User-scoped:

```sql
CREATE POLICY "users_view_own_notification_prefs"
ON notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

---

## 👀 PRODUCT_VIEWS (Analytics)

### **Policy 1: authenticated_view_product_views**

```sql
CREATE POLICY "authenticated_view_product_views"
ON product_views FOR SELECT
TO authenticated
USING (true);
```

**Diferencial:** Qualquer autenticado pode ver (analytics público).

### **Policy 2: authenticated_create_product_views**

```sql
CREATE POLICY "authenticated_create_product_views"
ON product_views FOR INSERT
TO authenticated
WITH CHECK (true);
```

**Motivo:** Queremos trackear TODOS os views, de qualquer org.

---

## ⭐ PRODUCT_REVIEWS

### **Policy 1: org_members_view_product_reviews**

```sql
CREATE POLICY "org_members_view_product_reviews"
ON product_reviews FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = product_reviews.product_id
      AND (organization_id IS NULL OR user_is_org_member(organization_id))
  )
);
```

**Nota:** `organization_id IS NULL` permite reviews globais (se existirem).

### **Policy 2: authenticated_create_reviews**

```sql
CREATE POLICY "authenticated_create_reviews"
ON product_reviews FOR INSERT
TO authenticated
WITH CHECK (true);
```

**Permissivo:** Qualquer um pode criar review.

### **Policy 3: users_manage_own_reviews**

```sql
CREATE POLICY "users_manage_own_reviews"
ON product_reviews FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**Lógica:** User gerencia apenas próprias reviews.

---

## 🔀 PRODUCT_COMPARISONS

User-scoped:

```sql
CREATE POLICY "users_view_own_comparisons"
ON product_comparisons FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

**Motivo:** Comparações são pessoais.

---

## 💵 PRODUCT_PRICE_HISTORY

### **Policy 1: org_members_view_price_history**

```sql
CREATE POLICY "org_members_view_price_history"
ON product_price_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = product_price_history.product_id
      AND (organization_id IS NULL OR user_is_org_member(organization_id))
  )
);
```

**Herança:** Histórico herda org do produto.

### **Policy 2: system_create_price_history**

```sql
CREATE POLICY "system_create_price_history"
ON product_price_history FOR INSERT
TO authenticated
WITH CHECK (true);
```

**Motivo:** Sistema cria automaticamente via trigger.

---

## 💬 QUOTE_COMMENTS

### **Policy 1: org_members_view_quote_comments**

```sql
CREATE POLICY "org_members_view_quote_comments"
ON quote_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE id = quote_comments.quote_id
      AND (organization_id IS NULL OR user_is_org_member(organization_id))
  )
);
```

**Herança:** Comentários herdam org do quote.

### **Policy 2: org_members_create_quote_comments**

```sql
CREATE POLICY "org_members_create_quote_comments"
ON quote_comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE id = quote_comments.quote_id
      AND (organization_id IS NULL OR user_is_org_member(organization_id))
  )
);
```

**Permissivo:** Members podem comentar.

---

## 📊 ANALYTICS_EVENTS

### **Policy 1: authenticated_view_analytics**

```sql
CREATE POLICY "authenticated_view_analytics"
ON analytics_events FOR SELECT
TO authenticated
USING (true);
```

**Público:** Todos autenticados veem analytics.

### **Policy 2: system_create_analytics**

```sql
CREATE POLICY "system_create_analytics"
ON analytics_events FOR INSERT
TO authenticated
WITH CHECK (true);
```

**Sistema:** Cria eventos automaticamente.

---

## 🔍 SEARCH_QUERIES

```sql
CREATE POLICY "authenticated_view_searches"
ON search_queries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated_create_searches"
ON search_queries FOR INSERT
TO authenticated
WITH CHECK (true);
```

**Público:** Todas buscas são públicas (para insights).

---

## 📋 AUDIT_LOG

```sql
CREATE POLICY "authenticated_view_audit_log"
ON audit_log FOR SELECT
TO authenticated
USING (true);
```

**Transparência:** Todos veem audit log.

---

## 📝 NOTIFICATION_TEMPLATES

### **Policy 1: all_view_active_templates**

```sql
CREATE POLICY "all_view_active_templates"
ON notification_templates FOR SELECT
TO authenticated
USING (is_active = true);
```

**Global:** Templates são globais (todas orgs usam).

### **Policy 2: authenticated_manage_templates**

```sql
CREATE POLICY "authenticated_manage_templates"
ON notification_templates FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

**Nota:** Pode ser restrito a admins no futuro.

---

## 🧪 Como Testar Policies

### **Teste 1: Member vê apenas dados da própria org**

```sql
-- Logar como member da Org A
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-A-uuid"}';

-- Tentar ver produtos
SELECT * FROM products;
-- Deve retornar APENAS produtos da Org A

-- Tentar ver produtos de outra org diretamente
SELECT * FROM products WHERE organization_id = 'org-B-uuid';
-- Deve retornar 0 rows (bloqueado por RLS)
```

### **Teste 2: Member não pode deletar**

```sql
-- Tentar deletar produto
DELETE FROM products WHERE id = 'product-uuid';
-- Deve dar erro: "policy violation"
```

### **Teste 3: Admin pode gerenciar**

```sql
-- Logar como admin
SET LOCAL request.jwt.claims TO '{"sub": "admin-uuid"}';

-- Criar produto
INSERT INTO products (organization_id, name) 
VALUES ('my-org-uuid', 'Teste');
-- Deve funcionar ✅

-- Deletar produto
DELETE FROM products WHERE id = 'product-uuid';
-- Deve funcionar ✅
```

---

## 📚 Resumo

### **Padrões de Policies:**

**Organization-scoped:**
- Members veem
- Admins gerenciam

**User-scoped:**
- User vê apenas próprios
- User gerencia apenas próprios

**Herança via JOIN:**
- Filhos herdam org do pai
- Ex: quote_items herdam org do quote

**Público/Open:**
- Analytics
- Templates
- Search queries

**Proteção financeira:**
- Payments: apenas admins

**Criação por members:**
- Quotes: sim
- Orders: sim
- Mockup jobs: sim
- Products: não (apenas admins)

---

## 📚 Referências

- [Como Criar Primeira Organization](./01_CRIAR_PRIMEIRA_ORGANIZATION.md)
- [Integração Frontend](./02_INTEGRACAO_FRONTEND_REACT.md)
- [Arquitetura do Sistema](./03_ARQUITETURA_DO_SISTEMA.md)
- [Próximos Passos](./05_ROADMAP_PROXIMOS_PASSOS.md)

---

**✅ 80+ Policies explicadas!** 🚀
