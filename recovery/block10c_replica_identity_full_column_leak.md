# 🔒 Mitigando vazamento de colunas com `REPLICA IDENTITY FULL`

> Complemento de `block10_realtime.sql` e `block10b_replica_identity_benchmark.md`.
>
> **Problema:** ao definir `REPLICA IDENTITY FULL` em uma tabela sensível, o Postgres
> passa a escrever **todas as colunas** da linha antiga no WAL. O Realtime entrega
> esse `payload.old` (e o `payload.new` do UPDATE) para **todo cliente que passar na
> RLS de SELECT da tabela base** — inclusive colunas que a aplicação nunca expõe
> via API (ex.: `password_hash`, `cpf`, `internal_score`, `cost_price`,
> `stripe_customer_id`, etc.).
>
> RLS filtra **linhas**, não **colunas**. Realtime + FULL = risco de vazamento
> coluna-a-coluna mesmo com RLS "correta".

---

## 1. Quando isso é um problema concreto

Você está em risco se **todas** as condições abaixo forem verdadeiras:

1. A tabela tem `REPLICA IDENTITY FULL`.
2. A tabela está em `supabase_realtime`.
3. A tabela tem **pelo menos uma coluna sensível** que a aplicação nunca deveria entregar ao browser.
4. Existe **alguma policy de SELECT** que permite ao usuário ver a linha (mesmo que a UI esconda colunas).

Checagem rápida:

```sql
-- Tabelas em FULL E publicadas em realtime
select n.nspname as schema,
       c.relname as table,
       case c.relreplident
         when 'd' then 'default (PK)'
         when 'n' then 'nothing'
         when 'f' then 'FULL  ⚠️'
         when 'i' then 'index'
       end as replica_identity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_publication_tables pt
  on pt.schemaname = n.nspname and pt.tablename = c.relname
where pt.pubname = 'supabase_realtime'
  and c.relreplident = 'f'
order by 1,2;
```

---

## 2. Estratégia recomendada: Realtime no espelho, FULL na base

> **Tabela base = privada (não publicada em realtime).
> Tabela espelho/projeção pública = publicada em realtime, com `REPLICA IDENTITY DEFAULT`.**

Assim:

- Escritas continuam indo para a tabela base (com FULL para auditoria/triggers internos).
- O Realtime só vê as colunas que você **explicitamente** expôs.
- RLS roda sobre o espelho (mais restritiva ou igual à da base).

### 2.1 Tabela base com colunas sensíveis

```sql
create table public.users_private (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique,
  display_name    text not null,
  avatar_url      text,
  status          text not null default 'offline',
  -- ⚠️ SENSÍVEIS — nunca devem sair em payload.old/new
  email           text not null,
  cpf             text,
  stripe_customer_id text,
  internal_score  numeric,
  password_reset_token text,
  updated_at      timestamptz not null default now()
);

alter table public.users_private enable row level security;

-- FULL na base: necessário p/ triggers internos lerem OLD.* completo
alter table public.users_private replica identity full;

-- ❌ NÃO FAÇA: alter publication supabase_realtime add table public.users_private;
```

### 2.2 View de leitura (uso direto via PostgREST, não Realtime)

```sql
create or replace view public.users_presence
with (security_invoker = true) as
select id, user_id, display_name, avatar_url, status, updated_at
from public.users_private;

comment on view public.users_presence is
  'Projeção segura de users_private. NÃO inclui email/cpf/stripe/score.';
```

`security_invoker = true` é **obrigatório**: sem ele, a view roda como dono e bypassa a RLS do usuário.

### 2.3 Caminho A — Tabela espelho sincronizada por trigger (recomendado p/ Realtime)

Views regulares não podem ser publicadas em `supabase_realtime` (a publication exige relação física). Crie um espelho:

