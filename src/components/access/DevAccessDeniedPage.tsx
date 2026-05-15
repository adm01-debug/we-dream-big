import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { recordDevRouteTelemetry } from "@/lib/access/dev-route-telemetry";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  ShieldAlert,
  Send,
  Copy,
  Check,
  ArrowLeft,
  LifeBuoy,
  Users,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  requestDevAccess,
  getThrottleStatus,
  DEV_ACCESS_CONTACT_EMAIL,
} from "@/lib/access/request-dev-access";
import { ACCESS_DENIED_STRINGS, type Role } from "@/lib/access/access-denied-strings";
import { generateSecurityId } from "@/lib/access/security-utils";

export type DevAccessUserRole =
  | "supervisor"
  | "agente"
  | "agent"
  | "vendedor"
  | string
  | null
  | undefined;

interface DevAccessDeniedPageProps {
  user: { id: string; email?: string | null };
  /** Papel atual do usuário, usado para personalizar copy/CTAs. */
  role: DevAccessUserRole;
  /** Caminho bloqueado (apenas pathname, ex: "/admin/telemetria"). */
  blockedPath: string;
  /** Caminho completo (path + search + hash) para "Tentar novamente". */
  blockedFullPath: string;
  /** State original da location para preservar em "Tentar novamente". */
  blockedState?: unknown;
}

function getRoleCopy(role: DevAccessUserRole, _blockedPath: string) {
  // Normaliza apelidos comuns
  const normalized =
    role === "agent" || role === "vendedor" ? "agente" : role ?? "desconhecido";
  
  const key = (normalized in ACCESS_DENIED_STRINGS ? normalized : "desconhecido") as Role;
  const config = ACCESS_DENIED_STRINGS[key];

  return {
    ...config,
    contextualCtaIcon: key === "supervisor" ? <Users className="h-4 w-4 mr-2" /> : 
                       key === "agente" ? <ShoppingCart className="h-4 w-4 mr-2" /> : 
                       <ArrowLeft className="h-4 w-4 mr-2" />
  };
}

/**
 * Página dedicada de "Acesso restrito ao Dev".
 *
 * Diferenciação por papel:
 * - **Supervisor**: copy técnica + CTA primário "Solicitar acesso a Dev" +
 *   atalhos para áreas administrativas (Usuários, Empresas, Configurações).
 * - **Agente/Vendedor**: copy curta orientando voltar ao Catálogo; CTA de
 *   solicitação fica secundário e recomenda falar com o supervisor antes.
 * - **Outros**: fallback genérico.
 *
 * Mantém todas as garantias do DevRoute original: throttle, mailto fallback,
 * link copiável, "Tentar novamente" preservando location state, semântica 403.
 */
