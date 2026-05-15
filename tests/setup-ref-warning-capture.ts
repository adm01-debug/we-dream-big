/**
 * Captura GLOBAL de console.error/warn durante toda a suite de testes.
 *
 * Objetivo: além dos guards locais (`installReactWarningGuard`), ter uma
 * rede de segurança que falha o pipeline se QUALQUER teste dispara o
 * warning canônico do React "Function components cannot be given refs"
 * (ou o seu acompanhamento "Attempts to access this ref will fail"),
 * mesmo em testes que não usam o guard explicitamente.
 *
 * Comportamento:
 *  - Sempre coleta todas as mensagens (stdout: nenhuma; arquivo: snapshot).
 *  - Exporta o snapshot completo para `coverage/console-snapshot.json`
 *    (ou `CONSOLE_SNAPSHOT_PATH`) como artifact auditável do CI.
 *  - Em modo estrito (`STRICT_REF_WARNINGS=1`), falha o processo no
 *    `afterAll` global se houver ref warnings que não foram interceptados
 *    por um `installReactWarningGuard` local.
 *
 * Como funciona a coexistência com `installReactWarningGuard`:
 *  - O guard local usa `vi.spyOn(console, 'error')` que **substitui** a
 *    implementação do método. Portanto, mensagens capturadas pelo guard
 *    NÃO chegam aqui — o guard já as inspeciona e o teste dele decide
 *    se passa ou falha. Isso é exatamente o comportamento desejado:
 *    sanity tests do guard injetam warnings de propósito, e não devem
 *    contar contra o critério estrito global.
 *
 * Ative no CI com:
 *   STRICT_REF_WARNINGS=1 npm test
 */
import { afterAll } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const STRICT = process.env.STRICT_REF_WARNINGS === "1";
const SNAPSHOT_PATH = resolve(
  process.cwd(),
  process.env.CONSOLE_SNAPSHOT_PATH ?? "coverage/console-snapshot.json",
);

/**
 * Padrão ÚNICO que aciona o gate estrito. Mantemos alinhado ao
 * `react-warning-guard` local: apenas a frase canônica do React causa
 * falha. A linha de contexto "Attempts to access this ref will fail"
 * NÃO é trigger isolado (era falso positivo em testes que logam contexto
 * sem reproduzir o aviso real).
 */
const REF_PATTERNS = [
  /Function components cannot be given refs/i,
];

interface CapturedEntry {
  level: "error" | "warn";
  message: string;
  timestamp: string;
  isRefWarning: boolean;
}

const captured: CapturedEntry[] = [];

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) return a.message;
      try { return JSON.stringify(a); } catch { return String(a); }
    })
    .join(" ");
}

function makeWrapper(
  level: "error" | "warn",
  original: (...args: unknown[]) => void,
) {
  return (...args: unknown[]) => {
    const message = formatArgs(args);
    const isRef = REF_PATTERNS.some((re) => re.test(message));
    captured.push({
      level,
      message,
      timestamp: new Date().toISOString(),
      isRefWarning: isRef,
    });
    // Mantém o comportamento original para não suprimir output útil.
    original(...args);
  };
}

// Instala wrappers UMA vez por processo de worker. Vitest usa workers
// independentes; cada um produz seu próprio snapshot — eles serão
// fundidos pelo step de CI antes da auditoria.
const origError = console.error.bind(console);
const origWarn = console.warn.bind(console);
console.error = makeWrapper("error", origError) as typeof console.error;
console.warn = makeWrapper("warn", origWarn) as typeof console.warn;

afterAll(() => {
  // Persistência do snapshot (sempre — útil mesmo fora do modo estrito).
  try {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    // Cada worker grava em arquivo único para evitar race; o CI consolida.
    const workerSuffix = process.env.VITEST_POOL_ID ?? process.pid;
    const path = SNAPSHOT_PATH.replace(/\.json$/, `.${workerSuffix}.json`);
    writeFileSync(
      path,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          worker: workerSuffix,
          strict: STRICT,
          totalEntries: captured.length,
          refWarnings: captured.filter((c) => c.isRefWarning).length,
          entries: captured,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    origError("[ref-warning-capture] falha ao gravar snapshot:", err);
  }

  if (STRICT) {
    const refs = captured.filter((c) => c.isRefWarning);
    if (refs.length > 0) {
      const summary =
        `\n[STRICT_REF_WARNINGS] ${refs.length} ref warning(s) escapou(aram) ` +
        `dos guards locais durante a suite:\n` +
        refs
          .slice(0, 10)
          .map((r, i) => `  [${i + 1}] (${r.level}) ${r.message.slice(0, 280)}`)
          .join("\n") +
        (refs.length > 10 ? `\n  ...e mais ${refs.length - 10}.` : "") +
        `\n\nSnapshot completo: ${SNAPSHOT_PATH}\n`;
      origError(summary);
      // Vitest não tem hook "fail-on-after-all", então usamos exit code.
      // Postergamos via setImmediate para garantir flush dos reporters.
      process.exitCode = 1;
    }
  }
});
