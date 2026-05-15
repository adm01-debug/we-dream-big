# ♿ Guia de Acessibilidade (a11y)

## Princípios WCAG 2.1

1. **Perceptível** - Informação apresentada de forma perceptível
2. **Operável** - Navegável por teclado
3. **Compreensível** - Interface intuitiva
4. **Robusto** - Compatível com tecnologias assistivas

## Checklist

### ✅ ARIA Labels

```typescript
// Botões sem texto
<Button aria-label="Fechar modal">
  <X />
</Button>

// Links
<a href="/products" aria-label="Ver todos os produtos">
  Produtos
</a>

// Inputs
<Input
  aria-label="Buscar produtos"
  aria-describedby="search-hint"
/>
<span id="search-hint">Digite o nome ou código</span>
```

### ✅ Navegação por Teclado

```typescript
// Tab index
<div tabIndex={0} role="button" onKeyDown={handleKeyDown}>
  Custom Button
</div>

// Focus visible
.focus-visible:focus {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

### ✅ Roles Semânticas

```html
<nav role="navigation">
<main role="main">
<aside role="complementary">
<footer role="contentinfo">
```

### ✅ Contraste de Cores

- **Normal text:** Mínimo 4.5:1
- **Large text:** Mínimo 3:1
- **UI components:** Mínimo 3:1

### ✅ Formulários Acessíveis

```typescript
<Label htmlFor="name">Nome</Label>
<Input
  id="name"
  name="name"
  required
  aria-required="true"
  aria-invalid={errors.name ? "true" : "false"}
  aria-describedby="name-error"
/>
{errors.name && (
  <span id="name-error" role="alert">
    {errors.name.message}
  </span>
)}
```

### ✅ Imagens

```typescript
// Imagens decorativas
<img src="..." alt="" />

// Imagens informativas
<img src="..." alt="Caneta personalizada azul" />
```

### ✅ Tabelas

```typescript
<Table>
  <caption className="sr-only">
    Lista de orçamentos
  </caption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Número</TableHead>
    </TableRow>
  </TableHeader>
</Table>
```

## Screen Reader Support

```typescript
// Conteúdo apenas para screen readers
<span className="sr-only">
  Carregando...
</span>

// Skip navigation
<a href="#main-content" className="sr-only focus:not-sr-only">
  Pular para conteúdo principal
</a>
```

## Testes

```bash
# Ferramentas
- axe DevTools (Chrome Extension)
- WAVE (Web Accessibility Evaluation Tool)
- Lighthouse (Chrome DevTools)
- NVDA / JAWS (screen readers)
```

## Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| Tab | Navegar para frente |
| Shift+Tab | Navegar para trás |
| Enter | Ativar |
| Space | Selecionar |
| Esc | Fechar/Cancelar |
| Arrow keys | Navegação em menus |

---

**Meta:** WCAG 2.1 Level AA