export function DevAccessDeniedPage({
  user,
  role,
  blockedPath,
  blockedFullPath,
  _blockedState,
}: DevAccessDeniedPageProps & { _blockedState?: unknown }) {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const securityId = useMemo(() => generateSecurityId('REQ', blockedPath), [blockedPath]);

  const copy = getRoleCopy(role, blockedPath);
  const isAgente =
    role === "agente" || role === "agent" || role === "vendedor";
  const isSupervisor = role === "supervisor";

  // ---- Telemetria de UX (sem PII) -----------------------------------------
  // Marca o instante em que a tela apareceu para calcular o tempo até a ação
  // final (back/retry/fallback/request_access/abandon).
  const viewedAtRef = useRef<number>(Date.now());
  const finalizedRef = useRef<boolean>(false);
  const sinceView = () => Date.now() - viewedAtRef.current;
  const emit = (event: Parameters<typeof recordDevRouteTelemetry>[0]["event"]) =>
    void recordDevRouteTelemetry({
      event,
      blockedPath,
      userRole: typeof role === "string" ? role : null,
      durationMs: sinceView(),
    });
  const finalize = useCallback((
    event: Parameters<typeof recordDevRouteTelemetry>[0]["event"],
  ) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    emit(event);
  }, [blockedPath, role, sinceView]);

  // 1) Registra "view" uma única vez ao montar (sem duration).
  useEffect(() => {
    viewedAtRef.current = Date.now();
    void recordDevRouteTelemetry({
      event: "view",
      blockedPath,
      userRole: typeof role === "string" ? role : null,
      durationMs: null,
    });
  }, [blockedPath, role]);

  // 2) "abandon" via beacon ao desmontar/fechar a aba sem decisão registrada.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && !finalizedRef.current) {
        // Best-effort: a request pode não terminar — coalescing server-side cobre.
        finalize("abandon");
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (!finalizedRef.current) finalize("abandon");
    };
  }, [finalize]);

  // -------------------------------------------------------------------------

  const handleRequestAccess = async () => {
    const throttle = getThrottleStatus(user.id);
    if (throttle.throttled) {
      toast.warning("Aguarde um instante", {
        id: "dev-access-throttle",
        description: `Tente novamente em ${throttle.retryInSeconds}s.`,
      });
      return;
    }
    setSubmitting(true);
    const result = await requestDevAccess({
      userId: user.id,
      userEmail: user.email,
      blockedPath,
      reason,
    });
    setSubmitting(false);

    if (result.throttled) {
      toast.warning("Aguarde um instante", {
        id: "dev-access-throttle",
        description: `Tente novamente em ${result.retryInSeconds ?? 60}s.`,
      });
      return;
    }
    if (!result.ok) {
      toast.error("Falha ao enviar solicitação", {
        id: "dev-access-error",
        description: result.error ?? "Tente novamente em instantes.",
      });
      return;
    }
    toast.success("Solicitação enviada", {
      id: "dev-access-sent",
      description: `Time técnico avisado (${DEV_ACCESS_CONTACT_EMAIL}).`,
    });
    finalize("request_access");
    if (result.mailtoUrl) {
      window.location.href = result.mailtoUrl;
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${blockedPath}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado", {
        id: "dev-access-link-copied",
        description: "Envie ao time técnico.",
      });
      emit("copy_link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar link", { id: "dev-access-link-error" });
    }
  };

  const requestButton = (
    <Button
      onClick={handleRequestAccess}
      disabled={submitting}
      variant={isAgente ? "outline" : "default"}
      className="w-full"
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Send className="h-4 w-4 mr-2" />
      )}
      {isAgente ? "Solicitar via Suporte" : "Solicitar acesso a Dev"}
    </Button>
  );

  return (
    <>
      <Helmet>
        <title>403 — Acesso restrito ao Dev</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="x-http-status" content="403" />
      </Helmet>
      <div
        role="alert"
        data-testid="app-access-denied"
        data-http-status="403"
        data-user-role={role}
        className="min-h-screen flex items-center justify-center bg-background px-4 py-8"
      >
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-destructive/10 rounded-full blur-xl" />
            <ShieldAlert className="h-16 w-16 text-destructive relative z-10" />
          </div>

          <div className="space-y-4 w-full">
            <div className="space-y-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {copy.badge} · 403
              </span>
              <h1
                id="dev-access-denied-title"
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                {copy.title}
              </h1>
            </div>

            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground px-2">
                {copy.intro}
              </p>
              
              {isSupervisor && (
                <div className="mx-auto max-w-sm p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-left">
                  <p className="font-medium text-foreground mb-1">Nota de Permissão:</p>
                  <p className="text-muted-foreground leading-normal">
                    Seus privilégios administrativos estão configurados para gestão de negócio e usuários. 
                    O acesso a ferramentas de infraestrutura e telemetria é restrito.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/10">
              <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest">
                Identificador de Segurança
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-1 bg-muted/30 py-1 px-2 rounded inline-block">
                {securityId}
              </p>
            </div>
          </div>

          {/* Para supervisor: atalhos visuais para áreas administrativas. */}
          {isSupervisor && (
            <div className="w-full pt-2 border-t border-border/40">
              <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-3">
                Atalhos Administrativos
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/usuarios")}
                  className="text-xs h-8"
                >
                  Usuários
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/cadastros")}
                  className="text-xs h-8"
                >
                  Cadastros
                </Button>
              </div>
            </div>
          )}

          <div className="w-full text-left rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-[10px] leading-relaxed text-muted-foreground">{copy.hint}</p>
          </div>

          {/* Bloco de motivo + CTA de solicitação (todos os papéis podem
              pedir, mas o tom muda — ver requestButton). */}
          <div className="w-full text-left space-y-2">
            <label
              htmlFor="dev-access-reason"
              className="text-xs font-medium text-foreground"
            >
              Motivo (opcional)
            </label>
            <Textarea
              id="dev-access-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={
                isAgente
                  ? "Ex.: precisei conferir um log que o supervisor pediu."
                  : "Ex.: investigar lentidão no catálogo após a release de hoje."
              }
              rows={3}
              className="resize-none"
              disabled={submitting}
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {reason.length}/500
            </div>
          </div>

          <div className="flex flex-col w-full gap-2 pt-2">
            {requestButton}

            {/* Tentar novamente — útil quando o papel acabou de ser elevado e
                o usuário quer revalidar a rota sem digitar URL de novo. */}
            <Button
              variant="secondary"
              onClick={() => {
                finalize("retry");
                navigate(blockedFullPath, { replace: true });
              }}
              className="h-9 gap-2"
            >
              Tentar novamente
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  finalize("back");
                  // Agente/vendedor → catálogo (área principal de trabalho).
                  // Outros papéis → histórico (mantém UX existente).
                  if (isAgente) {
                    navigate("/catalogo");
                  } else {
                    navigate(-1);
                  }
                }}
                className="h-9 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="h-9 gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Link
              </Button>
            </div>

            <Button
              variant="link-secondary"
              size="sm"
              asChild
              className="text-[10px] h-auto py-1"
              onClick={() => emit("mail")}
            >
              <a
                href={`mailto:${DEV_ACCESS_CONTACT_EMAIL}?subject=${encodeURIComponent(
                  `[Promo Gifts] Acesso técnico — ${securityId}`,
                )}&body=${encodeURIComponent(
                  `Olá, equipe técnica.\n\nGostaria de solicitar acesso técnico.\n\nIdentificador: ${securityId}\n\nMotivo: ${reason || "(não informado)"}\n\nObrigado.`,
                )}`}
              >
                <LifeBuoy className="h-3 w-3 mr-1.5" />
                Solicitar via Suporte
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
