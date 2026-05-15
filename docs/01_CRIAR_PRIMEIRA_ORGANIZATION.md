# 🏢 Como Criar sua Primeira Organization

> **Sistema Multi-tenant Gifts Store**  
> Guia completo para criar e configurar sua primeira organização

---

## 📋 O que você vai fazer:

1. ✅ Criar uma Organization
2. ✅ Adicionar você como Owner
3. ✅ Testar o acesso
4. ✅ Entender o modelo multi-tenant

---

## 🎯 PASSO 1: Criar a Organization

Execute este SQL no **SQL Editor** do Supabase:

```sql
-- ============================================================
-- CRIAR PRIMEIRA ORGANIZATION
-- ============================================================

-- 1. Criar a organização
INSERT INTO public.organizations (
  name,
  slug,
  description,
  settings
) VALUES (
  'Pink e Cerébro',                          -- Nome da sua empresa
  'pink-cerebro',                             -- Slug único (URL-friendly)
  'Catálogo de Brindes Promocionais',        -- Descrição
  '{
    "currency": "BRL",
    "timezone": "America/Sao_Paulo",
    "language": "pt-BR",
    "max_users": 50,
    "max_products": 1000
  }'::jsonb
)
RETURNING id, name, slug;
```

**Resultado esperado:**
```
id: 550e8400-e29b-41d4-a716-446655440000
name: Pink e Cerébro
slug: pink-cerebro
```

⚠️ **IMPORTANTE:** Copie o `id` da organização! Você vai precisar dele.

---

## 🎯 PASSO 2: Adicionar você como Owner

**Antes de executar:** Você precisa do seu `user_id` do Supabase Auth.

### **2.1: Pegar seu User ID**

```sql
-- Verificar usuários existentes
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

**Copie seu `user_id`** (UUID do usuário logado)

### **2.2: Adicionar você à Organization**

```sql
-- Substituir:
-- YOUR_USER_ID = UUID do passo 2.1
-- YOUR_ORG_ID = UUID do passo 1

INSERT INTO public.user_organizations (
  user_id,
  organization_id,
  role,
  permissions
) VALUES (
  'YOUR_USER_ID',      -- ⚠️ SUBSTITUIR!
  'YOUR_ORG_ID',       -- ⚠️ SUBSTITUIR!
  'owner',
  '{
    "can_manage_users": true,
    "can_manage_products": true,
    "can_manage_orders": true,
    "can_manage_payments": true,
    "can_view_analytics": true,
    "can_manage_settings": true
  }'::jsonb
)
RETURNING *;
```

**Resultado esperado:**
```
✅ 1 row inserted
```

---

## 🎯 PASSO 3: Associar dados à Organization

Agora que você tem uma org, precisa associar os dados existentes a ela.

### **3.1: Associar Categorias**

```sql
-- Associar todas as categorias à sua org
UPDATE public.categories
SET organization_id = 'YOUR_ORG_ID'  -- ⚠️ SUBSTITUIR!
WHERE organization_id IS NULL;

-- Verificar
SELECT 
  name, 
  organization_id
FROM public.categories
LIMIT 5;
```

### **3.2: Associar Técnicas (Opcional)**

As técnicas de personalização são **globais** por padrão (todas orgs usam).  
Se quiser torná-las específicas da sua org:

```sql
-- Tornar técnicas específicas da org
UPDATE public.personalization_techniques
SET organization_id = 'YOUR_ORG_ID'  -- ⚠️ SUBSTITUIR!
WHERE organization_id IS NULL;
```

⚠️ **Recomendação:** Deixe as técnicas como globais (não execute isso).

---

## 🎯 PASSO 4: Testar o Acesso

Agora vamos testar se o RLS está funcionando!

### **4.1: Verificar sua membership**

```sql
-- Ver se você está na org
SELECT 
  u.email,
  o.name as organization,
  uo.role,
  uo.permissions
FROM public.user_organizations uo
JOIN auth.users u ON u.id = uo.user_id
JOIN public.organizations o ON o.id = uo.organization_id
WHERE uo.user_id = auth.uid();
```

**Resultado esperado:**
```
email: seu@email.com
organization: Pink e Cerébro
role: owner
permissions: {...}
```

### **4.2: Testar acesso a categorias**

```sql
-- Como owner, você deve ver as categorias da sua org
SELECT 
  id,
  name,
  organization_id
