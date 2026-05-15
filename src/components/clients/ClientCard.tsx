/**
 * ClientCard — card de listagem de empresa/cliente CRM.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";

interface ClientCardProps {
  client: CrmCompany;
  onClick?: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const name = getCompanyDisplayName(client);
  const location = [client.cidade, client.estado].filter(Boolean).join(" / ");

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className="hover:border-primary/30 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {client.logo_url ? (
            <img src={client.logo_url} alt={name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Building2 className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            {location && (<><MapPin className="h-3 w-3" />{location}</>)}
            {client.cnpj && <span className="ml-1 font-mono">· {client.cnpj}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 justify-end flex-shrink-0">
          {client.is_customer && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Cliente</Badge>}
          {client.is_supplier && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Fornecedor</Badge>}
          {client.is_carrier && <Badge variant="outline" className="bg-muted text-muted-foreground">Transportadora</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
