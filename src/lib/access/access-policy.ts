import { type AppRole } from '@/contexts/AuthContext';

export interface AccessPolicy {
  requiredRole?: AppRole;
  requireMfa?: boolean;
  requireDev?: boolean;
}

export const checkAccess = (
  userRoles: AppRole[] | null | undefined,
  currentAAL: string | null,
  policy: AccessPolicy,
): { allowed: boolean; reason?: 'unauthenticated' | 'insufficient_role' | 'mfa_required' } => {
  const { requiredRole, requireMfa, requireDev } = policy;
  // Defensivo contra mocks parciais e estados intermediários do AuthContext
  // (carregando, falha de fetch). Em runtime real AuthContext sempre retorna
  // [], mas null/undefined pode aparecer em testes ou em frames iniciais.
  const safeRoles: AppRole[] = Array.isArray(userRoles) ? userRoles : [];

  if (requireDev && !safeRoles.includes('dev')) {
    return { allowed: false, reason: 'insufficient_role' };
  }

  if (requiredRole) {
    const isSupervisorOrAbove = safeRoles.some((r) =>
      ['dev', 'supervisor', 'admin', 'manager'].includes(r),
    );
    if (requiredRole === 'supervisor' && !isSupervisorOrAbove) {
      return { allowed: false, reason: 'insufficient_role' };
    }
    if (requiredRole === 'dev' && !safeRoles.includes('dev')) {
      return { allowed: false, reason: 'insufficient_role' };
    }
  }

  if (requireMfa && currentAAL !== 'aal2') {
    return { allowed: false, reason: 'mfa_required' };
  }

  return { allowed: true };
};