FROM public.categories
WHERE organization_id = 'YOUR_ORG_ID';  -- ⚠️ SUBSTITUIR!
```

Se aparecer `Permission denied`, algo está errado com o RLS.

### **4.3: Testar criação de produto**

```sql
-- Criar produto de teste
INSERT INTO public.products (
  organization_id,
  name,
  description,
  sku,
  is_active
) VALUES (
  'YOUR_ORG_ID',  -- ⚠️ SUBSTITUIR!
  'Caneca Personalizada - TESTE',
  'Produto de teste do sistema',
  'TEST-001',
  true
)
RETURNING id, name, organization_id;
```

**Se funcionou:** ✅ RLS está OK!  
**Se deu erro:** ❌ Verifique as policies.

---

## 🎯 PASSO 5: Entender o Modelo Multi-tenant

### **Como funciona:**

```
┌─────────────────────────────────────────────────────────┐
│                    ORGANIZATION 1                       │
│                   "Pink e Cerébro"                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Users:          Products:         Quotes:             │
│  - João (owner)  - Caneca          - Quote #001        │
│  - Maria (admin) - Camiseta        - Quote #002        │
│  - Pedro (member)- Boné            - Quote #003        │
│                                                         │
│  Categories:     Orders:           Payments:           │
│  - Canecas       - Order #001      - Payment #001      │
│  - Camisetas     - Order #002      - Payment #002      │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    ORGANIZATION 2                       │
│                   "Outra Empresa"                       │
├─────────────────────────────────────────────────────────┤
│  (Dados completamente isolados)                         │
│  João NÃO vê nada desta org                            │
└─────────────────────────────────────────────────────────┘
```

### **Regras de Acesso (RLS):**

**Owner:**
- ✅ Ver tudo da org
- ✅ Criar/editar/deletar tudo
- ✅ Gerenciar usuários
- ✅ Gerenciar configurações

**Admin:**
- ✅ Ver tudo da org
- ✅ Criar/editar/deletar produtos, quotes, orders
- ✅ Gerenciar usuários (exceto outros admins)
- ❌ Não pode alterar configurações

**Member:**
- ✅ Ver produtos, quotes, orders da org
- ✅ Criar quotes e orders
- ✅ Editar próprios quotes/orders
- ❌ Não pode deletar
- ❌ Não pode gerenciar usuários

---

## 🎯 PASSO 6: Criar mais usuários (Opcional)

### **6.1: Convidar usuário**

```sql
-- Criar convite (futuro: enviar por email)
INSERT INTO public.organization_invites (
  organization_id,
  email,
  role,
  invited_by,
  expires_at
) VALUES (
  'YOUR_ORG_ID',                    -- ⚠️ SUBSTITUIR!
  'novo.usuario@email.com',         -- Email do convidado
  'member',                         -- Ou 'admin'
  auth.uid(),                       -- Você está convidando
  NOW() + INTERVAL '7 days'         -- Expira em 7 dias
)
RETURNING *;
```

### **6.2: Aceitar convite (usuário novo)**

Quando o usuário criar conta e logar:

```sql
-- Buscar convites pendentes
SELECT 
  o.name,
  oi.role,
  oi.expires_at
FROM public.organization_invites oi
JOIN public.organizations o ON o.id = oi.organization_id
WHERE oi.email = 'novo.usuario@email.com'  -- Email do usuário
  AND oi.status = 'pending'
  AND oi.expires_at > NOW();

-- Aceitar convite
UPDATE public.organization_invites
SET 
  status = 'accepted',
  accepted_at = NOW()
WHERE id = 'INVITE_ID';  -- ID do convite

-- Adicionar à org
INSERT INTO public.user_organizations (
  user_id,
  organization_id,
  role
) VALUES (
  auth.uid(),        -- Novo usuário
  'YOUR_ORG_ID',     -- Org do convite
  'member'           -- Role do convite
);
```

---

## 🎯 PASSO 7: Verificar tudo funcionando

### **Checklist final:**

```sql
-- 1. Verificar organizations criadas
SELECT * FROM public.organizations;

-- 2. Verificar membros
SELECT 
  u.email,
  o.name,
  uo.role
FROM public.user_organizations uo
JOIN auth.users u ON u.id = uo.user_id
JOIN public.organizations o ON o.id = uo.organization_id;

-- 3. Verificar dados associados
SELECT 
  'Categories' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as with_org
FROM public.categories
UNION ALL
SELECT 
  'Products',
  COUNT(*),
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL)
FROM public.products
UNION ALL
SELECT 
  'Quotes',
  COUNT(*),
  COUNT(*) FILTER (WHERE organization_id IS NOT NULL)
FROM public.quotes;
```

**Resultado esperado:**
```
table_name    total    with_org
Categories    15       15 ✅
Products      1        1  ✅
Quotes        0        0  ✅
```

---

## 🚀 Próximos Passos

Agora que você tem sua Organization configurada:

1. ✅ **Frontend:** Configure o OrganizationContext no React
2. ✅ **Produtos:** Comece a cadastrar produtos reais
3. ✅ **Usuários:** Convide sua equipe
4. ✅ **Testes:** Crie quotes e orders de teste

---

## ❓ Problemas Comuns

### **"Permission denied" ao tentar acessar dados**

**Causa:** Você não está autenticado ou não é membro da org.

**Solução:**
```sql
-- Verificar se você está autenticado
SELECT auth.uid();  -- Deve retornar seu UUID

-- Verificar se você está na org
SELECT * FROM public.user_organizations 
WHERE user_id = auth.uid();
```

### **"Não vejo nenhuma categoria/produto"**

**Causa:** Os dados não estão associados à sua org.

**Solução:**
```sql
-- Associar categorias
UPDATE public.categories
SET organization_id = 'YOUR_ORG_ID'
WHERE organization_id IS NULL;
```

### **"Não consigo criar produtos"**

**Causa:** Seu role não tem permissão.

**Solução:**
```sql
-- Verificar seu role
SELECT role FROM public.user_organizations
WHERE user_id = auth.uid();

-- Deve ser 'owner' ou 'admin'
-- Se não for, peça ao owner para atualizar
```

---

## 📚 Referências

- [Guia de Integração Frontend](./02_INTEGRACAO_FRONTEND_REACT.md)
- [Arquitetura do Sistema](./03_ARQUITETURA_DO_SISTEMA.md)
- [Explicação das Policies](./04_EXPLICACAO_DAS_POLICIES.md)
- [Próximos Passos](./05_ROADMAP_PROXIMOS_PASSOS.md)

---

**✅ Organization criada com sucesso!**

Agora você está pronto para integrar com o Frontend! 🚀
