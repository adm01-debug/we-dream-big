import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  processBatch,
  type ActiveConnection,
  type CompatibleSupabaseClient,
  type ServiceClient,
} from "./index.ts";

// Stub mínimo com a forma de SupabaseClient (.from/.rpc/.auth) — passa pelo
// runtime guard e no type-check estático. Usado apenas para garantir que a
// nova assinatura genérica de processBatch ACEITA as variações esperadas
// SEM precisar recorrer a `any` no call site.
function makeStubClient(): SupabaseClient {
  return {
    from: () => ({}),
    rpc: () => ({}),
    auth: {},
  } as unknown as SupabaseClient;
}

Deno.test("processBatch: aceita SupabaseClient default (compat 100%)", async () => {
  const service: ServiceClient = makeStubClient();
  // batch vazio → não dispara runConnectionTest, valida só a assinatura.
  const result = await processBatch(service, [] as ActiveConnection[]);
  assert(Array.isArray(result));
});

Deno.test("processBatch: aceita CompatibleSupabaseClient<any, 'public'> explícito", async () => {
  // deno-lint-ignore no-explicit-any
  const service: CompatibleSupabaseClient<any, "public"> = makeStubClient();
  const result = await processBatch(service, [] as ActiveConnection[]);
  assert(Array.isArray(result));
});

Deno.test("processBatch: aceita Database tipado com schema 'public'", async () => {
  // Simula um Database gerado (ex.: src/integrations/supabase/types).
  type FakeDatabase = {
    public: {
      Tables: Record<string, { Row: Record<string, unknown> }>;
      Views: Record<string, never>;
      Functions: Record<string, never>;
      Enums: Record<string, never>;
      CompositeTypes: Record<string, never>;
    };
  };
  const service = makeStubClient() as unknown as CompatibleSupabaseClient<FakeDatabase, "public">;
  const result = await processBatch<FakeDatabase, "public">(service, [] as ActiveConnection[]);
  assert(Array.isArray(result));
});
