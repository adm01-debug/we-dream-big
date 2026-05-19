/**
 * VoiceTranscriptPanel — Displays live transcript and agent response in the voice overlay.
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  MicOff,
  Search,
  Filter,
  Navigation,
  ArrowUpDown,
  Trash2,
  HelpCircle,
} from "lucide-react";
import type { VoiceAgentAction, VoiceAgentPhase } from "@/hooks/intelligence";
import type { ReactElement } from "react";

const ACTION_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  search: { icon: () => null, label: "Busca", color: "text-primary" },
  filter: { icon: () => null, label: "Filtro", color: "text-accent-foreground" },
  navigate: { icon: () => null, label: "Navegação", color: "text-success" },
  sort: { icon: () => null, label: "Ordenação", color: "text-orange" },
  clear: { icon: () => null, label: "Limpar", color: "text-destructive" },
  answer: { icon: () => null, label: "Resposta", color: "text-secondary-foreground" },
};

// Re-import real icons lazily to keep the file light
ACTION_META.search.icon = Search;
ACTION_META.filter.icon = Filter;
ACTION_META.navigate.icon = Navigation;
ACTION_META.sort.icon = ArrowUpDown;
ACTION_META.clear.icon = Trash2;
ACTION_META.answer.icon = HelpCircle;

interface VoiceTranscriptPanelProps {
  phase: VoiceAgentPhase;
  partialTranscript: string;
  finalTranscript: string;
  agentResponse: string;
  error?: string | null;
  currentAction?: VoiceAgentAction | null;
}

export function VoiceTranscriptPanel({
  phase,
  partialTranscript,
  finalTranscript,
  agentResponse,
  error,
  currentAction,
}: VoiceTranscriptPanelProps): ReactElement {
  const showTranscript = partialTranscript || finalTranscript;

  return (
    <>
      {/* Live transcript */}
      <AnimatePresence mode="wait">
        {showTranscript && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl px-5 py-4 backdrop-blur-sm">
              <p className="text-[10px] text-white/35 uppercase tracking-[0.15em] font-medium mb-1.5">
                {phase === "listening" ? "🎙️ Você está dizendo:" : "✅ Você disse:"}
              </p>
              <p className="text-[15px] font-display font-medium text-white/90 leading-relaxed">
                "{partialTranscript || finalTranscript}"
                {phase === "listening" && partialTranscript && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-primary ml-0.5"
                  >
                    |
                  </motion.span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent response */}
      <AnimatePresence mode="wait">
        {agentResponse && (phase === "speaking" || phase === "idle") && (
          <motion.div
            key="agent-response"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="w-full"
          >
            <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl px-5 py-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                {(() => {
                  const actionType = currentAction?.action || "answer";
                  const actionMeta = ACTION_META[actionType] || ACTION_META.answer;
                  const Icon = actionMeta.icon;
                  return (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10, stiffness: 200 }}
                      className="h-8 w-8 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center shrink-0 mt-0.5"
                    >
                      <Icon className={`h-4 w-4 ${actionMeta.color}`} />
                    </motion.div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[10px] text-white/35 uppercase tracking-[0.15em] font-medium">Assistente</p>
                    {currentAction && currentAction.action !== "answer" && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-[9px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] font-medium ${ACTION_META[currentAction.action]?.color || "text-white/50"}`}
                      >
                        {ACTION_META[currentAction.action]?.label}
                      </motion.span>
                    )}
                  </div>
                  <p className="text-sm font-display text-white/90 leading-relaxed">{agentResponse}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full bg-destructive/10 border border-destructive/20 rounded-2xl px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                <MicOff className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
                <p className="text-xs text-white/40 mt-1">Toque no orbe para tentar novamente</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
