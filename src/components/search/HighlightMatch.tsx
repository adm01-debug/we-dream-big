import { memo } from "react";

interface HighlightMatchProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Highlights matching portions of text based on the search query.
 * Splits the query into words and highlights each match.
 */
export const HighlightMatch = memo(function HighlightMatch({
  text,
  query,
  className = "",
  highlightClassName = "bg-primary/20 text-primary font-semibold rounded-sm px-0.5",
}: HighlightMatchProps) {
  if (!query || query.length < 2) {
    return <span className={className}>{text}</span>;
  }

  // Escape regex special chars and split into words
  const words = query
    .trim()
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (words.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className={highlightClassName}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
});
