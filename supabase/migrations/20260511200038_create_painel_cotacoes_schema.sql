-- ============================================================
--  Painel de Cotação Multi-Transportadora — Schema inicial
--  Onda 2 antecipada: persistência + auth + RLS
-- ============================================================
--
-- Nota de sincronização (2026-05-12, T19 redeploy Fase 1):
-- Esta migration foi aplicada diretamente no banco produção via
-- MCP `apply_migration` em 2026-05-11 e ficou órfã no repo.
-- Conteúdo aqui é cópia fiel do que vive em `supabase_migrations.schema_migrations`
-- para reduzir o desync repo↔DB flagado pela auditoria (PR #154).
-- ============================================================

create table if not exists public.cotacoes (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- quem cotou (FK pra auth.users)
  user_id                  uuid not null references auth.users(id) on delete restrict,
  responsavel_nome         text not null,    -- snapshot do nome (não muda se user mudar metadata)
  responsavel_role         text,             -- snapshot da role (admin/cotacao)

  -- cotação escolhida
  transportadora_escolhida text not null,
  numero_cotacao           text,
  preco_total              numeric(12,2) not null,
  prazo_dias               int not null,

  -- contexto completo
  remetente                jsonb not null,   -- {nome, cnpj, cep}
  destinatario             jsonb not null,   -- {nome, cnpj, cep, cidade, uf}
  carga                    jsonb not null,   -- {caixas[], pesoTotal, qtdVolumes, valorNF}
  todas_cotacoes           jsonb,            -- snapshot dos 6 ramos pra auditoria

  -- workflow
  status                   text not null default 'cotado'
    check (status in ('cotado','contratado','cancelado')),
  origem                   text not null default 'PORTAL',
  observacoes              text
);

-- Trigger: atualiza updated_at automaticamente
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists trg_cotacoes_updated_at on public.cotacoes;
create trigger trg_cotacoes_updated_at
  before update on public.cotacoes
  for each row execute function public.tg_set_updated_at();

-- Indexes
create index if not exists idx_cotacoes_created_at on public.cotacoes(created_at desc);
create index if not exists idx_cotacoes_user_id    on public.cotacoes(user_id);
create index if not exists idx_cotacoes_status     on public.cotacoes(status);
create index if not exists idx_cotacoes_transp     on public.cotacoes(transportadora_escolhida);

-- ============================================================
--  RLS — Row Level Security
--  Política: transparência interna (todos autenticados veem tudo)
--           mas só admin pode UPDATE/DELETE alheio.
-- ============================================================

alter table public.cotacoes enable row level security;

-- Helper: ver role do user logado
create or replace function public.current_user_role()
returns text language sql stable as $fn$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'cotacao'
  );
$fn$;

-- SELECT: qualquer autenticado vê tudo (transparência interna)
drop policy if exists "cotacoes_select_authenticated" on public.cotacoes;
create policy "cotacoes_select_authenticated"
  on public.cotacoes for select
  to authenticated
  using (true);

-- INSERT: autenticado pode inserir, user_id deve = auth.uid()
drop policy if exists "cotacoes_insert_self" on public.cotacoes;
create policy "cotacoes_insert_self"
  on public.cotacoes for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: dono ou admin
drop policy if exists "cotacoes_update_owner_or_admin" on public.cotacoes;
create policy "cotacoes_update_owner_or_admin"
  on public.cotacoes for update
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');

-- DELETE: NINGUÉM (nem admin) — auditoria
-- (sem policy = bloqueado por RLS)

comment on table public.cotacoes is
  'Cotações de frete realizadas via painel log.atomicabr.com.br. Auditoria — não deletar.';
