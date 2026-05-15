# ⛔ OBSOLETO — PLANO v3.0 substituído por v4.0

> **⚠️ Este plano foi MARCADO COMO OBSOLETO em 2026-05-11.**
>
> **Motivo:** auditoria descobriu que o banco DESTINO é PROD ativo com evolução
> massiva pós-Lovable, **não** um banco vazio aguardando restore.
> Aplicar este plano (Recovery from scratch) sobrescreveria dados de produção.
>
> **Use o plano novo:** [`PLANO_AUDIT_PATCH_V4.md`](./PLANO_AUDIT_PATCH_V4.md)
>
> **Relevação desta descoberta:** ver [`RELATORIO_GAPS.md`](./RELATORIO_GAPS.md)

---

## Por que este plano não se aplica mais

O PLANO v3.0 assumia o banco destino vazio ou mínimo. A realidade:

| Item | Esperado (v3.0) | Real (auditado) |
|---|---|---|
| Tabelas | 0 (vazio) | **195** (em uso!) |
| Functions | 0 (vazio) | **545** (evolução massiva) |
| Policies | 0 (vazio) | **458** (em uso) |
| Auth users | 0 | **4** (admins) |
| Dados em tabelas | 0 | **~250+ MB** |

Aplicar `block01_tables_indexes_rls.sql`, `block03_policies.sql` e `block04_functions.sql`
do dump (como o v3.0 propunha) iria:
- Tentar criar 136 tabelas que já existem (CONFLICT)
- Substituir 163 functions por versões mais antigas (REGRESSÃO)
- Aplicar 317 policies sobre estrutura diferente (FALHA SEMÂNTICA)
- Risco real de **corromper o banco de produção**

## Conteúdo abaixo preservado por histórico

O conteúdo original do plano v3.0 fica abaixo somente como **referência histórica**. **NÃO EXECUTAR.**

---

# 🛡️ Recovery — Plano Mestre em 25 Fases (v3.0) [OBSOLETO]

> **Versão:** 3.0 (2026-05-11)
> **Status:** Fase 0 ✅ · Fase 1 🔄 60% · Demais 🟦 pendentes
> **Sponsor:** Joaquim (adm01@promobrindes.com.br)
> **Branch:** `recovery/lovable-introspection`

*… (resto do conteúdo preservado em histórico, não reproduzido aqui pra evitar confusão) …*

Ver [git log do arquivo](https://github.com/adm01-debug/Promo_Gifts/commits/recovery/lovable-introspection/recovery/agent-db/PLANO_20_FASES.md) para conteúdo completo nas versões anteriores.
