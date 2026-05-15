/**
 * Sanity + integração do checker estático scripts/check-route-ref-usage.mjs.
 *
 * Valida:
 *  1. Que o checker passa no estado atual do projeto.
 *  2. Que cada regra detecta o padrão problemático correspondente quando
 *     injetado via fixture temporária.
 *
 * Sem fixtures que falham, o checker poderia "ficar verde" silenciosamente
 * por bugs internos — esses testes provam que ele realmente morde.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-route-ref-usage.mjs");

function runChecker(cwd: string): { code: number; stdout: string; stderr: string } {
  const env = { ...process.env, ROUTE_REF_ROOT: cwd };
  try {
    const stdout = execSync(`node ${SCRIPT}`, { cwd, encoding: "utf8", env });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

describe("route-ref checker — estado atual do projeto", () => {
  it("passa no projeto real (zero violações)", () => {
    const r = runChecker(REPO_ROOT);
    expect(r.code, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/nenhum uso indevido/i);
  });
});

describe("route-ref checker — detecta padrões problemáticos", () => {
  let work: string;

  /** Monta uma cópia mínima do esqueleto que o checker precisa varrer. */
  beforeEach(() => {
    work = mkdtempSync(path.join(tmpdir(), "route-ref-check-"));
    mkdirSync(path.join(work, "src/components/layout"), { recursive: true });
    mkdirSync(path.join(work, "src/pages"), { recursive: true });
  });

  afterEach(() => {
    rmSync(work, { recursive: true, force: true });
  });

  it("regra 1: detecta forwardRef em route guard", () => {
    writeFileSync(
      path.join(work, "src/components/layout/AdminRoute.tsx"),
      `
        import { forwardRef } from "react";
        export const AdminRoute = forwardRef<HTMLDivElement>(function AdminRoute(_p, ref) {
          return <div ref={ref}>guard</div>;
        });
      `,
    );
    const r = runChecker(work);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/guard-no-forwardRef/);
    expect(r.stderr).toMatch(/AdminRoute/);
  });

  it("regra 2: detecta segundo argumento 'ref' em função pura", () => {
    writeFileSync(
      path.join(work, "src/pages/MyPage.tsx"),
      `
        export default function MyPage(props, ref) {
          return <div>page</div>;
        }
      `,
    );
    const r = runChecker(work);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/no-ref-second-arg/);
  });

  it("regra 2: detecta 'ref' em tipo de Props", () => {
    writeFileSync(
      path.join(work, "src/pages/MyPage.tsx"),
      `
        interface MyPageProps {
          children: React.ReactNode;
          ref?: React.Ref<HTMLDivElement>;
        }
        export default function MyPage(_p: MyPageProps) {
          return <div>page</div>;
        }
      `,
    );
    const r = runChecker(work);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/no-ref-in-props-type/);
  });

  it("regra 3: detecta export default forwardRef em página", () => {
    writeFileSync(
      path.join(work, "src/pages/MyPage.tsx"),
      `
        import { forwardRef } from "react";
        export default forwardRef<HTMLDivElement>(function MyPage(_p, ref) {
          return <div ref={ref}>page</div>;
        });
      `,
    );
    const r = runChecker(work);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/pages-no-forwardRef/);
  });

  it("regra 3: detecta 'const NAME = forwardRef; export default NAME'", () => {
    writeFileSync(
      path.join(work, "src/pages/MyPage.tsx"),
      `
        import { forwardRef } from "react";
        const MyPage = forwardRef<HTMLDivElement>(function MyPage(_p, ref) {
          return <div ref={ref}>page</div>;
        });
        export default MyPage;
      `,
    );
    const r = runChecker(work);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/pages-no-forwardRef/);
  });

  it("regra 3: IGNORA sub-componente forwardRef em arquivo de página", () => {
    // Sub-componente auxiliar pode usar forwardRef legitimamente;
    // só o top-level (default OU export const com mesmo nome do arquivo)
    // é proibido.
    writeFileSync(
      path.join(work, "src/pages/MyPage.tsx"),
      `
        import { forwardRef } from "react";
        export const Helper = forwardRef<HTMLDivElement>(function Helper(_p, ref) {
          return <div ref={ref}>helper</div>;
        });
        export default function MyPage() {
          return <div>page</div>;
        }
      `,
    );
    const r = runChecker(work);
    expect(r.code).toBe(0);
  });

  it("allowlist '// route-ref-allow:' suprime a violação", () => {
    writeFileSync(
      path.join(work, "src/components/layout/AdminRoute.tsx"),
      `
        import { forwardRef } from "react";
        // route-ref-allow: motivo legítimo de auditoria
        export const AdminRoute = forwardRef<HTMLDivElement>(function AdminRoute(_p, ref) {
          return <div ref={ref}>guard</div>;
        });
      `,
    );
    const r = runChecker(work);
    expect(r.code).toBe(0);
  });
});
