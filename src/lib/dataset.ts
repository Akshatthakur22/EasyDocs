import Papa from "papaparse";
import type { ImportResult } from "@/lib/types";
import { MAX_BATCH_ROWS } from "@/lib/types";

function headerDisplay(value: unknown, index: number): string {
  const text = String(value ?? "").trim();
  return text || `Column ${index + 1}`;
}

function uniqueHeaders(source: unknown[]): { headers: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  const headers = source.map((value, index) => {
    const original = headerDisplay(value, index);
    const key = original.normalize("NFKC").trim().toLocaleLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) warnings.push(`The source has repeated “${original}” headers. They were renamed “${original} (${count})” so each column stays distinct.`);
    return count === 1 ? original : `${original} (${count})`;
  });
  return { headers, warnings };
}

function toImportResult(matrix: unknown[][], _sourceType: "csv" | "xlsx", sheetName?: string): ImportResult {
  const nonEmpty = matrix.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (nonEmpty.length < 2) throw new Error("Add a header row and at least one record to the spreadsheet.");
  const { headers, warnings } = uniqueHeaders(nonEmpty[0]);
  const records = nonEmpty.slice(1).map((line) => {
    const values: Record<string, string> = {};
    headers.forEach((header, index) => {
      values[header] = String(line[index] ?? "").trim();
    });
    return values;
  });
  if (records.length > MAX_BATCH_ROWS) {
    throw new Error(`This batch has ${records.length} rows. The current local processing limit is ${MAX_BATCH_ROWS}. Split the data into smaller batches.`);
  }
  return { headers, rows: records, warnings, sheetName };
}

export async function importCsv(file: File): Promise<ImportResult> {
  const text = await file.text();
  const parsed = Papa.parse<unknown[]>(text, { skipEmptyLines: "greedy", dynamicTyping: false });
  const error = parsed.errors.find((item) => item.type === "Delimiter");
  if (error) throw new Error(`Could not read this CSV near row ${(error.row ?? 0) + 1}: ${error.message}`);
  const result = toImportResult(parsed.data, "csv");
  const quoteErrors = parsed.errors.filter((item) => item.type === "Quotes");
  if (quoteErrors.length) {
    const locations = [...new Set(quoteErrors.map((item) => (item.row ?? 0) + 1))];
    const displayed = locations.slice(0, 5).join(", ");
    const more = locations.length > 5 ? ` and ${locations.length - 5} more row(s)` : "";
    result.warnings.push(`Some CSV quotes are malformed near row${locations.length === 1 ? "" : "s"} ${displayed}${more}. The file was imported with the parser's recovery; review those records before generating documents.`);
  }
  return result;
}

export async function importXlsx(file: File, selectedSheet?: string): Promise<ImportResult & { sheetNames: string[] }> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
  const sheet = selectedSheet ? workbook.getWorksheet(selectedSheet) : workbook.worksheets[0];
  if (!sheet) throw new Error("Select a worksheet that exists in this workbook.");
  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[];
    matrix.push(values.slice(1).map((value) => {
      if (value && typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
      if (value && typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "");
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return value == null ? "" : String(value);
    }));
  });
  return { ...toImportResult(matrix, "xlsx", sheet.name), sheetNames };
}

export function normalizeHeader(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function suggestMapping(placeholders: string[], headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const placeholder of placeholders) {
    const exact = headers.filter((header) => header.trim().toLocaleLowerCase() === placeholder.trim().toLocaleLowerCase());
    if (exact.length === 1) {
      mapping[placeholder] = exact[0];
      continue;
    }
    if (exact.length > 1) continue;
    const normalized = headers.filter((header) => normalizeHeader(header) === normalizeHeader(placeholder));
    if (normalized.length === 1) mapping[placeholder] = normalized[0];
  }
  return mapping;
}

export function getRowValue(row: Record<string, string>, header: string | undefined): string {
  return header ? String(row[header] ?? "").trim() : "";
}

export function getFilenameValue(value: string): string {
  return value.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80).replace(/[. ]+$/g, "") || "document";
}
