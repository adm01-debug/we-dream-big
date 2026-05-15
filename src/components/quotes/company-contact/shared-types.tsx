/**
 * Shared types and small components for CompanyContactSelector
 */
import { cn } from "@/lib/utils";

export interface CompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  ramo_atividade: string | null;
  cnpj: string | null;
  logo_url: string | null;
}

export interface ContactOption {
  id: string;
  name: string;
  cargo: string | null;
  email: string | null;
  phone: string | null;
}

export function CompanyAvatar({ name, logoUrl, size = "md" }: { name: string; logoUrl?: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs";
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={cn(dim, "rounded-full object-cover bg-background border border-border flex-shrink-0")} loading="lazy" />;
  }
  return (
    <div className={cn(dim, "rounded-full flex items-center justify-center font-bold text-primary-foreground bg-primary flex-shrink-0")}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}
