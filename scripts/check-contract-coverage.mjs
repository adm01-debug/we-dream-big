#!/usr/bin/env node
/**
 * Contract coverage gate.
 *
 * Reports — and optionally fails CI on — Edge Functions that are missing
 * either a Zod schema or a Deno contract test or a contract.json manifest.
 *
 * Tiers (see plan):
 *   - webhook (verify_jwt=false AND name matches webhook-*) → must have all 3
 *   - public  (verify_jwt=false)                            → must have schema + test (manifest optional)
 *   - jwt | cron                                            → warn-only (T2-T4 PRs)
 *
 * Exceptions live in scripts/contract-exceptions.json with a justification.
 *
 * Usage:
 *   node scripts/check-contract-coverage.mjs              # warn-only (this PR)
 *   node scripts/check-contract-coverage.mjs --strict     # fail on any tier
 *   node scripts/check-contract-coverage.mjs --tier=webhook  # gate just one tier
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');
const CONFIG_TOML = path.join(ROOT, 'supabase', 'config.toml');
const EXCEPTIONS_FILE = path.join(__dirname, 'contract-exceptions.json');

const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const TIER_FILTER = [...args].find((a) => a.startsWith('--tier='))?.split('=')[1];
const WEBHOOK_TIER_GATE = !TIER_FILTER || TIER_FILTER === 'webhook';

// ─────────────────────────────────────────────────────────────────────────────
// Discover
// ─────────────────────────────────────────────────────────────────────────────

function discoverFunctions() {
  const entries = fs.readdirSync(FN_DIR, { withFileTypes: true });
  const fns = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === '_shared' || e.name === 'tests' || e.name.startsWith('.')) continue;
    const indexPath = path.join(FN_DIR, e.name, 'index.ts');
    if (!fs.existsSync(indexPath)) continue;
    fns.push({ name: e.name, dir: path.join(FN_DIR, e.name), indexPath });
  }
  return fns;
}

function readConfigToml() {
  if (!fs.existsSync(CONFIG_TOML)) return new Map();
  const text = fs.readFileSync(CONFIG_TOML, 'utf8');
  const m = new Map();
  const re = /\[functions\.([^\]]+)\][^[]*verify_jwt\s*=\s*(true|false)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    m.set(match[1], match[2] === 'true');
  }
  return m;
}

function readExceptions() {
  if (!fs.existsSync(EXCEPTIONS_FILE)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, 'utf8'));
    return new Set((data.exemptions ?? []).map((x) => x.endpoint));
  } catch {
    return new Set();
  }
}

function classifyTier(name, verifyJwtMap) {
  if (name.startsWith('webhook-') || name === 'product-webhook') return 'webhook';
  const vj = verifyJwtMap.get(name);
  // verify_jwt explicitly false → public
  if (vj === false) {
    // cron heuristics
    if (
      name.startsWith('cleanup-') ||
      name.startsWith('process-') ||
      name.endsWith('-watcher') ||
      name.endsWith('-reminders') ||
      name === 'send-digest' ||
      name === 'send-scheduled-reports' ||
      name === 'sync-external-db' ||
      name === 'ownership-audit' ||
      name === 'connections-health-check'
    ) {
      return 'cron';
    }
    return 'public';
  }
  return 'jwt';
}

function detectsSchema(fn) {
  // Quick AST-free heuristic: look for z.object( in index.ts or schemas.ts
  const candidates = [
    path.join(fn.dir, 'schemas.ts'),
    fn.indexPath,
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (/z\.object\(/.test(content)) return true;
    if (/parseBodyWithSchema\(/.test(content)) return true;
    if (/parseBodyVersioned\(/.test(content)) return true;
  }
  return false;
}

function hasContractTest(fn) {
  const candidates = ['index.test.ts', 'contract_test.ts', 'contract.test.ts'];
  return candidates.some((f) => fs.existsSync(path.join(fn.dir, f)));
}

function hasManifest(fn) {
  return fs.existsSync(path.join(fn.dir, 'contract.json'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const verifyJwtMap = readConfigToml();
const exceptions = readExceptions();
const fns = discoverFunctions();

const report = {
  webhook: [],
  public: [],
  cron: [],
  jwt: [],
};

let hardFails = 0;
let warnings = 0;

for (const fn of fns) {
  const tier = classifyTier(fn.name, verifyJwtMap);
  if (exceptions.has(fn.name)) {
    report[tier].push({ name: fn.name, status: 'exempt' });
    continue;
  }

  const hasSchema = detectsSchema(fn);
  const hasTest = hasContractTest(fn);
  const hasManif = hasManifest(fn);

  const missing = [];
  if (!hasSchema) missing.push('schema');
  if (!hasTest) missing.push('test');
  if (!hasManif && tier === 'webhook') missing.push('manifest');

  const entry = {
    name: fn.name,
    tier,
    has_schema: hasSchema,
    has_test: hasTest,
    has_manifest: hasManif,
    missing,
  };
  report[tier].push(entry);

  if (missing.length === 0) continue;

  if (tier === 'webhook' && WEBHOOK_TIER_GATE) {
    hardFails++;
  } else if (tier === 'public' && (STRICT || TIER_FILTER === 'public')) {
    hardFails++;
  } else {
    warnings++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Print
// ─────────────────────────────────────────────────────────────────────────────

function printTier(name, entries) {
  const total = entries.length;
  const exempt = entries.filter((e) => e.status === 'exempt').length;
  const missing = entries.filter((e) => Array.isArray(e.missing) && e.missing.length > 0);
  const ok = total - exempt - missing.length;

  console.log(`\n=== Tier: ${name.toUpperCase()} (${total} functions, ${ok} covered, ${exempt} exempt, ${missing.length} missing) ===`);
  if (missing.length === 0) {
    console.log('  ✅ all covered');
    return;
  }
  for (const e of missing) {
    console.log(`  ⚠ ${e.name.padEnd(36)} missing: ${e.missing.join(', ')}`);
  }
}

console.log('\n📋 Contract Coverage Report');
console.log(`   strict=${STRICT}  tier-filter=${TIER_FILTER ?? '(all)'}`);

printTier('webhook', report.webhook);
printTier('public', report.public);
printTier('cron', report.cron);
printTier('jwt', report.jwt);

console.log('\n--------------------------------------');
console.log(`Hard fails (gating tiers): ${hardFails}`);
console.log(`Warnings (non-gating tiers): ${warnings}`);

if (hardFails > 0) {
  console.log('\n❌ Contract coverage gate FAILED for required tier(s).');
  process.exit(1);
} else {
  console.log('\n✅ Contract coverage gate PASSED for required tier(s).');
}
