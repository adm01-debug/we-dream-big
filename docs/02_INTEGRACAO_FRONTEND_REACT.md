# 💻 Integração Frontend (React)

> **Sistema Multi-tenant Gifts Store**  
> Guia completo para integrar Organizations no React

---

## 📋 O que você vai fazer:

1. ✅ Criar OrganizationContext
2. ✅ Criar hooks customizados
3. ✅ Buscar dados com RLS
4. ✅ Componentes de seleção de org
5. ✅ Proteger rotas

---

## 🎯 PARTE 1: OrganizationContext

### **1.1: Criar o Context**

Crie: `src/contexts/OrganizationContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext'; // Seu contexto de auth existente
import { supabase } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface UserOrganization {
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  permissions: Record<string, boolean>;
  organization: Organization;
}

interface OrganizationContextType {
  // Estado
  currentOrg: Organization | null;
  userOrgs: UserOrganization[];
  isLoading: boolean;
  
  // Métodos
  switchOrg: (orgId: string) => void;
  refreshOrgs: () => Promise<void>;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  hasPermission: (permission: string) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userOrgs, setUserOrgs] = useState<UserOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar organizations do usuário
  const fetchUserOrganizations = async () => {
    if (!user) {
      setUserOrgs([]);
      setCurrentOrg(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          permissions,
          organization:organizations (
            id,
            name,
            slug,
            description,
            logo_url,
            settings,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserOrgs(data as UserOrganization[]);

      // Selecionar org padrão
      if (data && data.length > 0) {
        // Tentar pegar da localStorage
        const savedOrgId = localStorage.getItem('currentOrgId');
        const savedOrg = data.find(
          (uo) => uo.organization_id === savedOrgId
        );

        if (savedOrg) {
          setCurrentOrg(savedOrg.organization);
        } else {
          // Primeira org por padrão
          setCurrentOrg(data[0].organization);
          localStorage.setItem('currentOrgId', data[0].organization_id);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Trocar de org
  const switchOrg = (orgId: string) => {
    const org = userOrgs.find((uo) => uo.organization_id === orgId);
    if (org) {
      setCurrentOrg(org.organization);
      localStorage.setItem('currentOrgId', orgId);
    }
  };

  // Refresh organizations
  const refreshOrgs = async () => {
    await fetchUserOrganizations();
  };

  // Helpers de role
  const currentUserOrg = userOrgs.find(
    (uo) => uo.organization_id === currentOrg?.id
  );

  const isOwner = currentUserOrg?.role === 'owner';
  const isAdmin = currentUserOrg?.role === 'admin' || isOwner;
  const isMember = !!currentUserOrg;

  const hasPermission = (permission: string): boolean => {
    if (!currentUserOrg) return false;
    return currentUserOrg.permissions?.[permission] === true;
  };

  // Fetch on mount e quando user mudar
  useEffect(() => {
    fetchUserOrganizations();
  }, [user]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        userOrgs,
        isLoading,
        switchOrg,
        refreshOrgs,
        isOwner,
        isAdmin,
        isMember,
        hasPermission,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}
```

### **1.2: Adicionar ao App**

Edite: `src/App.tsx`

```typescript
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        {/* Resto do app */}
      </OrganizationProvider>
    </AuthProvider>
  );
}
```

---

## 🎯 PARTE 2: Hooks Customizados

### **2.1: Hook para buscar dados com RLS**

Crie: `src/hooks/useOrgData.ts`

