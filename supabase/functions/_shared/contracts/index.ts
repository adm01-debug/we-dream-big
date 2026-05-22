/**
 * Barrel dos contratos por endpoint.
 *
 * Permite import único:
 *   import { ProductWebhookSchemaByVersion } from "../_shared/contracts/index.ts";
 *
 * Padrão por endpoint:
 *   - `<Endpoint>V<n>Schema`           — schema Zod versionado
 *   - `<Endpoint>V<n>`                 — type inferred
 *   - `<Endpoint>Versions`             — readonly array de versões suportadas
 *   - `<Endpoint>SchemaByVersion`      — record { v1: schema, v2: schema }
 */

export * from "./product-webhook.ts";
export * from "./webhook-dispatcher.ts";
export * from "./webhook-inbound.ts";
