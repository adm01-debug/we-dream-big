#!/usr/bin/env node
/**
 * Contract Testing Runner — E2E.
 *
 * Auto-discovers contract manifests at supabase/functions/<name>/contract.json
 * and runs a matrix of v1/v2 scenarios against each endpoint:
 *   - valid                  → expect 200
 *   - invalid_missing_field  → expect 400 (v1) or 422 (v2)
 *   - invalid_wrong_type     → idem
 *   - invalid_empty_value    → idem
 *   - invalid_uuid           → idem (when present)
 *   - invalid_unknown_key    → idem (when present)
 *
 * Modes:
 *   --simulate   (default) compute expected status from manifest; do NOT hit
 *                network. Suitable for offline CI. Verifies manifest shape.
 *   --live       POST against a real Supabase project (requires SUPABASE_URL
 *                + SUPABASE_SERVICE_ROLE_KEY).
 *   --baseline   --live mode that records SHA-256 of v1 responses into
 *                scripts/__contracts__/v1-baseline.json (commit this file).
 *
 * Exit code is non-zero on any scenario mismatch.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// dotenv is optional — if absent, env vars come from the shell.
try {
  const dotenv = await import('dotenv');
  dotenv.config?.();
} catch {
  /* no-op: dotenv not installed, rely on shell env */
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FN_DIR = path.join(ROOT, 'supabase', 'functions');
const BASELINE_FILE = path.join(__dirname, '__contracts__', 'v1-baseline.json');

const args = new Set(process.argv.slice(2));
const MODE_LIVE = args.has('--live');
const MODE_BASELINE = args.has('--baseline');
const MODE_SIMULATE = !MODE_LIVE && !MODE_BASELINE;
const VERBOSE = args.has('--verbose') || args.has('-v');

const SUPABASE_URL = process.env.SUPABASE_URL
  || 'https://pqpdolkaeqlyzpdpbizo.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'a46c3981-244a-4f81-9f57-bab5c45b5cde';

// ─────────────────────────────────────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────────────────────────────────────

