/**
 * VoiceSuggestionsPanel — Shows command suggestions or recent commands + text input.
 */
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Keyboard, X } from "lucide-react";
import type { VoiceAgentPhase } from "@/hooks/useVoiceAgent";
import type { VoiceHistoryEntry } from "@/hooks/voice/useVoiceHistory";

const SUGGESTION_COMMANDS = [
  "Quero canetas azuis baratas",
  "Mostra mochilas ecológicas",
  "Pergunte ao Flow qual o melhor brinde",
  "Abre os orçamentos",
];

interface VoiceSuggestionsPanelProps {
  phase: VoiceAgentPhase;
  isBooting: boolean;
  recentCommands?: VoiceHistoryEntry[];
  onCommandSelect?: (command: string) => void;
  onSimulateCommand?: (command: string) => void;
  onClose: () => void;
}

export function VoiceSuggestionsPanel({
  phase,
  isBooting,
  recentCommands,
  onCommandSelect,
  onSimulateCommand,
  onClose,
}: VoiceSuggestionsPanelProps) {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textCommand, setTextCommand] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Suggestions / Recent Commands */}
      {phase === "idle" && !isBooting && (
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-3 text-center w-full"
        >
          {recentCommands && recentCommands.length > 0 ? (
            <>
              <p className="text-[10px] text-white/25 uppercase tracking-widest font-medium">
                Comandos recentes
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {recentCommands.slice(0, 4).map((entry) => (
                  <button
                    key={entry.timestamp}
                    onClick={() => onCommandSelect?.(entry.transcript)}
                    className="group px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-full text-xs text-white/35 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                  >
                    <span className="group-hover:tracking-wide transition-all duration-200">"{entry.transcript}"</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] text-white/25 uppercase tracking-widest font-medium">
                Experimente dizer
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTION_COMMANDS.map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => onCommandSelect?.(cmd)}
                    className="group px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-full text-xs text-white/35 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                  >
                    <span className="group-hover:tracking-wide transition-all duration-200">"{cmd}"</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Text input */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full overflow-hidden"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (textCommand.trim() && onSimulateCommand) {
                  onSimulateCommand(textCommand.trim());
                  setTextCommand("");
                  setShowTextInput(false);
                }
              }}
              className="flex gap-2"
            >
              <input
                ref={textInputRef}
                type="text"
                value={textCommand}
                onChange={(e) => setTextCommand(e.target.value)}
                placeholder="Digite um comando..."
                className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10"
                autoFocus
                disabled={phase === "processing" || phase === "speaking"}
              />
              <button
                type="submit"
                disabled={!textCommand.trim() || phase === "processing" || phase === "speaking"}
                className="h-9 w-9 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 flex items-center justify-center text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="w-full flex items-center justify-between mt-1">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[10px] text-white/20"
        >
          <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px] font-mono border border-white/10">ESC</kbd> fechar
          <span className="mx-1.5 text-white/10">·</span>
          <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px] font-mono border border-white/10">SPACE</kbd> ativar
        </motion.p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setShowTextInput((v) => !v);
              if (!showTextInput) setTimeout(() => textInputRef.current?.focus(), 100);
            }}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/80 transition-colors"
            aria-label="Digitar comando"
            title="Digitar comando (sem microfone)"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/80 transition-colors"
            aria-label="Fechar assistente de voz"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
