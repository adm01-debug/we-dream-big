# 📊 Guia de Integração - Botão Export Excel

## ✅ Arquivos Já Criados

1. ✅ `/src/utils/excelExport.ts` - Utilitário genérico
2. ✅ `/src/components/export/ExportExcelButton.tsx` - Componente reutilizável

## 🎯 Próximos Passos (Manual)

### 1. QuotesListPage

**Arquivo:** `src/pages/QuotesListPage.tsx`

**Adicionar imports (após linha 10):**
```typescript
import { ExportExcelButton } from "@/components/export/ExportExcelButton";
import { formatCurrency, formatStatus } from "@/utils/excelExport";
```

**Adicionar botão (após botão "Templates", antes de "Novo Orçamento"):**
```tsx
<ExportExcelButton
  config={{
    filename: 'orcamentos',
    sheetName: 'Lista de Orçamentos',
    columns: [
      { key: 'quote_number', header: 'Número', width: 15 },
      { key: 'client.name', header: 'Cliente', width: 30 },
      { key: 'total', header: 'Valor Total', width: 15, format: (v) => formatCurrency(v || 0) },
      { key: 'status', header: 'Status', width: 20, format: (v) => formatStatus(v) },
      { key: 'valid_until', header: 'Válido Até', width: 15, format: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
      { key: 'created_at', header: 'Criado Em', width: 18, format: (v) => new Date(v).toLocaleDateString('pt-BR') },
      { key: 'sales_rep.full_name', header: 'Vendedor', width: 25 }
    ],
    data: filteredQuotes
  }}
  variant="outline"
/>
```

### 2. OrdersListPage

**Arquivo:** `src/pages/OrdersListPage.tsx`

**Adicionar imports:**
```typescript
import { ExportExcelButton } from "@/components/export/ExportExcelButton";
import { formatCurrency, formatStatus } from "@/utils/excelExport";
```

**Adicionar botão:**
```tsx
<ExportExcelButton
  config={{
    filename: 'pedidos',
    sheetName: 'Lista de Pedidos',
    columns: [
      { key: 'order_number', header: 'Número', width: 15 },
      { key: 'client.name', header: 'Cliente', width: 30 },
      { key: 'total', header: 'Valor Total', width: 15, format: (v) => formatCurrency(v || 0) },
      { key: 'status', header: 'Status', width: 20, format: (v) => formatStatus(v) },
      { key: 'created_at', header: 'Criado Em', width: 18, format: (v) => new Date(v).toLocaleDateString('pt-BR') }
    ],
    data: filteredOrders
  }}
  variant="outline"
/>
```

### 3. ClientList

**Arquivo:** `src/pages/ClientList.tsx`

**Adicionar imports:**
```typescript
import { ExportExcelButton } from "@/components/export/ExportExcelButton";
```

**Adicionar botão:**
```tsx
<ExportExcelButton
  config={{
    filename: 'clientes',
    sheetName: 'Lista de Clientes',
    columns: [
      { key: 'name', header: 'Nome', width: 30 },
      { key: 'email', header: 'Email', width: 30 },
      { key: 'phone', header: 'Telefone', width: 15 },
      { key: 'company', header: 'Empresa', width: 25 },
      { key: 'segment', header: 'Segmento', width: 20 },
      { key: 'rfm_segment', header: 'RFM', width: 15 }
    ],
    data: filteredClients
  }}
  variant="outline"
/>
```

## 🎯 Benefícios

- ✅ Exportação rápida em 1 clique
- ✅ Formatação automática de moedas e datas
- ✅ Componente reutilizável
- ✅ Nomes de arquivo com timestamp
- ✅ Feedback visual (toast)

## 🔧 Uso Avançado

### Múltiplas Abas

```typescript
import { exportMultipleSheets } from "@/utils/excelExport";

exportMultipleSheets('relatorio-completo', [
  {
    sheetName: 'Orçamentos',
    columns: quotesColumns,
    data: quotes
  },
  {
    sheetName: 'Pedidos',
    columns: ordersColumns,
    data: orders
  }
]);
```

### Formatação Customizada

```typescript
{
  key: 'profit_margin',
  header: 'Margem (%)',
  format: (value, row) => {
    const margin = (row.profit / row.revenue) * 100;
    return `${margin.toFixed(1)}%`;
  }
}
```
