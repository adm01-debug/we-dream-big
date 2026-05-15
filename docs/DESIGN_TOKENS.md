# Design Tokens — Orange Premium SSOT

> **Fonte única**: `src/index.css` (`:root` para light, `.dark` para dark) e `tailwind.config.ts` (mapeamento Tailwind).
> **Página visual viva**: `/admin/design-tokens` (DEV-only) — sempre reflete o estado atual dos tokens.
> **Regra Core do projeto**: nunca usar cor literal em componentes (`text-white`, `bg-[#fff]`, `from-orange-500`). Sempre tokens.

---

## 1. Cores (HSL)

Todos os valores são **HSL puro** (sem `hsl()`). Ler com `hsl(var(--token))` ou via classe Tailwind (`bg-primary`, `text-foreground`, etc.).

### 1.1 Brand — Orange Premium

| Token | Light | Dark | Tailwind | Uso |
|---|---|---|---|---|
| `--primary` | `24 100% 50%` | `24 100% 58%` | `bg-primary` / `text-primary` | Cor principal de marca, CTAs, ícones ativos, focus ring |
| `--primary-hover` | `24 100% 45%` | `24 100% 64%` | `bg-primary-hover` | Estado hover de elementos primários |
| `--primary-active` | `24 100% 40%` | `24 100% 70%` | `bg-primary-active` | Estado pressed (active) |
| `--primary-glow` | `24 100% 65%` | `24 100% 72%` | `bg-primary-glow` | Pares em gradientes / brilhos neon |
| `--primary-foreground` | `0 0% 100%` | `24 100% 6%` | `text-primary-foreground` | Texto sobre fundo primário (contraste WCAG AA) |

> **Por que dark inverte?** No dark mode `--primary-foreground` fica laranja escuro para legibilidade sobre o laranja luminoso 58%.

### 1.2 Surfaces & Foreground

| Token | Light | Dark | Tailwind | Uso |
|---|---|---|---|---|
| `--background` | `0 0% 100%` | `24 30% 3%` | `bg-background` | Fundo global da página |
| `--foreground` | `24 100% 5%` | `24 10% 98%` | `text-foreground` | Texto base de alto contraste |
| `--surface` | `24 100% 98%` | `24 28% 6%` | `bg-surface` | Cartões/painéis de 1º nível sutis |
| `--surface-hover` | `24 100% 95%` | `24 28% 10%` | `bg-surface-hover` | Hover de superfícies |
| `--card` | `0 0% 100%` | `24 28% 6%` | `bg-card` | Container de cartão (Card UI) |
| `--card-elevated` | `0 0% 100%` | `24 28% 10%` | `bg-card-elevated` | Cartão em destaque (modal, popover) |
| `--popover` | `0 0% 100%` | `24 28% 7%` | `bg-popover` | Popover, dropdown, tooltip |
| `--muted` | `24 20% 92%` | `24 22% 10%` | `bg-muted` | Backgrounds neutros (skeleton, chip off) |
| `--muted-foreground` | `24 40% 25%` | `24 15% 78%` | `text-muted-foreground` | Texto secundário |
| `--accent` | — | `24 28% 14%` | `bg-accent` | Estados de hover de menu (dark) |

### 1.3 Funcionais

| Token | Light | Dark | Tailwind | Uso |
|---|---|---|---|---|
| `--success` | `142 100% 35%` | `142 90% 48%` | `bg-success` | Confirmações, status OK |
| `--warning` | `38 100% 45%` | `38 100% 58%` | `bg-warning` | Avisos não-críticos |
| `--destructive` | `0 100% 45%` | `0 95% 62%` | `bg-destructive` | Destruição, erros |
| `--info` | `210 100% 45%` | `210 100% 62%` | `bg-info` | Informativo neutro |

Todos têm `*-foreground` correspondente para texto sobre o background colorido.

