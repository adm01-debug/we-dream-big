import { getCorsHeaders } from "../_shared/cors.ts";
/**
 * rls-matrix-export — exporta a matriz RLS por tabela crítica × operação.
 *
 * GET /rls-matrix-export?format=csv  → CSV
 * GET /rls-matrix-export?format=pdf  → PDF (gerado server-side em HTML simples)
 *
 * Requer JWT de admin/dev. A RPC `audit_rls_matrix` valida a role internamente
 * (SECURITY DEFINER), mas validamos aqui também para resposta 401 amigável.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { castRpcResult } from "../_shared/supabase-client-adapter.ts";

// Module-scope CORS headers — atribuído per-request no handler.
let corsHeaders: Record<string, string> = {};

interface MatrixRow {
  table: string;
  rls_enabled: boolean;
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  missing: boolean;
  policy_count: number;
  policies: Array<{ name: string; qual: string; with_check: string }>;
  criterion_diverges: boolean;
  severity: "critical" | "high" | "medium" | "review" | "ok";
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "missing_auth" }, 401);
    }

    // Valida usuário e role com cliente authed
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "invalid_token" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: isAdmin } = await castRpcResult<{
      data: boolean | null;
      error: { message: string } | null;
    }>(admin.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    }));
    const { data: isDev } = await castRpcResult<{
      data: boolean | null;
      error: { message: string } | null;
    }>(admin.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "dev",
    }));
    if (!isAdmin && !isDev) return json({ error: "forbidden" }, 403);

    const { data: matrix, error: matErr } = await castRpcResult<{
      data: MatrixRow[] | null;
      error: { message: string } | null;
    }>(admin.rpc("audit_rls_matrix"));
    if (matErr) {
      console.error("[rls-matrix-export] rpc error", matErr);
      return json({ error: matErr.message }, 500);
    }

    const rows: MatrixRow[] = matrix ?? [];
    const url = new URL(req.url);
    const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    if (format === "pdf") {
      const html = renderHtml(rows);
      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="rls-matrix-${stamp}.html"`,
        },
      });
    }

    // CSV (default)
    const csv = renderCsv(rows);
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rls-matrix-${stamp}.csv"`,
      },
    });
  } catch (e) {
    console.error("[rls-matrix-export] uncaught", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function renderCsv(rows: MatrixRow[]): string {
  const header = [
    "tabela",
    "rls_enabled",
    "operacao",
    "tem_politica",
    "qtd_politicas",
    "criterio_divergente",
    "severidade",
    "lacuna",
    "predicado_using",
    "predicado_with_check",
    "nomes_politicas",
  ].join(",");

  const lines = [header];
  for (const r of rows) {
    const usings = r.policies.map((p) => p.qual).filter(Boolean).join(" | ");
    const checks = r.policies.map((p) => p.with_check).filter(Boolean).join(" | ");
    const names = r.policies.map((p) => p.name).join(" | ");
    const gap = r.missing
      ? "POLITICA_AUSENTE"
      : r.criterion_diverges
      ? "CRITERIO_DIVERGENTE"
      : "";
    lines.push([
      csvEscape(r.table),
      csvEscape(r.rls_enabled ? "ON" : "OFF"),
      csvEscape(r.operation),
      csvEscape(r.missing ? "NAO" : "SIM"),
      csvEscape(r.policy_count),
      csvEscape(r.criterion_diverges ? "SIM" : "NAO"),
      csvEscape(r.severity),
      csvEscape(gap),
      csvEscape(usings),
      csvEscape(checks),
      csvEscape(names),
    ].join(","));
  }
  return "\uFEFF" + lines.join("\n"); // BOM p/ Excel pt-BR
}

function sevColor(s: MatrixRow["severity"]): string {
  switch (s) {
    case "critical": return "#7f1d1d";
    case "high": return "#b91c1c";
    case "medium": return "#ca8a04";
    case "review": return "#1d4ed8";
    default: return "#15803d";
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

function renderHtml(rows: MatrixRow[]): string {
  // Agrupa por tabela para renderizar uma linha = tabela, 4 colunas = ops
  const tables = Array.from(new Set(rows.map((r) => r.table))).sort();
  const ops: MatrixRow["operation"][] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

  const stamp = new Date().toLocaleString("pt-BR");
  const totalGaps = rows.filter((r) => r.missing).length;
  const totalDiv = rows.filter((r) => r.criterion_diverges).length;

  const tableHtml = tables.map((t) => {
    const cells = ops.map((op) => {
      const r = rows.find((x) => x.table === t && x.operation === op)!;
      const label = r.missing ? "✗ ausente" : r.criterion_diverges ? "⚠ divergente" : "✓ ok";
      return `<td style="background:${sevColor(r.severity)};color:#fff;text-align:center;padding:6px 8px;font-size:11px">
        ${label}<br><span style="opacity:.85;font-size:10px">${r.policy_count} pol.</span>
      </td>`;
    }).join("");
    const r0 = rows.find((x) => x.table === t)!;
    const rls = r0.rls_enabled
      ? '<span style="color:#15803d">ON</span>'
      : '<span style="color:#b91c1c;font-weight:bold">OFF</span>';
    return `<tr>
      <td style="padding:6px 10px;font-family:monospace;font-size:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(t)}</td>
      <td style="padding:6px 10px;text-align:center;border-bottom:1px solid #e5e7eb">${rls}</td>
      ${cells}
    </tr>`;
  }).join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Matriz RLS — Promo Gifts</title>
<style>
  body{font-family:-apple-system,Segoe UI,Inter,Roboto,sans-serif;margin:24px;color:#0f172a}
  h1{font-size:18px;margin:0 0 4px}
  .meta{font-size:11px;color:#64748b;margin-bottom:16px}
  table{border-collapse:collapse;width:100%;font-size:12px}
  th{background:#f1f5f9;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#475569}
  .legend span{display:inline-block;padding:2px 8px;border-radius:4px;color:#fff;font-size:10px;margin-right:6px}
  @media print { body{margin:12mm} .no-print{display:none} }
</style></head><body>
<h1>Matriz de cobertura RLS — tabelas críticas do vendedor</h1>
<div class="meta">Gerado em ${stamp} · ${tables.length} tabelas · ${totalGaps} lacunas · ${totalDiv} critérios divergentes</div>
<div class="legend" style="margin-bottom:12px">
  <span style="background:#7f1d1d">crítico (RLS off)</span>
  <span style="background:#b91c1c">alto (sem SELECT)</span>
  <span style="background:#ca8a04">médio (sem mutação)</span>
  <span style="background:#1d4ed8">revisar (divergente)</span>
  <span style="background:#15803d">ok</span>
</div>
<table>
  <thead><tr>
    <th>Tabela</th><th style="text-align:center">RLS</th>
    <th style="text-align:center">SELECT</th><th style="text-align:center">INSERT</th>
    <th style="text-align:center">UPDATE</th><th style="text-align:center">DELETE</th>
  </tr></thead>
  <tbody>${tableHtml}</tbody>
</table>
<p class="no-print" style="margin-top:16px;font-size:11px;color:#64748b">
  Use o menu do navegador → Imprimir → Salvar como PDF para gerar um arquivo.
</p>
</body></html>`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
