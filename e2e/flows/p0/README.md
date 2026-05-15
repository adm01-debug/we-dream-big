# P0 E2E Flows

Cenários **P0** do `docs/RUNBOOK.md` em formato Playwright. Todos com `test.skip` —
destrave após implementar a UX de degradação correspondente.

## Mapeamento

| Spec                          | Cenário                                          |
|-------------------------------|--------------------------------------------------|
| `01-auth-recovery.spec.ts`    | Auth fora do ar / sessão expirada                |
| `02-catalog-degraded.spec.ts` | DB externo offline → cache + banner              |
| `03-quote-blocked.spec.ts`    | Bitrix/CRM offline durante criação de orçamento  |
| `04-checkout-blocked.spec.ts` | Edge functions de pagamento/order com 5xx        |
| `05-admin-down.spec.ts`       | full-op-diagnostics ou MCP fora do ar            |

Mocks compartilhados em `_mocks.ts` (interceptam via `page.route()`).
