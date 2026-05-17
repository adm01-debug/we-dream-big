## Diagnóstico

O print do `/` (catálogo) mostra três sintomas que indicam **vazamento de tema claro** sobre uma UI que deveria ser 100% dark:

1. **Faixa branca no topo da página** (acima da toolbar de filtros).
2. **Título "Catálogo de Produtos · 6.090 itens" quase invisível** — texto escuro sobre fundo branco.
3. **Toolbar e cards** já desenhados em dark (correto) — provando que o problema é só o wrapper externo + o `<h1>` herdando `color: foreground` errado.

Investigação inicial confirmou:

- O fundo espacial / `Starfield` / `SpaceScene` **está corretamente escopado às rotas de auth** (`Auth.tsx`, `AuthBranding.tsx`, `ResetPassword`, `ForgotPasswordConfirmation`, `SSOCallbackPage`). Não vazou para outras telas.
- `src/index.css` cresceu para **2.364 linhas** e acumulou animações/keyframes (`breathingStar`, `rocketRising`, `zigzagMovement` etc.) e overrides globais de `.dark body`, `.dark p/span/td/...` durante a iteração da tela de login.
- O catálogo (`Index.tsx` + `CatalogHeader.tsx`) usa tokens semânticos corretos (`bg-background/95`, `text-muted-foreground`), portanto o bug visível é **causado por o `dark` class não estar sendo aplicado ao `<html>`** em algum momento (provavelmente bootstrap do tema ou um override CSS criado durante o trabalho do login que força `:root` a permanecer light).

Escopo aprovado pelo usuário: **catálogo + auditoria global, mantendo dark como padrão**.

## Plano

### Fase 1 — Bug imediato do catálogo (dark theme leak)

1. Identificar o ponto exato em que o `dark` deixa de ser aplicado:
   - Checar `ThemeProvider` / inicialização do tema (provavelmente `src/main.tsx` ou `src/components/system/ThemeProvider.tsx`).
   - Verificar se há `:root { color-scheme: light }` ou `html:not(.dark)` introduzido junto com o trabalho do login.
2. Garantir que **fora das rotas `/auth*`** o `dark` esteja sempre ativo (política atual do app — plataforma fechada, dark-only).
3. Validar visualmente o `/` (catálogo) com `browser--screenshot` — título, hero e cards devem ficar legíveis.

### Fase 2 — Auditoria do `index.css` (conter o que vazou)

1. Mapear todas as regras `@keyframes` e classes adicionadas durante o trabalho do login (`breathingStar`, `starGlowPulse`, `starDrift`, `rocketRising`, `zigzagMovement`, `floatMovement`, `shootingStar`, `nebulaDrift`).
2. Mover esses keyframes para um arquivo **escopado** (`src/pages/auth/auth-scene.css`) importado **só** por `AuthBranding.tsx`, removendo-os do `index.css` global.
3. Revisar os overrides `.dark body`, `.dark p/span/label/td/th/li`, `.dark .text-muted-foreground`, `.dark .font-*` (linhas ~395-450) — alguns desses ajustes de `font-weight`/`letter-spacing` foram afinados para o card de login e estão deixando o texto do app inteiro fino demais sobre os cards escuros.
4. Restaurar pesos/contraste padrão para texto de UI (corpo, labels, paragraphs) e manter os ajustes finos apenas onde semanticamente fizer sentido (ex.: `.font-display`).

### Fase 3 — Auditoria de hardcodes fora da `/auth*`

1. Rodar grep por `bg-white`, `text-white`, `bg-black`, `text-black`, `#fff`, `#000`, `from-blue-`, `to-purple-` em `src/pages/**` e `src/components/**` **excluindo** `src/pages/Auth.tsx`, `src/pages/auth/**`, `src/pages/ResetPassword.tsx`, `src/pages/ForgotPasswordConfirmation.tsx`, `src/pages/SSOCallbackPage.tsx`, `src/components/auth/**`.
2. Substituir hits legítimos por tokens semânticos (`bg-background`, `text-foreground`, `bg-primary`, `border-border`).
3. Não tocar nas rotas de auth — elas têm identidade visual própria (azul-noite + estrelas) e ficam.

### Fase 4 — QA visual

1. Screenshot de `/` (catálogo), `/colecoes`, `/comparar`, `/admin/usuarios`, `/orcamento`, `/auth` (controle — não deve mudar).
2. Confirmar contraste WCAG AA em texto principal e `muted-foreground`.
3. Confirmar que `/auth` mantém o fundo espacial intacto.

## Detalhes técnicos

- **Política dark-only fora de `/auth`**: já consta na memória do projeto (`Closed Platform` + `Skins Propagation`). A correção deve respeitar `var(--primary)` e nunca cores hardcoded.
- **Não criar nada novo no Lovable Cloud / DBs externos** — todo o trabalho é frontend/CSS.
- **Não fazer redesign** — só reverter vazamentos e restaurar contraste. UI das telas continua igual.
- **Arquivos esperados de mudança**: `src/index.css`, `src/pages/auth/AuthBranding.tsx` (+ novo `auth-scene.css`), eventual `ThemeProvider`, e ajustes pontuais em páginas/componentes com hardcodes.
- **Arquivos intocáveis**: `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/ForgotPasswordConfirmation.tsx`, `src/pages/SSOCallbackPage.tsx`, `src/components/auth/**`, `src/integrations/supabase/*`.

## Riscos / fora de escopo

- Não vou alterar a paleta de cores (`--primary`, `--background` etc.) — só corrigir aplicação. Se você quiser repaletar, abrimos um plano separado.
- Não vou mexer no comportamento do `Starfield`/animações de auth — só mudar o **arquivo onde elas moram** (escopo CSS).
- Se a Fase 3 revelar muitos hardcodes (>50 hits), volto antes de continuar para confirmar prioridades.
