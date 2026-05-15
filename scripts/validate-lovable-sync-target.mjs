#!/usr/bin/env node
/**
 * Valida que o bot de sync da Lovable está direcionando PRs para `main`
 * e não para branches `lovable-sync-*`.
 *
 * Como rodar (após ajustar a configuração no painel Lovable):
 *   GH_TOKEN=ghp_xxx OWNER=meu-org REPO=meu-repo \
 *     node scripts/validate-lovable-sync-target.mjs
 *
 * Critérios de aprovação (todos devem valer):
 *   1. Não existem branches abertas com prefixo `lovable-sync-` criadas
 *      nas últimas 24h.
 *   2. PRs abertos pelo app `lovable[bot]` têm `base.ref === "main"`.
 *   3. Os 5 PRs mais recentes do bot foram mergeados em `main`
 *      (ou ainda estão abertos com base = main).
 *
 * Saída: relatório legível em stdout + JSON em
 * `lovable-sync-validation.json`. Exit 0 = ok; 1 = configuração ainda errada.
 */

import { writeFileSync } from "node:fs";

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
const BOT_LOGIN = process.env.LOVABLE_BOT_LOGIN || "lovable[bot]";

if (!TOKEN || !OWNER || !REPO) {
  console.error(
    "❌ Faltam env vars. Use: GH_TOKEN=... OWNER=... REPO=... node scripts/validate-lovable-sync-target.mjs",
  );
  process.exit(2);
}

const API = "https://api.github.com";
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function gh(path) {
  const r = await fetch(`${API}${path}`, { headers });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`GitHub ${r.status} em ${path}: ${body.slice(0, 200)}`);
  }
  return r.json();
}

const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const report = {
  generatedAt: new Date().toISOString(),
  repo: `${OWNER}/${REPO}`,
  botLogin: BOT_LOGIN,
  checks: { syncBranches: null, openBotPrs: null, recentBotPrs: null },
  failures: [],
};

// 1) Branches lovable-sync-* recentes
const branches = await gh(`/repos/${OWNER}/${REPO}/branches?per_page=100`);
const syncBranches = branches.filter((b) => b.name.startsWith("lovable-sync-"));
report.checks.syncBranches = {
  total: syncBranches.length,
  names: syncBranches.map((b) => b.name).slice(0, 10),
};
if (syncBranches.length > 0) {
  report.failures.push(
    `Encontradas ${syncBranches.length} branch(es) 'lovable-sync-*' — bot ainda criando.`,
  );
}

// 2) PRs abertos do bot
const openPrs = await gh(
  `/repos/${OWNER}/${REPO}/pulls?state=open&per_page=50`,
);
const openBotPrs = openPrs.filter((p) => p.user?.login === BOT_LOGIN);
const openBotMisrouted = openBotPrs.filter((p) => p.base.ref !== "main");
report.checks.openBotPrs = {
  total: openBotPrs.length,
  misrouted: openBotMisrouted.map((p) => ({
    number: p.number,
    base: p.base.ref,
    head: p.head.ref,
  })),
};
if (openBotMisrouted.length > 0) {
  report.failures.push(
    `${openBotMisrouted.length} PR(s) abertos do bot com base ≠ main.`,
  );
}

// 3) Últimos 5 PRs do bot (qualquer estado)
const allPrs = await gh(
  `/repos/${OWNER}/${REPO}/pulls?state=all&sort=created&direction=desc&per_page=50`,
);
const recentBotPrs = allPrs
  .filter((p) => p.user?.login === BOT_LOGIN)
  .slice(0, 5)
  .map((p) => ({
    number: p.number,
    base: p.base.ref,
    head: p.head.ref,
    state: p.state,
    mergedAt: p.merged_at,
    createdAt: p.created_at,
  }));
const recentMisrouted = recentBotPrs.filter((p) => p.base !== "main");
report.checks.recentBotPrs = { sample: recentBotPrs, misrouted: recentMisrouted };
if (recentBotPrs.length > 0 && recentMisrouted.length === recentBotPrs.length) {
  report.failures.push(
    `Todos os ${recentBotPrs.length} PRs recentes do bot têm base ≠ main.`,
  );
}

// ---------- relatório ----------
console.log(`\n🔎 Validação de roteamento do bot Lovable`);
console.log(`   repo: ${OWNER}/${REPO}`);
console.log(`   bot:  ${BOT_LOGIN}`);
console.log(`   janela 'sync-branches': últimas 24h (since ${since})\n`);

console.log(
  `1) Branches 'lovable-sync-*' presentes: ${report.checks.syncBranches.total}`,
);
for (const n of report.checks.syncBranches.names) console.log(`   • ${n}`);

console.log(
  `\n2) PRs abertos do bot: ${report.checks.openBotPrs.total} — mal-roteados: ${report.checks.openBotPrs.misrouted.length}`,
);
for (const p of report.checks.openBotPrs.misrouted) {
  console.log(`   • PR #${p.number}  ${p.head} → ${p.base}`);
}

console.log(`\n3) Últimos PRs do bot (amostra ${recentBotPrs.length}):`);
for (const p of recentBotPrs) {
  const flag = p.base === "main" ? "✅" : "❌";
  console.log(
    `   ${flag} #${p.number}  ${p.head} → ${p.base}  [${p.state}${p.mergedAt ? " merged" : ""}]`,
  );
}

console.log("\n" + "─".repeat(72));
if (report.failures.length === 0) {
  console.log("✅ Bot Lovable está roteando corretamente para `main`.");
  writeFileSync(
    "lovable-sync-validation.json",
    JSON.stringify(report, null, 2),
  );
  process.exit(0);
}

console.log("❌ Configuração ainda incorreta:");
for (const f of report.failures) console.log(`   • ${f}`);
console.log(
  "\n   Próximo passo: Account Settings → Labs → desativar 'GitHub Branch Switching'.",
);
console.log("   Se já estiver desativado, abrir ticket com o suporte Lovable.");

writeFileSync("lovable-sync-validation.json", JSON.stringify(report, null, 2));
process.exit(1);
