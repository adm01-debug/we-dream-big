import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Module-scope CORS headers — atribuído per-request no handler.
let corsHeaders: Record<string, string> = {};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Aceita IPv4, IPv6 e CIDR (validação leve, banco rejeita malformado via type inet)
const IP_REGEX = /^[0-9a-fA-F:.\/]{3,45}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Não autorizado" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) return jsonRes({ error: "Não autorizado" }, 401);

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (callerRole?.role !== "admin") {
      return jsonRes({ error: "Apenas admins podem bloquear IPs" }, 403);
    }

    let body: { ip?: string; reason?: string; hours?: number } = {};
    try { body = await req.json(); } catch { return jsonRes({ error: "Body inválido" }, 400); }

    const ip = (body.ip || "").trim();
    if (!ip || !IP_REGEX.test(ip) || ip.length > 45) {
      return jsonRes({ error: "IP inválido (use IPv4, IPv6 ou CIDR)" }, 400);
    }

    const hours = Math.max(1, Math.min(720, Number(body.hours) || 24));
    const reason = (body.reason || "Bloqueio temporário via Security Center").slice(0, 500);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseAdmin.from("ip_access_control").insert({
      ip_address: ip,
      list_type: "block",
      reason,
      expires_at: expiresAt,
      created_by: caller.id,
    });

    if (insertErr) {
      return jsonRes({ error: insertErr.message }, 500);
    }

    const ua = req.headers.get("user-agent") || null;
    const callerIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      null;

    await supabaseAdmin.from("admin_audit_log").insert({
      user_id: caller.id,
      action: "ip_block_temporary",
      resource_type: "ip_access_control",
      resource_id: ip,
      details: { ip, hours, reason, expires_at: expiresAt },
      ip_address: callerIp,
      user_agent: ua,
    });

    return jsonRes({ success: true, ip, expires_at: expiresAt, hours });
  } catch (err) {
    return jsonRes({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
});
