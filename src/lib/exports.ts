import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import type { DataRow } from "@/lib/types";

export async function createPdfZip(rows: DataRow[], filenameFor: (row: DataRow) => string, summary: string, onProgress?: (percent: number) => void): Promise<Blob> {
  const completed = rows.filter((row) => row.status === "completed" && row.pdf);
  if (!completed.length) throw new Error("There are no completed PDF files to export.");
  const zip = new JSZip();
  const used = new Set<string>();
  for (const row of completed) {
    const base = filenameFor(row);
    let unique = base;
    let suffix = 2;
    while (used.has(unique.toLocaleLowerCase())) unique = `${base}_${suffix++}`;
    used.add(unique.toLocaleLowerCase());
    zip.file(`PDF/${unique}.pdf`, row.pdf!);
  }
  zip.file("batch-summary.txt", summary);
  return zip.generateAsync({ type: "blob" }, (metadata) => onProgress?.(Math.round(metadata.percent)));
}

export async function createCombinedPdf(rows: DataRow[], onProgress?: (percent: number) => void): Promise<Blob> {
  const completed = rows.filter((row) => row.status === "completed" && row.pdf).sort((a, b) => a.id - b.id);
  if (!completed.length) throw new Error("There are no completed PDF files to combine.");
  const combined = await PDFDocument.create();
  for (const [index, row] of completed.entries()) {
    const source = await PDFDocument.load(await row.pdf!.arrayBuffer());
    const pages = await combined.copyPages(source, source.getPageIndices());
    pages.forEach((page) => combined.addPage(page));
    onProgress?.(Math.round(((index + 1) / completed.length) * 100));
  }
  const bytes = await combined.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
