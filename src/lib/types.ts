export type RowStatus = "pending" | "processing" | "completed" | "failed" | "excluded";
export type BatchStatus = "draft" | "generating" | "complete" | "partial" | "failed";
export type TemplateFormat = "image" | "pdf" | "docx";

export interface PositionedField {
  id: string;
  column: string;
  page: number;
  x: number;
  y: number;
  size: number;
  color: string;
  align: "left" | "center" | "right";
  fontFamily?: "Helvetica" | "TimesRoman" | "Courier";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface DataRow {
  id: number;
  values: Record<string, string>;
  included: boolean;
  status: RowStatus;
  error?: string;
  docx?: Blob;
  pdf?: Blob;
}

export interface Dataset {
  name: string;
  headers: string[];
  rows: DataRow[];
  warnings: string[];
  sourceType: "csv" | "xlsx";
  sheetName?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  size: number;
  updatedAt: number;
  blob: Blob;
  placeholders: string[];
  format: TemplateFormat;
  originalFormat?: string;
  fields?: PositionedField[];
}

export interface Batch {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: BatchStatus;
  templateId: string | null;
  templateFormat?: TemplateFormat;
  fields: PositionedField[];
  datasetName: string | null;
  sourceType: "csv" | "xlsx" | null;
  sheetName?: string;
  headers: string[];
  mapping: Record<string, string>;
  placeholders: string[];
  unsupportedTokens: string[];
  datasetWarnings: string[];
  rowCount: number;
}

export interface BatchCounts {
  total: number;
  valid: number;
  excluded: number;
  completed: number;
  failed: number;
  pending: number;
}

export interface ImportResult {
  headers: string[];
  rows: Record<string, string>[];
  warnings: string[];
  sheetName?: string;
}

export interface TemplateInspection {
  placeholders: string[];
  unsupportedTokens: string[];
}

export const MAX_BATCH_ROWS = 500;
export const LOCAL_RETENTION_DAYS = 7;

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
