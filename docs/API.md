# 📡 Documentação de APIs - Gifts Store

## Edge Functions

### 1. **ai-recommendations**
Gera recomendações personalizadas de produtos usando IA.

**Endpoint:** `https://[project].supabase.co/functions/v1/ai-recommendations`

**Método:** POST

**Body:**
```json
{
  "userId": "uuid",
  "context": "quote" | "product",
  "limit": 10
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "productId": "uuid",
      "score": 0.95,
      "reason": "Baseado em compras anteriores"
    }
  ]
}
```

---

### 2. **bitrix-sync**
Sincroniza dados entre Gifts Store e Bitrix24.

**Endpoint:** `https://[project].supabase.co/functions/v1/bitrix-sync`

**Método:** POST

**Body:**
```json
{
  "entity": "clients" | "quotes" | "products",
  "direction": "import" | "export",
  "filters": {}
}
```

---

### 3. **expert-chat**
Chatbot especialista em brindes.

**Endpoint:** `https://[project].supabase.co/functions/v1/expert-chat`

**Método:** POST

**Body:**
```json
{
  "message": "string",
  "conversationId": "uuid",
  "context": {}
}
```

---

### 4. **quote-approval**
Processa aprovações de orçamentos via token.

**Endpoint:** `https://[project].supabase.co/functions/v1/quote-approval`

**Método:** POST

**Body:**
```json
{
  "token": "string",
  "action": "approve" | "reject",
  "notes": "string"
}
```

---

## Schemas de Banco

### Produtos (products)
```typescript
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  stock_quantity: number;
  image_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

### Orçamentos (quotes)
```typescript
interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  sales_rep_id: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total_amount: number;
  valid_until: string;
  notes?: string;
  tags?: string[];
  version?: number;
  parent_quote_id?: string;
  created_at: string;
  updated_at: string;
}
```

### Itens de Orçamento (quote_items)
```typescript
interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}
```

---

## Hooks Customizados

### useQuotes()
Gerencia orçamentos completos.

```typescript
const {
  quotes,           // Quote[]
  isLoading,        // boolean
  createQuote,      // (data: CreateQuoteInput) => Promise<Quote>
  updateQuote,      // (id: string, data: UpdateQuoteInput) => Promise<Quote>
  deleteQuote,      // (id: string) => Promise<void>
  duplicateQuote    // (id: string) => Promise<Quote>
} = useQuotes();
```

### useProducts()
Gerencia catálogo de produtos.

```typescript
const {
  products,         // Product[]
  isLoading,
  searchProducts,   // (query: string) => void
  filterByCategory  // (category: string) => void
} = useProducts();
```

### useGamification()
Sistema de pontos e conquistas.

```typescript
const {
  userStats,        // { points, level, rank }
  achievements,     // Achievement[]
  addPoints,        // (points: number, reason: string) => void
  unlockAchievement // (achievementId: string) => void
} = useGamification();
```

---

## Validações (Zod)

### Quote Schema
```typescript
import { quoteSchema } from '@/lib/validations';

const validatedData = quoteSchema.parse({
  client_id: 'uuid',
  items: [
    { product_id: 'uuid', quantity: 10, unit_price: 5.00 }
  ],
  valid_until: '2025-12-31'
});
```

---

## Rate Limiting

- **Global:** 100 requisições/minuto por IP
- **Edge Functions:** 50 requisições/minuto por função
- **Supabase Client:** Ilimitado (RLS aplicado)

---

## Autenticação

Todas as requisições requerem header:
```
Authorization: Bearer <jwt_token>
```

Token obtido via:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Validação falhou |
| 401 | Unauthorized - Token inválido |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Server Error |

---

**Última Atualização:** 28/12/2025
