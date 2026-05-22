#!/usr/bin/env node
/**
 * Generate stub files for a new Edge Function contract:
 *   - <name>/schemas.ts
 *   - <name>/index.test.ts
 *   - <name>/contract.json
 *
 * Used by subsequent PRs (T2/T3/T4) to apply the same contract pattern to the
 * remaining ~77 Edge Functions without manual boilerplate.
 *
 * Usage:
 *   node scripts/generate-contract-stub.mjs <function-name> [--v2]
 *   node scripts/generate-contract-stub.mjs categories-api
 *   node scripts/generate-contract-stub.mjs product-webhook --v2   # also emit v2
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');

const argv = process.argv.slice(2);
const name = argv.find((a) => !a.startsWith('--'));
const wantV2 = argv.includes('--v2');

if (!name) {
  console.error('Usage: node scripts/generate-contract-stub.mjs <function-name> [--v2]');
  process.exit(1);
}

const dir = path.join(FN_DIR, name);
if (!fs.existsSync(dir) || !fs.existsSync(path.join(dir, 'index.ts'))) {
  console.error(`Function not found: ${dir}/index.ts`);
  process.exit(1);
}

function writeOnce(file, content) {
  if (fs.existsSync(file)) {
    console.log(`  skip (exists): ${path.relative(ROOT, file)}`);
    return false;
  }
  fs.writeFileSync(file, content);
  console.log(`  wrote: ${path.relative(ROOT, file)}`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// schemas.ts
// ─────────────────────────────────────────────────────────────────────────────

const schemasTs = wantV2 ? `
/**
 * Versioned contract schemas for ${name}.
 * TODO: fill in real shape — this is a generated stub.
 */
import { z } from "https://esm.sh/zod@3.23.8";

export const RequestSchemaV1 = z.object({
  // TODO: add fields matching the current inline schema (or capture the
  // payload your function receives today). Keep this lenient for back-compat.
}).passthrough();

export const RequestSchemaV2 = z.object({
  // TODO: stricter version; add idempotency_key / correlation_id where useful.
}).strict();

export type RequestV1 = z.infer<typeof RequestSchemaV1>;
export type RequestV2 = z.infer<typeof RequestSchemaV2>;

export interface Canonical {
  // TODO
}

export function adaptV1ToCanonical(_data: RequestV1): Canonical {
  // TODO
  return {} as Canonical;
}

export function adaptV2ToCanonical(_data: RequestV2): Canonical {
  // TODO
  return {} as Canonical;
}
` : `
/**
 * Contract schema for ${name}.
 * V1 only — this function does not (yet) have a v2 contract.
 */
import { z } from "https://esm.sh/zod@3.23.8";

export const RequestSchemaV1 = z.object({
  // TODO: define fields matching the request body this function expects.
});

export type RequestV1 = z.infer<typeof RequestSchemaV1>;
`;

writeOnce(path.join(dir, 'schemas.ts'), schemasTs.trimStart());

// ─────────────────────────────────────────────────────────────────────────────
// index.test.ts
// ─────────────────────────────────────────────────────────────────────────────

const testTs = `// Generated contract-test stub for ${name}.
// TODO: import { handler } from "./index.ts" after refactoring the function to
// export the handler (replace \`Deno.serve(async (req) => ...)\` with
// \`export const handler = async (req) => ...; Deno.serve(handler);\`).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { RequestSchemaV1${wantV2 ? ', RequestSchemaV2' : ''} } from "./schemas.ts";

Deno.test("[${name} schema v1] rejects missing required fields", () => {
  const r = RequestSchemaV1.safeParse({});
  // TODO: tighten once real fields are added.
  assert(r.success === true || r.success === false);
});

${wantV2 ? `Deno.test("[${name} schema v2] rejects unknown keys (strict)", () => {
  const r = RequestSchemaV2.safeParse({ rogue_field: 1 });
  assertEquals(r.success, false);
});
` : ''}`;

writeOnce(path.join(dir, 'index.test.ts'), testTs);

// ─────────────────────────────────────────────────────────────────────────────
// contract.json
// ─────────────────────────────────────────────────────────────────────────────

const contractJson = {
  $schema: '../../../scripts/__contracts__/contract.schema.json',
  endpoint: name,
  verifyJwt: false,
  kind: 'public',
  versions: wantV2 ? ['v1', 'v2'] : ['v1'],
  samples: {
    v1: {
      valid: { TODO: 'fill in a valid sample payload' },
      invalid_missing_field: {},
      invalid_wrong_type: {},
      invalid_empty_value: {},
    },
    ...(wantV2
      ? {
          v2: {
            valid: { TODO: 'fill in a valid v2 sample' },
            invalid_missing_field: {},
            invalid_wrong_type: {},
            invalid_empty_value: {},
          },
        }
      : {}),
  },
  expectedResponses: {
    v1_valid: { status: 200 },
    v1_invalid: { status: 400, shape: { error: 'Validation failed' } },
    ...(wantV2
      ? {
          v2_valid: { status: 200 },
          v2_invalid: { status: 422, shape: { code: 'validation_failed' } },
        }
      : {}),
  },
};

writeOnce(path.join(dir, 'contract.json'), JSON.stringify(contractJson, null, 2) + '\n');

console.log(`\n✅ Stubs generated for ${name}. Edit them to fill in real schemas/payloads.`);
