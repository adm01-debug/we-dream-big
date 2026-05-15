
# Erradicação Total da Sombra/Glow Laranja

Após varredura minuciosa, identifiquei **3 camadas de origem** do glow laranja, espalhadas por **162 ocorrências** em ~40 arquivos. O plano ataca a raiz (tokens) e depois faz a varredura nos consumidores.

## Diagnóstico — Onde nasce o glow

### Camada 1 — Tokens raiz (`src/index.css`)
São a fonte primária. Mesmo componentes que parecem "limpos" herdam glow daqui:
- `--shadow-glow`, `--shadow-glow-hover`, `--shadow-glow-active`, `--shadow-glow-focus`
- `--shadow-premium`, `--shadow-premium-hover`
- Variáveis de controle: `--glow-blur`, `--glow-intensity`, `--glow-color`, `--glow-blur-hover`, `--glow-intensity-hover`
- Definições duplicadas em `:root` (light) e `.dark` — ambas precisam ser neutralizadas

### Camada 2 — Pseudo-elementos e classes utilitárias globais
- `.dark .ambient-glow::before` e `::after` (gradientes radiais laranja/azul fixos na viewport)
- `.hover-glow`, `.hover-glow-primary`, `.skin-glow` (em `index.css`, `design-polish.css`, `animations.css`)
- `text-shadow` laranja em `link-primary`, `link-secondary` e em links globais (modo light e dark)
- Aplicação no `MainLayout.tsx` (`className="...ambient-glow"`)

### Camada 3 — Consumidores diretos (componentes)
~40 arquivos usando `shadow-glow*`, `shadow-premium*`, `drop-shadow-[...primary...]`. Os principais ofensores:
- **UI base:** `tooltip.tsx`, `textarea.tsx`, `tabs.tsx`, `switch.tsx`, `sidebar.tsx`, `button.tsx`, `breadcrumb.tsx`
- **Páginas:** `Auth.tsx`, `ResetPassword.tsx`, `QuotesListPage.tsx`, `FiltersPage.tsx`, `SimuladorWizard.tsx`, `ProductDetailHero.tsx`
- **Wizard simulador:** `StepProduct`, `StepSpecs`, `StepLocation`, `PersonalizationSummary`, `ComparisonCard`
- **Busca/cards:** `GlobalSearchPalette`, `GlobalSearchHelpers`, `GlobalSearchIdleState`, `RelatedProducts`
- **Outros:** `LocationCard`, `MockupLayoutButtons`, `FilterPanelHeader`, `FlowFilterPrimitives`, `HorizontalStepper`, `AddToCollectionModal`, `AdminDesignTokensPage`, `AuthBranding`

### Camada 4 — Theme presets (`src/lib/theme-presets.ts`)
Todos os skins (default, neon, pride, etc.) **regeram** tokens de `shadow-glow*` em runtime via `boostGlowAlpha`. Se não neutralizar aqui, ao trocar de skin o glow retorna.

## Estratégia (cirúrgica e segura)

A premissa é **neutralizar na raiz** (tokens viram `none`/sombra neutra) para que 90% dos consumidores fiquem limpos sem tocar arquivo por arquivo. Depois faço a varredura cirúrgica nos casos remanescentes.

### Etapa 1 — Neutralizar tokens no `src/index.css`
Em `:root` (light) **e** em `.dark`, redefinir:
- `--shadow-glow: none;`
- `--shadow-glow-hover: none;`
- `--shadow-glow-active: none;`
- `--shadow-premium: 0 4px 12px hsl(0 0% 0% / 0.08);` (sombra neutra cinza, sem laranja)
- `--shadow-premium-hover: 0 6px 16px hsl(0 0% 0% / 0.12);`
- `--shadow-glow-focus: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary) / 0.4);` (mantém só o anel de foco a11y, sem o terceiro halo de 30–40px)
- Zerar/reduzir as variáveis de controle: `--glow-intensity: 0`, `--glow-intensity-hover: 0`, `--glow-blur: 0`

### Etapa 2 — Remover glow ambiental e text-shadow
- Esvaziar `.dark .ambient-glow::before` e `.dark .ambient-glow::after` (manter o seletor mas com `background: none` e `display: none`) — ou remover a classe do `MainLayout.tsx`
- Remover/zerar todos os `text-shadow` em `link-primary`, `link-secondary`, links globais, `:root a:not(...)` e suas variantes `.dark`
- Zerar as classes utilitárias: `.hover-glow`, `.hover-glow-primary`, `.hover-glow-secondary`, `.hover-glow-success`, `.skin-glow` em `index.css`, `design-polish.css` e `animations.css` (manter o seletor com `box-shadow: none` para não quebrar JSX existente)
- Remover `box-shadow: 0 0 0 6px hsl(var(--primary) / 0.2)` (linha 1895) e similares em linhas 866, 869, 1096, 1099, 1199, 1206, 1262, 1266, 1270, 1545, 1603, 2203, 2208

### Etapa 3 — Limpar `theme-presets.ts`
- Sobrescrever todas as keys `shadow-glow*` para retornarem `'none'`
- Remover/neutralizar a função `boostGlowAlpha` (ou fazê-la retornar `'none'`)
- Garante que skins futuros (pride, neon, default) não reintroduzam o glow

