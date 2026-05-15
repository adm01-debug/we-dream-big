# Progresso Recovery — Status atual

## ✅ Concluído (em PROD, mergeado em main)

### Batch D.1 + D.2 + Fase 2 (PR #143)
- D.1 (P1): 13 tables + 16 RPCs (Storage, Optimization Queue, Collection Items, Kit Collab, Dashboard Widgets)
- D.2 (P2): 17 tables + 16 RPCs (Security & Audit, Webhooks, MCP Keys básico, External Connections, Telemetry)
- Fase 2: 12 secrets migrados de system_settings_legacy → integration_credentials

### Batch D.3 + D.4 (esta PR — recovery/d3-d5-complete)
- D.3 (P3): 21 tables (Magic Up, Expert Chat, Voice Commands, Role Migration, Analytics/UX)
- D.4 (P2 complementar): 21 tables + 75 RPCs (Step-Up MFA completo, Quote/Mockup/Reactions advanced, Security/Auth, MCP advanced, Cart workflow)

## 📊 Estado do banco PROD
- Tables (public): 257 (era 215 antes do D.3+D.4)
- Functions (public): 704 (era 575 antes)
- Triggers: ~230+
- RLS Policies (public): 580+
- Total Lovable parity: ✅ 100% (exceto 2 edges públicas removidas conscientemente)

## 🟦 Pendente (decisão de produto)
- ✅ **Fase B EXECUTADA (Decision 011)** — DROP de `kit_share_tokens` + `quote_approval_tokens` + 3 funções órfãs + refactor de 3 funções + cleanup de 7 arquivos frontend/edges/tests. Aplicado em PROD 2026-05-12. Detalhes em `recovery/patches/D7_fase_b_cleanup/`.
- Validar features no frontend (Magic Up, Expert Chat, Voice Commands) — pode precisar de adaptações em código React

## 🟦 Fase C — Bitrix24 como fonte da verdade (Decision 012)

**Status**: planejada, C.1 começando 12/05/2026

- 🟦 **C.1 EM CURSO** — Configurar BITRIX24_WEBHOOK_URL e validar com 1 quote real
- 🟦 C.2 — Reconciliação diária (cron pull) — depois de C.1
- 🟦 C.3 — Webhook receiver (push) — depois de C.2
- 🟦 C.4 — UI/indicadores no Promo — depois de C.3

Arquitetura escolhida: **Híbrida** (push real-time + reconciliação diária).  
Status: **manter vocabulário atual** (`approved`/`rejected`/etc), Bitrix24 só "carimba" eles.  
Não há cleanup de status histórico (decisão do sponsor 12/05).
