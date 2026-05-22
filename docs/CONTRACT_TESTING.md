# Contract Testing for Edge Functions

This document describes the contract-test pattern adopted in PR
`claude/webhook-contract-tests-swzNU` and the migration roadmap for the
remaining Edge Functions.

## Why

The project has ~80 Supabase Edge Functions. Before this work:

- Schema coverage was inconsistent (~40 with Zod, ~40 without).
- Webhook `webhook-inbound` accepted any JSON.
- Error responses had different shapes per function.
- There was no contract versioning, so any breaking schema change would hit
  external clients (n8n, logistics APIs, etc.) at once.

This PR introduces:

1. A **shared error helper** with two flavors:
   - V1: legacy `{error, details}` with HTTP 400 (byte-for-byte compatible
     with the previous `parseBodyWithSchema` behavior — n8n keeps working).
   - V2: new `{code, message, fields: [{path, code, message}]}` with HTTP 422
     and `Content-Type: application/problem+json`.
2. A **path-based version dispatcher** (`/v1` / `/v2`) that defaults to v1
   when no version is present (back-compat).
3. **Contract tests** covering happy path, missing fields, wrong types, empty
   values, invalid enums/UUIDs, and unknown keys (v2 strict mode).
4. An **auto-discovery runner** (`npm run test:contracts`) that picks up any
   `supabase/functions/<name>/contract.json` manifest.
5. A **coverage gate** (`npm run check:contract-coverage`) that fails CI when
   webhook-tier functions miss schema/test/manifest.

## The three shared helpers

```
supabase/functions/_shared/version-dispatch.ts
  → resolveVersion(req) reads URL pathname; falls back to ?_v=2; default v1.
  → withVersionHeader / VERSION_SERVED_HEADER (X-Contract-Version-Served).

supabase/functions/_shared/error-response.ts
  → buildV1ValidationError(err, cors)   // 400 / {error, details}
  → buildV2ValidationError(err, cors)   // 422 / {code, message, fields}
  → buildV2Error(code, msg, status, cors, fields?)

supabase/functions/_shared/zod-validate.ts
  → parseBodyWithSchema  (unchanged — legacy 400)
  → parseBodyVersioned   (new — dispatches v1/v2)
```

## Pattern: applying contract versioning to a new function

```ts
// supabase/functions/my-fn/schemas.ts
import { z } from "https://esm.sh/zod@3.23.8";

export const RequestV1 = z.object({ /* current shape */ });
export const RequestV2 = RequestV1.extend({
  idempotency_key: z.string().min(8),
}).strict();

export function adaptV1ToCanonical(d) { /* ... */ }
export function adaptV2ToCanonical(d) { /* ... */ }
```

```ts
// supabase/functions/my-fn/index.ts
import { parseBodyVersioned } from "../_shared/zod-validate.ts";
import { RequestV1, RequestV2, adaptV1ToCanonical, adaptV2ToCanonical } from "./schemas.ts";

export const handler = async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const parsed = await parseBodyVersioned(req, { v1: RequestV1, v2: RequestV2 }, corsHeaders);
  if ("error" in parsed) return parsed.error;
  const canonical = parsed.version === "v2"
    ? adaptV2ToCanonical(parsed.data)
    : adaptV1ToCanonical(parsed.data);
  // Business logic operates on the canonical shape only.
};
Deno.serve(handler);
```

Then add `index.test.ts` and `contract.json` (see existing webhooks for
examples) or run `npm run generate:contract-stub <name> [--v2]` to scaffold.

## Running the tests

| Command | What it does |
|---------|--------------|
| `npm run test:contracts` | Simulate mode — validates manifest shape. No network. |
| `npm run test:contracts:live` | Hits Supabase deployment with all matrix scenarios. |
| `npm run test:contracts:baseline` | Records v1 response hashes to `scripts/__contracts__/v1-baseline.json`. Commit the file. |
| `npm run test:contracts:deno` | Runs Deno unit tests for the 3 webhooks + shared helpers. |
| `npm run check:contract-coverage` | Reports which functions are missing schema/test/manifest. Fails only on webhook tier in this PR. |
| `npm run check:contract-coverage:strict` | Fail also on public tier (future PRs). |
| `npm run generate:contract-stub <name> [--v2]` | Scaffold the 3 files for a new function. |

## Tier plan (this PR vs future PRs)

| Tier | Functions | Versioning | Status |
|------|-----------|------------|--------|
| T0   | Shared helpers + tests | n/a | ✅ this PR |
| T1   | product-webhook, webhook-inbound, webhook-dispatcher | v1+v2 | ✅ this PR |
| T2   | 13 `verify_jwt=false` non-webhook functions | v1 | Future PRs (use `generate:contract-stub`) |
| T3   | 12 cron functions | v1 | Future PRs (most are exempt — see `contract-exceptions.json`) |
| T4   | ~52 JWT-protected functions | v1 | Future PRs |

## Anti-regression for V1 (n8n & external clients)

- `error-response.test.ts` includes a snapshot test that asserts
  `{error, details}` 400 shape stays byte-for-byte stable.
- `scripts/__contracts__/v1-baseline.json` stores response-shape hashes per
  endpoint per case. CI compares against this file when run with `--live`.
- A PR that intentionally alters V1 must add the `breaking-v1` label.
