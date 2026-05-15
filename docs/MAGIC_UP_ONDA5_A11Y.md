# ♿ Magic Up — Onda 5 a11y guideline

Referência canônica para devs ao adicionar ou editar componentes interativos da **Onda 5** do Magic Up. Garante foco visível (WCAG 2.4.7) e contraste em estados disabled (WCAG 1.4.3). **Travado por testes automatizados** — qualquer regressão quebra CI.

---

## 1. Classes obrigatórias — Focus Visible

| Token | Classes Tailwind | Quando usar |
|-------|------------------|-------------|
| **Ring padrão** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` | `<Button variant="outline">`, dots de paginação, thumbnails, tabs, qualquer `<button>` customizado |
| **Ring sobre input** | `focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary` | `<Input>`, `<Textarea>` (já no design system) |

**Regra:** todo elemento focável customizado (não-input) deve incluir o **bloco padrão completo**. Usar `outline-none` sozinho é proibido — sempre par `outline-none` + `ring-*`.

---

## 2. Classes obrigatórias — Disabled

| Cenário | Classes obrigatórias | Por quê |
|---------|---------------------|---------|
| **Botão prev/next variação, paginação** | `disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100` | `opacity-50` padrão do shadcn cai abaixo de 4.5:1 — substituímos por par token-on-token que mantém legibilidade |
| **Botão de ação (gerar, baixar, share)** | `disabled:opacity-50` (padrão shadcn aceito) | Ação destrutiva ou bloqueada por validação — usuário entende rapidamente |

**Regra:** botões de **navegação por teclado** (prev/next, paginação) **não podem** usar `disabled:opacity-50` — sempre par `bg-muted` + `text-muted-foreground` + `opacity-100`.

---

## 3. Hit area mínima (WCAG 2.5.5 AAA)

- **Dots de paginação, thumbnails, ícones interativos:** `w-11 h-11` (44×44px)
- Para manter visual menor: usar `<span aria-hidden="true">` interno como ponto visual + **negative margin** (`-mx-[18px] -my-[18px]`) no botão para neutralizar layout

Exemplo (já em produção):

```tsx
<button
  aria-label={`Selecionar variação ${i + 1}`}
  className="group relative inline-flex items-center justify-center w-11 h-11 -mx-[18px] -my-[18px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
>
  <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-muted-foreground/30" />
</button>
```

---

## 4. Componentes cobertos

- [`MagicUpResultPanel`](../src/pages/magic-up/MagicUpResultPanel.tsx) — prev/next, dots, thumbnails
- [`MagicUpVariationComparator`](../src/components/magic-up/MagicUpVariationComparator.tsx) — cards de variação, botão "marcar vencedora"
- [`MagicUpQualityScore`](../src/components/magic-up/MagicUpQualityScore.tsx) — score badge, progressbar
- [`MagicUpQualityChecklist`](../src/components/magic-up/MagicUpQualityChecklist.tsx) — itens de checklist
- [`AdImageResult`](../src/components/magic-up/AdImageResult.tsx) — ações de download/share/regenerate

---

## 5. Testes que travam regressões

| Arquivo | O que valida |
|---------|--------------|
| [`tests/components/magic-up-onda5.test.tsx`](../tests/components/magic-up-onda5.test.tsx) | Classes literais via `expect(button.className).toContain(...)` — detecta remoção de `focus-visible:ring-*` ou `disabled:bg-muted` |
| [`tests/a11y/onda5-a11y.test.tsx`](../tests/a11y/onda5-a11y.test.tsx) | axe-core (WCAG 2.1 AA): button-name, aria-*, nested-interactive, progressbar valuenow/min/max |
| [`tests/components/magic-up-result-panel-keyboard.test.tsx`](../tests/components/magic-up-result-panel-keyboard.test.tsx) | Tab order, Enter/Space em dot/prev/next/thumbnail, hit area `w-11 h-11` |
| [`tests/components/magic-up-strategy-onda5.test.ts`](../tests/components/magic-up-strategy-onda5.test.ts) | Lógica do Magic Score e diagnóstico heurístico |

---

## 6. Checklist para PRs novos

Antes de abrir PR que toca componente Onda 5:

- [ ] Copiei o bloco completo `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` em todo `<button>` customizado
- [ ] Botão de navegação (prev/next, dot) usa par `disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100` — **nunca** `disabled:opacity-50` sozinho
- [ ] Hit area de 44×44px (`w-11 h-11`) em qualquer elemento ícone-only ou ponto visual <24px
- [ ] Todo `<button>` ícone-only tem `aria-label` descritivo
- [ ] Rodei `npm test -- magic-up` e a suíte axe (`onda5-a11y`) passa local

---

**Meta:** WCAG 2.1 Level AA + targets AAA em hit area. Veja também [`docs/ACCESSIBILITY.md`](./ACCESSIBILITY.md) para o guia geral do projeto.
