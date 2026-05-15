/**
 * react-warning-guard — instala um spy em console.error/console.warn que
 * captura warnings do React e expõe utilitários para asserções.
 *
 * Foco estrito: a mensagem canônica
 *   "Function components cannot be given refs"
 * (causada por componentes de função sob Radix `asChild`, motion, etc.,
 * sem `React.forwardRef`).
 *
 * Política de falsos positivos:
 * - `expectNoRefWarning()` só falha quando essa frase exata aparece. Outras
 *   variações que historicamente vinham junto ("Attempts to access this ref
 *   will fail.") são tratadas como contexto/ruído e NUNCA falham por si.
 * - Uma ALLOWLIST configurável remove ruídos conhecidos (act() warnings,
 *   "not wrapped in act", `useLayoutEffect` no SSR, mensagens injetadas pelo
 *   `react-router` em dev) antes da classificação.
 * - `expectNoRelevantWarnings()` continua disponível para testes que
 *   queiram ser mais estritos, mas o gate global usa apenas o padrão exato.
 *
 * Uso típico em testes:
 *
 *   const guard = installReactWarningGuard();
 *   render(<MyComponent />);
 *   guard.expectNoRefWarning();   // só falha em "Function components cannot be given refs"
 *   guard.dispose();
 */
import { vi } from "vitest";

/**
 * Padrão ÚNICO que faz o guard falhar. Mantemos como RegExp para tolerar
 * pequenas variações de pontuação/case, mas a frase central é fixa.
 */
const STRICT_REF_WARNING = /Function components cannot be given refs/i;

/**
 * Padrões que indicam contexto adicional do mesmo aviso (ex: a segunda linha
 * "Attempts to access this ref will fail."). Não falham sozinhos — só são
 * usados para enriquecer a mensagem de erro quando o STRICT já disparou.
 */
const REF_WARNING_CONTEXT = [
  /Attempts to access this ref will fail/i,
  /Did you mean to use React\.forwardRef\(\)/i,
];

/**
 * Outros warnings que podem ser interessantes para auditoria, mas que NÃO
 * fazem o gate falhar por padrão.
 */
const OTHER_RELEVANT = [
  /Each child in a list should have a unique "key" prop/i,
  /validateDOMNesting/i,
];

/**
 * Allowlist de ruído conhecido — mensagens que devem ser completamente
 * ignoradas (não contam como warning, não vão para `messages`).
 * Mantemos a lista pequena e bem-justificada.
 */
const NOISE_ALLOWLIST: RegExp[] = [
  // Ambientes de teste sem flushSync; comum quando um componente fora do
  // controle do teste atualiza estado de forma assíncrona.
  /not wrapped in act\(/i,
  /An update to .* inside a test was not wrapped in act/i,
  // React Router v6 dev warnings que aparecem ao montar trees parciais.
  /React Router Future Flag Warning/i,
  /No routes matched location/i,
  // useLayoutEffect SSR warning quando algum componente é renderizado em
  // jsdom sem layout — irrelevante para o gate de ref.
  /useLayoutEffect does nothing on the server/i,
  // Aviso de Radix quando Dialog é montado sem DialogTitle em mocks.
  /DialogContent[^]*requires a[^]*DialogTitle/i,
  /Missing `?Description`?/i,
];

export interface ReactWarningGuard {
  /** Todas as mensagens capturadas (após filtro de allowlist). */
  readonly messages: string[];
  /** Mensagens que casam com o padrão estrito de ref warning. */
  readonly refWarnings: string[];
  /** Mensagens em `OTHER_RELEVANT` (key/DOM nesting). */
  readonly otherWarnings: string[];
  /** Mensagens ignoradas pela allowlist (somente para debug). */
  readonly suppressed: string[];
  /**
   * Falha o teste **somente** se a mensagem
   * "Function components cannot be given refs" tiver aparecido.
   */
  expectNoRefWarning(context?: string): void;
  /**
   * Modo estrito opcional: falha em ref + key + DOM nesting.
   * Não é usado pelo gate global; útil em testes específicos.
   */
  expectNoRelevantWarnings(context?: string): void;
  /** Restaura console.error/warn originais. */
  dispose(): void;
}

export function installReactWarningGuard(): ReactWarningGuard {
  const messages: string[] = [];
  const refWarnings: string[] = [];
  const otherWarnings: string[] = [];
  const refContext: string[] = [];
  const suppressed: string[] = [];

  const capture = (args: unknown[]) => {
    const msg = args
      .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : ""))
      .join(" ");
    if (!msg) return;

    if (NOISE_ALLOWLIST.some((re) => re.test(msg))) {
      suppressed.push(msg);
      return;
    }

    messages.push(msg);
    if (STRICT_REF_WARNING.test(msg)) refWarnings.push(msg);
    else if (REF_WARNING_CONTEXT.some((re) => re.test(msg))) refContext.push(msg);
    if (OTHER_RELEVANT.some((re) => re.test(msg))) otherWarnings.push(msg);
  };

  const errSpy = vi.spyOn(console, "error").mockImplementation((...args) => capture(args));
  const warnSpy = vi.spyOn(console, "warn").mockImplementation((...args) => capture(args));

  return {
    get messages() { return messages; },
    get refWarnings() { return refWarnings; },
    get otherWarnings() { return otherWarnings; },
    get suppressed() { return suppressed; },
    expectNoRefWarning(context?: string) {
      if (refWarnings.length === 0) return;
      const where = context ? ` (${context})` : "";
      const ctx = refContext.length
        ? "\n\nContexto adicional capturado:\n" +
          refContext.map((m, i) => `  · ${m}`).join("\n")
        : "";
      throw new Error(
        `React ref warning detectado${where}:\n` +
          refWarnings.map((m, i) => `  [${i + 1}] ${m}`).join("\n") +
          ctx +
          "\n\nProvável causa: um componente de função recebeu `ref` sem usar React.forwardRef.\n" +
          "Comum sob Radix `asChild` (TooltipTrigger, PopoverTrigger, DropdownMenuTrigger).\n" +
          "Solução: wrap o filho em <span className=\"inline-flex\"> ou converta-o para forwardRef.",
      );
    },
    expectNoRelevantWarnings(context?: string) {
      const all = [...refWarnings, ...otherWarnings];
      if (all.length === 0) return;
      const where = context ? ` (${context})` : "";
      throw new Error(
        `React warnings detectados${where}:\n` +
          all.map((m, i) => `  [${i + 1}] ${m}`).join("\n"),
      );
    },
    dispose() {
      errSpy.mockRestore();
      warnSpy.mockRestore();
    },
  };
}
