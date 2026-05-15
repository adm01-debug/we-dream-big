// Exemplo completo: assina eventos Realtime (INSERT/UPDATE/DELETE)
// de uma tabela `messages` e renderiza mudanças ao vivo na UI.
//
// Pré-requisitos no banco (rode uma vez):
//   create table if not exists public.messages (
//     id uuid primary key default gen_random_uuid(),
//     content text not null,
//     user_id uuid references auth.users(id) on delete cascade,
//     created_at timestamptz not null default now(),
//     updated_at timestamptz not null default now()
//   );
//   alter table public.messages enable row level security;
//   create policy "read own" on public.messages for select
//     to authenticated using (auth.uid() = user_id);
//   create policy "insert own" on public.messages for insert
//     to authenticated with check (auth.uid() = user_id);
//   create policy "update own" on public.messages for update
//     to authenticated using (auth.uid() = user_id);
//   create policy "delete own" on public.messages for delete
//     to authenticated using (auth.uid() = user_id);
//   alter publication supabase_realtime add table public.messages;
//
// Uso:
//   import RealtimeMessagesExample from "@/examples/RealtimeMessagesExample";
//   <RealtimeMessagesExample />

import { useEffect, useState, useCallback } from "react";
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePostgresDeletePayload,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  content: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

type FeedEvent =
  | { kind: "INSERT"; at: string; row: Message }
  | { kind: "UPDATE"; at: string; row: Message; old: Partial<Message> }
  | { kind: "DELETE"; at: string; old: Partial<Message> };

export default function RealtimeMessagesExample() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [status, setStatus] = useState<string>("idle");
  const [draft, setDraft] = useState("");

  // 1) Carrega snapshot inicial (Realtime só envia mudanças futuras).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        console.error("[realtime-example] initial load failed", error);
        return;
      }
      setMessages((data ?? []) as Message[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Inscreve no canal Realtime e reconcilia o estado local.
  useEffect(() => {
    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: RealtimePostgresInsertPayload<Message>) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id)
              ? prev
              : [payload.new, ...prev],
          );
          setEvents((prev) =>
            [{ kind: "INSERT", at: new Date().toISOString(), row: payload.new }, ...prev].slice(0, 20),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload: RealtimePostgresUpdatePayload<Message>) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m)),
          );
          setEvents((prev) =>
            [
              {
                kind: "UPDATE",
                at: new Date().toISOString(),
                row: payload.new,
                old: payload.old as Partial<Message>,
              },
              ...prev,
            ].slice(0, 20),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload: RealtimePostgresDeletePayload<Message>) => {
          const oldRow = payload.old as Partial<Message>;
          setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
          setEvents((prev) =>
            [{ kind: "DELETE", at: new Date().toISOString(), old: oldRow }, ...prev].slice(0, 20),
          );
        },
      )
      .subscribe((s) => setStatus(s));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleInsert = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;
    const { data: auth } = await supabase.auth.getUser();
    const user_id = auth.user?.id ?? null;
    setDraft("");
    const { error } = await supabase.from("messages").insert({ content, user_id });
    if (error) console.error("[realtime-example] insert failed", error);
  }, [draft]);

  const handleUpdate = useCallback(async (id: string) => {
    const next = window.prompt("Novo conteúdo:");
    if (next == null) return;
    const { error } = await supabase
      .from("messages")
      .update({ content: next, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("[realtime-example] update failed", error);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) console.error("[realtime-example] delete failed", error);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Realtime: messages</h1>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          canal: {status}
        </span>
      </header>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Escreva uma mensagem…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleInsert();
          }}
        />
        <button
          type="button"
          onClick={() => void handleInsert()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Inserir
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Linhas ({messages.length})</h2>
        <ul className="divide-y rounded-md border">
          {messages.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate">{m.content}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()} · {m.id.slice(0, 8)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void handleUpdate(m.id)}
                  className="rounded-md border px-2 py-1 text-xs"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(m.id)}
                  className="rounded-md border px-2 py-1 text-xs text-destructive"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
          {messages.length === 0 && (
            <li className="p-3 text-center text-xs text-muted-foreground">Sem mensagens.</li>
          )}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Eventos recebidos</h2>
        <ul className="space-y-1 rounded-md border p-3 text-xs font-mono">
          {events.map((ev, i) => (
            <li key={i}>
              <span
                className={
                  ev.kind === "INSERT"
                    ? "text-emerald-600"
                    : ev.kind === "UPDATE"
                      ? "text-amber-600"
                      : "text-destructive"
                }
              >
                {ev.kind}
              </span>{" "}
              {ev.at} ·{" "}
              {ev.kind === "DELETE"
                ? `id=${(ev.old.id ?? "?").toString().slice(0, 8)}`
                : `id=${ev.row.id.slice(0, 8)} "${ev.row.content}"`}
            </li>
          ))}
          {events.length === 0 && (
            <li className="text-muted-foreground">Aguardando eventos…</li>
          )}
        </ul>
      </section>
    </div>
  );
}