# 🏗️ Arquitetura do Sistema

> **Sistema Multi-tenant Gifts Store**  
> Documentação completa da arquitetura e design patterns

---

## 📋 Visão Geral

O **Gifts Store** é um sistema **multi-tenant** que permite múltiplas empresas (Organizations) usarem a mesma aplicação com **isolamento completo de dados**.

### **Características Principais:**

- ✅ **Multi-tenancy** via Organizations
- ✅ **Row Level Security (RLS)** em todas as tabelas
- ✅ **Roles e Permissions** granulares
- ✅ **Real-time** com Supabase Realtime
- ✅ **TypeScript** end-to-end
- ✅ **Escalável** e **Seguro**

---

## 🎯 Modelo Multi-tenant

### **Conceito:**

```
┌─────────────────────────────────────────────────────────┐
│                    APLICAÇÃO ÚNICA                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Organization 1 │  │  Organization 2 │             │
│  ├─────────────────┤  ├─────────────────┤             │
│  │ Users           │  │ Users           │             │
│  │ Products        │  │ Products        │             │
│  │ Orders          │  │ Orders          │             │
│  │ ...             │  │ ...             │             │
│  └─────────────────┘  └─────────────────┘             │
│         ▲                      ▲                        │
│         │                      │                        │
│         └──────────────────────┘                        │
│            DADOS ISOLADOS                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Cada Organization tem:**
- Seus próprios usuários (com roles)
- Seus próprios produtos
- Seus próprios orçamentos e pedidos
- Seus próprios clientes
- Configurações independentes

**Usuários NÃO podem:**
- Ver dados de outras orgs
- Modificar dados de outras orgs
- Interagir com outras orgs (exceto via APIs específicas)

---

## 🗄️ Estrutura do Banco de Dados

### **Tabelas Principais:**

```
CORE (Multi-tenant)
├── organizations
├── user_organizations
│
CATALOG (Organization-scoped)
├── categories
├── suppliers
├── products
├── product_variants
├── personalization_techniques (global/scoped)
│
SALES (Organization-scoped)
├── quotes
├── quote_items
├── orders
├── order_items
├── payments
│
CLIENTS (Organization-scoped)
├── bitrix_clients
├── client_contacts
├── client_notes
│
MOCKUPS (Organization-scoped)
├── mockup_generation_jobs
├── generated_mockups
│
COLLECTIONS (Organization-scoped)
├── collections
├── collection_products
│
USER DATA (User-scoped)
├── user_favorites
├── user_filter_presets
├── saved_filters
├── push_subscriptions
├── notification_preferences
│
SYSTEM (Global/Admin)
├── feature_flags
├── system_settings
├── notification_templates
├── analytics_events
├── audit_log
├── sync_jobs
```

---

## 🔐 Row Level Security (RLS)

### **Como Funciona:**

**1. Todas as tabelas têm RLS habilitado:**

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

**2. Policies controlam acesso:**

```sql
-- Members da org podem ver produtos da org
CREATE POLICY "org_members_view_products"
ON products FOR SELECT
TO authenticated
USING (
  public.user_is_org_member(organization_id)
);
```

**3. Supabase aplica policies automaticamente:**

```typescript
// Frontend faz query normal
const { data } = await supabase
  .from('products')
  .select('*');

// RLS garante que apenas produtos da org atual aparecem
// User NÃO precisa filtrar manualmente por organization_id
```

### **Tipos de Policies:**

**Organization-scoped:**
```sql
USING (public.user_is_org_member(organization_id))
```
→ User vê apenas dados da sua org

**User-scoped:**
```sql
USING (user_id = auth.uid())
```
→ User vê apenas seus próprios dados

**Herança via JOIN:**
```sql
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = product_reviews.product_id
      AND public.user_is_org_member(organization_id)
  )
)
```
→ Reviews herdam org do produto

**Public/Open:**
```sql
USING (true)
```
→ Todos autenticados podem ver (analytics, templates)

---

## 🎭 Sistema de Roles e Permissions

### **Roles:**

```
Owner (máximo controle)
  ├── Pode TUDO
  ├── Gerenciar settings
  ├── Gerenciar billing
  ├── Adicionar/remover admins
  └── Deletar organization
  
