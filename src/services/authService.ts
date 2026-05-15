import { supabase } from "@/integrations/supabase/client";
import { AppRole, Profile } from "@/contexts/AuthContext";
import { authDebug, authDebugError } from "@/lib/auth/auth-debug";
import { logger } from "@/lib/logger";

export const authService = {
  async fetchAAL() {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    return {
      currentAAL: (aalData?.currentLevel ?? null) as 'aal1' | 'aal2' | null,
      nextAAL: (aalData?.nextLevel ?? null) as 'aal1' | 'aal2' | null,
      hasMFA: !!factorsData?.totp?.some((f) => f.status === 'verified')
    };
  },

  async queryRoles(userId: string) {
    return supabase.from("user_roles").select("role").eq("user_id", userId);
  },

  async fetchProfile(userId: string) {
    return supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
  },

  async updateLastLogin(userId: string) {
    return supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
};
