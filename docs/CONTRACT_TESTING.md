# Contract Testing — Edge Functions

> PR de origem: `feat/contract-tests-zod-v1-v2`
> Owner técnico: TI Promo Brindes — Abner Silva

Este documento descreve o padrão de **validação de contrato** para todas as
Edge Functions do projeto: formato único de erro 422, versionamento v1/v2,
e como adicionar / migrar functions para o novo padrão.

---

## 1. Formato único de erro 422

Toda falha de **schema** retorna:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
x-api-version: v1

{
  "code":    "VALIDATION_FAILED",
  "message": "Payload inválido para esta rota",
  "fields":  [
    { "path": "product.price", "message": "Number must be greater than or equal to 0", "code": "too_small" },
    { "path": "sku",           "message": "Required",                                    "code": "invalid_type" }
  ],
  "api_version": "v1"
}
```

### Códigos previstos

| Código                | HTTP | Significado                                          |
| --------------------- | ---- | ---------------------------------------------------- |
| `VALIDATION_FAILED`   | 422  | Schema Zod recusou o payload                         |
| `INVALID_JSON`        | 400  | Body não é JSON parseável                            |
| `EMPTY_BODY`          | 400  | Body vazio quando o schema exige conteúdo            |
| `UNSUPPORTED_VERSION` | 400  | Header/param `x-api-version` aponta para versão inexistente |
| `DEPRECATED_VERSION`  | 200* | Resposta retorna headers `Deprecation: true` + `Sunset` |

\* status code da rota; é apenas um sinal nos headers.

### Por que 422 e não 400?

- **400 Bad Request** = problema sintático (JSON corrompido, body vazio).
- **422 Unprocessable Entity** = JSON sintaticamente OK, mas semanticamente
  inválido. Separar os dois facilita debug e métricas. RFC 9110 §15.5.21.

---

## 2. Versionamento v1 / v2

Toda Edge Function que aceita payload estruturado deve suportar versionamento.

### Como o cliente declara versão

Por ordem de prioridade:
1. Header `x-api-version: v2`
2. Query string `?v=2` ou `?api_version=2`
3. Default (geralmente `v1`)

Aceita também `"2"` sem prefixo — normaliza para `v2`.

### Como a Edge Function responde

Toda resposta carrega `x-api-version: vN` no header.
Versões depreciadas adicionalmente carregam:

```http
Deprecation: true
Sunset: Fri, 31 Dec 2026 00:00:00 GMT
Link: <https://docs.example.com/v2-migration>; rel="deprecation"
```

---

## 3. Como adicionar contract validation a uma Edge Function

### 3.1 Criar o schema versionado em `_shared/contracts/`

```ts
// supabase/functions/_shared/contracts/minha-function.ts
import { z } from "https://esm.sh/zod@3.23.8";

export const MinhaFunctionV1Schema = z.object({
  acao: z.enum(["criar", "atualizar"]),
  payload: z.record(z.unknown()),
});

export const MinhaFunctionV2Schema = z.object({
  acao: z.enum(["criar", "atualizar", "remover"]),
  payload: z.record(z.unknown()),
  idempotency_key: z.string().min(8).max(128),
});

export const MinhaFunctionVersions = ["v1", "v2"] as const;
export type MinhaFunctionVersion = typeof MinhaFunctionVersions[number];
export const MinhaFunctionSchemaByVersion = {
  v1: MinhaFunctionV1Schema,
  v2: MinhaFunctionV2Schema,
} as const;
```

E exportar de `_shared/contracts/index.ts`.

### 3.2 Consumir no `index.ts` da function

```ts
import {
  MinhaFunctionSchemaByVersion,
  MinhaFunctionVersions,
  type MinhaFunctionVersion,
} from "../_shared/contracts/index.ts";
import {
  parseApiVersion,
  withVersionHeaders,
} from "../_shared/contract-versioning.ts";
import { parseBodyWithSchema422 } from "../_shared/zod-validate.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const versioned = parseApiVersion<MinhaFunctionVersion>(
    req,
    MinhaFunctionVersions,
    { defaultVersion: "v1", corsHeaders },
  );
  if ("error" in versioned) return versioned.error;

  const schema = MinhaFunctionSchemaByVersion[versioned.version];
  const parsed = await parseBodyWithSchema422(req, schema, {
    corsHeaders,
    apiVersion: versioned.version,
  });
  if ("error" in parsed) return withVersionHeaders(parsed.error, versioned);

  // ... lógica de negócio ...

  return withVersionHeaders(
    new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
    versioned,
  );
});
```

### 3.3 Adicionar testes em `tests/edge-functions/contracts/`

Seguir o padrão dos arquivos `*.contract.test.ts` já criados. Cobertura mínima:

- Cada versão: pelo menos 1 caso válido + 3 negativos
- Pelo menos 1 caso de **retrocompatibilidade**: confirmar que payload v1 ainda valida em v1 após introdução de v2

### 3.4 Rodar localmente

```sh
npm run test:edge-contracts
```

---

## 4. Migração das functions existentes

Estado em `feat/contract-tests-zod-v1-v2`:

| Function              | Migrado |
| --------------------- | ------- |
| `product-webhook`     | ✅      |
| `webhook-dispatcher`  | ✅      |
| `webhook-inbound`     | ✅      |
| `ai-recommendations`  | ⏳ próxima onda |
| `quote-sync`          | ⏳ próxima onda |
| (outras ~70 functions)| ⏳      |

Functions ainda no padrão antigo (`parseBodyWithSchema`, 400) continuam
funcionando — o helper legado é mantido marcado `@deprecated`.

---

## 5. Quando NÃO usar o padrão estrito

`webhook-inbound` recebe payloads de upstreams variados (n8n, Bitrix,
GitHub). Por design, ele usa **modo permissivo**: valida com Zod, mas se
falhar grava o evento no DB com `error: "Validation: ..."` e
`processed: false`, retornando 200. Isso evita quebrar integradores legados.

Para forçar rejeição estrita:

```
POST /webhook-inbound?slug=meu-slug&strict=1
```

---

## 6. Referências internas

- `supabase/functions/_shared/api-errors.ts` — builders 400/422
- `supabase/functions/_shared/contract-versioning.ts` — parse + decorate
- `supabase/functions/_shared/zod-validate.ts` — `parseBodyWithSchema422` (novo) e `parseBodyWithSchema` (legado)
- `supabase/functions/_shared/contracts/` — schemas por endpoint
- `tests/edge-functions/contracts/` — testes Vitest dos schemas + helpers
