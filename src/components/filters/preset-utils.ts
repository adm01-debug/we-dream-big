// ─── Preset Constants & Utilities ─────────────────────────
import type { FilterState } from "./FilterPanel";

export const PRESET_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7",
];

export const PRESET_EMOJIS = [
  "📦", "🎯", "⭐", "🔥", "💎", "🏷️", "🎨", "🛒",
  "📋", "🚀", "💡", "🎁", "🏆", "📌", "✨", "🔖",
  "🎪", "🧲", "💼", "🎒", "🏅", "🔔", "💫", "🧩",
  "🌟", "🎈", "🧳", "📎", "🎵", "🌈", "⚡", "🍀",
  "🦋", "🔑",
];

/** Count the number of active filter dimensions in a FilterState */
export function countFilters(filters: FilterState): number {
  let count = 0;
  if (filters.categories?.length) count += filters.categories.length;
  if (filters.suppliers?.length) count += filters.suppliers.length;
  if (filters.colorGroups?.length) count += filters.colorGroups.length;
  if (filters.colorVariations?.length) count += filters.colorVariations.length;
  if (filters.genders?.length) count += filters.genders.length;
  if (filters.sizes?.length) count += filters.sizes.length;
  if (filters.priceRange?.[0] > 0 || filters.priceRange?.[1] < 500) count++;
  if (filters.stockRange?.[0] > 0) count++;
  if (filters.onlyInStock) count++;
  if (filters.onlyFeatured) count++;
  if (filters.onlyNew) count++;
  return count;
}

/** Build a human-readable summary of a preset's filters */
export function summarizeFilters(filters: FilterState): string {
  const parts: string[] = [];
  if (filters.categories?.length) parts.push(`${filters.categories.length} categoria${filters.categories.length > 1 ? "s" : ""}`);
  if (filters.suppliers?.length) parts.push(`${filters.suppliers.length} fornecedor${filters.suppliers.length > 1 ? "es" : ""}`);
  if (filters.colorGroups?.length) parts.push(`${filters.colorGroups.length} cor${filters.colorGroups.length > 1 ? "es" : ""}`);
  if (filters.genders?.length) parts.push(`${filters.genders.length} gênero${filters.genders.length > 1 ? "s" : ""}`);
  if (filters.sizes?.length) parts.push(`${filters.sizes.length} tamanho${filters.sizes.length > 1 ? "s" : ""}`);
  if (filters.priceRange?.[0] > 0 || filters.priceRange?.[1] < 500) parts.push("faixa de preço");
  if (filters.onlyInStock) parts.push("em estoque");
  if (filters.onlyFeatured) parts.push("destaques");
  if (filters.onlyNew) parts.push("novidades");
  return parts.length > 0 ? parts.join(" · ") : "Sem filtros";
}
