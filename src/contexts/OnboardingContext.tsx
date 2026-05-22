import React, { createContext, useContext } from 'react';
import { useOnboarding as useOnboardingHook } from '@/hooks/ui';

type OnboardingContextType = ReturnType<typeof useOnboardingHook>;

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const onboarding = useOnboardingHook();
  return <OnboardingContext.Provider value={onboarding}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingContext(): OnboardingContextType {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return ctx;
}

/**
 * Variante segura para componentes que podem renderizar antes do
 * <OnboardingProvider /> (ex.: Sidebar, Spotlight, atalhos globais).
 * Retorna `null` em vez de lançar — assim os callers param de embrulhar
 * o hook em try/catch (anti-pattern que viola react-hooks/rules-of-hooks).
 */
export function useOptionalOnboardingContext(): OnboardingContextType | null {
  return useContext(OnboardingContext);
}
