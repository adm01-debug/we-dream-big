/**
 * Regressão: o checker estático de aninhamento `<Trigger asChild>` deve
 * passar (exit 0). Se algum aninhamento sem wrapper neutro for introduzido,
 * este teste falha junto com o CI.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

describe("Radix asChild nesting checker", () => {
  it("não detecta aninhamento <Trigger asChild><Trigger asChild> sem wrapper", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync("node scripts/check-aschild-nesting.mjs", {
        cwd: ROOT,
        encoding: "utf8",
      });
    } catch (err) {
      // execSync joga em exit != 0
      exitCode = (err as { status?: number }).status ?? 1;
      stdout = `${(err as { stdout?: string }).stdout ?? ""}\n${(err as { stderr?: string }).stderr ?? ""}`;
    }
    expect(exitCode, `Checker falhou:\n${stdout}`).toBe(0);
    expect(stdout).toMatch(/nenhum aninhamento problemático/i);
  });
});
