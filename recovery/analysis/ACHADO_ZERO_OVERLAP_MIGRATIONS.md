# 🚨 Achado Bombástico: 0% overlap entre repo e banco

## Os números
- Banco atual: **204 migrations aplicadas** (12/mar/2026 → 10/mai/2026)
- Repo Promo_Gifts: **331 versões distintas** em `supabase/migrations/`
- **Overlap: 0** (zero migrations em comum)

## O que isso significa
- O banco atual nasceu em 12/mar/2026 do ZERO
- Todas as 204 migrations vieram via Dashboard / SQL Editor (workflow paralelo)
- Os 331 arquivos no repo são "artefatos órfãos" — nunca aplicados
- A primeira migration aplicada (`20260312113744`) é POSTERIOR à última do repo Lovable

## Implicação pro Recovery
- Repo Promo_Gifts NÃO é fonte de verdade do banco
- Dependemos 100% do dump do Lovable + nova migration consolidada
- Pós-Recovery: parar de modificar via dashboard, voltar a usar `supabase db push`
