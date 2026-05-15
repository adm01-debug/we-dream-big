---
name: Simulation price source badge
description: Aviso visual persistente da origem do cálculo no simulador (RPC oficial vs fallback heurístico) com data/hora
type: feature
---

`SimulationOption` carrega `priceSource` ('rpc' | 'legacy-fallback' | 'unavailable'),
`calculatedAt` (ISO) e `rpcAvailable`. Componente
`src/components/simulation/SimulationPriceSourceBadge.tsx` renderiza:
- pílula esmeralda "Cálculo oficial · atualizado às HH:mm" para `rpc`;
- bloco âmbar "Estimativa — cálculo oficial indisponível" + data/hora + motivo +
  CTA "Confirme o valor antes de fechar o orçamento" para `legacy-fallback`.

Toast de fallback em `useSimulation` dispara só 1x por sessão
(`fallbackToastShownRef`) — o badge no card é a fonte de verdade visual.
Reusa o vocabulário visual do `PriceFreshnessBadge variant="pdp"`.
