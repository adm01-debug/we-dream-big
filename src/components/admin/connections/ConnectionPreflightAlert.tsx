import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreflightIssue } from "./secretValidators";

interface Props {
  issues: PreflightIssue[];
  className?: string;
}

/**
 * Inline alert shown above "Testar conexão" when one or more required
 * secrets fail format pre-flight checks. Lists each invalid field with its
 * reason and the expected format hint, so the admin knows exactly what to fix
 * before retrying.
 */
export function ConnectionPreflightAlert({ issues, className }: Props) {
  if (issues.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive space-y-1.5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 font-medium">
        <ShieldAlert className="h-3.5 w-3.5" />
        Não é possível testar — corrija {issues.length === 1 ? "este campo" : `estes ${issues.length} campos`}:
      </div>
      <ul className="space-y-1 pl-5 list-disc marker:text-destructive/60">
        {issues.map((iss) => (
          <li key={iss.name} className="break-words">
            <span className="font-medium">{iss.label}:</span>{" "}
            <span className="font-normal">{iss.message}</span>
            {iss.hint && (
              <div className="text-muted-foreground font-normal mt-0.5">
                Formato esperado: {iss.hint}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
