import { getCorsHeaders } from "../_shared/cors.ts";
// github-credentials-test: valida GITHUB_TOKEN/REPO/DEFAULT_BRANCH lendo
// a API do GitHub. Admin-only. Lê credenciais do `integration_credentials`
// com fallback para Deno.env (mesma política do secrets-manager).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface CheckResult {
  ok: boolean;
  /** Resumo curto para exibir no badge/tooltip. */
  message: string;
  /** Detalhe técnico opcional (ex: HTTP 404). */
  detail?: string;
}

interface Report {
  ok: boolean;
  checks: {
    GITHUB_TOKEN: CheckResult;
    GITHUB_REPO: CheckResult;
    GITHUB_DEFAULT_BRANCH: CheckResult;
  };
  user?: { login: string; scopes: string[] } | null;
  repo?: { full_name: string; default_branch: string; private: boolean } | null;
  latency_ms: number;
  tested_at: string;
}

async function loadSecret(
  service: import("../_shared/supabase-client-adapter.ts").CompatibleSupabaseClient,
  name: string,
): Promise<{ value: string | null; source: "db" | "env" | "none" }> {
  const { data } = await service
    .from("integration_credentials")
    .select("secret_value")
    .eq("secret_name", name)
    .maybeSingle();
  const v = (data as { secret_value?: string } | null)?.secret_value;
  if (v && v.length > 0) return { value: v, source: "db" };
  const env = Deno.env.get(name);
  if (env && env.length > 0) return { value: env, source: "env" };
  return { value: null, source: "none" };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  const startedAt = Date.now();
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const service = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await service
      .from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) {
      return new Response(JSON.stringify({ ok: false, error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenSec = await loadSecret(service, "GITHUB_TOKEN");
    const repoSec = await loadSecret(service, "GITHUB_REPO");
    const branchSec = await loadSecret(service, "GITHUB_DEFAULT_BRANCH");

    const report: Report = {
      ok: false,
      checks: {
        GITHUB_TOKEN: { ok: false, message: "Não verificado" },
        GITHUB_REPO: { ok: false, message: "Não verificado" },
        GITHUB_DEFAULT_BRANCH: { ok: false, message: "Não verificado" },
      },
      user: null,
      repo: null,
      latency_ms: 0,
      tested_at: new Date().toISOString(),
    };

    // 1) GITHUB_TOKEN — GET /user
    if (!tokenSec.value) {
      report.checks.GITHUB_TOKEN = {
        ok: false,
        message: "Token ausente — configure GITHUB_TOKEN.",
      };
    } else {
      try {
        const resp = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${tokenSec.value}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "promo-gifts-mcp",
          },
        });
        const scopesHeader = resp.headers.get("x-oauth-scopes") ?? "";
        const scopes = scopesHeader.split(",").map((s) => s.trim()).filter(Boolean);
        if (resp.ok) {
          const body = (await resp.json()) as { login: string };
          report.user = { login: body.login, scopes };
          report.checks.GITHUB_TOKEN = {
            ok: true,
            message: `Autenticado como ${body.login} (${tokenSec.source.toUpperCase()})`,
            detail: scopes.length ? `Escopos: ${scopes.join(", ")}` : "Fine-grained PAT (sem header de escopos)",
          };
        } else if (resp.status === 401) {
          report.checks.GITHUB_TOKEN = {
            ok: false,
            message: "Token inválido ou expirado (401).",
            detail: await resp.text().catch(() => ""),
          };
        } else {
          report.checks.GITHUB_TOKEN = {
            ok: false,
            message: `Falha ao validar token (HTTP ${resp.status}).`,
            detail: await resp.text().catch(() => ""),
          };
        }
      } catch (err) {
        report.checks.GITHUB_TOKEN = {
          ok: false,
          message: "Erro de rede ao chamar api.github.com.",
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // 2) GITHUB_REPO — GET /repos/{owner}/{repo}
    if (!repoSec.value) {
      report.checks.GITHUB_REPO = {
        ok: false,
        message: "Repositório ausente — configure GITHUB_REPO (owner/repo).",
      };
    } else if (!/^[\w.-]+\/[\w.-]+$/.test(repoSec.value.trim())) {
      report.checks.GITHUB_REPO = {
        ok: false,
        message: `Formato inválido: "${repoSec.value}". Use owner/repo.`,
      };
    } else if (!report.checks.GITHUB_TOKEN.ok) {
      report.checks.GITHUB_REPO = {
        ok: false,
        message: "Não verificável — corrija o token primeiro.",
      };
    } else {
      try {
        const resp = await fetch(`https://api.github.com/repos/${repoSec.value.trim()}`, {
          headers: {
            Authorization: `Bearer ${tokenSec.value}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "promo-gifts-mcp",
          },
        });
        if (resp.ok) {
          const body = (await resp.json()) as {
            full_name: string; default_branch: string; private: boolean;
          };
          report.repo = {
            full_name: body.full_name,
            default_branch: body.default_branch,
            private: body.private,
          };
          report.checks.GITHUB_REPO = {
            ok: true,
            message: `Acesso OK a ${body.full_name} (${body.private ? "privado" : "público"})`,
            detail: `Default branch do repo: ${body.default_branch}`,
          };
        } else if (resp.status === 404) {
          report.checks.GITHUB_REPO = {
            ok: false,
            message: `Repositório não encontrado ou sem permissão: ${repoSec.value}.`,
            detail: "Verifique o nome e se o token tem acesso (Contents:read).",
          };
        } else if (resp.status === 403) {
          report.checks.GITHUB_REPO = {
            ok: false,
            message: "Permissão negada (403) — token sem acesso ao repositório.",
            detail: await resp.text().catch(() => ""),
          };
        } else {
          report.checks.GITHUB_REPO = {
            ok: false,
            message: `Falha ao validar repo (HTTP ${resp.status}).`,
            detail: await resp.text().catch(() => ""),
          };
        }
      } catch (err) {
        report.checks.GITHUB_REPO = {
          ok: false,
          message: "Erro de rede ao consultar o repositório.",
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // 3) GITHUB_DEFAULT_BRANCH — GET /repos/{owner}/{repo}/branches/{branch}
    if (!branchSec.value) {
      report.checks.GITHUB_DEFAULT_BRANCH = {
        ok: false,
        message: "Branch ausente — configure GITHUB_DEFAULT_BRANCH.",
      };
    } else if (!report.checks.GITHUB_REPO.ok || !repoSec.value) {
      report.checks.GITHUB_DEFAULT_BRANCH = {
        ok: false,
        message: "Não verificável — corrija o repositório primeiro.",
      };
    } else {
      const branch = branchSec.value.trim();
      try {
        const resp = await fetch(
          `https://api.github.com/repos/${repoSec.value.trim()}/branches/${encodeURIComponent(branch)}`,
          {
            headers: {
              Authorization: `Bearer ${tokenSec.value}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "promo-gifts-mcp",
            },
          },
        );
        if (resp.ok) {
          report.checks.GITHUB_DEFAULT_BRANCH = {
            ok: true,
            message: `Branch "${branch}" existe e é acessível.`,
            detail: branch === "main" || branch === "master"
              ? "⚠️ Recomendado: usar mcp-edits/* para evitar commits diretos em produção."
              : "OK — escritas do MCP irão para este branch.",
          };
        } else if (resp.status === 404) {
          report.checks.GITHUB_DEFAULT_BRANCH = {
            ok: false,
            message: `Branch "${branch}" não existe no repo.`,
            detail: "Crie o branch no GitHub ou ajuste GITHUB_DEFAULT_BRANCH.",
          };
        } else {
          report.checks.GITHUB_DEFAULT_BRANCH = {
            ok: false,
            message: `Falha ao validar branch (HTTP ${resp.status}).`,
            detail: await resp.text().catch(() => ""),
          };
        }
      } catch (err) {
        report.checks.GITHUB_DEFAULT_BRANCH = {
          ok: false,
          message: "Erro de rede ao consultar branches.",
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    }

    report.ok =
      report.checks.GITHUB_TOKEN.ok &&
      report.checks.GITHUB_REPO.ok &&
      report.checks.GITHUB_DEFAULT_BRANCH.ok;
    report.latency_ms = Date.now() - startedAt;

    // Audit log
    await service.from("admin_audit_log").insert({
      user_id: u.user.id,
      action: "github_credentials_tested",
      resource_type: "secret",
      resource_id: "GITHUB_*",
      details: {
        ok: report.ok,
        token: report.checks.GITHUB_TOKEN.ok,
        repo: report.checks.GITHUB_REPO.ok,
        branch: report.checks.GITHUB_DEFAULT_BRANCH.ok,
        latency_ms: report.latency_ms,
      },
    });

    return new Response(JSON.stringify({ ok: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
