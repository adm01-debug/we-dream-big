/**
 * GlobalSearchPalette — High-contrast black redesign
 * Helper components extracted to GlobalSearchHelpers.tsx
 */
import { lazy, Suspense, useEffect, useCallback } from 'react';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Package,
  FileText,
  Loader2,
  Sparkles,
  Brain,
  Mic,
  Search,
  ChevronRight,
  Terminal,
  Sun,
  Moon,
  LogOut,
  PlusCircle,
  Users,
  Calculator,
  LifeBuoy,
  AlertCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useGlobalSearch } from './useGlobalSearch';
import { typeConfig } from './search-types';
import { GlobalSearchIdleState } from './GlobalSearchIdleState';
import {
  paletteItemStateClass,
  staggerStyle,
  type QuickAction,
  typeColorMap,
} from './GlobalSearchHelpers';
import { HighlightMatch } from './HighlightMatch';
import { EmptySearchState } from './EmptySearchState';

const LazyVoiceOverlay = lazy(() => import('./VoiceSearchOverlayConnected'));

/* ── Quick Actions ── */
const quickActions: QuickAction[] = [
...
          {/* AI Processing Banner */}
          {s.isAIProcessing && (
            <div className="from-primary/12 via-primary/6 to-primary/3 mx-2 mt-3 flex items-center gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r px-4 py-3.5 shadow-sm shadow-primary/5 duration-300 animate-in fade-in-0 slide-in-from-top-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 shadow-inner">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold text-primary">
                  Analisando sua busca...
                </p>
                <p className="mt-0.5 text-[11px] text-primary/50">
                  IA identificando intenção e filtros
                </p>
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
            </div>
          )}

          {/* Intent chips */}
          {s.searchIntent && !s.isSearching && s.results.length > 0 && (
            <div className="mx-2 mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 duration-200 animate-in fade-in-0 slide-in-from-top-1 [background:linear-gradient(90deg,hsl(var(--command-surface-raised)),hsl(var(--command-surface)))] [border-color:hsl(var(--command-border))]">
              <div className="bg-primary/12 flex h-6 w-6 items-center justify-center rounded-lg">
                <Brain className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold [color:hsl(var(--command-text-muted))]">
                Entendi:
              </span>
              {s.searchIntent.type !== 'mixed' && typeConfig[s.searchIntent.type] && (
                <Badge
                  variant="outline"
                  className="h-5 rounded-lg text-[11px] font-semibold [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border-strong))]"
                >
                  {typeConfig[s.searchIntent.type].label}s
                </Badge>
              )}
              {s.searchIntent.filters.category && (
                <Badge
                  variant="secondary"
                  className="h-5 rounded-lg text-[11px] [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]"
                >
                  {s.searchIntent.filters.category}
                </Badge>
              )}
              {s.searchIntent.filters.color && (
                <Badge
                  variant="secondary"
                  className="h-5 rounded-lg text-[11px] [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]"
                >
                  Cor: {s.searchIntent.filters.color}
                </Badge>
              )}
              {s.searchIntent.filters.priceRange && (
                <Badge
                  variant="secondary"
                  className="h-5 rounded-lg text-[11px] [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]"
                >
                  {
                    { low: 'Preço baixo', medium: 'Preço médio', high: 'Premium' }[
                      s.searchIntent.filters.priceRange
                    ]
                  }
                </Badge>
              )}
              {s.searchIntent.filters.status && (
                <Badge
                  variant="secondary"
                  className="h-5 rounded-lg text-[11px] [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]"
                >
                  Status: {s.searchIntent.filters.status}
                </Badge>
              )}
              {s.searchIntent.filters.clientName && (
                <Badge
                  variant="secondary"
                  className="h-5 rounded-lg text-[11px] [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]"
                >
                  Cliente: {s.searchIntent.filters.clientName}
                </Badge>
              )}
            </div>
          )}

          {/* Loading state */}
...
          {/* Search Results — safeGroupedResults previne crash se groupedResults chegar undefined */}
          {!s.isSearching &&
            Object.entries(safeGroupedResults).map(([type, items]) => {
              const config = typeConfig[type];
              if (!config) return null;
              const BaseIcon = config.icon;
              const typeColors = typeColorMap[type] || typeColorMap.default;

              return (
                <CommandGroup
                  key={type}
                  heading={config.label + 's'}
                  className="duration-300 animate-in fade-in-0 slide-in-from-bottom-2 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-4"
                >
                  {(items ?? []).map((result, i) => (
                    <CommandItem
                      key={result.id}
                      value={`${type}-${result.id}-${result.title}`}
                      onSelect={() => s.handleSelect(result.href)}
                      className={cn(
                        'mx-2 flex items-center gap-3.5 rounded-xl px-3 py-3 duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
                        paletteItemStateClass,
                      )}
                      style={staggerStyle(i, 50)}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
                          typeColors.bg,
                        )}
                      >
                        {type === 'command' && result.metadata?.iconName ? (
                          (() => {
                            const CmdIcon =
                              commandIconMap[result.metadata.iconName as string] || Terminal;
                            return (
                              <CmdIcon className={cn('h-4 w-4', typeColors.text)} />
                            );
                          })()
                        ) : (
                          <BaseIcon className={cn('h-4 w-4', typeColors.text)} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          <HighlightMatch text={result.title} query={s.query} />
                        </p>
                        {result.subtitle && (
                          <p className="mt-0.5 truncate text-[11px] [color:hsl(var(--command-text-muted))]">
                            <HighlightMatch
                              text={result.subtitle}
                              query={s.query}
                              highlightClassName="bg-primary/15 text-primary font-semibold rounded-sm px-0.5"
                            />
                          </p>
                        )}
                      </div>

                      {/* Power-user indicator for first 9 results */}
                      {i < 9 && !s.query.trim() && (
                        <kbd className="hidden h-5 w-5 items-center justify-center rounded border border-border bg-muted/30 text-[10px] font-bold text-muted-foreground sm:flex">
                          {i + 1}
                        </kbd>
                      )}

                      <Badge
                        variant="outline"
                        className="h-5 shrink-0 rounded-lg text-[10px] font-medium [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border-strong))]"
                      >
                        {config.label}
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}


          {/* Typing suggestions — safeTypingSuggestions previne crash se typingSuggestions for undefined */}
          {safeTypingSuggestions.length > 0 &&
            s.query.length >= 2 &&
            s.query.length < 5 &&
            !s.isSearching && (
              <CommandGroup heading="Sugestões" className="duration-200 animate-in fade-in-0">
                {safeTypingSuggestions.map((suggestion, i) => (
                  <CommandItem
                    key={`sug-${i}`}
                    value={`suggestion-${suggestion}`}
                    onSelect={() => s.handleSuggestionClick(suggestion)}
                    className={cn(
                      'mx-2 flex items-center gap-3.5 rounded-xl px-3 py-3 duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
                      paletteItemStateClass,
                    )}
                    style={staggerStyle(i)}
                  >
                    <div className="from-primary/12 to-primary/4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br">
                      <Sparkles className="h-4 w-4 text-primary/70" />
                    </div>
                    <span className="flex-1 text-[13px] font-medium">{suggestion}</span>
                    <ChevronRight className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

          {/* IDLE STATE — todos os props recebem fallback seguro */}
          {s.query.length < 2 && !s.isSearching && (
            <GlobalSearchIdleState
              history={safeHistory}
              popularProducts={safePopularProducts}
              contextualSuggestions={safeContextualSuggestions}
              quickSuggestions={safeQuickSuggestions}
              routeContext={safeRouteContext}
              quickActionsData={quickActions}
              onSuggestionClick={s.handleSuggestionClick}
              onSelect={s.handleSelect}
              onRemoveFromHistory={s.handleRemoveFromHistory}
            />
          )}
        </CommandList>

        {/* Premium Footer */}
        <div className="flex select-none items-center justify-between border-t px-5 py-2.5 [background:linear-gradient(90deg,hsl(var(--command-surface-raised)),hsl(var(--command-surface)),hsl(var(--command-surface-raised)))] [border-color:hsl(var(--command-border))]">
          <div className="flex items-center gap-4 text-[11px] [color:hsl(var(--command-text-subtle))]">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
                ↵
              </kbd>
              <span>Selecionar</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
                ↑↓
              </kbd>
              <span>Navegar</span>
            </span>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <kbd className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
                1-9
              </kbd>
              <span>Saltar</span>
            </span>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <kbd className="inline-flex h-[18px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
                ⌘↵
              </kbd>
              <span>Nova aba</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
                ESC
              </kbd>
              <span>Fechar</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary/40">
            <div className="bg-primary/8 flex h-4 w-4 items-center justify-center rounded-md">
              <Brain className="h-2.5 w-2.5" />
            </div>
            <span>Busca com IA</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
