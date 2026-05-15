/**
 * GenderBadge — Badge compacto de gênero do produto
 */
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GENDER_CONFIG: Record<string, { label: string; className: string }> = {
  masculino: { label: "Masc.", className: "bg-info/10 text-info border-info/20" },
  feminino: { label: "Fem.", className: "bg-primary/10 text-primary border-primary/20" },
  infantil: { label: "Infantil", className: "bg-warning/10 text-warning border-warning/20" },
  unissex: { label: "Unissex", className: "bg-primary/10 text-primary border-primary/20" },
};

interface GenderBadgeProps {
  gender?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function GenderBadge({ gender, size = "sm", className }: GenderBadgeProps) {
  if (!gender) return null;
  const key = gender.toLowerCase().trim();
  const config = GENDER_CONFIG[key];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1",
        config.className,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      <Users className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {config.label}
    </Badge>
  );
}
