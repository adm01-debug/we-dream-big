// supabase/functions/cors-audit/index.ts
/**
 * Diagnostic endpoint — returns the CORS configuration of every edge function
 * in the project so you can audit which custom headers are accepted.
 *
 * Auth: dev role only (uses authorize({ requireRole: "dev" })).
 */

import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import {
  CORS_INTROSPECTION,
  handleCorsPreflight,
  getCorsHeaders,
} from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import snapshot from "../_shared/cors-snapshot.json" with { type: "json" };

// --- Types ---

interface SnapshotFunction {
  name: string;
  mode: "shared" | "inline" | "none";
  allowHeaders: string[];
  exposeHeaders: string[];
  allowMethods: string | null;
  allowOrigin: string | null;
}

interface Snapshot {
  generated_at: string;
  total: number;
  counts: { shared: number; inline: number; none: number };
  functions: SnapshotFunction[];
}

interface AuditResult {
  missing_in_inline: Record<string, string[]>;
  extra_in_inline: Record<string, string[]>;
}

// --- Logic ---

function buildAudit(snap: Snapshot): AuditResult {
  const sharedAllow = new Set(
    CORS_INTROSPECTION.allowHeadersList.map((h) => h.toLowerCase()),
  );
  const sharedExpose = new Set(
    CORS_INTROSPECTION.exposeHeaders
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );

  const missing_in_inline: Record<string, string[]> = {};
  const extra_in_inline: Record<string, string[]> = {};

  const addIssue = (record: Record<string, string[]>, key: string, fnName: string) => {
    (record[key] ||= []).push(fnName);
  };

  for (const fn of snap.functions) {
    if (fn.mode !== "inline") continue;

    const inlineAllow = new Set(fn.allowHeaders.map(h => h.toLowerCase()));
    
    // Check for missing standard headers in inline config
    for (const h of sharedAllow) {
      if (!inlineAllow.has(h)) {
        addIssue(missing_in_inline, h, fn.name);
      }
    }
    
    // Check for extra headers in inline config (potential divergence)
    for (const h of inlineAllow) {
      if (!sharedAllow.has(h)) {
        addIssue(extra_in_inline, h, fn.name);
      }
    }
    
    // Check for missing exposed headers
    for (const h of sharedExpose) {
      if (!fn.exposeHeaders.map(eh => eh.toLowerCase()).includes(h)) {
        addIssue(missing_in_inline, `expose:${h}`, fn.name);
      }
    }
  }

  return { missing_in_inline, extra_in_inline };
}

function countTotalIssues(audit: AuditResult): number {
  return Object.values(audit.missing_in_inline).reduce((acc, list) => acc + list.length, 0) +
         Object.values(audit.extra_in_inline).reduce((acc, list) => acc + list.length, 0);
}

// --- Handler ---

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "cors-audit", requestId, req });

  // Handle CORS
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  // Authorization check
  const auth = await authorize(req, { requireRole: "dev" });
  if (!auth.ok) {
    log.warn("cors_audit_denied", { reason: "insufficient_role" });
    return auth.response;
  }

  const snap = snapshot as Snapshot;
  const audit = buildAudit(snap);
  const issueCount = countTotalIssues(audit);

  log.info("cors_audit_ok", {
    total_functions: snap.total,
    counts: snap.counts,
    issue_count: issueCount,
  });

  const body = {
    shared: {
      allowHeaders: CORS_INTROSPECTION.allowHeaders,
      allowHeadersList: CORS_INTROSPECTION.allowHeadersList,
      allowMethods: CORS_INTROSPECTION.allowMethods,
      exposeHeaders: CORS_INTROSPECTION.exposeHeaders,
    },
    snapshot: snap,
    audit,
    meta: {
      request_id: requestId,
      generated_at: new Date().toISOString(),
    }
  };

  return log.respond(
    new Response(JSON.stringify(body, null, 2), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json" 
      },
    }),
  );
});

