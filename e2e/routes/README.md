# Suíte E2E por rota

Cobertura por rota crítica do app, organizada em 4 áreas:

| Pasta                  | Auth?      | Project Playwright   |
|------------------------|------------|----------------------|
| `routes/public/`       | Não        | `routes-public`      |
| `routes/app/`          | Sim        | `routes-authed`      |
| `routes/quotes/`       | Sim        | `routes-authed`      |
| `routes/admin/`        | Sim+admin  | `routes-authed`      |

## Padrão por rota (8 casos)

Cada spec contém os mesmos casos nominais para fácil leitura:

1. **render** — rota carrega sem erros JS, elementos chave visíveis
2. **happy path** — fluxo principal funciona com mocks de sucesso
3. **auth fail** — sessão inválida / 401 → redireciona ou exibe erro
4. **payload inválido** — 400 do backend é tratado com mensagem legível
5. **timeout** — chamada lenta não trava UI (loading visível, botão recupera)
6. **5xx** — erro de infraestrutura mostra alerta acionável
7. **a11y básico** (`@a11y`) — sem H1 duplicado, inputs com label, botões com nome
8. **mobile** (`@mobile`) — layout 390×844 sem overflow horizontal, CTAs visíveis

Rotas públicas substituem "auth fail" por "token inválido / expirado".

## Mocks

Tudo via `e2e/routes/_shared.ts` com `page.route()` (sem rede real). Helpers:
`mockEdgeFn`, `mockRestTable5xx`, `mockRestTable401`, `mockSessionExpired`,
`basicA11yChecks`, `setMobileViewport`.

## Como rodar

```bash
# Tudo
npx playwright test --project=routes-public --project=routes-authed

# Só pública
npx playwright test e2e/routes/public

# Só mobile
npx playwright test --project=routes-mobile
```