```sql
create table public.users_presence_public (
  id           uuid primary key,
  user_id      uuid not null unique,
  display_name text not null,
  avatar_url   text,
  status       text not null,
  updated_at   timestamptz not null
);

alter table public.users_presence_public enable row level security;
alter table public.users_presence_public replica identity default;  -- PK estável

create or replace function public.sync_users_presence_public()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if tg_op = 'DELETE' then
    delete from public.users_presence_public where id = old.id;
    return old;
  end if;

  insert into public.users_presence_public
    (id, user_id, display_name, avatar_url, status, updated_at)
  values
    (new.id, new.user_id, new.display_name, new.avatar_url, new.status, new.updated_at)
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url   = excluded.avatar_url,
    status       = excluded.status,
    updated_at   = excluded.updated_at;

  return new;
end;
$func$;

create trigger trg_sync_users_presence_public
after insert or update or delete on public.users_private
for each row execute function public.sync_users_presence_public();

-- ✅ Publica APENAS o espelho
alter publication supabase_realtime add table public.users_presence_public;

create policy "presence is readable by authenticated"
on public.users_presence_public
for select to authenticated
using (true);
```

Cliente:

```ts
supabase
  .channel('presence')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'users_presence_public' },
    (payload) => {
      // payload.new / payload.old contêm SOMENTE colunas seguras
      console.log(payload.new);
    })
  .subscribe();
```

### 2.4 Caminho B — Column list na publication (Postgres ≥15)

Se você **não precisa de FULL** para o Realtime (apenas para triggers internos), pode publicar um subconjunto:

```sql
alter publication supabase_realtime drop table public.users_private;

alter publication supabase_realtime
  add table public.users_private (id, user_id, display_name, avatar_url, status, updated_at);
```

⚠️ **Limitação:** column lists não combinam bem com `REPLICA IDENTITY FULL` —
o Postgres pode recusar UPDATE com
`cannot update table ... because it does not have a replica identity that includes ...`.
Quando você precisa simultaneamente de **(a)** FULL na base, **(b)** Realtime e
**(c)** ocultar colunas, use o **Caminho A**.

---

## 3. Anti-padrões comuns

- ❌ Confiar na RLS para esconder colunas sensíveis — RLS filtra linhas, não colunas.
- ❌ `create view ... as select * from base` sem `security_invoker = true` — bypassa RLS.
- ❌ Publicar a base com FULL e "filtrar no cliente" — o dado já saiu do servidor.
- ❌ Adicionar uma view diretamente em `supabase_realtime` — Realtime exige tabela física.
- ❌ Manter FULL "por garantia" sem consumidor de `payload.old` — só custo + risco.
- ❌ Espelho com RLS mais permissiva que a base — vaza linhas que a base esconderia.

---

## 4. Checklist antes de habilitar FULL + Realtime

1. [ ] A tabela tem alguma coluna que **nunca** deve aparecer no browser? Liste.
2. [ ] Existe consumidor real de `payload.old` (auditoria/diff/animação)? Se **não**, volte para `DEFAULT`.
3. [ ] Se sim, o Realtime escuta a **base** ou um **espelho**?
4. [ ] View declara `security_invoker = true`? Tabela espelho tem RLS própria?
5. [ ] RLS do espelho é **igual ou mais restritiva** que a da base?
6. [ ] `REPLICA IDENTITY` do espelho é `DEFAULT` — não `FULL` por inércia?
7. [ ] Teste manual: cliente comum + UPDATE em coluna sensível na base → confirma payload limpo.

---

## 5. Teste de regressão (SQL + TS)

```sql
-- Como service_role
update public.users_private
   set status = 'online',
       internal_score = coalesce(internal_score,0) + 1,
       password_reset_token = gen_random_uuid()::text
 where user_id = '00000000-0000-0000-0000-000000000001';
```

```ts
// Browser, autenticado como usuário comum
const SENSITIVE = ['email','cpf','stripe_customer_id','internal_score','password_reset_token'];

supabase.channel('leak-probe')
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users_presence_public' },
      (payload) => {
        const leaked = Object.keys({ ...payload.new, ...payload.old })
          .filter(k => SENSITIVE.includes(k));
        console.assert(leaked.length === 0, '🚨 vazamento:', leaked);
      })
  .subscribe();
```

Se `leaked` for `[]` em qualquer mutação, a mitigação está correta.

---

## 6. Resumo de uma linha

> **Nunca publique no Realtime uma tabela com `REPLICA IDENTITY FULL` que contenha
> colunas sensíveis. Publique um espelho (ou use column-list publication) com
> apenas o subconjunto seguro, e mantenha FULL somente na base privada.**
