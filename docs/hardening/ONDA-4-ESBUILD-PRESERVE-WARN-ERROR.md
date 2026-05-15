# Onda 4 — esbuild preservar console.warn/error em produção

**Data:** 14 de maio de 2026  
**PR alvo:** cleanup/onda-4-esbuild-preserve-warn-error  
**Bloqueador resolvido:** B-1.1 (parcial — B-1.2 = Sentry init virá na Onda 5)  
**Tempo de execução:** ~30 minutos  
**Risco:** baixo (1 linha lógica de config)

## Contexto

A auditoria profunda de 10/mai/2026 identificou B-1: "Errors em produção são silenciosamente engolidos".

O `vite.config.ts` tinha:

```ts
esbuild: {
  // Strip console.log/debug/info in production — keep warn/error for diagnostics
  drop: mode === 'production' ? ['console', 'debugger'] : [],
},
```

**O bug:** o comentário promete preservar `warn/error`, mas `drop: ['console']` do esbuild **remove TODOS os métodos** de console — incluindo `error` e `warn`. As 13+ chamadas a `logger.error()` no código (que internamente fazem `console.error`) ficam silenciosamente removidas em produção.

Resultado: quando algo quebra em prod, vendedores veem tela branca, mas o time técnico não tem como investigar — sem logs, sem stack trace, sem agregação.

## Solução

Trocar `drop: ['console', 'debugger']` por:
- `pure: ['console.log', 'console.debug', 'console.info']` — remove apenas estes métodos específicos
- `drop: ['debugger']` — continua removendo `debugger;` statements

A diferença: `pure` aceita uma **lista de nomes específicos** que esbuild pode remover como side-effect-free, enquanto `drop: 'console'` é um atalho que mata o objeto `console` inteiro.

## Validação empírica

Rodado contra um arquivo de teste com `console.{log,debug,info,warn,error}` + `debugger`:

| Config | Sobreviventes no bundle |
|---|---|
| ANTIGA (`drop: ['console', 'debugger']`) | NENHUM — todos os console.* foram strippados |
| NOVA (`pure: log/debug/info` + `drop: debugger`) | `console.warn`, `console.error` ✅ |

Comando usado:
```bash
esbuild --bundle test.ts --pure:console.log --pure:console.debug --pure:console.info --drop:debugger --minify
```

## Impacto

| Item | Antes | Depois |
|---|---|---|
| `console.error` em bundle prod | removido | **preservado** |
| `console.warn` em bundle prod | removido | **preservado** |
| `console.log` em bundle prod | removido | removido (igual) |
| `console.debug` em bundle prod | removido | removido (igual) |
| `console.info` em bundle prod | removido | removido (igual) |
| `debugger;` statements | removidos | removidos (igual) |

## Próximo passo (Onda 5)

Com `console.error/warn` agora sobrevivendo em prod, **Onda 5 (B-1.2)** vai ligar o Sentry (`@sentry/react@^8.45.0` já está em `package.json` mas nunca foi inicializado). Sentry vai capturar esses errors/warns + stack traces e mandar pro agregador, fechando o ciclo de observabilidade.

## Riscos / rollback

- Se algum bug fizer a página spam `console.error` em loop, vai aparecer no DevTools dos vendedores (não era visível antes). Mitigação: já existe `logger.error` que vai ser substituído por Sentry capture na Onda 5.
- Rollback simples: reverter o PR (1 arquivo, 5 linhas).
