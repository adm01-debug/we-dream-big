# 🔐 Fase 2 — Migração de Secrets Críticos
**Data:** 11/MAY/2026
**Contexto:** Follow-up da Decision 007 (system_settings_legacy)
**Status:** ✅ COMPLETO — 12/12 secrets migrados

## Problema descoberto

Durante mapeamento de uso de `system_settings_legacy` (Decision 007), foi descoberto que
**12 secrets críticos** estavam armazenados em local incorreto:

- Tabela `system_settings` (depois renomeada para `_legacy`) tinha 1 policy `ALL` genérica
- Valores incluíam tokens reais (CLOUDFLARE_API_TOKEN) sem cripto
- Schema histórico (jan/2026) misturava configs operacionais e secrets

A tabela CORRETA para secrets é `public.integration_credentials`, que tem:
- RLS habilitado ✅
- 4 policies granulares (SELECT/INSERT/UPDATE/DELETE separadas) ✅
- Apenas `is_admin_or_above` pode acessar ✅
- Trigger `tg_integration_credentials_derive_biu` auto-deriva provider, length, masked_suffix ✅

## Secrets migrados (12 total)

### Cloudflare (10)
| secret_name | credential_type | length |
|---|---|---:|
| CLOUDFLARE_ACCOUNT_HASH | account_id | 22 |
| CLOUDFLARE_ACCOUNT_ID | account_id | 32 |
| CLOUDFLARE_API_TOKEN | api_key | 40 |
| CLOUDFLARE_IMAGES_URL | config_url | 48 |
| CLOUDFLARE_STREAM_SUBDOMAIN | config_url | 46 |
| CLOUDFLARE_VARIANT_LARGE | config_url | 5 |
| CLOUDFLARE_VARIANT_MEDIUM | config_url | 6 |
| CLOUDFLARE_VARIANT_PUBLIC | config_url | 6 |
| CLOUDFLARE_VARIANT_SMALL | config_url | 5 |
| CLOUDFLARE_VARIANT_THUMBNAIL | config_url | 9 |

### XBZ Supplier (2)
| secret_name | credential_type | length |
|---|---|---:|
| XBZ_CDN_BASE_URL | config_url | 45 |
| XBZ_IMAGE_SOURCE | config_url | 9 |

## Estratégia: dual storage temporário

Não deletei os 12 rows de `system_settings_legacy` ainda. Estratégia "belt and suspenders":

1. **Agora (semanas 1-2)**: Ambos têm os secrets. Se algo falhar em integration_credentials, há fallback.
2. **Após validação em produção**: Deletar de system_settings_legacy.
3. **Long-term**: system_settings_legacy mantém apenas configs/feature flags/backups (zero secrets).

## Melhoria incremental aplicada

Trigger `tg_integration_credentials_derive_biu` foi atualizado para reconhecer os prefixos
`CLOUDFLARE_` e `XBZ_` no auto-derive de provider:

```sql
WHEN NEW.secret_name LIKE 'CLOUDFLARE_%' THEN 'cloudflare'
WHEN NEW.secret_name LIKE 'XBZ_%'        THEN 'xbz'
```

Futuras inserções nessas categorias terão provider derivado automaticamente.

## Quem consome esses secrets

Auditoria mostrou que **ZERO código atual consome esses tokens** (Edge Functions OU Frontend).

Isso é consistente com o cenário: foram cadastrados em antecipação a features
de integração com Cloudflare (upload de imagens via API, etc) que ainda não foram
implementadas. Agora estão preservados no local correto, prontos para uso.

## Próximos passos sugeridos

### Imediato
- Nenhum — operação concluída

### Curto prazo (1-2 semanas)
- Confirmar com sponsor: deletar 12 rows do legacy?
- Documentar em README do projeto que secrets vão para integration_credentials

### Médio prazo
- Quando Cloudflare integration for desenvolvida, consumir via integration_credentials
- Considerar Supabase Vault para criptografar `secret_value` em rest

## Comandos de reversão (se necessário)

```sql
-- Reverter: deletar os 12 migrados
DELETE FROM public.integration_credentials WHERE notes LIKE '%Decision 007%';
-- Os 12 originais continuam em system_settings_legacy
```

## Resumo numérico final

```
📦 Migrados:                    12/12  ✅
🔐 RLS em destino:              ON     ✅
🛡️ Policies granulares:         4      ✅
🎯 Auto-derive ativo:           SIM    ✅
🗑️ Legacy preservado:           12     ✅ (rollback possível)
👥 Acesso restrito:             admin+ ✅
🐛 Bugs encontrados durante:    1 (trigger sem CLOUDFLARE/XBZ — corrigido)
```
