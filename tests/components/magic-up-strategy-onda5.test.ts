import { describe, expect, it } from "vitest";
import { buildMagicScore, buildQualityDiagnosis, CURATION_STATUSES } from "@/pages/magic-up/magicUpStrategy";

describe("Magic Up Onda 5 strategy", () => {
  it("calcula score alto quando todos os requisitos estão completos", () => {
    const score = buildMagicScore({ hasProduct: true, hasLogo: true, hasClient: true, hasTechnique: true, hasBrief: true, channel: "whatsapp" });
    expect(score.total).toBeGreaterThanOrEqual(88);
    expect(score.label).toBe("Excelente para envio");
    expect(score.checks.every((check) => check.passed)).toBe(true);
  });

  it("reduz score quando falta logo e cliente", () => {
    const complete = buildMagicScore({ hasProduct: true, hasLogo: true, hasClient: true, hasTechnique: true, hasBrief: true, channel: "linkedin" });
    const incomplete = buildMagicScore({ hasProduct: true, hasLogo: false, hasClient: false, hasTechnique: true, hasBrief: true, channel: "linkedin" });
    expect(incomplete.total).toBeLessThan(complete.total);
    expect(incomplete.checks.find((check) => check.label === "Logo disponível")?.passed).toBe(false);
    expect(incomplete.checks.find((check) => check.label === "Cliente contextualizado")?.passed).toBe(false);
  });

  it("transforma score legado em diagnóstico heurístico completo", () => {
    const score = buildMagicScore({ hasProduct: true, hasLogo: false, hasClient: true, hasTechnique: false, hasBrief: true, channel: "catalogo" });
    const diagnosis = buildQualityDiagnosis(score);

    expect(diagnosis.source).toBe("heuristic");
    expect(diagnosis.total).toBe(score.total);
    expect(diagnosis.criteria).toHaveLength(score.checks.length);
    expect(diagnosis.criteria.map((criterion) => criterion.id)).toContain("logo-disponivel");
    expect(diagnosis.criteria.every((criterion) => /^[a-z0-9-]+$/.test(criterion.id))).toBe(true);
    expect(diagnosis.risks).toEqual(expect.arrayContaining(["Logo disponível", "Técnica informada"]));
    expect(diagnosis.recommendations.length).toBe(diagnosis.risks.length);
  });

  it("mantém todos os status de curadoria esperados", () => {
    expect(CURATION_STATUSES.map((status) => status.value)).toEqual([
      "draft",
      "good",
      "favorite",
      "internal-approved",
      "sent-to-client",
      "client-approved",
      "client-rejected",
      "needs-adjustment",
    ]);
  });
});