import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldAlert, LogIn, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { generateSecurityId } from "@/lib/access/security-utils";

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Ofusca o path original para segurança usando hash não reversível
  const requestId = useMemo(() => generateSecurityId('AUTH', location.pathname), [location.pathname]);

  const handleLogin = () => {
    navigate("/login", { state: { from: location }, replace: true });
  };

  return (
    <>
      <Helmet>
        <title>401 — Autenticação Necessária</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div 
        role="alert"
        data-testid="app-unauthorized"
        className="min-h-screen flex items-center justify-center bg-background px-4 py-8"
      >
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-primary/10 rounded-full blur-xl" />
            <ShieldAlert className="h-16 w-16 text-primary relative z-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Não Autenticado · 401
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Acesso Restrito
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Para visualizar este conteúdo, você precisa estar autenticado no sistema. 
              Sua sessão pode ter expirado ou o link acessado é protegido.
            </p>
          </div>

          <div className="w-full pt-4 border-t border-border/40 space-y-2">
            <Button onClick={handleLogin} className="w-full gap-2 h-9">
              <LogIn className="h-4 w-4" />
              Ir para o Login
            </Button>
            
            <Button variant="ghost" onClick={() => navigate(-1)} className="w-full gap-2 h-9">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>

          <div className="pt-2">
            <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
              Identificador de Segurança
            </p>
            <p className="text-[10px] font-mono text-muted-foreground/60 mt-1 bg-muted/20 py-1 px-2 rounded inline-block">
              {requestId}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