```typescript
import { useEffect, useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

export function useOrgData<T>(
  table: string,
  options?: {
    select?: string;
    filter?: (query: any) => any;
    orderBy?: { column: string; ascending?: boolean };
  }
) {
  const { currentOrg } = useOrganization();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentOrg) {
      setData([]);
      setIsLoading(false);
      return;
    }

    fetchData();
  }, [currentOrg, table]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from(table)
        .select(options?.select || '*')
        .eq('organization_id', currentOrg!.id);

      if (options?.filter) {
        query = options.filter(query);
      }

      if (options?.orderBy) {
        query = query.order(
          options.orderBy.column,
          { ascending: options.orderBy.ascending ?? true }
        );
      }

      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;

      setData(result as T[]);
    } catch (err) {
      setError(err as Error);
      console.error(`Error fetching ${table}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    fetchData();
  };

  return { data, isLoading, error, refresh };
}
```

### **2.2: Hook para criar dados**

```typescript
export function useOrgCreate<T>(table: string) {
  const { currentOrg } = useOrganization();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = async (data: Partial<T>) => {
    if (!currentOrg) {
      throw new Error('No organization selected');
    }

    try {
      setIsCreating(true);
      setError(null);

      const { data: result, error: createError } = await supabase
        .from(table)
        .insert({
          ...data,
          organization_id: currentOrg.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      return result as T;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  return { create, isCreating, error };
}
```

---

## 🎯 PARTE 3: Exemplos Práticos

### **3.1: Buscar Produtos**

```typescript
import { useOrgData } from '@/hooks/useOrgData';

function ProductsList() {
  const { data: products, isLoading, error } = useOrgData<Product>('products', {
    select: '*, category:categories(name)',
    filter: (query) => query.eq('is_active', true),
    orderBy: { column: 'name', ascending: true },
  });

  if (isLoading) return <div>Carregando produtos...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### **3.2: Criar Produto**

```typescript
import { useOrgCreate } from '@/hooks/useOrgData';

function CreateProductForm() {
  const { create, isCreating } = useOrgCreate<Product>('products');

  const handleSubmit = async (formData: ProductFormData) => {
    try {
      const newProduct = await create({
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        is_active: true,
        // organization_id é adicionado automaticamente
      });

      console.log('Produto criado:', newProduct);
      // Redirecionar ou mostrar mensagem
    } catch (error) {
      console.error('Erro ao criar produto:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos do formulário */}
      <button type="submit" disabled={isCreating}>
        {isCreating ? 'Criando...' : 'Criar Produto'}
      </button>
    </form>
  );
}
```

### **3.3: Buscar Orçamentos**

```typescript
function QuotesList() {
  const { data: quotes, isLoading } = useOrgData<Quote>('quotes', {
    select: `
      *,
      client:bitrix_clients(name, email),
      items:quote_items(*, product:products(name))
    `,
    orderBy: { column: 'created_at', ascending: false },
  });

  // Render quotes...
}
```

---

## 🎯 PARTE 4: Componente de Seleção de Org

### **4.1: OrganizationSwitcher**

Crie: `src/components/OrganizationSwitcher.tsx`

```typescript
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function OrganizationSwitcher() {
  const { currentOrg, userOrgs, switchOrg, isLoading } = useOrganization();

  if (isLoading) {
    return <div className="animate-pulse h-10 w-48 bg-gray-200 rounded" />;
  }

  if (userOrgs.length === 0) {
    return <div>Nenhuma organização</div>;
  }

  return (
    <Select
      value={currentOrg?.id}
      onValueChange={switchOrg}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Selecione organização" />
      </SelectTrigger>
      <SelectContent>
        {userOrgs.map((uo) => (
          <SelectItem key={uo.organization_id} value={uo.organization_id}>
            <div className="flex items-center gap-2">
              {uo.organization.logo_url ? (
                <img
                  src={uo.organization.logo_url}
                  alt={uo.organization.name}
                  className="w-5 h-5 rounded"
                />
              ) : (
                <div className="w-5 h-5 rounded bg-primary/10" />
              )}
              <span>{uo.organization.name}</span>
              {uo.role === 'owner' && (
                <span className="text-xs text-muted-foreground">(Owner)</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### **4.2: Usar no Header**

```typescript
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';

function Header() {
  return (
    <header>
      <div className="flex items-center gap-4">
        <Logo />
        <OrganizationSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
```

---

## 🎯 PARTE 5: Proteção de Rotas

### **5.1: ProtectedRoute com Role**

Crie: `src/components/ProtectedRoute.tsx`

```typescript
import { Navigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin' | 'member';
  requiredPermission?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const {
    currentOrg,
    isLoading: orgLoading,
    isOwner,
    isAdmin,
    isMember,
    hasPermission,
  } = useOrganization();

  if (authLoading || orgLoading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!currentOrg) {
    return <Navigate to="/select-organization" replace />;
  }

  // Verificar role
  if (requiredRole) {
    if (requiredRole === 'owner' && !isOwner) {
      return <Navigate to="/unauthorized" replace />;
    }
    if (requiredRole === 'admin' && !isAdmin) {
      return <Navigate to="/unauthorized" replace />;
    }
    if (requiredRole === 'member' && !isMember) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Verificar permissão
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

### **5.2: Usar nas Rotas**

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<Login />} />

      {/* Rotas protegidas - qualquer membro */}
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        }
      />

      {/* Rotas admin only */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredRole="admin">
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Rotas owner only */}
      <Route
        path="/billing"
        element={
          <ProtectedRoute requiredRole="owner">
            <BillingPage />
          </ProtectedRoute>
        }
      />

      {/* Rota com permissão específica */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute requiredPermission="can_view_analytics">
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

---

## 🎯 PARTE 6: Componentes Condicionais

### **6.1: Mostrar/Ocultar baseado em Role**

```typescript
import { useOrganization } from '@/contexts/OrganizationContext';

function ProductActions({ product }) {
  const { isAdmin } = useOrganization();

  return (
    <div>
      <Button>Ver Detalhes</Button>
      
      {isAdmin && (
        <>
          <Button variant="outline">Editar</Button>
          <Button variant="destructive">Deletar</Button>
        </>
      )}
    </div>
  );
}
```

### **6.2: Componente Can**

Crie: `src/components/Can.tsx`

```typescript
import { useOrganization } from '@/contexts/OrganizationContext';

interface CanProps {
  children: React.ReactNode;
  role?: 'owner' | 'admin' | 'member';
  permission?: string;
  fallback?: React.ReactNode;
}

export function Can({ children, role, permission, fallback }: CanProps) {
  const { isOwner, isAdmin, isMember, hasPermission } = useOrganization();

  let hasAccess = true;

  if (role) {
    if (role === 'owner') hasAccess = isOwner;
    if (role === 'admin') hasAccess = isAdmin;
    if (role === 'member') hasAccess = isMember;
  }

  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
```

**Uso:**

```typescript
function SettingsPage() {
  return (
    <div>
      <h1>Configurações</h1>

      <Can role="owner">
        <DangerZone />
      </Can>

      <Can permission="can_manage_users">
        <UserManagement />
      </Can>

      <Can role="admin" fallback={<p>Acesso negado</p>}>
        <AdvancedSettings />
      </Can>
    </div>
  );
}
```

---

## 🎯 PARTE 7: Real-time com Organizations

### **7.1: Subscribe a mudanças**

```typescript
import { useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';

function useRealtimeProducts() {
  const { currentOrg } = useOrganization();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!currentOrg) return;

    // Fetch inicial
    fetchProducts();

    // Subscribe a mudanças
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          console.log('Change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setProducts((prev) => [...prev, payload.new as Product]);
          }
          
          if (payload.eventType === 'UPDATE') {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? (payload.new as Product) : p
              )
            );
          }
          
          if (payload.eventType === 'DELETE') {
            setProducts((prev) =>
              prev.filter((p) => p.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg]);

  return { products };
}
```

---

## 🎯 PARTE 8: TypeScript Types

### **8.1: Definir tipos**

Crie: `src/types/database.types.ts`

```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  settings: {
    currency?: string;
    timezone?: string;
    language?: string;
    max_users?: number;
    max_products?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface UserOrganization {
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  permissions: {
    can_manage_users?: boolean;
    can_manage_products?: boolean;
    can_manage_orders?: boolean;
    can_manage_payments?: boolean;
    can_view_analytics?: boolean;
    can_manage_settings?: boolean;
  };
  joined_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ... outros tipos
```

---

## 🚀 Próximos Passos

1. ✅ Implemente o OrganizationContext
2. ✅ Crie os hooks customizados
3. ✅ Adicione o OrganizationSwitcher ao Header
4. ✅ Proteja rotas com ProtectedRoute
5. ✅ Use o hook useOrgData para buscar dados

---

## 📚 Referências

- [Como Criar Primeira Organization](./01_CRIAR_PRIMEIRA_ORGANIZATION.md)
- [Arquitetura do Sistema](./03_ARQUITETURA_DO_SISTEMA.md)
- [Explicação das Policies](./04_EXPLICACAO_DAS_POLICIES.md)

---

**✅ Frontend pronto para multi-tenancy!** 🚀
