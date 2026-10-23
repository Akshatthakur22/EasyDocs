import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { createCombinedPdf, createPdfZip } from "@/lib/exports";
import type { DataRow } from "@/lib/types";

async function pdfPage(width: number, height: number): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.addPage([width, height]);
  return new Blob([new Uint8Array(await pdf.save()).buffer as ArrayBuffer], { type: "application/pdf" });
}

describe("generated PDF exports", () => {
  const rows: DataRow[] = [
    { id: 2, values: {}, included: true, status: "completed", pdf: new Blob([]) },
    { id: 1, values: {}, included: true, status: "completed", pdf: new Blob([]) },
    { id: 3, values: {}, included: false, status: "excluded", pdf: new Blob([]) },
  ];

  it("combines completed records in source-row order and preserves their pages", async () => {
    rows[0].pdf = await pdfPage(200, 300);
    rows[1].pdf = await pdfPage(100, 150);
    const result = await createCombinedPdf(rows);
    const combined = await PDFDocument.load(await result.arrayBuffer());
    expect(combined.getPageCount()).toBe(2);
    expect(combined.getPage(0).getSize()).toEqual({ width: 100, height: 150 });
    expect(combined.getPage(1).getSize()).toEqual({ width: 200, height: 300 });
  });

  it("writes only completed PDFs to unique ZIP paths with its summary", async () => {
    rows[0].pdf = await pdfPage(200, 300);
    rows[1].pdf = await pdfPage(100, 150);
    const result = await createPdfZip(rows.slice(0, 2), () => "Avery_001", "Generated: 2");
    const zip = await JSZip.loadAsync(result);
    expect(Object.keys(zip.files).filter((name) => name.startsWith("PDF/") && name.endsWith(".pdf")).sort()).toEqual([
      "PDF/Avery_001.pdf",
      "PDF/Avery_001_2.pdf",
    ]);
    expect(await zip.file("batch-summary.txt")?.async("string")).toBe("Generated: 2");
  });
});