Admin (gerenciamento)
  ├── Gerenciar produtos
  ├── Gerenciar pedidos
  ├── Gerenciar usuários (exceto owners)
  ├── Ver analytics
  └── NÃO pode alterar settings

Member (operacional)
  ├── Ver produtos/pedidos
  ├── Criar orçamentos
  ├── Editar próprios orçamentos
  └── NÃO pode deletar
```

### **Permissions (JSONB):**

```json
{
  "can_manage_users": true,
  "can_manage_products": true,
  "can_manage_orders": true,
  "can_manage_payments": true,
  "can_view_analytics": true,
  "can_manage_settings": true
}
```

**Flexibilidade:**
- Owners têm todas permissions
- Admins têm quase todas (exceto settings)
- Members têm permissions limitadas
- **Customizável** por user

---

## 🔄 Fluxo de Dados

### **Fluxo de Autenticação:**

```
1. User faz login
   ↓
2. Supabase Auth cria sessão
   ↓
3. Frontend busca organizations do user
   ↓
4. User seleciona organization
   ↓
5. Organization ID salvo no localStorage
   ↓
6. Todas as queries usam RLS automaticamente
```

### **Fluxo de Query (Produtos):**

```
Frontend: supabase.from('products').select('*')
   ↓
Supabase RLS: WHERE organization_id IN (
  SELECT organization_id FROM user_organizations
  WHERE user_id = auth.uid()
)
   ↓
Database: Retorna APENAS produtos da org do user
   ↓
Frontend: Renderiza produtos
```

### **Fluxo de Criação (Novo Produto):**

```
Frontend: Preenche formulário
   ↓
Frontend: create({ name, description, ... })
   ↓
Hook: Adiciona organization_id automaticamente
   ↓
Supabase RLS: Valida se user pode inserir nesta org
   ↓
Database: INSERT com organization_id
   ↓
Frontend: Produto criado!
```

---

## 🏛️ Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                    │
│                    (React + Vite)                       │
├─────────────────────────────────────────────────────────┤
│  Components  │  Pages  │  Layouts  │  Routes           │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                     │
│                   (Contexts + Hooks)                    │
├─────────────────────────────────────────────────────────┤
│  AuthContext  │  OrganizationContext  │  useOrgData    │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      DATA LAYER                         │
│                   (Supabase Client)                     │
├─────────────────────────────────────────────────────────┤
│  Realtime  │  Storage  │  Functions  │  Auth           │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                        │
│                   (PostgreSQL + RLS)                    │
├─────────────────────────────────────────────────────────┤
│  Tables  │  Policies  │  Functions  │  Triggers         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Diagrama Entidade-Relacionamento

### **Relacionamentos Principais:**

```
organizations (1) ──────── (N) user_organizations (N) ──────── (1) auth.users
      │
      │ (1)
      │
      ├────────── (N) categories
      │
      ├────────── (N) suppliers
      │
      ├────────── (N) products
      │                  │
      │                  ├────────── (N) product_variants
      │                  │
      │                  ├────────── (N) product_reviews
      │                  │
      │                  └────────── (N) product_price_history
      │
      ├────────── (N) quotes
      │                  │
      │                  └────────── (N) quote_items
      │
      ├────────── (N) orders
      │                  │
      │                  ├────────── (N) order_items
      │                  │
      │                  └────────── (N) payments
      │
      ├────────── (N) bitrix_clients
      │                  │
      │                  ├────────── (N) client_contacts
      │                  │
      │                  └────────── (N) client_notes
      │
      └────────── (N) mockup_generation_jobs
                         │
                         └────────── (N) generated_mockups
```

---

## 🛠️ Design Patterns

### **1. Context + Provider Pattern**

```typescript
// OrganizationContext centraliza estado da org
<OrganizationProvider>
  <App />
</OrganizationProvider>
```

**Benefícios:**
- Estado global de org
- Reutilizável em qualquer componente
- Single source of truth

### **2. Custom Hooks Pattern**

```typescript
// Encapsula lógica de fetching com RLS
const { data, isLoading } = useOrgData('products');
```

**Benefícios:**
- Lógica reutilizável
- Abstrai complexidade do RLS
- Fácil de testar

### **3. Higher-Order Component (HOC)**

```typescript
// Protege rotas baseado em role
<ProtectedRoute requiredRole="admin">
  <AdminPage />
