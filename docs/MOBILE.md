# 📱 Guia de Responsividade Mobile

## Breakpoints

```css
sm: 640px   /* Smartphone landscape */
md: 768px   /* Tablet portrait */
lg: 1024px  /* Tablet landscape / Desktop */
xl: 1280px  /* Desktop large */
2xl: 1536px /* Desktop XL */
```

## Checklist de Componentes

### ✅ Tabelas
```typescript
// Scroll horizontal em mobile
<div className="overflow-x-auto">
  <Table className="min-w-full">...</Table>
</div>
```

### ✅ Modais
```typescript
// Altura adaptável
<Dialog>
  <DialogContent className="max-h-[90vh] overflow-y-auto">
    ...
  </DialogContent>
</Dialog>
```

### ✅ Formulários
```typescript
// Grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Input />
</div>
```

### ✅ Gráficos
```typescript
// Container responsivo
<ResponsiveContainer width="100%" height={300}>
  <LineChart>...</LineChart>
</ResponsiveContainer>
```

## Touch Targets

- **Mínimo:** 44x44px (iOS HIG)
- **Recomendado:** 48x48px (Material Design)

```typescript
// ✅ BOM
<Button size="lg" className="min-h-[48px]">

// ❌ EVITAR
<Button size="sm" className="h-6">
```

## Navegação Mobile

```typescript
// Hamburger menu
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="md:hidden">
      <Menu />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <Navigation />
  </SheetContent>
</Sheet>
```

## Otimizações

1. **Lazy loading de imagens**
2. **Virtualização de listas longas**
3. **Debounce em inputs**
4. **Service Worker para offline**

## Testando

```bash
# Chrome DevTools
# Toggle device toolbar (Ctrl+Shift+M)
# Testar em:
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- iPad (768px)
- Desktop (1920px)
```

---

**Status:** ✅ 100% responsivo
