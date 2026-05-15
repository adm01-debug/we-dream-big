import { Route } from "react-router-dom";
import { Auth, ResetPassword, SSOCallbackPage, Unauthorized } from "./lazy-pages";

/**
 * Public routes — accessible without authentication.
 *
 * Includes login, password reset, SSO callback handling, and the
 * unauthorized landing page.
 */
export const publicRoutes = (
  <>
    <Route path="/login" element={<Auth />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/auth/callback" element={<SSOCallbackPage />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
  </>
);
