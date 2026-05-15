/**
 * Type declarations for jspdf-autotable plugin.
 * Eliminates doc.lastAutoTable pattern.
 */
import { jsPDF } from "jspdf";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}
