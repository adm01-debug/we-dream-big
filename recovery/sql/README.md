# 📦 Recovery SQL — arquivos preparados (ainda NÃO aplicados)

## Arquivos prontos

| Arquivo | Propósito | Linhas | Aplicar quando |
|---|---|---|---|
| `01_missing_functions.sql` | 19 functions faltantes (chamadas por triggers das 55 tabelas) | 729 | **FASE A** — antes das tabelas |

## Status
- ✅ Idempotente (CREATE OR REPLACE)
- ✅ Origem: `block04_functions.sql` do dump Lovable
- ❌ Ainda NÃO aplicado em produção
- ⏳ Aguardando: aprovação do sponsor + complemento dos blocos 13-16 do Lovable