### Etapa 4 — Varredura nos componentes
Substituições pontuais nos arquivos onde a classe está hardcoded e ainda interfere visualmente mesmo com token zerado (ex.: `drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)]`):

| Arquivo | Classe atual | Substituir por |
|---|---|---|
| `breadcrumb.tsx` | `drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)]` | (remover a classe) |
| `tooltip.tsx` | `shadow-glow` | `shadow-md` |
| `textarea.tsx` | `focus-visible:shadow-glow` | (remover) |
| `tabs.tsx` | `data-[state=active]:shadow-glow` + `focus-visible:shadow-glow-focus` | (remover) |
| `switch.tsx` | `data-[state=checked]:shadow-glow` | (remover) |
| `sidebar.tsx` | `focus-visible:shadow-glow-focus` (2 ocorrências) | (remover) |
| `ProductDetailHero.tsx` | `shadow-premium` em hero | `shadow-md` |
| Demais arquivos (~30) | `shadow-glow*`, `shadow-premium*`, `hover:shadow-glow*` | Remover ou trocar por `shadow-sm`/`shadow-md` neutros |

### Etapa 5 — Estado de foco (a11y)
**Não remover totalmente o foco visual** — usuários de teclado dependem dele. Padrão final:
- `focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2`
- Remover o `shadow-glow-focus` em pares (que era o que adicionava o halo grande de 30–40px)

### Etapa 6 — Sidebar (refinos finais já discutidos)
- Manter `bg-orange/[0.03]` e o indicador lateral 1.5px (já estão calibrados)
- Garantir que nenhum `shadow-glow*` residual sobrou em `SidebarNavGroup`, `SidebarReorganized`, `SmartMobileNav`, `ui/sidebar.tsx`

### Etapa 7 — Atualizar testes de regressão
- Expandir `SidebarMobileRegression.test.ts` para escanear **todo `src/`** (não só sidebar) e falhar se `shadow-glow|shadow-premium|hover:shadow-orange|drop-shadow.*primary` reaparecer em qualquer arquivo (com allowlist mínima para a11y)
- Adicionar verificação no `src/index.css` de que os tokens `--shadow-glow*` resolvem para `none`

### Etapa 8 — Memória de projeto
- Atualizar `mem://design/no-orange-glow-policy` (novo) marcando como **constraint** que glow/halo laranja é proibido em todo o sistema, com a política de tokens neutralizados.

## Detalhes Técnicos (para referência)

```text
src/index.css
├── :root                        → tokens shadow-glow* = none, premium = neutro
├── .dark                        → idem + ambient-glow::before/after vazios
├── .link-primary, .link-secondary → text-shadow removidos (light + dark)
├── .hover-glow*                 → box-shadow: none
└── linhas 866/869/1096/1099/1199/1206/1262/1266/1270/1545/1603/1895/2203/2208
                                 → box-shadow neutralizado

src/styles/design-polish.css     → .hover-glow, .focus-ring-primary neutros
src/styles/animations.css        → .hover-glow neutro
src/lib/theme-presets.ts         → todos shadow-glow* = 'none', boostGlowAlpha → 'none'

~40 componentes                  → remoção das classes shadow-glow*/shadow-premium*/drop-shadow primary
src/components/layout/MainLayout.tsx → remover className "ambient-glow"
src/tailwind.config.lov.json     → opcional: apontar shadow.glow* para 'none' direto
```

## Critérios de Aceitação

1. Nenhum elemento do sistema (sidebar, cards, modais, tooltips, links, badges, buttons, switches, tabs, hero) exibe halo/glow laranja em estado normal, hover, active ou focus.
2. Foco de teclado continua **visível** (anel sólido fino, sem halo radial).
3. Sombras de profundidade (cards, popovers, dropdowns) viram cinza neutro suave.
4. Trocar entre skins (default/neon/pride) **não** reintroduz glow.
5. Modo dark e light ambos validados.
6. Teste de regressão global passa e falha automaticamente se alguém reintroduzir `shadow-glow*` em qualquer arquivo do `src/`.

## Riscos e Mitigações

- **Risco:** elementos críticos (CTA principal, foco de inputs) ficarem "apagados" demais.  
  **Mitigação:** manter `shadow-md`/`shadow-sm` neutros + anel de foco sólido `ring-2 ring-primary/40`.
- **Risco:** quebra visual em páginas que dependiam do glow para hierarquia (ex.: `ProductDetailHero`, `Auth`).  
  **Mitigação:** substituir por `border-primary/20` + `shadow-md` neutros, preservando profundidade sem cor.
- **Risco:** skins customizados perderem identidade.  
  **Mitigação:** identidade fica no `--primary` (cor de texto, bordas, ícones, fundos sutis), só o glow morre.

## Ordem de Execução

1. Tokens em `index.css` (impacto cascata imediato)
2. `theme-presets.ts` (impede regressão por troca de skin)
3. `ambient-glow` + text-shadow + classes utilitárias globais
4. Varredura nos ~40 componentes consumidores
5. Atualização do teste de regressão global
6. Atualização da memória de projeto (constraint)

Pronto para aprovar e executar?
