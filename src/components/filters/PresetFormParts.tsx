import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESET_COLORS, PRESET_EMOJIS } from "./preset-utils";

// ─── Color & Emoji Picker ─────────────────────────────────
export function ColorEmojiPicker({
  emoji,
  color,
  onEmojiChange,
  onColorChange,
}: {
  emoji: string;
  color: string;
  onEmojiChange: (e: string) => void;
  onColorChange: (c: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Emoji</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onEmojiChange(e)}
              className={cn(
                "w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all",
                "hover:bg-accent hover:scale-110",
                emoji === e
                  ? "bg-primary/15 ring-2 ring-primary scale-110"
                  : "bg-muted/50"
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cor</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className={cn(
                "w-7 h-7 rounded-full transition-all border-2 hover:scale-110",
                color === c
                  ? "border-foreground scale-110 shadow-lg"
                  : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            >
              {color === c && (
                <Check className="h-3.5 w-3.5 text-primary-foreground mx-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Preview Header ───────────────────────────────────────
export function PresetPreviewHeader({
  emoji,
  color,
  name,
  description,
}: {
  emoji: string;
  color: string;
  name: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 transition-colors"
        style={{ backgroundColor: color + "25" }}
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">
          {name || "Nome do preset"}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {description || "Descrição..."}
        </p>
      </div>
    </div>
  );
}
