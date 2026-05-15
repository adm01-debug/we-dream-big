/**
 * Evidence collector — captura screenshot full-page, dump do DOM, console e
 * metadados quando um teste falha. Anexa tudo ao testInfo para aparecer no
 * relatório HTML do Playwright.
 *
 * Uso: chamado automaticamente pelo afterEach em e2e/fixtures/test-base.ts.
 */
import type { Page, TestInfo } from "@playwright/test";

export interface EvidenceCollector {
  consoleLogs: Array<{ type: string; text: string; ts: number }>;
  pageErrors: Array<{ message: string; stack?: string; ts: number }>;
  attachAll: (page: Page, testInfo: TestInfo) => Promise<void>;
}

export function attachConsoleCapture(page: Page): EvidenceCollector {
  const consoleLogs: EvidenceCollector["consoleLogs"] = [];
  const pageErrors: EvidenceCollector["pageErrors"] = [];

  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
  });
  page.on("pageerror", (err) => {
    pageErrors.push({
      message: err.message,
      stack: err.stack,
      ts: Date.now(),
    });
  });

  return {
    consoleLogs,
    pageErrors,
    async attachAll(p, testInfo) {
      try {
        const screenshot = await p.screenshot({ fullPage: true });
        await testInfo.attach("screenshot.png", {
          body: screenshot,
          contentType: "image/png",
        });
      } catch (e) {
        // página pode estar fechada
      }

      try {
        const html = await p.content();
        await testInfo.attach("dom.html", {
          body: html,
          contentType: "text/html",
        });
      } catch {
        // ignore
      }

      await testInfo.attach("console.json", {
        body: JSON.stringify(consoleLogs, null, 2),
        contentType: "application/json",
      });

      if (pageErrors.length > 0) {
        await testInfo.attach("page-errors.json", {
          body: JSON.stringify(pageErrors, null, 2),
          contentType: "application/json",
        });
      }

      const meta = {
        url: p.url(),
        viewport: p.viewportSize(),
        timestamp: new Date().toISOString(),
        title: await p.title().catch(() => ""),
      };
      await testInfo.attach("meta.json", {
        body: JSON.stringify(meta, null, 2),
        contentType: "application/json",
      });
    },
  };
}
