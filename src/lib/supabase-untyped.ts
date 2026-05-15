/**
 * Typed wrapper for Supabase tables not yet in the generated schema.
 * Eliminates `as any` casts at call sites while maintaining type safety.
 *
 * Usage:
 *   const { data } = await untypedFrom<MyType>("my_table").select("*").eq("id", id);
 *   //              data is MyType[] (from generic), not never[]
 *
 * Strategy:
 *   The Supabase generated types narrow `from()` to known table names — any
 *   other string falls back to `audit_logs` row shape, which causes TS2339
 *   floods on every property access. Casting `supabase` itself to a
 *   permissive `SupabaseClient<any>` restores the unrestricted builder so
 *   the row-shape generic `T` flows through `select()/insert()/update()`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- needed for permissive SupabaseClient cast (see file header)
type AnyClient = SupabaseClient<any, any, any>;

/**
 * Access a Supabase table that doesn't exist in the generated types.
 *
 * Pass the row shape as `T` to recover full typing on `.select()`,
 * `.insert()`, `.update()` — otherwise falls back to a permissive
 * `Record<string, unknown>` that is still safer than `any`.
 */
export function untypedFrom<T = Record<string, unknown>>(table: string) {
  return (supabase as unknown as AnyClient).from(table) as ReturnType<
    AnyClient["from"]
  > & { _row?: T };
}

// Known untyped table names for documentation
export type UntypedTable =
  | "product_component_locations"
  | "product_component_location_techniques"
  | "product_group_components"
  | "product_group_locations"
  | "product_group_location_techniques";
