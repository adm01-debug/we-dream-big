/**
 * FlowFilterPrimitives — Shared UI components for FlowFilterPanel.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function GroupSeparator({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-5 pb-1.5">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground/35 select-none">
        <Icon className="h-2.5 w-2.5" />{label}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
    </div>
  );
}

export function SectionRow({ icon: Icon, label, isOpen, onToggle, count, totalOptions }: {
  icon: React.ElementType; label: string; isOpen: boolean; onToggle: () => void;
  count?: number; totalOptions?: number;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-1 py-2 group/sec">
      <div className="flex items-center gap-2.5">
        <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center transition-all duration-200",
          isOpen ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
            : count && count > 0 ? "bg-primary/10 text-primary"
            : "bg-muted/20 text-muted-foreground/40 group-hover/sec:bg-muted/40"
        )}><Icon className="h-3 w-3" /></div>
        <span className={cn("text-xs font-medium transition-colors", count && count > 0 ? "text-foreground" : "text-foreground/70 group-hover/sec:text-foreground")}>{label}</span>
        {count !== undefined && count > 0 && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-md bg-primary/10 text-primary border-primary/20 font-bold">{count}</Badge>}
        {totalOptions !== undefined && totalOptions > 0 && count === 0 && <span className="text-[9px] text-muted-foreground/30 font-medium">{totalOptions}</span>}
      </div>
      <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.15 }}>
        <ChevronDown className={cn("h-3 w-3 transition-colors", isOpen ? "text-primary/50" : "text-muted-foreground/25")} />
      </motion.div>
    </button>
  );
}

export function CollapsibleContent({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
          <div className="pb-2 pl-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MultiChipGrid({ items, selected, onToggle, maxVisible = 24, searchable = false, placeholder = "Buscar…" }: {
  items: string[]; selected: string[]; onToggle: (v: string) => void;
  maxVisible?: number; searchable?: boolean; placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.toLowerCase().includes(q));
  }, [items, search]);

  const visible = showAll ? filtered : filtered.slice(0, maxVisible);
  const hasMore = filtered.length > maxVisible && !showAll;

  if (items.length === 0) return <p className="text-[10px] text-muted-foreground/30 px-1 py-1 italic">Nenhuma opção disponível</p>;

  return (
    <div className="space-y-1.5">
      {searchable && items.length > 8 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder}
            className="w-full h-6 pl-7 pr-2 rounded-md text-[10px] bg-background/30 border border-border/15 placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-border/20 pr-0.5">
        {visible.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button key={item} onClick={() => onToggle(item)}
              className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all duration-150 flex items-center gap-1",
                isSelected ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/5" : "bg-muted/5 border-border/15 text-muted-foreground/55 hover:border-primary/20 hover:text-foreground hover:bg-accent/20")}>
              {isSelected && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
              <span className="truncate max-w-[120px]">{item}</span>
            </button>
          );
        })}
      </div>
      {hasMore && <button onClick={() => setShowAll(true)} className="text-[9px] text-primary/60 hover:text-primary font-medium px-1 transition-colors">+{filtered.length - maxVisible} mais…</button>}
      {search && filtered.length === 0 && <p className="text-[9px] text-muted-foreground/30 px-1 italic">Nenhum resultado</p>}
    </div>
  );
}
