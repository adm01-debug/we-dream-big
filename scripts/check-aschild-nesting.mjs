#!/usr/bin/env node
/**
 * Detector estático: aninhamento `<XTrigger asChild>` diretamente dentro de
 * outro `<YTrigger asChild>` sem um wrapper neutro (`<span>` / `<div>`)
 * entre eles. Esse padrão emite o warning do React
 *   "Function components cannot be given refs"
 * porque o Slot externo tenta fundir refs com o filho que já é um Slot,
 * sem um nó DOM que receba a ref final.
 *
 * Padrão correto (cf. mem://ui/radix-nesting-ref-standard):
 *
 *   <TooltipTrigger asChild>
 *     <span className="inline-flex">
 *       <PopoverTrigger asChild>
 *         <Button .../>
 *       </PopoverTrigger>
 *     </span>
 *   </TooltipTrigger>
 *
 * Allowlist por linha: `// aschild-allow: motivo`
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".git"].includes(e.name)) continue;
      out.push(...(await walk(full)));
    } else if (/\.(tsx|jsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

const violations = [];

async function checkFile(file) {
  const source = await fs.readFile(file, "utf8");
  const lines = source.split("\n");

  // Procura `<X asChild>` (com ou sem outras props) e olha as próximas
  // linhas significativas; se o primeiro filho for outro `<Y asChild>`,
  // sem `<span` / `<div` interposto, marca violação.
  const openRe = /<([A-Z][A-Za-z0-9_]*)\s[^>]*?asChild\b[^>]*?>/g;
  let m;
  while ((m = openRe.exec(source))) {
    const trigger = m[1];
    const startIdx = m.index;
    const lineNum = source.slice(0, startIdx).split("\n").length;

    // Busca o próximo token JSX significativo depois deste `>`
    const tail = source.slice(openRe.lastIndex, openRe.lastIndex + 400);
    const nextOpen = /<\s*([A-Za-z][A-Za-z0-9_]*)([\s>])/.exec(tail);
    if (!nextOpen) continue;
    const childTag = nextOpen[1];
    // OK: wrapper neutro
    if (/^(span|div|button|a|li|fragment)$/i.test(childTag)) continue;
    // OK: filho não usa asChild
    const childOpenIdx = tail.indexOf(nextOpen[0]);
    const childOpenEnd = tail.indexOf(">", childOpenIdx);
    if (childOpenEnd === -1) continue;
    const childOpenTag = tail.slice(childOpenIdx, childOpenEnd + 1);
    if (!/\basChild\b/.test(childOpenTag)) continue;
    // OK: tag filha é um Trigger? (qualquer componente serve, mas aqui filtramos)
    if (!/Trigger$/.test(childTag)) continue;

    // Allowlist
    const around = lines.slice(Math.max(0, lineNum - 2), lineNum + 1).join(" ");
    if (/aschild-allow:/i.test(around)) continue;

    violations.push({
      file: path.relative(ROOT, file),
      line: lineNum,
      outer: trigger,
      inner: childTag,
    });
  }
}

const files = await walk(SRC);
await Promise.all(files.map(checkFile));

if (violations.length === 0) {
  console.log(
    `✓ asChild-nesting checker: nenhum aninhamento problemático encontrado (${files.length} arquivos).`,
  );
  process.exit(0);
}

console.error(
  `\n✗ ${violations.length} aninhamento(s) <Trigger asChild><Trigger asChild> sem wrapper:\n`,
);
for (const v of violations) {
  console.error(
    `  ${v.file}:${v.line}  <${v.outer} asChild><${v.inner} asChild>...  → envolva o trigger interno em <span className="inline-flex">`,
  );
}
console.error(
  `\nReferência: mem://ui/radix-nesting-ref-standard. Allowlist: '// aschild-allow: motivo'.`,
);
process.exit(1);
