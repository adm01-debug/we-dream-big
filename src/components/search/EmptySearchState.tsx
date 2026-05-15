/**
 * EmptySearchState — empty state inteligente do GlobalSearchPalette.
 * Mostrado quando há query (>= 2 chars) mas zero resultados.
 */
import { memo } from "react";
import { Search, Plus, ExternalLink, RotateCcw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const RECENT_KEY = "recent_global_searches";

interface EmptySearchStateProps {
  query: string;
  onAction: (href: string) => void;
  onRefine: () => void;
  onPickRecent: (term: string) => void;
}

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").slice(0, 5);
  } catch {
    return [];
  }
}

export const EmptySearchState = memo(function EmptySearchState({
  query,
  onAction,
  onRefine,
  onPickRecent,
}: EmptySearchStateProps) {
  const recent = getRecentSearches();
  const encoded = encodeURIComponent(query);

  const actions = [
    {
      key: "catalog",
      label: "Buscar no catálogo",
      sublabel: "Pesquisar produtos no catálogo completo",
      icon: <ExternalLink className="h-4 w-4" />,
      onClick: () => onAction(`/?q=${encoded}`),
    },
    {
      key: "new-quote",
      label: `Criar orçamento para "${query}"`,
      sublabel: "Iniciar um novo orçamento com este nome",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => onAction(`/orcamentos/novo?client=${encoded}`),
    },
    {
      key: "refine",
      label: "Refinar busca",
      sublabel: "Limpar e tentar termos diferentes",
      icon: <RotateCcw className="h-4 w-4" />,
      onClick: onRefine,
    },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 py-6 animate-in fade-in-0 zoom-in-95 duration-300">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl [background-color:hsl(var(--command-surface-raised))] flex items-center justify-center border [border-color:hsl(var(--command-border))]">
          <Search className="h-5 w-5 [color:hsl(var(--command-text-subtle))]" />
        </div>
        <div>
          <p className="text-sm [color:hsl(var(--command-text-muted))]">
            Nenhum resultado para <span className="font-semibold text-foreground">"{query}"</span>
          </p>
          <p className="text-[11px] [color:hsl(var(--command-text-subtle))] mt-0.5">
            Tente uma destas ações:
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {actions.map(a => (
          <button
            key={a.key}
            onClick={a.onClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
              "border [border-color:hsl(var(--command-border))]",
              "hover:[background-color:hsl(var(--command-accent))] hover:[border-color:hsl(var(--command-border-strong))]"
            )}
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{a.label}</p>
              <p className="text-[11px] [color:hsl(var(--command-text-subtle))] truncate">{a.sublabel}</p>
            </div>
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t [border-color:hsl(var(--command-border))]">
          <p className="text-[10px] uppercase tracking-wide font-semibold [color:hsl(var(--command-text-subtle))] px-1">
            Buscas recentes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map(term => (
              <button
                key={term}
                onClick={() => onPickRecent(term)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border [border-color:hsl(var(--command-border))] [background-color:hsl(var(--command-surface-raised))] hover:[background-color:hsl(var(--command-accent))] transition-colors"
              >
                <Clock className="h-3 w-3 [color:hsl(var(--command-text-subtle))]" />
                <span className="truncate max-w-[160px]">{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/** Persist a query in recent searches (max 5, dedupe, most-recent first). */
export function pushRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr: string[] = raw ? (JSON.parse(raw) as string[]).filter(x => typeof x === "string") : [];
    const filtered = arr.filter(x => x.toLowerCase() !== trimmed.toLowerCase());
    filtered.unshift(trimmed);
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 5)));
  } catch {
    /* silent */
  }
}
