import { ShieldAlert } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  isDevOnlyPath,
  isAdminOnlyPath,
} from "@/lib/navigation/restricted-routes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RestrictedRouteNoticeProps {
  isCollapsed: boolean;
}

/**
 * Aviso contextual exibido no topo do Sidebar quando o usuário tenta
 * acessar (via URL direta, histórico ou link colado) uma rota técnica
 * para a qual não tem permissão.
 *
 * - Vendedor / Agente em rota dev/admin → mostra alerta + ação "Solicitar acesso".
 * - No modo colapsado, vira só o ícone com tooltip explicativo.
 * - Dev nunca vê (tem acesso).
 */
export function RestrictedRouteNotice({
  isCollapsed,
}: RestrictedRouteNoticeProps) {
  const location = useLocation();
  const { isAdmin, isDev, rolesLoaded } = useAuth();
  const path = location.pathname;

  const isDevRoute = isDevOnlyPath(path);
  const isAdminRoute = !isDevRoute && isAdminOnlyPath(path);

  // Dev sempre tem acesso; nada a avisar.
  if (!rolesLoaded || isDev) return null;

  // Rota técnica: precisa de dev. Bloqueia tanto vendedor quanto admin.
  // Rota admin: bloqueia só vendedor.
  const blocked =
    (isDevRoute && !isDev) || (isAdminRoute && !isAdmin && !isDev);
  if (!blocked) return null;

  const requiredRole = isDevRoute ? "dev" : "admin";
  const title = "Rota restrita";
  const description = isDevRoute
    ? "Esta área é exclusiva da equipe técnica (dev). Você não tem permissão para abri-la."
    : "Esta área exige perfil administrativo. Você não tem permissão para abri-la.";

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="status"
              aria-label={`${title}: ${description}`}
              className={cn(
                "mx-auto my-2 flex h-8 w-8 items-center justify-center rounded-md",
                "bg-destructive/10 text-destructive border border-destructive/30"
              )}
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="font-semibold text-xs">{title}</p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">
              {description}
            </p>
            <p className="text-[11px] mt-1">
              Papel exigido:{" "}
              <span className="font-mono font-semibold">{requiredRole}</span>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="sidebar-restricted-notice"
      className="mx-2 my-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert
          className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-destructive leading-tight">
            {title}
          </p>
          <p className="text-destructive/80 mt-0.5 leading-snug">
            {description}
          </p>
          <p className="text-destructive/70 mt-1">
            Papel exigido:{" "}
            <span className="font-mono font-semibold">{requiredRole}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
