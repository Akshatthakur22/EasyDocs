"use client";

import type { WorkerBrowserConverter } from "@matbee/libreoffice-converter/browser";

let converterPromise: Promise<WorkerBrowserConverter> | undefined;

export async function getOfficeConverter(onProgress?: (percent: number, message: string) => void): Promise<WorkerBrowserConverter> {
  if (!converterPromise) {
    converterPromise = (async () => {
      const { WorkerBrowserConverter, createWasmPaths } = await import("@matbee/libreoffice-converter/browser");
      const converter = new WorkerBrowserConverter({
        ...createWasmPaths("/office-runtime/"),
        browserWorkerJs: "/office-runtime/browser.worker.global.js",
        onProgress: (info: { percent?: number; message?: string }) => onProgress?.(info.percent ?? 0, info.message ?? "Preparing document engine"),
      });
      await converter.initialize();
      return converter;
    })().catch((error) => {
      converterPromise = undefined;
      throw error;
    });
  }
  return converterPromise;
}

export async function convertLegacyXlsToXlsx(file: Blob, name: string, onProgress?: (percent: number, message: string) => void): Promise<Blob> {
  const converter = await getOfficeConverter(onProgress);
  const input = new Uint8Array(await file.arrayBuffer());
  const result = await converter.convert(input, { inputFormat: "xls", outputFormat: "xlsx" }, name);
  return new Blob([new Uint8Array(result.data)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function convertDocumentToPdf(file: Blob, name: string, inputFormat: "doc" | "docx", onProgress?: (percent: number, message: string) => void): Promise<Blob> {
  const converter = await getOfficeConverter(onProgress);
  const input = new Uint8Array(await file.arrayBuffer());
  const result = await converter.convert(input, { inputFormat, outputFormat: "pdf" }, name);
  return new Blob([new Uint8Array(result.data)], { type: "application/pdf" });
}
