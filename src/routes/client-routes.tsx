import { Navigate, Route } from 'react-router-dom';
import { DeprecatedRoute } from '@/components/layout/DeprecatedRoute';
import {
  AdminTemasPage,
  ClientDetailPage,
  ClientsPage,
  CustomizableDashboard,
  Index,
  NotFound,
} from './lazy-pages';

/**
 * Home, Clients (CRM), Skins/Temas, legacy redirects.
 *
 * Mounted under ProtectedRoute. O catch-all `*` (404) foi movido para
 * `publicRoutes` — ver public-routes.tsx — para que rotas inexistentes
 * mostrem a página 404 ao invés de forçar redirect para /login.
 */
export const homeAndClientRoutes = (
  <>
    {/* Home */}
    <Route path="/" element={<Index />} />
    <Route path="/dashboard" element={<CustomizableDashboard />} />

    {/* Skins / Temas — disponível para todos os usuários autenticados (preferência local). */}
    <Route path="/admin/temas" element={<AdminTemasPage />} />

    {/* Redirects */}
    <Route path="/configuracoes" element={<Navigate to="/admin/usuarios" replace />} />
    <Route path="/admin/personalizacao" element={<Navigate to="/admin/cadastros" replace />} />
    <Route path="/cadastro-produtos" element={<Navigate to="/admin/cadastros" replace />} />
    <Route path="/cadastro-gravacao" element={<Navigate to="/admin/cadastros" replace />} />
    <Route
      path="/comissoes"
      element={
        <DeprecatedRoute
          message="O módulo de Comissões foi descontinuado nesta plataforma."
          redirectTo="/"
        />
      }
    />

    {/* Clients (CRM) */}
    <Route path="/clientes" element={<ClientsPage />} />
    <Route path="/clientes/:id" element={<ClientDetailPage />} />

    {/* Redirects legados */}
    <Route path="/perfil" element={<Navigate to="/admin/usuarios" replace />} />
  </>
);

/**
 * 404 catch-all PÚBLICO — fora do ProtectedRoute.
 *
 * Antes ficava aninhado em ProtectedRoute, o que fazia rotas inexistentes
 * acessadas sem sessão redirecionarem para /login (smoke test 92 falhava
 * por isso — issue #167). Mantido isolado para que React Router resolva
 * `path="*"` independentemente do estado de autenticação.
 *
 * Deve ser montado LAST em AppRoutes para preservar a precedência.
 */
export const notFoundRoute = <Route path="*" element={<NotFound />} />;