### 1.4 Borders, Inputs, Ring

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--border` | `24 100% 50% / 0.25` | `24 100% 60% / 0.32` | Borda padrão (`border-border`, `border` width = 1.5px) |
| `--border-strong` | `24 100% 50% / 0.45` | `24 100% 60% / 0.55` | Borda destacada |
| `--input` | `24 100% 50% / 0.10` | `24 100% 60% / 0.18` | Borda de campos de formulário |
| `--ring` | `24 100% 50%` | `24 100% 60%` | Focus ring (`focus-visible:ring-ring`) |
| `--divider` | `24 100% 50% / 0.15` | `24 100% 60% / 0.30` | Linhas divisórias horizontais/verticais |

### 1.5 Sidebar

`--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-border` — paleta dedicada para o sidebar (sutilmente diferente do background principal para destacar o painel).

---

## 2. Contraste (WCAG)

Combinações validadas em **AA** ou superior. Use sempre par token-fundo + token-texto:

| Fundo | Texto | Light | Dark |
|---|---|---|---|
| `bg-background` | `text-foreground` | ≥ 16:1 | ≥ 17:1 |
| `bg-card` | `text-card-foreground` | ≥ 16:1 | ≥ 17:1 |
| `bg-primary` | `text-primary-foreground` | 4.6:1 (AA) | 5.1:1 (AA) |
| `bg-muted` | `text-muted-foreground` | 7:1 (AAA) | 9:1 (AAA) |
| `bg-success` | `text-success-foreground` | AA | AA |
| `bg-destructive` | `text-destructive-foreground` | AA | AA |

> **Nunca** use `text-white`, `text-black`, ou qualquer cor literal. Sempre `text-*-foreground` ou `text-foreground` / `text-muted-foreground`.

---

## 3. Sombras & Glow

O sistema de brilho (Glow) é parametrizado para facilitar ajustes de intensidade e difusão em massa:
- `--glow-blur`: Raio de desfoque base (ex: `20px` light, `30px` dark).
- `--glow-intensity`: Opacidade do brilho base (ex: `0.45` light, `0.6` dark).
- `--glow-color`: Cor HSL base do brilho (geralmente `--primary`).

| Token | Composição (Simplificada) | Tailwind | Uso |
|---|---|---|---|
| `--shadow-soft` | `primary/0.10` | `shadow-sm` | Cartões em repouso, inputs |
| `--shadow-medium` | `primary/0.20 + glow/0.18` | `shadow-md` | Cartões interativos, modais |
| `--shadow-premium` | `primary/0.35 + intense glow` | `shadow-xl` | Hero CTAs, dialogs centrais |
| `--shadow-glow` | `var(--glow-blur) / var(--glow-intensity)` | `shadow-glow` | Botão hover, ícones ativos, neon |
| `--shadow-glow-hover` | `var(--glow-blur-hover) / var(--glow-intensity-hover)` | `shadow-glow-hover` | Hover sobre `shadow-glow` |
| `--shadow-glow-active` | `inset + intense glow` | `shadow-glow-active` | Estado pressed (active) |
| `--shadow-glow-focus` | `ring + outer glow` | `shadow-glow-focus` | Estado focus (ring offset 3px) |

**Quando usar:**
- `shadow-sm` → repouso default. Quase tudo.
- `shadow-md` → ao hover ou para destacar agrupamentos.
- `shadow-xl` → modais, dialogs, hero pricing.
- `shadow-glow` → estados ativos/selecionados (toggle on, item escolhido em wizard, primary CTA).

---

## 4. Radius

Escala completa em tokens (sem `calc()` — fácil de auditar):

| Token | Valor | Tailwind | Uso |
|---|---|---|---|
| `--radius-xs` | `0.25rem` (4px) | `rounded-xs` | Chips muito compactos, tags inline |
| `--radius-sm` | `0.5rem` (8px) | `rounded-sm` | Badges, switches, micro-controles |
| `--radius-md` | `0.75rem` (12px) | `rounded-md` (= `rounded`) | Default — dropdown items, popover content |
| `--radius-lg` | `1rem` (16px) | `rounded-lg` | **Padrão de inputs, buttons, selects** |
| `--radius-xl` | `1.25rem` (20px) | `rounded-xl` | Cartões internos, button xl |
| `--radius-2xl` | `1.5rem` (24px) | `rounded-2xl` | **Cards principais, dialog/modal** |
| `--radius-3xl` | `2rem` (32px) | `rounded-3xl` | Hero containers |
| `--radius-full` | `9999px` | `rounded-full` | Avatares, pills, switches, slider thumb |

**Hierarquia visual sugerida:**
- Inputs/buttons → `rounded-lg`
- Cartões de conteúdo → `rounded-2xl`
- Dialogs/modais → `rounded-2xl`
- Pills/badges/avatares → `rounded-full`

---

## 5. Border Width

Tokenizado em `--border-width` para consistência:

| Token | Valor | Tailwind | Uso |
|---|---|---|---|
| `--border-width-hairline` | `1px` | `border-hairline` | Divisórias finas, scrollbars |
| `--border-width` | `1.5px` | `border` (DEFAULT) | **Padrão do sistema** — inputs, buttons, dropdowns |
| `--border-width-strong` | `2px` | `border-2` / `border-strong` | Cards de destaque, status badges, checkboxes |

> Memo Core: `border-[1.5px]` é o padrão de hierarquia. Hoje basta usar `border` que já lê o token.

---

## 6. Gradientes (Hero & CTA)

Todos definidos em `--gradient-*` no `:root` (light) com overrides no `.dark`:

| Token | Tailwind | Uso |
|---|---|---|
| `--gradient-primary` | `bg-gradient-primary` | Gradiente sólido primary → primary-glow (logos, badges) |
| `--gradient-cta` | `bg-gradient-cta` | **CTA premium** (laranja → coral → vermelho) |
| `--gradient-hero` | `bg-gradient-hero` | Background de seções hero (sutil no light, escuro no dark) |
| `--gradient-glow` | `bg-gradient-glow` | Halo radial atrás de elementos focais |
| `--gradient-subtle` | `bg-gradient-subtle` | `surface → background`, separadores suaves |
| `--gradient-card` | `bg-gradient-card` | Cartões com leve profundidade |
| `--gradient-highlight` | `bg-gradient-highlight` | Primary → âmbar (badges promocionais) |
| `--gradient-success-token` | `bg-gradient-success-token` | Verde sólido para sucesso |

**Regra:** prefira **cor sólida** (`bg-primary`) sempre que possível. Use gradiente apenas em superfícies "hero" ou CTAs principais (constraint de UI Redesign Protocol).

---

## 7. Tipografia

| Token | Valor | Tailwind | Uso |
|---|---|---|---|
| `--font-sans` | `Plus Jakarta Sans` | `font-sans` (default) | Corpo |
| `--font-display` | `Outfit` | `font-display` | Títulos, números grandes, CTAs (memo Design System Spec) |

Pesos usados: `font-medium` (corpo), `font-semibold` (subtítulos), `font-bold` (títulos), `font-display font-bold` (heroes).

---

## 7.1 Links — `link-primary`, `link-secondary`, `link-disabled`

SSOT em `src/index.css` (linhas 274-308). Aplicar via classe utilitária OU via `<Button variant="link" | "link-secondary" | "link-disabled">` (mapeado em `src/components/ui/button.tsx`).

> **Regra Core:** nunca usar `<a>` "cru" com classes ad-hoc (`text-blue-500 underline`). Sempre um dos três tokens abaixo, ou a variante `Button` correspondente. O fallback global em `:root a:not([class*="link-"])` aplica `link-primary` automaticamente para `<a>` sem classe — mas **declare explicitamente**.

### Quando usar cada um

| Token | Quando aplicar | Exemplos no projeto |
|---|---|---|
| **`link-primary`** | Ação principal de navegação ou CTA textual: links de página, "Ver detalhes", "Abrir orçamento", links em hero/empty states, links em conteúdo público. Peso 800, glow laranja, sublinhado on hover. | CTAs em hero, "Ver tudo" em listagens, links de aprovação pública, links em e-mail templates |
| **`link-secondary`** | Ação contextual ou secundária dentro de blocos densos: "Ver histórico completo", "Editar", "Mais opções", links em rodapés, breadcrumbs intermediários, links auxiliares em cards. Peso 700, cor `muted-foreground`, ganha cor de marca no hover. | `RotationHistoryRow` ("Ver histórico completo"), "Selecionar todos os N" em `BulkActionsBar`, links em metadados de cards |
| **`link-disabled`** | Link permanentemente indisponível para o usuário atual (sem permissão, recurso bloqueado, item arquivado). NÃO usar para "loading" — para isso use `Skeleton` ou estado disabled em botão. Sem underline, opacidade 40%, grayscale, `pointer-events-none`. | Itens de menu sem permissão (RBAC), links para recursos arquivados |

### Exemplos canônicos

```tsx
// 1) Link primário em CTA / navegação principal
<Button variant="link" asChild>
  <Link to="/orcamentos/novo">Criar novo orçamento</Link>
