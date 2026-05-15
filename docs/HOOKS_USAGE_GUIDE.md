# 📚 Guia de Uso dos Hooks

## 🎯 useCRUD - Hook Reutilizável

### Exemplo: Produtos

```typescript
import { useCRUD } from '@/hooks/useCRUD';
import type { Product, ProductInput } from '@/types/database';

function useProductCRUD() {
  return useCRUD<Product, ProductInput>({
    tableName: 'products',
    queryKey: ['products'],
    entityName: 'Produto',
    validate: (input) => {
      if (!input.name || input.name.trim().length < 3) {
        throw new Error('Nome deve ter no mínimo 3 caracteres');
      }
      if (input.price <= 0) {
        throw new Error('Preço deve ser maior que zero');
      }
    },
    successMessages: {
      create: 'Produto adicionado ao catálogo!',
      update: 'Produto atualizado com sucesso!',
      delete: 'Produto removido do catálogo!',
    },
  });
}

// Uso no componente
function ProductForm() {
  const { create, update, remove } = useProductCRUD();

  const handleCreate = () => {
    create.mutate({
      name: 'Caneta',
      price: 2.50,
      category_id: '123',
    });
  };

  return (
    <button onClick={handleCreate} disabled={create.isLoading}>
      {create.isLoading ? 'Criando...' : 'Criar Produto'}
    </button>
  );
}
```

### Exemplo: Clientes

```typescript
function useClientCRUD() {
  return useCRUD<Client, ClientInput>({
    tableName: 'clients',
    queryKey: ['clients'],
    entityName: 'Cliente',
    validate: (input) => {
      if (!input.name || input.name.trim().length < 2) {
        throw new Error('Nome deve ter no mínimo 2 caracteres');
      }
      if (input.email && !input.email.includes('@')) {
        throw new Error('Email inválido');
      }
    },
  });
}
```

## 🚀 Optimistic Updates

Todos os hooks CRUD têm optimistic updates automático:

1. **UI atualiza instantaneamente** (antes da resposta do servidor)
2. **Rollback automático** em caso de erro
3. **Race condition prevention** (cancela queries duplicadas)

## ✅ Benefícios

- ✅ **DRY**: Sem duplicação de código
- ✅ **Type-Safe**: Generics para type inference
- ✅ **Optimistic Updates**: UX 10x melhor
- ✅ **Validação**: Customizável por entidade
- ✅ **Mensagens**: Customizáveis
- ✅ **Error Handling**: Completo e consistente

## 🎨 Componentes Melhorados

### LoadingSkeleton

```typescript
<ProductListSkeleton count={9} columns={3} />
<TableSkeleton rows={10} />
```

### ErrorMessage

```typescript
<ErrorMessage 
  error={error}
  severity="error" // ou "warning" ou "info"
  retryLabel="Tentar novamente"
  onRetry={refetch}
/>
```

### EmptyState

```typescript
<EmptyState
  size="lg"
  title="Nenhum produto encontrado"
  description="Adicione seu primeiro produto ao catálogo"
  image="/empty-box.svg"
  action={<Button>Adicionar Produto</Button>}
  secondaryAction={<Link>Ver tutorial</Link>}
  IconComponent={PackageOpen}
/>
```
