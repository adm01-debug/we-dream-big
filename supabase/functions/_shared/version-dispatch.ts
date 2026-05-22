/**
 * Contract version dispatch for Edge Functions.
 *
 * Path-based versioning: resolves `v1` or `v2` from the URL pathname.
 * Default to `v1` when no segment is present (back-compat for existing clients).
 *
 * Supabase routes Edge Functions at `/functions/v1/<function-name>/<rest>`, so a
 * client targeting v2 of `product-webhook` calls
 *   POST /functions/v1/product-webhook/v2
 * and a legacy client keeps calling
 *   POST /functions/v1/product-webhook
 * which we treat as v1.
 *
 * A secondary `?_v=2` query fallback is supported for environments that cannot
 * control the path (e.g. webhook providers that mandate a fixed URL).
 */

export type ContractVersion = "v1" | "v2";

// Match a /vN segment. Supabase mounts functions at /functions/v1/<name>, so
// the FIRST /vN in the path is the mount prefix (always v1). The CONTRACT
// version lives after the function name. We therefore scan for ALL matches
// and use the LAST one — that is the contract version segment.
const VERSION_PATH_RE_GLOBAL = /\/(v[12])(?=\/|$)/gi;
const VERSION_QUERY_KEY = "_v";

function lastVersionInPath(pathname: string): ContractVersion | null {
  const matches = [...pathname.matchAll(VERSION_PATH_RE_GLOBAL)];
  if (matches.length === 0) return null;
  // If only one match, it is the Supabase mount prefix (/functions/v1) — not
  // a contract version; treat as absent. The mount prefix is always v1.
  if (matches.length === 1) return null;
  const last = matches[matches.length - 1][1].toLowerCase();
  return last === "v2" ? "v2" : "v1";
}

export function resolveVersion(req: Request): ContractVersion {
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return "v1";
  }

  const fromPath = lastVersionInPath(url.pathname);
  if (fromPath) return fromPath;

  const q = url.searchParams.get(VERSION_QUERY_KEY);
  if (q === "2" || q === "v2") return "v2";
  if (q === "1" || q === "v1") return "v1";

  return "v1";
}

export function stripVersionFromPath(pathname: string): string {
  // Strip ONLY the last /vN segment (the contract version), preserving the
  // Supabase mount prefix /functions/v1.
  const matches = [...pathname.matchAll(VERSION_PATH_RE_GLOBAL)];
  if (matches.length <= 1) return pathname;
  const last = matches[matches.length - 1];
  const start = last.index ?? 0;
  return pathname.slice(0, start) + pathname.slice(start + last[0].length);
}

/**
 * Convenience: header to expose on every response so callers can confirm
 * which contract version was actually served.
 */
export const VERSION_SERVED_HEADER = "X-Contract-Version-Served";

export function withVersionHeader(
  headers: Record<string, string>,
  version: ContractVersion,
): Record<string, string> {
  return { ...headers, [VERSION_SERVED_HEADER]: version };
}
