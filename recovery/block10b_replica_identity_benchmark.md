# Bloco 10b — Benchmark `REPLICA IDENTITY` DEFAULT vs FULL

Roteiro reproduzível para comparar empiricamente os dois modos:

1. **WAL gerado** — via `pg_stat_wal` (bytes acumulados no servidor).
2. **Conteúdo de `payload.old`** — capturado por um listener Realtime
   em React/TS.

> Pré-requisito: `supabase_realtime` precisa existir como publication
> (já existe em projetos Supabase). O usuário do SQL precisa enxergar
> `pg_stat_wal` (qualquer role tem `SELECT`).

---

## 1. Setup — tabela isolada de benchmark

```sql
-- Tabela descartável só para o benchmark.
CREATE TABLE IF NOT EXISTS public.realtime_bench (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload     text NOT NULL,                 -- coluna "gorda" p/ ampliar diff
  counter     int  NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.realtime_bench ENABLE ROW LEVEL SECURITY;

-- RLS aberta SÓ para esta tabela de teste (Realtime precisa que o JWT
-- enxergue a linha). REMOVER após o benchmark.
DROP POLICY IF EXISTS "bench read all" ON public.realtime_bench;
CREATE POLICY "bench read all" ON public.realtime_bench
  FOR SELECT TO authenticated USING (true);

-- Adiciona à publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_bench;
```

---

## 2. Listener TS — captura `payload.old` cru

Cole num componente de página admin (ex.: `/admin/telemetria`) ou rode
como script Node com `@supabase/supabase-js`. Os logs vão para o console.

```tsx
import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Bench = { id: string; payload: string; counter: number; updated_at: string };

export function ReplicaIdentityProbe() {
  useEffect(() => {
    const log = (mode: string) =>
      (p: RealtimePostgresChangesPayload<Bench>) => {
        // eslint-disable-next-line no-console
        console.log(`[${mode}] ${p.eventType}`, {
          new_keys: Object.keys(p.new ?? {}),
          old_keys: Object.keys(p.old ?? {}),
          old: p.old,         // ← isto é o foco do teste
        });
      };

    const ch = supabase
      .channel("bench:probe")
      .on<Bench>("postgres_changes",
        { event: "*", schema: "public", table: "realtime_bench" },
        log("probe"))
      .subscribe((status) => console.log("probe status:", status));

    return () => { supabase.removeChannel(ch); };
  }, []);

  return <div>Probe ativo — veja o console.</div>;
}
```

**O que esperar no console** (mesma carga de UPDATE/DELETE):

| Modo     | `old_keys` em UPDATE          | `old_keys` em DELETE          |
|----------|-------------------------------|-------------------------------|
| DEFAULT  | `["id"]`                      | `["id"]`                      |
| FULL     | `["id","payload","counter","updated_at"]` | idem (linha inteira) |

---

## 3. Benchmark SQL — mede WAL e roda 2 rodadas idênticas

Rode tudo num único bloco para garantir snapshot consistente. Carga
sugerida: 1.000 INSERTs + 1.000 UPDATEs + 1.000 DELETEs.

```sql
-- =====================================================================
-- RODADA A — REPLICA IDENTITY DEFAULT (= PK)
-- =====================================================================
TRUNCATE public.realtime_bench;
ALTER  TABLE public.realtime_bench REPLICA IDENTITY DEFAULT;

-- Snapshot inicial do WAL.
SELECT wal_records AS rec_a0, wal_bytes AS bytes_a0, now() AS t_a0
  FROM pg_stat_wal \gset

-- Carga: 1k inserts → 1k updates → 1k deletes.
WITH rows AS (
  INSERT INTO public.realtime_bench (payload)
  SELECT repeat(md5(g::text), 8)        -- ~256 chars por linha
    FROM generate_series(1, 1000) g
  RETURNING id
)
SELECT count(*) AS inserted_a FROM rows;

UPDATE public.realtime_bench
   SET counter    = counter + 1,
       updated_at = now();

DELETE FROM public.realtime_bench;

-- Snapshot final.
SELECT
  'DEFAULT'                                AS mode,
  pg_stat_wal.wal_records - :rec_a0        AS wal_records_delta,
  pg_stat_wal.wal_bytes   - :bytes_a0      AS wal_bytes_delta,
  pg_size_pretty(pg_stat_wal.wal_bytes - :bytes_a0) AS wal_pretty,
  EXTRACT(EPOCH FROM (now() - :'t_a0'))    AS elapsed_s
  FROM pg_stat_wal;

-- =====================================================================
-- RODADA B — REPLICA IDENTITY FULL
-- =====================================================================
TRUNCATE public.realtime_bench;
ALTER  TABLE public.realtime_bench REPLICA IDENTITY FULL;

SELECT wal_records AS rec_b0, wal_bytes AS bytes_b0, now() AS t_b0
  FROM pg_stat_wal \gset

WITH rows AS (
  INSERT INTO public.realtime_bench (payload)
  SELECT repeat(md5(g::text), 8)
    FROM generate_series(1, 1000) g
  RETURNING id
)
SELECT count(*) AS inserted_b FROM rows;

UPDATE public.realtime_bench
   SET counter    = counter + 1,
       updated_at = now();

DELETE FROM public.realtime_bench;

SELECT
  'FULL'                                   AS mode,
  pg_stat_wal.wal_records - :rec_b0        AS wal_records_delta,
  pg_stat_wal.wal_bytes   - :bytes_b0      AS wal_bytes_delta,
  pg_size_pretty(pg_stat_wal.wal_bytes - :bytes_b0) AS wal_pretty,
  EXTRACT(EPOCH FROM (now() - :'t_b0'))    AS elapsed_s
  FROM pg_stat_wal;
```

> `\gset` é sintaxe `psql`. No SQL Editor do Lovable Cloud, rode
> `SELECT wal_records, wal_bytes FROM pg_stat_wal;` antes/depois
> manualmente e subtraia.

### Resultado típico (1k linhas, payload ~256 chars)

| Métrica                      | DEFAULT     | FULL        | Δ FULL/DEFAULT |
|------------------------------|-------------|-------------|----------------|
| `wal_records_delta` (UPDATE) | ~1.000      | ~1.000      | ~1.0×          |
| `wal_bytes_delta` (total)    | ~1–2 MB     | ~3–5 MB     | **~2–3×**      |
| `payload.old` em UPDATE      | só `id`     | linha completa | —           |
| `payload.old` em DELETE      | só `id`     | linha completa | —           |

Números variam com tamanho da linha; o que importa é a **proporção**:
FULL multiplica o WAL na faixa de 2–3× para tabelas com colunas TEXT
médias e cresce proporcionalmente ao tamanho da linha.

---

## 4. Cleanup

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.realtime_bench;
DROP POLICY IF EXISTS "bench read all" ON public.realtime_bench;
DROP TABLE public.realtime_bench;
```

---

## 5. Como interpretar

- Use **DEFAULT** sempre que possível (PK estável, sem necessidade de
  diff client-side). Custo de WAL mínimo, replicação enxuta.
- Use **FULL** apenas quando o consumidor Realtime PRECISA do estado
  anterior (ex.: animar transição de status, auditar diff de campos,
  ou tabela sem PK). Aceite o custo extra de WAL.
- Em tabelas hot-write (telemetria, eventos > 100 rps), prefira
  **DEFAULT** + buscar o estado anterior via cache local; FULL pode
  saturar o slot de replicação.