</ProtectedRoute>
```

**Benefícios:**
- Segurança declarativa
- Reutilizável
- Fácil de entender

### **4. Repository Pattern**

```typescript
// Camada de abstração sobre Supabase
class ProductRepository {
  async findByOrg(orgId: string) {
    // RLS garante que só retorna produtos da org
    return supabase.from('products').select('*');
  }
}
```

**Benefícios:**
- Facilita testes
- Separa concerns
- Fácil de trocar backend

---

## 🚀 Escalabilidade

### **Database:**

**Índices:**
```sql
-- Índice em organization_id para queries rápidas
CREATE INDEX idx_products_org ON products(organization_id);

-- Índice composto para filtros comuns
CREATE INDEX idx_products_org_active 
ON products(organization_id, is_active);
```

**Particionamento (futuro):**
```sql
-- Particionar por organization_id para orgs grandes
CREATE TABLE products_org_1 PARTITION OF products
FOR VALUES IN ('org-uuid-1');
```

### **Frontend:**

**Code Splitting:**
```typescript
// Lazy load páginas
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
```

**Virtualização:**
```typescript
// Renderizar apenas itens visíveis
<VirtualList
  items={products}
  renderItem={ProductCard}
/>
```

**Caching:**
```typescript
// React Query para cache
const { data } = useQuery(['products', orgId], fetchProducts);
```

---

## 🔒 Segurança

### **Camadas de Segurança:**

**1. Authentication (Supabase Auth):**
- JWT tokens
- Refresh tokens
- MFA (futuro)

**2. Authorization (RLS):**
- Policies por tabela
- Verificação automática
- Isolamento garantido

**3. Application (Frontend):**
- Protected routes
- Role-based UI
- Input validation

**4. Network:**
- HTTPS only
- CORS configurado
- Rate limiting (Edge Functions)

### **Princípio de Menor Privilégio:**

```sql
-- Users só podem SELECT por padrão
GRANT SELECT ON products TO authenticated;

-- INSERT/UPDATE/DELETE via RLS policies
-- Policies verificam role antes de permitir
```

---

## 📈 Monitoramento

### **Métricas Importantes:**

**Performance:**
- Query duration
- RLS overhead
- API response time

**Uso:**
- Users por org
- Products por org
- Quotes/Orders por mês

**Segurança:**
- Login attempts
- Failed RLS checks
- Permission violations

**Logs:**
```sql
-- audit_log registra ações importantes
INSERT INTO audit_log (
  user_id,
  organization_id,
  action,
  table_name,
  record_id,
  changes
) VALUES (...);
```

---

## 🧪 Testes

### **Testes de RLS:**

```sql
-- Criar user de teste
CREATE USER test_user;

-- Simular autenticação
SET LOCAL role test_user;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid"}';

-- Tentar acessar dados de outra org
SELECT * FROM products 
WHERE organization_id = 'other-org-uuid';
-- Deve retornar 0 rows

-- Tentar acessar dados da própria org
SELECT * FROM products 
WHERE organization_id = 'my-org-uuid';
-- Deve retornar produtos
```

### **Testes de Frontend:**

```typescript
// Testar OrganizationContext
test('switchOrg should update currentOrg', () => {
  const { result } = renderHook(() => useOrganization());
  
  act(() => {
    result.current.switchOrg('new-org-id');
  });
  
  expect(result.current.currentOrg?.id).toBe('new-org-id');
});
```

---

## 📚 Referências

- [Como Criar Primeira Organization](./01_CRIAR_PRIMEIRA_ORGANIZATION.md)
- [Integração Frontend](./02_INTEGRACAO_FRONTEND_REACT.md)
- [Explicação das Policies](./04_EXPLICACAO_DAS_POLICIES.md)
- [Próximos Passos](./05_ROADMAP_PROXIMOS_PASSOS.md)

---

**✅ Arquitetura multi-tenant enterprise-ready!** 🚀
