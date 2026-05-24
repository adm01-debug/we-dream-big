/**
 * Banner visual exibido no topo da aplicação quando um kill-switch está ATIVO
 * (= edge function descontinuada). Usa o hook useKillSwitchBanner para detecção.
 *
 * Visualmente alinhado com BridgeStatusBanner e CloudStatusBanner para
 * consistência. Sticky no topo, dismissível por sessão (sessionStorage).
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useKillSwitchBanner } from '@/hooks/useKillSwitchBanner';

const DISMISS_KEY_PREFIX = 'kill_switch_banner_dismissed:';

export function KillSwitchBanner() {
  const banner = useKillSwitchBanner();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!banner) {
      setDismissed(false);
      return;
    }
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      const key = DISMISS_KEY_PREFIX + banner.switchName;
      setDismissed(window.sessionStorage.getItem(key) === '1');
    } catch {
      // ignore
    }
  }, [banner]);

  if (!banner || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(DISMISS_KEY_PREFIX + banner.switchName, '1');
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="sticky top-0 z-50 w-full border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 text-sm">
          <strong className="font-semibold">Serviço em manutenção: </strong>
          {banner.message}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar aviso"
          className="flex-shrink-0 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