</Button>

// 2) Link secundário em ação contextual (dentro de card/row)
<Button variant="link-secondary" size="sm" className="h-auto p-0 text-xs"
        onClick={() => setOpen(true)}>
  Ver histórico completo
</Button>

// 3) Link desabilitado (sem permissão)
<Button variant="link-disabled" disabled>
  Acessar relatórios financeiros
</Button>

// 4) <a> nativo — quando não pode ser Button (e-mail HTML, conteúdo MD renderizado)
<a className="link-primary" href="https://promogifts.com.br/orcamento/abc">
  Aprovar orçamento
</a>
```

### Anti-padrões

❌ `<a className="text-primary underline">` — use `link-primary`
❌ `<a className="text-muted-foreground hover:text-foreground">` — use `link-secondary`
❌ `<a className="opacity-50 pointer-events-none">` — use `link-disabled`
❌ Misturar `variant="link"` com classes de cor (`className="text-blue-500"`) — quebra o glow Orange Premium
❌ Usar `link-disabled` para estado de loading — use `<Skeleton />` ou `disabled` em `<Button>`

### Acessibilidade

- Todos os três tokens definem `:focus-visible` com `ring-2 ring-primary` + `shadow-glow-focus` (consistente com `Button`).
- `link-disabled` aplica `cursor-not-allowed` e `pointer-events-none` — mas para leitores de tela complemente com `aria-disabled="true"` quando renderizado em `<a>`.
- Glow `text-shadow` usa `--background` como camada de nitidez, garantindo legibilidade em ambos os modos.

---

## 8. Como modificar tokens

1. **Edite apenas `src/index.css`** — alterar valor em `:root` (light) e correspondente em `.dark`.
2. **Nunca duplique no Tailwind config** — o config consome via `hsl(var(--...))`.
3. **Nunca use cor literal em componente** (`bg-orange-500`, `text-[#fff]`, `from-amber-400`). Adicione token novo se faltar.
4. **Valide contraste** com par `<token>` ↔ `<token>-foreground` (sempre AA).
5. **Atualize `/admin/design-tokens`** se adicionar família nova de tokens (paleta visual).
6. **Pares dark/light obrigatórios** — toda nova cor brand precisa de override no `.dark`.

### Checklist para adicionar um token de cor

- [ ] Defini `--token-name` em `:root` com HSL puro
- [ ] Defini override em `.dark` (mesmo H, ajustar L para luminância neon)
- [ ] Defini `--token-name-foreground` se for cor de fundo
- [ ] Mapeei em `tailwind.config.ts` → `colors.{token}`
- [ ] Validei contraste AA com `<token>` ↔ `<token>-foreground`
- [ ] Documentei aqui (seção apropriada)
- [ ] Renderizado em `/admin/design-tokens`

---

## 9. Anti-padrões (constraints)

❌ `text-white`, `text-black`, `bg-[#fff]`
❌ `from-orange-500 to-red-500`
❌ `border-[2px]` (use `border-2` que mapeia para `--border-width-strong`)
❌ `rounded-[20px]` (use `rounded-xl`)
❌ `shadow-[0_0_20px_rgba(255,165,0,0.5)]` (use `shadow-glow`)
❌ `<a className="text-primary underline">` (use `link-primary` ou `<Button variant="link">` — ver §7.1)

✅ `text-primary-foreground`, `bg-card`, `border`, `rounded-lg`, `shadow-glow`, `bg-gradient-cta`, `link-primary`

---

## 10. Referências cruzadas

- Memo Core: `var(--primary)` para glow/shadows, `Outfit` para títulos
- Memo `style/design-system-spec`: border-[1.5px], animate-fade-in
- Memo `architecture/skins-factory-deep-propagation`: tokens dinâmicos, sem hardcoded
- Memo `constraints/ui-redesign-protocol`: prefere sólido a gradiente; consultar usuário em redesigns
