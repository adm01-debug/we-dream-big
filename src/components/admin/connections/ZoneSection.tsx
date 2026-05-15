/**
 * ZoneSection — Onda 14
 *
 * Wrapper semântico para agrupar conteúdo em "zonas" claras dentro de uma
 * página densa (ex: /admin/conexoes). Garante:
 *   - <section> com aria-labelledby para acessibilidade
 *   - Header consistente com ícone + título h2 + descrição (tom híbrido)
 *   - Âncora navegável (id) para deep-linking
 *   - Espaçamento interno padronizado (space-y-4)
 *   - Suporte opcional a actions à direita do header
 */
import { type LucideIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ZoneSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Tom semântico do header — afeta apenas o ícone + barra lateral */
  tone?: "primary" | "info" | "neutral";
  actions?: React.ReactNode;
  /** Quando true, aplica anel + glow temporário (ex: deep-link de incidente) */
  highlight?: boolean;
  /** Estado colapsado (oculta conteúdo, mantém header). */
  collapsed?: boolean;
  /** Handler para alternar colapso. Se ausente, botão de toggle é omitido. */
  onToggleCollapse?: () => void;
  children: React.ReactNode;
  className?: string;
}

const TONE_CLS = {
  primary: { iconBg: "bg-primary/10", iconColor: "text-primary", bar: "bg-primary/40" },
  info: { iconBg: "bg-sky-500/10", iconColor: "text-sky-600 dark:text-sky-400", bar: "bg-sky-500/40" },
  neutral: { iconBg: "bg-muted", iconColor: "text-muted-foreground", bar: "bg-border" },
} as const;

export function ZoneSection({
  id,
  icon: Icon,
  title,
  description,
  tone = "primary",
  actions,
  highlight = false,
  collapsed = false,
  onToggleCollapse,
  children,
  className,
}: ZoneSectionProps) {
  const headingId = `${id}-heading`;
  const contentId = `${id}-content`;
  const tcls = TONE_CLS[tone];

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-24 space-y-4 rounded-xl transition-shadow duration-500 -mx-2 px-2 py-1",
        highlight && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span
          className={cn("h-8 w-1 rounded-full shrink-0 mt-1", tcls.bar)}
          aria-hidden="true"
        />
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            tcls.iconBg,
          )}
          aria-hidden="true"
        >
          <Icon className={cn("h-4 w-4", tcls.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id={headingId}
            className="text-base font-semibold leading-tight tracking-tight"
          >
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {description}
            </p>
          )}
        </div>
        {(actions || onToggleCollapse) && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            {onToggleCollapse && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={onToggleCollapse}
                    aria-expanded={!collapsed}
                    aria-controls={contentId}
                    aria-label={collapsed ? `Expandir ${title}` : `Colapsar ${title}`}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        collapsed && "-rotate-90",
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {collapsed ? "Expandir zona" : "Colapsar zona"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </header>
      <div
        id={contentId}
        hidden={collapsed}
        className="space-y-4"
      >
        {children}
      </div>
    </section>
  );
}
