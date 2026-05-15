# 🌙 Guia de Dark Mode - Gifts Store

## Checklist de Compatibilidade

### ✅ Componentes Verificados

- [x] Button
- [x] Card
- [x] Input
- [x] Select
- [x] Dialog
- [x] Table
- [x] Skeleton
- [x] Toast
- [x] Badge
- [x] Avatar
- [x] Charts (Recharts)

### Cores do Tema

```css
/* Light Mode */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 221.2 83.2% 53.3%;
--primary-foreground: 210 40% 98%;

/* Dark Mode */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
}
```

### Regras de Contraste

- **Mínimo WCAG AA:** 4.5:1 para texto normal
- **Mínimo WCAG AAA:** 7:1 para texto normal

### Testando Dark Mode

```bash
# Abrir DevTools
# Application > Local Storage > theme = "dark"
```

### Componentes com Atenção Especial

1. **Imagens**: Usar `filter: brightness()` se necessário
2. **Charts**: Cores adaptadas dinamicamente
3. **Shadows**: Usar `ring-` ao invés de `shadow-` em dark mode
4. **Borders**: Verificar visibilidade

### Classes Tailwind para Dark Mode

```typescript
// ✅ BOM
<div className="bg-background text-foreground">
<div className="bg-card border-border">

// ❌ EVITAR cores hardcoded
<div className="bg-white text-black">
```

### Utilitários

```typescript
import { useTheme } from '@/hooks/useTheme';

const { theme, setTheme } = useTheme();
// theme: 'light' | 'dark' | 'system'
```

---

**Última Verificação:** 28/12/2025  
**Status:** ✅ 100% compatível
