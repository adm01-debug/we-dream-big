# Storage — Política Oficial de Buckets Públicos

**Última atualização**: 2026-05-12 (T23 do redeploy Fase 2)
**Owner**: Joaquim + Tech Lead
**Aplicável a**: project Supabase `doufsxqlfjyuvxuezpln` (Promo_Gifts)

## Estado atual

| Bucket | Público? | Conteúdo | Uso pretendido |
|---|---|---|---|
| `recibos-entrega` | ❌ privado | recibos assinados de entrega (PII) | leitura por authenticated; compartilhamento externo via signed URL |
| `scripts` | ❌ privado | `worker.sh` (legado) | nenhum uso ativo conhecido; candidato a remoção |
| `mockup-art-files` | ❌ privado | arquivos de arte de mockup | uploads do app, leitura por authenticated |
| `personalization-images` | ❌ privado | imagens de personalização | idem |
| `product-videos` | ❌ privado | vídeos de produto | idem |
| `quarantine` | ❌ privado | quarentena de uploads sob análise | apenas admin |
| `supplier-logos` | ❌ privado | logos de fornecedores | leitura por authenticated |
| `component-media` | ❌ privado | mídia de componentes de kit | uploads e leitura por authenticated |

**Não há atualmente nenhum bucket público no projeto.**

## Política

### Regra geral: bucket privado é o default

Nenhum bucket deve ser marcado como `public=true` sem:

1. Justificativa documentada **neste arquivo** (linha na tabela "Estado atual" e seção "Buckets públicos justificados" abaixo)
2. Confirmação de que o conteúdo armazenado N**Ã**O contém:
   - PII (nomes, emails, telefones, endereços, CPF, CNPJ, fotos de pessoas identificáveis)
   - Dados comerciais sensíveis (preços não-públicos, contratos, propostas)
   - Credenciais ou tokens
   - Conteúdo regulamentado por LGPD
3. Aprovação registrada em PR pelo Tech Lead + Sponsor

### Como compartilhar arquivos externamente sem bucket público

Use **signed URLs** (URLs temporárias assinadas pelo SDK Supabase). Exemplo:

```typescript
const { data, error } = await supabase.storage
  .from('recibos-entrega')
  .createSignedUrl('caminho/do/recibo.pdf', 3600); // 1 hora
// data.signedUrl pode ser enviado por email/WhatsApp ao destinatário
```

**Vantagens**: link expira automaticamente, não exposto via crawler, auditável por log de geração de URL.

### Buckets públicos justificados

Nenhum no momento.

Quando algum bucket precisar ser público (ex: assets de marketing servidos sem autenticação), adicionar uma seção aqui no formato:

```
#### nome-do-bucket

- **Justificativa**: [por que precisa ser público]
- **Conteúdo permitido**: [tipos de arquivo aceitos]
- **Conteúdo proibido**: [explícito sobre o que NÃO pode entrar]
- **Aprovado em**: [PR ou data]
- **Revisado em**: [data da última revisão; cadência semestral]
```

## Mudanças aplicadas em 2026-05-12 (T23 da Fase 2 do redeploy)

### Bucket `recibos-entrega`

- **Antes**: `public=true`, criado em 2026-05-12 16:36 UTC (mesmo dia da Fase 2)
- **Conteúdo**: 0 objetos (não chegou a receber upload em produção)
- **Motivo de fechar**: recibos contêm dados de destinatário (PII) — bucket público violaria LGPD
- **Depois**: `public=false`, policy `recibos_public_read` removida (SELECT a `public`), policy `recibos_authenticated_read` (SELECT para `authenticated`) **pendente de criação via dashboard Supabase**
- **Recomendação para o frontend**: usar signed URLs ao gerar links de visualização de recibos para clientes externos

### Bucket `scripts`

- **Antes**: `public=true`, criado em 2026-02-25
- **Conteúdo**: 1 objeto — `worker.sh` (3.6 KB) de fev/2026
- **Motivo de fechar**: bucket público sem MIME restriction é vetor de upload malicioso; arquivo é legado de algum Cloudflare worker antigo
- **Depois**: `public=false`
- **Próximo passo recomendado**: confirmar se `worker.sh` ainda é referenciado em algum cron/worker; se não for, mover para repositório de IaC ou deletar

## Gap pendente — ação obrigatória pelo dashboard Supabase

A criação da policy SELECT `recibos_authenticated_read` em `storage.objects` foi **comprovadamente impossível via MCP/SQL** após múltiplas tentativas:

| Tentativa | Mecanismo | Resultado |
|---|---|---|
| 1 | `execute_sql` direto | `ERROR 42501: must be owner of relation objects` |
| 2 | `apply_migration` (roda como `postgres`) | Mesmo erro 42501 |
| 3 | `apply_migration` com `SET LOCAL ROLE supabase_storage_admin` | `ERROR 42501: permission denied to set role` |

Causa raiz confirmada (validado em 2026-05-12 via MCP `execute_sql`):

```sql
-- 1) Confirmar owner de storage.objects:
SELECT current_user, session_user,
       (SELECT rolname FROM pg_roles WHERE oid = relowner) AS objects_owner,
       pg_has_role(current_user, 'supabase_storage_admin', 'MEMBER')
         AS is_member_of_storage_admin
FROM pg_class
WHERE relname='objects' AND relnamespace='storage'::regnamespace;
-- => current_user=postgres
--    objects_owner=supabase_storage_admin
--    is_member_of_storage_admin=false
```

Portanto: `postgres` não é owner **nem** membro de `supabase_storage_admin`. Sem ALTER ou GRANT prévio (que só `supabase_storage_admin` pode emitir), `CREATE POLICY` em `storage.objects` falha com `42501`.

Sem essa policy, **usuários autenticados não conseguem ler arquivos do bucket `recibos-entrega` via cliente JS** (signed URLs geradas server-side continuam funcionando porque usam `service_role`).

### Como criar (única opção viável: Dashboard Supabase)

1. Abrir <https://supabase.com/dashboard/project/doufsxqlfjyuvxuezpln/storage/policies>
2. Localizar a tabela `objects` (schema `storage`) → clicar **New policy**
3. Escolher template **"For full customization"** → preencher:
   - **Policy name**: `recibos_authenticated_read`
   - **Allowed operation**: marcar apenas **SELECT**
   - **Target roles**: `authenticated`
   - **USING expression**: `bucket_id = 'recibos-entrega'`
   - **WITH CHECK expression**: deixar em branco
4. **Review** → **Save policy**

**Validação pós**:

```sql
SELECT policyname, cmd, roles::text FROM pg_policies
WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'recibos%';
-- Esperado: 3 linhas — recibos_authenticated_read (SELECT), recibos_authenticated_write (INSERT), recibos_authenticated_update (UPDATE)
```

## Procedimento para revisar/alterar este documento

1. Detectar bucket público novo via query:

   ```sql
   SELECT id, name, created_at FROM storage.buckets WHERE public=true;
   ```

2. Avaliar conteúdo e propósito
3. Se justificável: PR adicionando seção em "Buckets públicos justificados"
4. Se não justificável: PR + comando `UPDATE storage.buckets SET public=false WHERE id='...'`
5. Adicionar bucket à tabela "Estado atual" acima
6. Cadência de revisão: a cada 6 meses, validar que nenhum bucket virou público sem PR

## Referências

- Documento de execução da Fase 2: `docs/redeploy/REDEPLOY-FASE2-EXECUTION-LOG.md`
- Plano holístico do redeploy: `RECOVERY_PLAN.md`
- Auditoria 2026-05-07: `AUDITORIA_2026-05-07.md`
