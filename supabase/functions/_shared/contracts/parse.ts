/**
 * supabase/functions/_shared/contracts/parse.ts
 *
 * Helper canônico para parsear + validar + versionar payloads de Edge Functions.
 *
 * Uso típico:
 *
 *   import { parseContract } from "../_shared/contracts/index.ts";
 *   import { ProductWebhookSchemas } from "../_shared/contracts/schemas/product-webhook.ts";
 *
 *   const result = await parseContract(req, ProductWebhookSchemas, {
 *     corsHeaders,
 *     requestId,
 *   });
 *   if (!result.ok) return result.response;
 *
 *   const { version, data } = result;
 *   // data tem o tipo da versão resolvida; `version` indica qual.
 *
 * Convenção: o objeto `schemas` é um `Record<version, ZodSchema>`. As versões
 * disponíveis viram automaticamente `supported`. `default` e `deprecated` são
 * configurados no `VersionConfig`.
 */

import { z } from "https://esm.sh/zod@3.23.8";
import {
  invalidJsonResponse,
  missingBodyResponse,
  zodValidationErrorResponse,
} from "./errors.ts";
import {
  resolveContractVersion,
  type VersionConfig,
} from "./versioning.ts";

export interface ContractSchemas<V extends string = string> {
  /** Map versão → schema Zod. As chaves viram a lista de versões suportadas. */
  versions: Record<V, z.ZodTypeAny>;
  /** Versão default quando o client não pedir nenhuma. */
  defaultVersion: V;
  /** Lista de versões em depreciação com data de sunset. */
  deprecated?: VersionConfig["deprecated"];
  /** Identificador legível do contrato (usado em logs). */
  name?: string;
}

export interface ParseOptions {
  corsHeaders?: Record<string, string>;
  requestId?: string;
  /** Permite passar um body já lido (útil quando a função precisa do raw para HMAC). */
  prereadBody?: string;
}

/**
 * Resultado de sucesso discriminado pela versão resolvida.
 *
 * Gera uma união `{ version: "1"; data: v1 } | { version: "2"; data: v2 } | ...`
 * a partir de `C["versions"]`, de modo que `version` e `data` permaneçam
 * correlacionados em tempo de compilação (cada versão expõe o shape do seu
 * próprio schema, sem colapsar tudo no shape da versão default).
 *
 * Importante: indexamos os schemas diretamente (sem a interseção
 * `ContractSchemas<V> & { versions: S }` usada anteriormente). Aquela interseção
 * forçava `versions[k]` a virar `ZodTypeAny & ZodObject<...>`, fazendo o checker
 * recursar no retorno de `ZodObject.deepPartial()` e falhar com TS2345
 * (15 edge functions de contratos quebravam o `deno check`).
 */
type ParseSuccessByVersion<C extends ContractSchemas> = {
  [K in keyof C["versions"] & string]: {
    ok: true;
    version: K;
    data: z.infer<C["versions"][K]>;
    responseHeaders: Record<string, string>;
  };
}[keyof C["versions"] & string];

export type ParseResult<C extends ContractSchemas = ContractSchemas> =
  | ParseSuccessByVersion<C>
  | { ok: false; response: Response };

/**
 * Parseia, valida e versiona o body de uma requisição.
 */
export async function parseContract<C extends ContractSchemas>(
  req: Request,
  schemas: C,
  opts: ParseOptions = {},
): Promise<ParseResult<C>> {
  const corsHeaders = opts.corsHeaders ?? {};

  // 1. Resolver versão
  const supportedVersions = Object.keys(schemas.versions);
  const versionConfig: VersionConfig = {
    supported: supportedVersions,
    default: schemas.defaultVersion,
    deprecated: schemas.deprecated,
  };
  const vRes = resolveContractVersion(req, versionConfig, corsHeaders);
  if (!vRes.ok) return { ok: false, response: vRes.response };

  const { version, responseHeaders } = vRes.resolved;
  const schema = schemas.versions[version as keyof C["versions"]];

  // 2. Ler body (uma única vez)
  let rawText: string;
  if (opts.prereadBody !== undefined) {
    rawText = opts.prereadBody;
  } else {
    try {
      rawText = await req.text();
    } catch {
      return {
        ok: false,
        response: invalidJsonResponse({
          corsHeaders,
          version,
          requestId: opts.requestId,
          extraHeaders: responseHeaders,
        }),
      };
    }
  }

  if (!rawText || rawText.trim() === "") {
    return {
      ok: false,
      response: missingBodyResponse({
        corsHeaders,
        version,
        requestId: opts.requestId,
        extraHeaders: responseHeaders,
      }),
    };
  }

  // 3. Parsear JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      response: invalidJsonResponse({
        corsHeaders,
        version,
        requestId: opts.requestId,
        extraHeaders: responseHeaders,
      }),
    };
  }

  // 4. Validar contra o schema
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      response: zodValidationErrorResponse(result.error, {
        corsHeaders,
        version,
        requestId: opts.requestId,
        extraHeaders: responseHeaders,
      }),
    };
  }

  // O TS nao consegue inferir, dentro do corpo generico, que este objeto
  // satisfaz a uniao mapeada `ParseSuccessByVersion<C>` (a uniao colapsa para
  // `never` sobre um `C` ainda nao resolvido). A validacao real foi feita por
  // `resolveContractVersion` + `schema.safeParse`, entao o cast e seguro.
  return {
    ok: true,
    version,
    data: result.data,
    responseHeaders,
  } as ParseResult<C>;
}
