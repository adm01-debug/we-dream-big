# P0 Test Skeletons

Cenários **P0** (sistema fora do ar / dados corrompidos) conforme `docs/RUNBOOK.md`.

Todos os testes neste diretório iniciam com `test.skip` / `it.skip` — cada um documenta:

1. **Cenário**: descrição do incidente P0 que cobre.
2. **Pré-condições**: estado do sistema necessário.
3. **Mocks**: dependências externas a stubar (Bitrix24, n8n, MCP, Cloudflare, CRM, edge functions).
4. **Critério de aceite**: o que precisa passar para o teste ser destravado (`it`).

## Convenção

- **Vitest** (este diretório): contratos de edge functions, integrações, webhooks, RLS.
- **Playwright** (`e2e/flows/p0/`): fluxos UI ponta-a-ponta dos mesmos cenários.

## Como destravar

1. Implementar a correção referenciada no comentário `// TODO(P0):`.
2. Trocar `it.skip` → `it` (ou remover `test.skip(...)`).
3. Substituir mocks por chamadas reais quando aplicável (ou validar contrato).
4. Rodar `bun test tests/p0/` e `bunx playwright test e2e/flows/p0/`.

## Mapeamento P0 → Arquivo

| Cenário RUNBOOK                          | Vitest                              | Playwright                           |
|------------------------------------------|-------------------------------------|--------------------------------------|
| Edge functions com falha typecheck       | `edge-functions-failing.test.ts`    | —                                    |
| Webhooks (Bitrix, n8n) caídos / 5xx      | `webhooks-resilience.test.ts`       | —                                    |
| Integrações externas (CRM, Cloudflare)   | `external-integrations.test.ts`     | —                                    |
| RLS exposto / dados corrompidos          | `rls-data-integrity.test.ts`        | —                                    |
| Auth quebrado / sessão inválida          | `auth-recovery.test.ts`             | `01-auth-recovery.spec.ts`           |
| Catálogo bloqueado (DB externo offline)  | —                                   | `02-catalog-degraded.spec.ts`        |
| Orçamento bloqueado                      | —                                   | `03-quote-blocked.spec.ts`           |
| Checkout bloqueado                       | —                                   | `04-checkout-blocked.spec.ts`        |
| Admin / governança fora do ar            | —                                   | `05-admin-down.spec.ts`              |
