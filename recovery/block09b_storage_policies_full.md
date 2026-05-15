# Bloco 9b — Storage Policies Completas

Extração ao vivo de `pg_policies WHERE schemaname='storage'` em 2026-05-11.
Total: **34 policies** em `storage.objects`, distribuídas em 7 grupos.

## RLS state (todas tabelas do schema `storage`)

| Tabela | RLS | Force |
|---|---|---|
| `buckets` | on | off |
| `buckets_analytics` | on | off |
| `buckets_vectors` | on | off |
| `migrations` | on | off |
| `objects` | on | off |
| `s3_multipart_uploads` | on | off |
| `s3_multipart_uploads_parts` | on | off |
| `vector_indexes` | on | off |

## Distribuição por bucket

| Bucket | Policies |
|---|---|
| `component-media` | 4 |
| `mockup-art-files` | 7 |
| `personalization-images` | 9 |
| `product-videos` | 4 |
| `quarantine` | 2 |
| `supplier-logos` | 6 |
| `multi:supplier-logos,product-videos,personalization-images,component-media` | 2 |

## Detalhe por bucket

### `component-media` (4 policies)

| Cmd | Role | Policy | USING / WITH CHECK |
|---|---|---|---|
| DELETE | public | Admins can delete component media | USING `((bucket_id = 'component-media'::text) AND is_supervisor_or_above(auth.uid()))` |
| INSERT | public | Admins can upload component media | WITH CHECK `((bucket_id = 'component-media'::text) AND is_supervisor_or_above(auth.uid()))` |
| SELECT | authenticated | Authenticated direct read component-media | USING `((bucket_id = 'component-media'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |
| UPDATE | public | Admins can update component media | USING `((bucket_id = 'component-media'::text) AND is_supervisor_or_above(auth.uid()))` • WITH CHECK `((bucket_id = 'component-media'::text) AND is_supervisor_or_above(auth.uid()))` |

### `mockup-art-files` (7 policies)

| Cmd | Role | Policy | USING / WITH CHECK |
|---|---|---|---|
| DELETE | authenticated | Users can delete their own art files | USING `((bucket_id = 'mockup-art-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))` |
| DELETE | public | Users delete own art files in storage | USING `((bucket_id = 'mockup-art-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| INSERT | authenticated | Users can upload their own art files | WITH CHECK `((bucket_id = 'mockup-art-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))` |
| INSERT | public | Users upload own art files to storage | WITH CHECK `((bucket_id = 'mockup-art-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| SELECT | authenticated | Users can view their own or shared art files | USING `((bucket_id = 'mockup-art-files'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_supervisor_or_above(auth.uid())))` |
| SELECT | public | Users view own art files in storage | USING `((bucket_id = 'mockup-art-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| UPDATE | public | Users update own art files in storage | USING `((bucket_id = 'mockup-art-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |

### `personalization-images` (9 policies)

| Cmd | Role | Policy | USING / WITH CHECK |
|---|---|---|---|
| DELETE | authenticated | Admins can delete personalization images | USING `((bucket_id = 'personalization-images'::text) AND is_supervisor_or_above(auth.uid()))` |
| DELETE | authenticated | Authenticated users can delete own personalization images | USING `((bucket_id = 'personalization-images'::text) AND (owner = auth.uid()))` |
| INSERT | authenticated | Acesso de inserção para usuários autenticados em personaliza | WITH CHECK `(bucket_id = 'personalization-images'::text)` |
| INSERT | authenticated | Authenticated users can upload personalization images | WITH CHECK `(bucket_id = 'personalization-images'::text)` |
| INSERT | authenticated | Users can upload own personalization images | WITH CHECK `((bucket_id = 'personalization-images'::text) AND ((auth.uid())::text = split_part(name, '/'::text, 1)))` |
| SELECT | authenticated | Acesso de leitura para usuários autenticados em personalizatio | USING `(bucket_id = 'personalization-images'::text)` |
| SELECT | authenticated | Authenticated direct read personalization-images | USING `((bucket_id = 'personalization-images'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |
| SELECT | authenticated | Authenticated users can view personalization images | USING `(bucket_id = 'personalization-images'::text)` |
| UPDATE | authenticated | Authenticated users can update own personalization images | USING `((bucket_id = 'personalization-images'::text) AND (owner = auth.uid()))` • WITH CHECK `((bucket_id = 'personalization-images'::text) AND (owner = auth.uid()))` |

### `product-videos` (4 policies)

| Cmd | Role | Policy | USING / WITH CHECK |
|---|---|---|---|
| DELETE | public | Admins can delete videos | USING `((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(auth.uid()))` |
| INSERT | public | Admins can upload videos | WITH CHECK `((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(auth.uid()))` |
| SELECT | authenticated | Authenticated direct read product-videos | USING `((bucket_id = 'product-videos'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |
| UPDATE | public | Only admins can update product videos | USING `((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(auth.uid()))` • WITH CHECK `((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(auth.uid()))` |

### `quarantine` (2 policies)

| Cmd | Role | Policy | USING / WITH CHECK |
|---|---|---|---|
| ALL | service_role | Sistema pode gerenciar quarentena | USING `(bucket_id = 'quarantine'::text)` • WITH CHECK `(bucket_id = 'quarantine'::text)` |
| SELECT | authenticated | Admins podem visualizar quarentena | USING `((bucket_id = 'quarantine'::text) AND (((auth.jwt() ->> 'email'::text) ~~ '%admin%'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)))` |

### `supplier-logos` (6 policies)

| Cmd | Role | Policy | USING / WITH CHECK |
|---|---|---|---|
| ALL | authenticated | Only admins can manage supplier logos | USING `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid()))` • WITH CHECK `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid()))` |
| DELETE | public | Only admins can delete supplier logos | USING `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid()))` |
| INSERT | public | Only admins can upload supplier logos | WITH CHECK `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid()))` |
| SELECT | authenticated | Authenticated direct read supplier-logos | USING `((bucket_id = 'supplier-logos'::text) AND (name IS NOT NULL) AND (length(name) > 0))` |
| SELECT | public | Public can view supplier logos | USING `(bucket_id = 'supplier-logos'::text)` |
| UPDATE | public | Only admins can update supplier logos | USING `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid()))` • WITH CHECK `((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid()))` |

### `multi:supplier-logos,product-videos,personalization-images,component-media` (2 policies)

| Cmd | Role | Policy | USING / WITH CHECK |
|---|---|---|---|
| SELECT | public | Admins can list protected buckets | USING `((bucket_id = ANY (ARRAY['supplier-logos'::text, 'product-videos'::text, 'personalization-images'::text, 'component-media'::text])) AND is_supervisor_or_above(auth.uid()))` |
| SELECT | service_role | Service role full access protected buckets | USING `(bucket_id = ANY (ARRAY['supplier-logos'::text, 'product-videos'::text, 'personalization-images'::text, 'component-media'::text]))` |

## Restauração

Use `block09b_storage_policies_full.sql` (idempotente — usa `DROP POLICY IF EXISTS` antes de `CREATE`).

Pré-requisito: função `public.is_supervisor_or_above(uuid)` (Bloco 4).
