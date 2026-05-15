# Strict Ref-Warning Gate

Rede de segurança global que falha o CI se qualquer teste disparar o
warning canônico do React **"Function components cannot be given refs"**
(ou seu acompanhamento _"Attempts to access this ref will fail"_), mesmo
que o teste em questão não use `installReactWarningGuard` localmente.

## Componentes

| Arquivo | Função |
|---|---|
| `tests/setup-ref-warning-capture.ts` | Setup global do Vitest. Intercepta `console.error/warn` de todos os testes, grava em snapshot e (se `STRICT_REF_WARNINGS=1`) eleva `process.exitCode = 1` em `afterAll` se houver ref warnings. |
| `scripts/consolidate-console-snapshot.mjs` | Funde os snapshots por-worker (`coverage/console-snapshot.<id>.json`) em um único `coverage/console-snapshot.json` para upload como artifact e auditoria humana. |
| `npm run test:strict-ref` | Roda a suite com a flag estrita + consolida snapshots. |
| `.github/workflows/ci.yml` step **"Strict ref-warning gate"** | Executa o script no CI. |
| `.github/workflows/ci.yml` step **"Upload console snapshot"** | Anexa o snapshot consolidado como artifact (`console-snapshot-<run_id>`), retido por 14 dias. |

## Como funciona a coexistência com `installReactWarningGuard`

O guard local usa `vi.spyOn(console, 'error').mockImplementation(...)`,
que **substitui** o método. Mensagens capturadas pelo guard local NÃO
chegam ao wrapper global — exatamente o que queremos: testes que injetam
warnings de propósito (sanity tests do guard, p.ex.) não contam contra
o critério estrito global.

## Auditoria

Após cada execução do CI, baixe o artifact `console-snapshot-<run_id>`.
O JSON consolidado tem o formato:

```json
{
  "generatedAt": "2026-04-26T18:30:00.000Z",
  "totalEntries": 142,
  "refWarnings": 0,
  "byLevel": { "error": 3, "warn": 139 },
  "entries": [
    { "level": "error", "message": "...", "timestamp": "...", "isRefWarning": false }
  ]
}
```

`refWarnings > 0` significa que algum teste deixou escapar um warning
de ref — investigue qual e adicione/corrija o `forwardRef` ou wrapper
`<span className="inline-flex">` (ver `mem://ui/radix-nesting-ref-standard`).

## Rodar local

```bash
# Modo padrão (apenas grava snapshot, não falha):
npm test

# Modo estrito (falha se houver ref warning):
npm run test:strict-ref

# Auditoria pós-execução (qualquer modo):
node scripts/consolidate-console-snapshot.mjs
cat coverage/console-snapshot.json | jq '.refWarnings'
```

## Allowlist / debug

Para testes que **precisam** disparar warnings de ref de propósito
(ex.: smoke do próprio guard), use `installReactWarningGuard` localmente
— o spy local intercepta antes do wrapper global, então o evento não
contamina a auditoria.
