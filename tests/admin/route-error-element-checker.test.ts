/**
 * Regressão para `scripts/check-route-error-element.mjs`.
 *
 * Garante:
 *  1. O checker passa no estado atual do projeto (exit 0).
 *  2. Cada regra individual REALMENTE dispara contra um fixture controlado
 *     — evita "verde silencioso" se a regex for quebrada por refactor.
 *  3. A allowlist `// route-error-allow:` continua suprimindo a violação.
 *  4. Arquivos com data router (createBrowserRouter / RouterProvider) ficam
 *     isentos.
 *  5. O modo `--json` retorna a forma esperada (consumido por dashboards
 *     internos).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(ROOT, "scripts/check-route-error-element.mjs");

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function run(cwd: string, args: string[] = []): RunResult {
  try {
    const stdout = execSync(`node "${SCRIPT}" ${args.join(" ")}`, {
      cwd,
      encoding: "utf8",
    });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: e.status ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

describe("check-route-error-element — projeto real", () => {
  it("passa no código atual (sem violações)", () => {
    const r = run(ROOT);
    expect(r.exitCode, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/check passed/i);
  });

  it("modo --json retorna shape consumível por ferramentas externas", () => {
    const r = run(ROOT, ["--json"]);
    expect(r.exitCode).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(true);
    expect(Array.isArray(parsed.rules)).toBe(true);
    expect(parsed.rules.map((x: { id: string }) => x.id)).toEqual(
      expect.arrayContaining([
        "errorElement-in-declarative-routes",
        "useRouteError-outside-data-router",
      ]),
    );
    expect(parsed.violations).toEqual([]);
  });
});

describe("check-route-error-element — fixtures", () => {
  let tmp: string;
  let srcDir: string;

  beforeAll(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "route-err-checker-"));
    srcDir = path.join(tmp, "src");
    mkdirSync(srcDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writeFixture(name: string, contents: string) {
    const file = path.join(srcDir, name);
    writeFileSync(file, contents, "utf8");
  }

  function clean() {
    // limpa fixtures entre cenários sem precisar recriar tmp
    rmSync(srcDir, { recursive: true, force: true });
    mkdirSync(srcDir, { recursive: true });
  }

  it("detecta `errorElement={...}` em <Routes> declarativo", () => {
    clean();
    writeFixture(
      "BadRoutes.tsx",
      `
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Boom from "./Boom";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/x" element={<Boom />} errorElement={<div>oops</div>} />
      </Routes>
    </BrowserRouter>
  );
}
`,
    );
    const r = run(tmp);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/errorElement-in-declarative-routes/);
    expect(r.stderr).toMatch(/BadRoutes\.tsx:9/);
  });

  it("detecta `useRouteError()` fora de data router", () => {
    clean();
    writeFixture(
      "BadHook.tsx",
      `
import { useRouteError } from "react-router-dom";

export default function ErrorBoundaryView() {
  const err = useRouteError();
  return <pre>{String(err)}</pre>;
}
`,
    );
    const r = run(tmp);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/useRouteError-outside-data-router/);
    expect(r.stderr).toMatch(/BadHook\.tsx:5/);
  });

  it("isenta arquivos que usam createBrowserRouter + RouterProvider", () => {
    clean();
    writeFixture(
      "DataRouter.tsx",
      `
import { createBrowserRouter, RouterProvider, useRouteError } from "react-router-dom";

function Boundary() {
  // useRouteError é válido aqui (data router de fato)
  const err = useRouteError();
  return <div>{String(err)}</div>;
}

const router = createBrowserRouter([
  { path: "/", element: <div />, errorElement: <Boundary /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
`,
    );
    const r = run(tmp);
    expect(r.exitCode, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/check passed/i);
  });

  it("respeita allowlist `// route-error-allow:` na mesma linha", () => {
    clean();
    writeFixture(
      "Allowed.tsx",
      `
import { useRouteError } from "react-router-dom";

export default function Tmp() {
  const err = useRouteError(); // route-error-allow: migração futura para data router
  return <pre>{String(err)}</pre>;
}
`,
    );
    const r = run(tmp);
    expect(r.exitCode, `stderr:\n${r.stderr}`).toBe(0);
  });

  it("respeita allowlist na linha imediatamente acima", () => {
    clean();
    writeFixture(
      "AllowedAbove.tsx",
      `
import { useRouteError } from "react-router-dom";

export default function Tmp() {
  // route-error-allow: prototype branch
  const err = useRouteError();
  return <pre>{String(err)}</pre>;
}
`,
    );
    const r = run(tmp);
    expect(r.exitCode, `stderr:\n${r.stderr}`).toBe(0);
  });

  it("captura múltiplas regras em um único arquivo (relatório agrupado)", () => {
    clean();
    writeFixture(
      "BothRules.tsx",
      `
import { Routes, Route, useRouteError } from "react-router-dom";

function B() {
  const err = useRouteError();
  return <div>{String(err)}</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div />} errorElement={<B />} />
    </Routes>
  );
}
`,
    );
    const r = run(tmp);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/errorElement-in-declarative-routes/);
    expect(r.stderr).toMatch(/useRouteError-outside-data-router/);
  });

  it("--json em fixture com violações reporta lista detalhada", () => {
    clean();
    writeFixture(
      "Bad.tsx",
      `
import { useRouteError } from "react-router-dom";
export default function X() { return <>{useRouteError() as unknown as string}</>; }
`,
    );
    const r = run(tmp, ["--json"]);
    expect(r.exitCode).toBe(1);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.violations.length).toBeGreaterThan(0);
    expect(parsed.violations[0]).toMatchObject({
      rule: "useRouteError-outside-data-router",
      file: expect.stringContaining("Bad.tsx"),
    });
  });
});