function discoverManifests() {
  const out = [];
  const entries = fs.readdirSync(FN_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === '_shared' || e.name === 'tests' || e.name.startsWith('.')) continue;
    const mf = path.join(FN_DIR, e.name, 'contract.json');
    if (!fs.existsSync(mf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(mf, 'utf8'));
      out.push({ name: e.name, dir: path.join(FN_DIR, e.name), manifest: data });
    } catch (err) {
      console.error(`⚠ failed to parse ${mf}: ${err.message}`);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario expansion
// ─────────────────────────────────────────────────────────────────────────────

const INVALID_KEYS_ORDER = [
  'invalid_missing_field',
  'invalid_wrong_type',
  'invalid_empty_value',
  'invalid_enum',
  'invalid_uuid',
  'invalid_unknown_key',
];

function expandScenarios(name, manifest) {
  const scenarios = [];
  const versions = manifest.versions ?? ['v1'];
  for (const v of versions) {
    const samples = manifest.samples?.[v];
    if (!samples) continue;
    if (samples.valid !== undefined) {
      scenarios.push({
        endpoint: name,
        version: v,
        case: 'valid',
        body: samples.valid,
        expectedStatusList: [200],
      });
    }
    for (const key of INVALID_KEYS_ORDER) {
      if (samples[key] === undefined) continue;
      scenarios.push({
        endpoint: name,
        version: v,
        case: key,
        body: samples[key],
        expectedStatusList: v === 'v2' ? [422] : [400],
      });
    }
  }
  return scenarios;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth headers per manifest
// ─────────────────────────────────────────────────────────────────────────────

function authHeaders(manifest) {
  const a = manifest.auth ?? {};
  const headers = {};
  if (a.type === 'header' && a.name && a.env) {
    const v = process.env[a.env];
    headers[a.name] = v ?? 'sim-secret';
  }
  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL builder (path-based versioning)
// ─────────────────────────────────────────────────────────────────────────────

function buildUrl(name, version) {
  const base = `${SUPABASE_URL}/functions/v1/${name}`;
  return version === 'v2' ? `${base}/v2` : base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulate mode: validate manifest shape without hitting the network.
// ─────────────────────────────────────────────────────────────────────────────

function simulateScenario(s) {
  const issues = [];
  if (s.case === 'valid') {
    if (!s.body || (typeof s.body === 'object' && Object.keys(s.body).length === 0)) {
      issues.push('valid scenario body is empty');
    }
  }
  if (!s.expectedStatusList || s.expectedStatusList.length === 0) {
    issues.push('expectedStatusList missing');
  }
  return { passed: issues.length === 0, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// Live mode: actually POST and check status code + response shape
// ─────────────────────────────────────────────────────────────────────────────

async function liveScenario(s, manifest) {
  const url = buildUrl(s.endpoint, s.version);
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...authHeaders(manifest),
  };
  let status;
  let body;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(s.body),
    });
    status = res.status;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } catch (err) {
    return { passed: false, status: 0, body: null, error: err.message };
  }

  const matches = s.expectedStatusList.includes(status);
  let shapeOk = true;

  if (s.version === 'v2' && s.case !== 'valid' && body) {
    if (
      typeof body.code !== 'string'
      || typeof body.message !== 'string'
      || !Array.isArray(body.fields)
    ) {
      shapeOk = false;
    }
  }
  if (s.version === 'v1' && s.case !== 'valid' && body) {
    if (typeof body.error !== 'string') {
      shapeOk = false;
    }
  }

  return {
    passed: matches && shapeOk,
    status,
    body,
    issues: [
      !matches && `expected status in [${s.expectedStatusList.join(',')}] got ${status}`,
      !shapeOk && `response shape mismatch for ${s.version}/${s.case}`,
    ].filter(Boolean),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Baseline mode
// ─────────────────────────────────────────────────────────────────────────────

function hashResponse(status, body) {
  const keysOnly = body && typeof body === 'object' ? Object.keys(body).sort() : [];
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ status, keys: keysOnly }))
    .digest('hex');
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return { endpoints: {} };
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return { endpoints: {} };
  }
}

function saveBaseline(b) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 2) + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  const mode = MODE_LIVE ? 'live' : MODE_BASELINE ? 'baseline' : 'simulate';
  console.log(`🚀 Contract Testing (${mode} mode)`);

  const manifests = discoverManifests();
  if (manifests.length === 0) {
    console.error('No contract.json manifests found.');
    process.exit(1);
  }
  console.log(`Discovered ${manifests.length} contract manifest(s):`);
  manifests.forEach((m) => {
    console.log(`  • ${m.name} (versions=${(m.manifest.versions ?? ['v1']).join(',')})`);
  });

  const baseline = MODE_BASELINE ? loadBaseline() : null;
  if (MODE_BASELINE) {
    baseline.endpoints = {};
    baseline.generated_at = new Date().toISOString();
  }

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const m of manifests) {
    const scenarios = expandScenarios(m.name, m.manifest);
    if (VERBOSE) console.log(`\n📦 ${m.name} — ${scenarios.length} scenarios`);
    for (const s of scenarios) {
      const label = `${s.endpoint}/${s.version}/${s.case}`;
      let result;
      if (MODE_SIMULATE) {
        result = simulateScenario(s);
      } else {
        result = await liveScenario(s, m.manifest);
      }
      if (result.passed) {
        passed++;
        if (VERBOSE) console.log(`  ✅ ${label}`);
      } else {
        failed++;
        const reason = result.issues?.join('; ') || result.error || 'unknown';
        console.log(`  ❌ ${label} — ${reason}`);
        failures.push({ label, ...result });
      }
      if (MODE_BASELINE && s.version === 'v1') {
        baseline.endpoints[s.endpoint] = baseline.endpoints[s.endpoint] || {};
        baseline.endpoints[s.endpoint][s.case] = hashResponse(result.status, result.body);
      }
    }
  }

  if (MODE_BASELINE) {
    saveBaseline(baseline);
    console.log(`\n💾 Baseline updated: ${path.relative(ROOT, BASELINE_FILE)}`);
  }

  console.log('\n--- RESULTADO DOS TESTES DE CONTRATO ---');
  console.log(`Sucessos: ${passed}`);
  console.log(`Falhas:   ${failed}`);
  console.log('-----------------------------------------\n');

  if (failed > 0) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
