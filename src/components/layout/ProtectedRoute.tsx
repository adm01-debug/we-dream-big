import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import { EnhancedErrorBoundary } from '@/components/errors/EnhancedErrorBoundary';
import { EmptyState } from '@/components/common/EmptyState';
import { checkAccess, type AccessPolicy } from '@/lib/access/access-policy';
import { savePostLoginRedirect } from '@/lib/auth/post-login-redirect';

interface ProtectedRouteProps extends AccessPolicy {
  children?: ReactNode;
  /** @deprecated Use requiredRole="supervisor" */
  requireAdmin?: boolean;
}

function ProtectedRouteErrorFallback() {
  const location = useLocation();

  return (
    <EmptyState
      variant="error"
      title="Falha no Carregamento"
      description="Ocorreu um erro ao carregar este módulo. Tente recarregar a página ou voltar ao início."
      action={{ 
        label: 'Recarregar Página', 
        onClick: () => window.location.reload() 
      }}
      secondaryAction={{
        label: 'Ir para o Início',
        onClick: () => window.location.href = '/'
      }}
    />
  );
}

export function ProtectedRoute({
  children,
  requiredRole,
  requireMfa,
  requireDev,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, session, roles, currentAAL, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !session) {
    // Salva destino pós-login (sobrevive ao round-trip OAuth)
    savePostLoginRedirect(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const effectiveRole =
    requiredRole || (requireDev ? 'dev' : requireAdmin ? 'supervisor' : undefined);
  const { allowed, reason } = checkAccess(roles, currentAAL, {
    requiredRole: effectiveRole,
    requireMfa,
    requireDev,
  });

  if (!allowed) {
    const log = createClientLogger('security.access');
    log.warn('access_denied', { 
      reason, 
      path: location.pathname, 
      user_id: user.id,
      roles: roles.join(',') 
    });

    if (reason === 'mfa_required') {
      // O AdminRoute/DevRoute tratam o diálogo de MFA, aqui apenas bloqueamos se for o caso
    }

    return (
      <EmptyState
        variant="security"
        title="Acesso Restrito"
        description={
          reason === 'insufficient_role'
            ? 'Você não tem permissão para acessar esta área.'
            : 'Autenticação adicional necessária.'
        }
        action={{ label: 'Voltar ao início', onClick: () => (window.location.href = '/') }}
      />
    );
  }

  return (
    <EnhancedErrorBoundary
      fallback={<ProtectedRouteErrorRedirect />}
    >
      {children ? <>{children}</> : <Outlet />}
    </EnhancedErrorBoundary>
  );
}
