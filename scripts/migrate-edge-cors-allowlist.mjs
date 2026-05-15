#!/usr/bin/env node
/**
 * migrate-edge-cors-allowlist
 * --------------------------------------------------------------
 * One-shot codemod que substitui o bloco local
 *
 *   const corsHeaders = {
 *     'Access-Control-Allow-Origin': '*',
 *     ...
 *   };
 *
 * por uma resolução dinâmica baseada no Origin da requisição,
 * usando o helper canônico `getCorsHeaders(req)` em
 * `supabase/functions/_shared/cors.ts`.
 *
 * Estratégia:
 *  - Mantém o nome `corsHeaders` (todas as referências dentro da função
 *    seguem funcionando — não precisa renomear chamadas).
 *  - Insere import de `getCorsHeaders` se ainda não existir.
 *  - Substitui o objeto literal por `let corsHeaders: Record<string, string> = ...`
 *    e logo depois adiciona `corsHeaders = getCorsHeaders(req);` dentro do
 *    handler — só funciona se o handler tem assinatura `(req)`.
 *
 * Como esse último passo é frágil em larga escala, o script usa uma
 * abordagem mais robusta: troca o `const corsHeaders = { ... }` por uma
 * **função builder** `buildCorsHeaders(req)` e reescreve TODAS as
 * referências `corsHeaders` no arquivo para `buildCorsHeaders(req)` —
 * as edges sempre têm `req` em escopo dentro do handler.
 *
 * Skip explícito: arquivos cujos cabeçalhos `*` são intencionais
 * (webhooks server-to-server, públicos por token, jobs de cron).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SKIP = new Set([
  "webhook-inbound",
  "webhook-dispatcher",
  "product-webhook",
  "process-scheduled-reports",
  "send-scheduled-reports",
  "cleanup-notifications",
  "send-digest",
  "quote-followup-reminders",
  "process-queue",
  "health-check",
  "comparisons-public-react",
  "collections-public-react",
  "kit-public-view",
  "quote-public-view",
  "e2e-cleanup",
  "expert-chat", // já usa getCorsHeaders
  "external-db-bridge", // já usa getCorsHeaders
]);

const TARGETS = [
  "bi-copilot",
  "trends-insights",
  "step-up-verify",
  "secrets-manager",
  "connections-health-check",
  "connections-auto-test",
  "connection-tester",
  "kit-ai-builder",
  "kit-identity-suggest",
  "comparison-ai-advisor",
  "comparison-price-watcher",
  "market-intelligence-insights",
  "ownership-repair",
  "ownership-audit",
  "rls-matrix-export",
  "quote-sync",
  "github-credentials-test",
  "block-ip-temporarily",
  "force-global-logout",
  "get-visitor-info",
  "send-transactional-email",
  "mcp-server",
];

let migrated = 0;
let skipped = 0;
const errors = [];

for (const fn of TARGETS) {
  if (SKIP.has(fn)) {
    skipped++;
    continue;
  }
  const path = resolve(`supabase/functions/${fn}/index.ts`);
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch (e) {
    errors.push(`${fn}: ${e.message}`);
    continue;
  }

  const original = src;

  // 1) Adiciona import se ausente
  if (!src.includes("getCorsHeaders") && !src.includes("../_shared/cors.ts")) {
    src = `import { getCorsHeaders } from "../_shared/cors.ts";\n${src}`;
  } else if (!src.includes("getCorsHeaders")) {
    // já importa algo de _shared/cors — adiciona o nome
    src = src.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']\.\.\/_shared\/cors\.ts["']/,
      (_m, names) => {
        const set = new Set(names.split(",").map((s) => s.trim()).filter(Boolean));
        set.add("getCorsHeaders");
        return `import { ${[...set].join(", ")} } from "../_shared/cors.ts"`;
      },
    );
  }

  // 2) Substitui literal `const corsHeaders = { ... };` (com '*') por const cors local + helper
  //    Reescreve para uma constante imutável `BASE_CORS` (não usada) só para preservar histórico,
  //    e substitui referências de `corsHeaders` pela chamada `getCorsHeaders(req)`.
  //    Para evitar reescrita em arquivos sem `req` no escopo, validamos que o arquivo usa `(req`.
  if (!/\(req[\s,:)\]]/.test(src) && !/\(\s*req\s*[:)\,]/.test(src)) {
    errors.push(`${fn}: handler não usa parâmetro 'req' — pulando, requer revisão manual`);
    continue;
  }

  // Remove o bloco literal antigo (3 variantes comuns)
  const literalRe =
    /const\s+corsHeaders\s*=\s*\{\s*["']Access-Control-Allow-Origin["']\s*:\s*["']\*["'][\s\S]*?\};?\s*\n/;
  if (!literalRe.test(src)) {
    skipped++;
    continue; // já não tem o literal (pode estar usando padrão diferente)
  }
  src = src.replace(literalRe, "");

  // Substitui todas as referências livres ao identificador corsHeaders
  // por getCorsHeaders(req). Cuidado: não tocar em propriedades (.corsHeaders)
  // nem strings.
  src = src.replace(/(?<![\w.\$"'`])corsHeaders(?![\w$])/g, "getCorsHeaders(req)");

  if (src === original) {
    skipped++;
    continue;
  }

  writeFileSync(path, src, "utf8");
  migrated++;
  console.log(`  ✔ ${fn}`);
}

console.log("\n— Resumo —");
console.log(`  Migradas: ${migrated}`);
console.log(`  Puladas:  ${skipped}`);
if (errors.length) {
  console.log(`  Erros:    ${errors.length}`);
  for (const e of errors) console.log(`    ! ${e}`);
}
