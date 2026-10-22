"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import TemplateDesigner from "@/components/TemplateDesigner";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert,
  CloudOff, FileArchive, FileCheck2, FileSpreadsheet, FileText, FolderOpen,
  LoaderCircle, LockKeyhole, Plus, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Trash2,
  Upload, X, XCircle
} from "lucide-react";
import { cleanupExpiredData, clearBatch, db, loadBatch, persistBatch } from "@/lib/database";
import { getFilenameValue, getRowValue, importCsv, importXlsx } from "@/lib/dataset";
import { convertDocumentToPdf, convertLegacyXlsToXlsx } from "@/lib/office-engine";
import { renderPositionedTemplate } from "@/lib/template";
import { createId, MAX_BATCH_ROWS, type Batch, type DataRow, type ImportResult, type PositionedField, type SavedTemplate, type TemplateFormat } from "@/lib/types";

const STEPS = [
  { title: "Template", caption: "Choose a document" },
  { title: "Your data", caption: "Import a spreadsheet" },
  { title: "Map fields", caption: "Connect the columns" },
  { title: "Review & create", caption: "Preview and export" },
];

function freshBatch(templateId: string | null = null): Batch {
  const now = Date.now();
  return {
    id: createId(), createdAt: now, updatedAt: now, status: "draft", templateId,
    datasetName: null, sourceType: null, headers: [], mapping: {}, placeholders: [], fields: [],
    unsupportedTokens: [], datasetWarnings: [], rowCount: 0,
  };
}

function fileSize(size: number): string {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 20_000);
}

function artifactBase(row: DataRow, batch: Batch): string {
  const nameField = batch.placeholders.find((item) => /name|student|person|recipient/i.test(item)) ?? batch.placeholders[0];
  const name = nameField ? getRowValue(row.values, batch.mapping[nameField]) : "";
  return `${getFilenameValue(name || `document_${String(row.id).padStart(3, "0")}`)}_${String(row.id).padStart(3, "0")}`;
}

function clearRowOutputs(rows: DataRow[]): DataRow[] {
  return rows.map((row) => ({
    id: row.id,
    values: row.values,
    included: row.included,
    status: row.included ? "pending" : "excluded",
  }));
}

function StatusPill({ status }: { status: DataRow["status"] }) {
  const icon = status === "completed" ? <Check size={11} /> : status === "failed" ? <XCircle size={11} /> : status === "processing" ? <LoaderCircle size={11} className="spin" /> : status === "excluded" ? <CircleAlert size={11} /> : null;
  return <span className={`status-pill ${status}`}>{icon}{status === "pending" ? "Ready" : status[0].toUpperCase() + status.slice(1)}</span>;
}

export default function Workbench() {
  const [step, setStep] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [batch, setBatch] = useState<Batch>(() => freshBatch());
  const [rows, setRows] = useState<DataRow[]>([]);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templateBlob, setTemplateBlob] = useState<Blob | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [engineProgress, setEngineProgress] = useState(0);
  const [engineMessage, setEngineMessage] = useState("");
  const [previewRowId, setPreviewRowId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [draggingTemplate, setDraggingTemplate] = useState(false);
  const [draggingData, setDraggingData] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [recentTemplatePage, setRecentTemplatePage] = useState(false);
  const templateInput = useRef<HTMLInputElement>(null);
  const dataInput = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  const say = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await cleanupExpiredData();
        const savedTemplates = await db.templates.orderBy("updatedAt").reverse().toArray();
        const lastBatch = await db.batches.orderBy("updatedAt").reverse().first();
        if (!alive) return;
        setTemplates(savedTemplates);
        if (lastBatch) {
          const saved = await loadBatch(lastBatch.id);
          let template = lastBatch.templateId ? await db.templates.get(lastBatch.templateId) : undefined;
          if (template && (!template.format || template.format === "docx")) {
            template = { ...template, format: "pdf", blob: await convertDocumentToPdf(template.blob, template.name, "docx") };
            await db.templates.put(template);
          }
          if (!alive) return;
          if (saved) {
            const recoveredRows = saved.rows.map((row) => row.status === "processing" ? { ...row, status: "pending" as const, error: undefined } : row);
            const recoveredBatch = { ...saved.batch, fields: saved.batch.fields ?? template?.fields ?? [], templateFormat: template?.format ?? saved.batch.templateFormat ?? "pdf", status: saved.batch.status === "generating" ? "partial" as const : saved.batch.status };
            setBatch(recoveredBatch);
            setRows(recoveredRows);
            setTemplateBlob(template?.blob ?? null);
            setTemplateName(template?.name ?? "");
            setStep(lastBatch.status === "draft" && !lastBatch.rowCount ? (template ? 2 : 1) : lastBatch.rowCount ? 3 : 1);
            if (recoveredRows.some((row) => row.status === "processing")) {
              await persistBatch(recoveredBatch, recoveredRows);
              say("Your batch was recovered. Completed files are still saved.");
            }
          }
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not open local batch data.");
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [say]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const mappedMissing = useMemo(() => batch.placeholders.filter((placeholder) => !batch.mapping[placeholder] || !batch.headers.includes(batch.mapping[placeholder])), [batch]);
  const unsupported = batch.unsupportedTokens;
  const missingForRow = useCallback((row: DataRow) => batch.placeholders.filter((placeholder) => {
    const header = batch.mapping[placeholder];
    return !header || !String(row.values[header] ?? "").trim();
  }), [batch.mapping, batch.placeholders]);
  const invalidRowIds = useMemo(() => new Set(rows.filter((row) => row.included && missingForRow(row).length > 0).map((row) => row.id)), [rows, missingForRow]);
  const validRows = useMemo(() => rows.filter((row) => row.included && missingForRow(row).length === 0), [rows, missingForRow]);
  const counts = useMemo(() => ({
    total: rows.length,
    valid: rows.filter((row) => row.included && missingForRow(row).length === 0).length,
    excluded: rows.filter((row) => !row.included).length,
    completed: rows.filter((row) => row.status === "completed").length,
    failed: rows.filter((row) => row.status === "failed").length,
    pending: rows.filter((row) => row.status === "pending" || row.status === "processing").length,
  }), [rows, missingForRow]);
  const hasTemplate = Boolean(templateBlob && batch.templateId);
  const canMap = hasTemplate && rows.length > 0 && batch.fields.length > 0 && !unsupported.length && !mappedMissing.length;
  const hasUnexcludedInvalid = invalidRowIds.size > 0;
  const canGenerate = canMap && validRows.length > 0 && !hasUnexcludedInvalid && !generating;
  const allDone = counts.completed + counts.failed >= rows.filter((row) => row.included).length && !generating && counts.completed > 0;

  const commitBatch = useCallback(async (nextBatch: Batch, nextRows: DataRow[]) => {
    setBatch(nextBatch);
    setRows(nextRows);
    try {
      await persistBatch(nextBatch, nextRows);
    } catch (reason) {
      setError(`Local storage could not save this change. ${reason instanceof Error ? reason.message : "Check available browser storage."}`);
    }
  }, []);

  const refreshTemplates = useCallback(async () => {
    setTemplates(await db.templates.orderBy("updatedAt").reverse().toArray());
  }, []);

  const selectTemplate = useCallback(async (template: SavedTemplate) => {
    setBusy(true);
    setError("");
    try {
      let format: TemplateFormat = template.format ?? "docx";
      let blob = template.blob;
      if (format === "docx") {
        blob = await convertDocumentToPdf(blob, template.name, "docx", (percent, message) => { setEngineProgress(percent); setEngineMessage(message); });
        format = "pdf";
      }
      const fields = template.fields ?? [];
      const mapping = Object.fromEntries(fields.map((field) => [field.id, field.column]));
      const nextRows = template.id === batch.templateId ? rows : clearRowOutputs(rows);
      const nextBatch = {
        ...batch,
        updatedAt: Date.now(), status: "draft" as const, templateId: template.id,
        templateFormat: format,
        fields, placeholders: fields.map((field) => field.id), unsupportedTokens: [], mapping,
      };
      const prepared = { ...template, blob, format, fields };
      await db.templates.put(prepared);
      setTemplateBlob(blob);
      setTemplateName(template.name);
      setPreviewUrl("");
      setPreviewError("");
      setPreviewRowId(null);
      await commitBatch(nextBatch, nextRows);
      setStep(nextRows.length ? 3 : 2);
      setRecentTemplatePage(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read this document template.");
    } finally {
      setBusy(false);
    }
  }, [batch, commitBatch, rows]);

  const addTemplate = useCallback(async (file: File) => {
    setBusy(true);
    setError("");
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("The template is larger than 25 MB. Choose a smaller file.");
      const extension = file.name.toLocaleLowerCase().split(".").pop();
      if (!extension || !["doc", "docx", "pdf", "png", "jpg", "jpeg"].includes(extension)) throw new Error("Choose a Word document (.doc/.docx), PDF, PNG, or JPG template.");
      const isImage = ["png", "jpg", "jpeg"].includes(extension);
      const format: TemplateFormat = isImage ? "image" : "pdf";
      const normalizedFile = extension === "doc" || extension === "docx"
        ? await convertDocumentToPdf(file, file.name, extension, (percent, message) => { setEngineProgress(percent); setEngineMessage(message); })
        : isImage ? new Blob([file], { type: extension === "png" ? "image/png" : "image/jpeg" })
          : file;
      if (format === "pdf") {
        const pdf = await PDFDocument.load(await normalizedFile.arrayBuffer());
        if (!pdf.getPageCount()) throw new Error("This document has no pages to use as a template.");
      } else {
        const image = new Image();
        const url = URL.createObjectURL(normalizedFile);
        try {
          await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("This image could not be opened.")); image.src = url; });
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      const template: SavedTemplate = { id: createId(), name: file.name, size: normalizedFile.size, updatedAt: Date.now(), blob: normalizedFile, placeholders: [], fields: [], format, originalFormat: extension };
      await db.templates.put(template);
      const nextRows = clearRowOutputs(rows);
      const nextBatch = {
        ...batch,
        updatedAt: Date.now(), status: "draft" as const, templateId: template.id,
        templateFormat: format,
        fields: [], placeholders: [], unsupportedTokens: [], mapping: {},
      };
      setTemplateBlob(normalizedFile);
      setTemplateName(file.name);
      setPreviewUrl("");
      setPreviewError("");
      await commitBatch(nextBatch, nextRows);
      await refreshTemplates();
      setStep(rows.length ? 3 : 2);
      say(isImage ? "Image template loaded. Import data, then place its fields." : "Document loaded as a printable background. Import data, then place its fields.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read this template.");
    } finally {
      setBusy(false);
    }
  }, [batch, commitBatch, refreshTemplates, rows, say]);

  const applyDataset = useCallback(async (file: File, imported: ImportResult, sourceType: "csv" | "xlsx") => {
    const nextRows: DataRow[] = imported.rows.map((values, index) => ({ id: index + 1, values, included: true, status: "pending" }));
      const mapping = Object.fromEntries((batch.fields ?? []).map((field) => [field.id, imported.headers.includes(field.column) ? field.column : ""]));
    const nextBatch: Batch = {
      ...batch,
      updatedAt: Date.now(), status: "draft", datasetName: file.name, sourceType,
      sheetName: imported.sheetName, headers: imported.headers, mapping, datasetWarnings: imported.warnings,
      rowCount: nextRows.length,
    };
    setPreviewUrl("");
    setPreviewError("");
    setPreviewRowId(null);
    await commitBatch(nextBatch, nextRows);
    setStep(batch.templateId ? 3 : 1);
    say(`${nextRows.length} rows imported${imported.sheetName ? ` from ${imported.sheetName}` : ""}.`);
  }, [batch, commitBatch, say]);

  const saveDesign = useCallback(async (fields: PositionedField[]) => {
    const placeholders = fields.map((field) => field.id);
    const mapping = Object.fromEntries(fields.map((field) => [field.id, field.column]));
    const nextBatch = { ...batch, fields, placeholders, mapping, updatedAt: Date.now(), status: "draft" as const };
    await commitBatch(nextBatch, clearRowOutputs(rows));
    if (batch.templateId) await db.templates.update(batch.templateId, { fields, placeholders });
  }, [batch, commitBatch, rows]);

  const addPositionedField = useCallback((column: string, page: number) => {
    const fields = batch.fields ?? [];
    const offset = fields.length % 7;
    const field: PositionedField = { id: createId(), column, page, x: 0.12, y: Math.min(0.88, 0.14 + offset * 0.075), size: 0.025, color: "#202622", align: "left", fontFamily: "Helvetica", bold: false, italic: false };
    void saveDesign([...fields, field]);
  }, [batch.fields, saveDesign]);

  const duplicatePositionedField = useCallback((id: string) => {
    const source = (batch.fields ?? []).find((field) => field.id === id);
    if (!source) return;
    const copy = { ...source, id: createId(), x: Math.min(0.98, source.x + 0.025), y: Math.min(0.98, source.y + 0.025) };
    void saveDesign([...(batch.fields ?? []), copy]);
  }, [batch.fields, saveDesign]);

  const updatePositionedField = useCallback((id: string, update: Partial<PositionedField>) => {
    void saveDesign((batch.fields ?? []).map((field) => field.id === id ? { ...field, ...update } : field));
  }, [batch.fields, saveDesign]);

  const removePositionedField = useCallback((id: string) => {
    void saveDesign((batch.fields ?? []).filter((field) => field.id !== id));
  }, [batch.fields, saveDesign]);

  const handleDataFile = useCallback(async (file: File, sheet?: string) => {
    setBusy(true);
    setError("");
    setDatasetFile(file);
    try {
      const isLegacyXls = /\.xls$/i.test(file.name) && !/\.xlsx$/i.test(file.name);
      const isXlsx = /\.(xlsx|xlsm)$/i.test(file.name) || isLegacyXls;
      const workbookFile = isLegacyXls
        ? new File([await convertLegacyXlsToXlsx(file, file.name, (percent, message) => { setEngineProgress(percent); setEngineMessage(message); })], `${file.name}.xlsx`, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
        : file;
      const imported = isXlsx ? await importXlsx(workbookFile, sheet) : await importCsv(file);
      if (isXlsx) {
        setSheetNames((imported as Awaited<ReturnType<typeof importXlsx>>).sheetNames);
        setSelectedSheet(imported.sheetName ?? "");
      } else {
        setSheetNames([]);
        setSelectedSheet("");
      }
      await applyDataset(file, imported, isXlsx ? "xlsx" : "csv");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not import this spreadsheet.");
    } finally {
      setBusy(false);
    }
  }, [applyDataset]);

  const toggleRow = useCallback(async (rowId: number) => {
    const nextRows = rows.map((row) => row.id === rowId ? { ...row, included: !row.included, status: (!row.included ? "pending" : "excluded") as DataRow["status"], error: undefined } : row);
    const nextBatch = { ...batch, updatedAt: Date.now(), status: "draft" as const };
    await commitBatch(nextBatch, nextRows);
  }, [batch, commitBatch, rows]);

  const updateRowValue = useCallback((rowId: number, header: string, value: string) => {
    setRows((current) => {
      const updated = current.map((row) => row.id === rowId
        ? { ...row, values: { ...row.values, [header]: value }, status: "pending" as const, error: undefined, docx: undefined, pdf: undefined }
        : row);
      const row = updated.find((item) => item.id === rowId);
      if (row) void db.rows.put({ ...row, batchId: batch.id });
      return updated;
    });
    const nextBatch = { ...batch, updatedAt: Date.now(), status: "draft" as const };
    setBatch(nextBatch);
    void db.batches.put(nextBatch);
    setPreviewUrl("");
    setPreviewError("");
  }, [batch]);

  const newBatch = useCallback(async () => {
    setError("");
    setPreviewUrl("");
    setPreviewError("");
    let latestTemplate = await db.templates.orderBy("updatedAt").reverse().first();
    if (latestTemplate && (!latestTemplate.format || latestTemplate.format === "docx")) {
      latestTemplate = { ...latestTemplate, blob: await convertDocumentToPdf(latestTemplate.blob, latestTemplate.name, "docx"), format: "pdf" };
      await db.templates.put(latestTemplate);
    }
    const next = freshBatch(latestTemplate?.id ?? null);
    if (latestTemplate) {
      next.fields = latestTemplate.fields ?? [];
      next.placeholders = next.fields.map((field) => field.id);
      next.mapping = Object.fromEntries(next.fields.map((field) => [field.id, field.column]));
      next.templateFormat = latestTemplate.format ?? "docx";
      setTemplateBlob(latestTemplate.blob);
      setTemplateName(latestTemplate.name);
      setStep(2);
    } else {
      setTemplateBlob(null);
      setTemplateName("");
      setStep(1);
    }
    await commitBatch(next, []);
    setDatasetFile(null);
    setSheetNames([]);
    setSelectedSheet("");
    setRecentTemplatePage(false);
  }, [commitBatch]);

  const showPreview = useCallback(async () => {
    if (!templateBlob) return;
    const row = rows.find((item) => item.id === previewRowId) ?? validRows[0];
    if (!row) return;
    setPreviewLoading(true);
    setPreviewError("");
    setEngineProgress(0);
    setEngineMessage("Preparing the printable preview");
    try {
      const values = Object.fromEntries(batch.fields.map((field) => [field.id, getRowValue(row.values, batch.mapping[field.id])]));
      const pdf = await renderPositionedTemplate(templateBlob, batch.templateFormat ?? "pdf", batch.fields, values);
      const url = URL.createObjectURL(pdf);
      setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return url; });
      setPreviewRowId(row.id);
    } catch (reason) {
      setPreviewError(reason instanceof Error ? reason.message : "Could not render this preview.");
    } finally {
      setPreviewLoading(false);
      setEngineMessage("");
    }
  }, [batch, previewRowId, rows, templateBlob, validRows]);

  const generateBatch = useCallback(async (retryOnly = false) => {
    if (!templateBlob) return;
    const work = rows.filter((row) => row.included && (retryOnly ? row.status === "failed" : (row.status === "pending" || row.status === "failed")) && missingForRow(row).length === 0);
    if (!work.length) return;
    cancelRef.current = false;
    setCancelRequested(false);
    setGenerating(true);
    setError("");
    setEngineProgress(0);
    const generatingBatch = { ...batch, updatedAt: Date.now(), status: "generating" as const };
    setBatch(generatingBatch);
    await db.batches.put(generatingBatch);
    let completedNow = 0;
    for (const row of work) {
      if (cancelRef.current) break;
      const processing = { ...row, status: "processing" as const, error: undefined };
      setRows((current) => current.map((item) => item.id === row.id ? processing : item));
      await db.rows.put({ ...processing, batchId: batch.id });
      try {
        const values = Object.fromEntries(batch.fields.map((field) => [field.id, getRowValue(row.values, batch.mapping[field.id])]));
        setEngineMessage(`Rendering record ${completedNow + 1} of ${work.length}`);
        const pdf = await renderPositionedTemplate(templateBlob, batch.templateFormat ?? "pdf", batch.fields, values);
        const done: DataRow = { ...processing, status: "completed", pdf };
        await db.rows.put({ ...done, batchId: batch.id });
        setRows((current) => current.map((item) => item.id === row.id ? done : item));
        completedNow += 1;
      } catch (reason) {
        const failed: DataRow = { ...processing, status: "failed", error: reason instanceof Error ? reason.message : "Document generation failed." };
        await db.rows.put({ ...failed, batchId: batch.id });
        setRows((current) => current.map((item) => item.id === row.id ? failed : item));
      }
      setEngineProgress(Math.round((completedNow / work.length) * 100));
    }
    const savedRows = await db.rows.where("batchId").equals(batch.id).sortBy("id");
    const successCount = savedRows.filter((row) => row.status === "completed").length;
    const failedCount = savedRows.filter((row) => row.status === "failed" && row.included).length;
    const stillPending = savedRows.some((row) => row.status === "pending" && row.included);
    const cancelled = cancelRef.current;
    const finalBatch: Batch = {
      ...generatingBatch,
      status: cancelled || stillPending ? "partial" : failedCount === 0 ? "complete" : successCount > 0 ? "partial" : "failed",
      updatedAt: Date.now(),
    };
    setBatch(finalBatch);
    await db.batches.put(finalBatch);
    setGenerating(false);
    setCancelRequested(false);
    setEngineMessage("");
    if (cancelled) say("Generation paused. Completed files are saved and pending rows can resume.");
    else if (failedCount) say(`${successCount} generated; ${failedCount} failed. You can retry failed rows.`);
    else say(`${successCount} personalized documents are ready.`);
  }, [batch, missingForRow, rows, say, templateBlob]);

  const requestCancel = useCallback(() => {
    cancelRef.current = true;
    setCancelRequested(true);
  }, []);

  const downloadZip = useCallback(async () => {
    const completed = rows.filter((row) => row.status === "completed");
    if (!completed.length) return;
    setBusy(true);
    setExportProgress(0);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      for (const row of completed) {
        const base = artifactBase(row, batch);
        let unique = base;
        let suffix = 2;
        while (used.has(unique.toLocaleLowerCase())) unique = `${base}_${suffix++}`;
        used.add(unique.toLocaleLowerCase());
        if (row.pdf) zip.file(`PDF/${unique}.pdf`, row.pdf);
      }
      zip.file("batch-summary.txt", `EasyDocs batch export\nTemplate: ${templateName}\nSpreadsheet: ${batch.datasetName ?? ""}\nGenerated PDFs: ${completed.length}\nFailed: ${counts.failed}\nExcluded: ${counts.excluded}\n\nPrintable files are in PDF/.\n`);
      const blob = await zip.generateAsync({ type: "blob" }, (metadata) => setExportProgress(Math.round(metadata.percent)));
      saveFile(blob, `easydocs_${batch.id.slice(0, 8)}.zip`);
      say("ZIP export downloaded.");
    } catch (reason) {
      setError(`Could not create the ZIP: ${reason instanceof Error ? reason.message : "Browser storage limit reached."}`);
    } finally {
      setBusy(false);
      setExportProgress(null);
    }
  }, [batch, counts.excluded, counts.failed, rows, say, templateName]);

  const downloadCombinedPdf = useCallback(async () => {
    const completed = rows.filter((row) => row.status === "completed" && row.pdf).sort((a, b) => a.id - b.id);
    if (!completed.length) return;
    setBusy(true);
    setExportProgress(0);
    try {
      const combined = await PDFDocument.create();
      for (const [index, row] of completed.entries()) {
        const source = await PDFDocument.load(await row.pdf!.arrayBuffer());
        const pages = await combined.copyPages(source, source.getPageIndices());
        pages.forEach((page) => combined.addPage(page));
        setExportProgress(Math.round(((index + 1) / completed.length) * 100));
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
      const bytes = await combined.save();
      saveFile(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `easydocs_print_${batch.id.slice(0, 8)}.pdf`);
      say(`${completed.length} documents combined in spreadsheet order.`);
    } catch (reason) {
      setError(`Could not create the combined PDF: ${reason instanceof Error ? reason.message : "The file is too large for available browser memory."}`);
    } finally {
      setBusy(false);
      setExportProgress(null);
    }
  }, [batch.id, rows, say]);

  const downloadSingle = useCallback((row: DataRow, format: "docx" | "pdf") => {
    const blob = row[format];
    if (blob) saveFile(blob, `${artifactBase(row, batch)}.${format}`);
  }, [batch]);

  const startOver = useCallback(async () => {
    if (!window.confirm("Delete this batch and its generated files? Saved templates used by other batches will stay on this device.")) return;
    try {
      await clearBatch(batch.id);
      await newBatch();
      say("Batch cleared. Saved templates are available for reuse.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not clear this batch.");
    }
  }, [batch.id, newBatch, say]);

  const deleteAllData = useCallback(async () => {
    if (!window.confirm("Delete every EasyDocs template, spreadsheet, batch, and generated file stored on this device? This cannot be undone.")) return;
    await db.delete();
    window.location.reload();
  }, []);

  const handleTemplateInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void addTemplate(file);
    event.target.value = "";
  };
  const handleDataInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleDataFile(file);
    event.target.value = "";
  };
  const dropFile = (event: DragEvent<HTMLDivElement>, kind: "template" | "data") => {
    event.preventDefault();
    if (kind === "template") setDraggingTemplate(false);
    else setDraggingData(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (kind === "template") void addTemplate(file);
    else void handleDataFile(file);
  };

  const pageTitle = recentTemplatePage ? "Your template library" : STEPS[step - 1].title;
  const continueTo = () => {
    if (step === 1 && hasTemplate) setStep(2);
    else if (step === 2 && rows.length) setStep(3);
    else if (step === 3 && canMap && !hasUnexcludedInvalid) setStep(4);
  };
  const chooseStep = (target: number) => {
    if (target < step) setStep(target);
    else if (target === 2 && hasTemplate) setStep(2);
    else if (target === 3 && rows.length) setStep(3);
    else if (target === 4 && canMap && !hasUnexcludedInvalid) setStep(4);
  };

  if (!loaded) return <div className="loading-screen"><div className="loading-brand">EasyDocs</div><LoaderCircle className="spin" size={22} /></div>;

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="EasyDocs home">
          <span className="brand-mark"><FileText size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">easy<span>docs</span></span>
        </a>
        <div className="top-actions">
          <div className="privacy-chip" title="Your documents and spreadsheet stay in this browser."><LockKeyhole size={14} /><span>Files stay on this device</span></div>
          <button className="quiet-button" onClick={() => void newBatch()}><Plus size={15} /> New batch</button>
          <button className="quiet-button" onClick={() => setRecentTemplatePage((value) => !value)}><FolderOpen size={15} /> <span className="library-label">Templates</span></button>
        </div>
      </header>

      <div className="page-wrap">
        <div className="intro-row">
          <div>
            <div className="eyebrow">A calmer way to make documents</div>
            <h1>One template.<br />A whole lot less busywork.</h1>
            <p className="intro-copy">Bring a document and a spreadsheet together. Place each value on the page, review a real record, then make print-ready copies.</p>
          </div>
          <div className="intro-aside"><ShieldCheck size={20} /><span>Your files stay in your browser. No account, no upload, no cloud document storage.</span></div>
        </div>

        <div className="workspace">
          <aside className="rail" aria-label="Batch workflow">
            <div className="rail-label">Your batch</div>
            {STEPS.map((item, index) => {
              const number = index + 1;
              const done = (number === 1 && hasTemplate) || (number === 2 && rows.length > 0) || (number === 3 && canMap) || (number === 4 && allDone);
              const accessible = number < step || (number === 2 && hasTemplate) || (number === 3 && rows.length > 0) || (number === 4 && canMap && !hasUnexcludedInvalid);
              return <button key={item.title} className={`step-item ${step === number ? "active" : ""} ${done ? "done" : ""}`} disabled={!accessible && number !== step || generating} onClick={() => chooseStep(number)}>
                <span className="step-number">{done && step !== number ? <Check size={14} /> : number}</span>
                <span><span className="step-label">{item.title}</span><span className="step-caption">{item.caption}</span></span>
              </button>;
            })}
            <div className="rail-bottom"><strong>Private by default</strong><br />Templates, rows, and generated files are saved locally in this browser and expire after 7 days.</div>
          </aside>

          <section className="main-panel">
            {!recentTemplatePage && <>
              <div className="progress-head"><span>STEP 0{step} <span style={{ color: "#b0b7b0" }}>/ 04</span> &nbsp;·&nbsp; {pageTitle}</span><span>{step === 4 && rows.length ? `${counts.valid} ready · ${counts.excluded} excluded` : "About 2 minutes to set up"}</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${step * 25}%` }} /></div>
            </>}

            {error && <div className="notice error" role="alert"><CircleAlert size={15} /><span>{error}</span><button className="button ghost small" aria-label="Dismiss" onClick={() => setError("")}><X size={14} /></button></div>}

            {recentTemplatePage ? <section className="card">
              <div className="card-head"><div><div className="step-kicker">Kept on this device</div><h2>Your template library</h2><p>Reuse a document template with another spreadsheet whenever you need it.</p></div><button className="button secondary small" onClick={() => setRecentTemplatePage(false)}><ArrowLeft size={14} /> Back to batch</button></div>
              <div className="card-body">
                {templates.length ? <div className="template-grid">{templates.map((template) => <button key={template.id} className="template-tile" onClick={() => void selectTemplate(template)}>
                  <span className="file-icon"><FileText size={20} /></span><span className="template-tile-name">{template.name}</span><span className="template-tile-meta">{template.fields?.length ?? 0} placed fields · updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                </button>)}</div> : <div className="empty-state"><FolderOpen size={28} /><div>No templates saved yet.</div><p>Upload an image, PDF, or Word document to design reusable field positions.</p><button className="button small" onClick={() => { setRecentTemplatePage(false); setStep(1); }}>Choose a template</button></div>}
                <div className="step-footer"><span className="subtle">Clearing all local data removes every saved template and batch.</span><button className="button danger small" onClick={() => void deleteAllData()}><Trash2 size={13} /> Delete all local data</button></div>
              </div>
            </section> : <>
              {step === 1 && <section className="card">
                <div className="card-head"><div><div className="step-kicker">01 — Start with a document</div><h2>Choose your template</h2><p>Upload an image, PDF, or Word document. EasyDocs turns each into a printable background for field placement.</p></div><span className="format-badge"><FileText size={13} /> Image · PDF · Word</span></div>
                <div className="card-body">
                  {templateBlob ? <div className="file-card"><span className="file-icon"><FileCheck2 size={20} /></span><span className="file-meta"><span className="file-name">{templateName}</span><span className="file-sub">{fileSize(templateBlob.size)} · {batch.fields.length} placed fields</span></span><span className="file-actions"><button className="button secondary small" onClick={() => templateInput.current?.click()} disabled={busy}><RotateCcw size={13} /><span>Replace</span></button><button className="button ghost small" onClick={() => setRecentTemplatePage(true)}>Library</button></span></div> : <div className={`dropzone ${draggingTemplate ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDraggingTemplate(true); }} onDragLeave={() => setDraggingTemplate(false)} onDrop={(event) => dropFile(event, "template")}>
                    <div className="drop-icon"><Upload size={21} /></div><div className="drop-title">Drop an image, PDF, or Word document here</div><div className="drop-help">PNG, JPG, PDF, DOC, DOCX · up to 25 MB · stays on device</div><button className="button" onClick={() => templateInput.current?.click()} disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <FolderOpen size={14} />} Browse files</button><a className="small-link sample-link" href="/sample-attendance-warning.docx" download>Download a sample letter</a>
                  </div>}
                  <input ref={templateInput} type="file" accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" hidden onChange={handleTemplateInput} />
                  {templateBlob && batch.fields.length > 0 && <>
                    <div className="section-label">Fields placed on this page</div>
                    <div className="placeholder-chips">{batch.fields.map((field) => <span className="mapping-tag" key={field.id}>{field.column}</span>)}</div>
                  </>}
                  <div className="notice info" style={{ marginTop: 20 }}><LockKeyhole size={14} /><span>Your template is saved in this browser for 7 days. Files stay on this device and are not uploaded.</span></div>
                  <div className="step-footer"><span className="subtle">Fields are placed on top of your page background, then exported as printable PDFs.</span><button className="button" disabled={!hasTemplate || busy} onClick={continueTo}>Continue <ArrowRight size={14} /></button></div>
                </div>
              </section>}

              {step === 2 && <section className="card">
                <div className="card-head"><div><div className="step-kicker">02 — Bring your list</div><h2>Import your spreadsheet</h2><p>Use a header row to label the columns you want to fill into the document.</p></div><span className="format-badge"><FileSpreadsheet size={13} /> CSV · XLS · XLSX</span></div>
                <div className="card-body">
                  {rows.length ? <div className="file-card"><span className="file-icon"><FileSpreadsheet size={20} /></span><span className="file-meta"><span className="file-name">{batch.datasetName}</span><span className="file-sub">{rows.length} rows · {batch.headers.length} columns{batch.sheetName ? ` · ${batch.sheetName}` : ""}</span></span><span className="file-actions"><button className="button secondary small" onClick={() => dataInput.current?.click()} disabled={busy}><RotateCcw size={13} /><span>Replace</span></button></span></div> : <div className={`dropzone ${draggingData ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDraggingData(true); }} onDragLeave={() => setDraggingData(false)} onDrop={(event) => dropFile(event, "data")}>
                    <div className="drop-icon"><FileSpreadsheet size={21} /></div><div className="drop-title">Drop a CSV or Excel file here</div><div className="drop-help">CSV, XLS, XLSX · up to {MAX_BATCH_ROWS} rows · values stay on your device</div><button className="button" onClick={() => dataInput.current?.click()} disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <FolderOpen size={14} />} Choose spreadsheet</button><a className="small-link sample-link" href="/sample-students.csv" download>Download sample data</a>
                  </div>}
                  <input ref={dataInput} type="file" accept=".csv,.xlsx,.xlsm,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={handleDataInput} />
                  {rows.length > 0 && sheetNames.length > 1 && datasetFile && <div className="sheet-select"><label htmlFor="sheet-select">Worksheet</label><select id="sheet-select" className="select" value={selectedSheet} onChange={(event) => { setSelectedSheet(event.target.value); void handleDataFile(datasetFile, event.target.value); }}>{sheetNames.map((name) => <option key={name}>{name}</option>)}</select></div>}
                  {batch.datasetWarnings.map((warning) => <div className="notice warn" key={warning} style={{ marginTop: 10 }}><CircleAlert size={14} /><span>{warning}</span></div>)}
                  {rows.length > 0 && <><div className="section-label">A quick look at your data</div><DatasetTable headers={batch.headers} rows={rows.slice(0, 4)} /></>}
                  <div className="notice info" style={{ marginTop: 20 }}><ShieldCheck size={14} /><span>Leading zeroes are kept when values are stored as text. Check Excel formatting for IDs stored as numbers.</span></div>
                  <div className="step-footer"><button className="button secondary" onClick={() => setStep(1)}><ArrowLeft size={14} /> Back</button><button className="button" disabled={!rows.length || busy} onClick={continueTo}>Continue to field mapping <ArrowRight size={14} /></button></div>
                </div>
              </section>}

              {step === 3 && <section className="card">
                <div className="card-head"><div><div className="step-kicker">03 — Design and map</div><h2>Place your data on the page</h2><p>Add a spreadsheet column, drag it onto the preview, and adjust its position, size, color, and alignment.</p></div><span className="format-badge"><Sparkles size={13} /> {batch.fields.length} placed</span></div>
                <div className="card-body">
                  {!hasTemplate && <div className="notice error"><CircleAlert size={15} /><span>Choose a supported document template before mapping spreadsheet fields.</span></div>}
                  {templateBlob && (batch.templateFormat === "image" || batch.templateFormat === "pdf") && <TemplateDesigner template={templateBlob} format={batch.templateFormat} headers={batch.headers} fields={batch.fields} sample={Object.fromEntries(batch.fields.map((field) => [field.id, getRowValue((rows.find((row) => row.included) ?? rows[0])?.values ?? {}, batch.mapping[field.id])]))} onAdd={addPositionedField} onUpdate={updatePositionedField} onRemove={removePositionedField} onDuplicate={duplicatePositionedField} />}
                  {batch.datasetWarnings.map((warning) => <div className="notice warn" key={warning} style={{ marginTop: 10 }}><CircleAlert size={14} /><span>{warning}</span></div>)}
                  <div className="validation-summary"><Stat label="Records" value={counts.total} /><Stat label="Ready to generate" value={counts.valid} /><Stat label="Need attention" value={invalidRowIds.size} color={invalidRowIds.size ? "#a25243" : undefined} /><Stat label="Excluded" value={counts.excluded} /></div>
                  {hasUnexcludedInvalid && !mappedMissing.length && <div className="notice warn"><CircleAlert size={14} /><span>{invalidRowIds.size} included row{invalidRowIds.size === 1 ? "" : "s"} are missing required values. Exclude them below or correct the spreadsheet and re-import.</span></div>}
                  {batch.fields.length === 0 && <div className="notice warn"><CircleAlert size={14} /><span>Add at least one data field and position it on the document preview before continuing.</span></div>}
                  <div className="section-label">Record review <span className="subtle">· incomplete rows cannot be generated</span></div>
                  <div className="table-scroll"><table className="data-table"><thead><tr><th>Include</th><th>Row</th>{batch.headers.slice(0, 5).map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}<th>Validation</th></tr></thead><tbody>
                      {(showAllRows ? rows : rows.slice(0, 10)).map((row) => {
                      const missing = missingForRow(row);
                        const columns = [...new Set([...batch.headers.slice(0, 4), ...batch.placeholders.map((field) => batch.mapping[field]).filter((value): value is string => Boolean(value))])];
                        return <tr key={row.id} className={!row.included ? "row-exclude" : ""}><td><input aria-label={`Include row ${row.id}`} className="checkbox" type="checkbox" checked={row.included} onChange={() => void toggleRow(row.id)} disabled={generating} /></td><td>{row.id}</td>{columns.map((header, index) => {
                          const needsValue = missing.some((field) => batch.mapping[field] === header);
                          return <td key={`${header}-${index}`} title={row.values[header]}>{needsValue && row.included ? <input className="text-input cell-input" aria-label={`Correct ${header} for row ${row.id}`} placeholder="Enter value" value={row.values[header] ?? ""} onChange={(event) => updateRowValue(row.id, header, event.target.value)} disabled={generating} /> : row.values[header] || "—"}</td>;
                        })}<td>{!row.included ? "Excluded" : missing.length ? `Missing: ${missing.map((id) => batch.mapping[id] ?? id).join(", ")}` : "Ready"}</td></tr>;
                    })}
                  </tbody></table></div>
                  {rows.length > 10 && <button className="small-link" style={{ marginTop: 10 }} onClick={() => setShowAllRows((value) => !value)}>{showAllRows ? "Show fewer rows" : `Show all ${rows.length} rows`}</button>}
                  <div className="step-footer"><button className="button secondary" onClick={() => setStep(2)}><ArrowLeft size={14} /> Back</button><button className="button" disabled={!canMap || hasUnexcludedInvalid} onClick={() => { setStep(4); setPreviewRowId(validRows[0]?.id ?? null); }}>Review documents <ArrowRight size={14} /></button></div>
                </div>
              </section>}

              {step === 4 && <section className="card">
                <div className="card-head"><div><div className="step-kicker">04 — Check then create</div><h2>Preview and generate</h2><p>Review a real record, then generate one printable PDF for each valid spreadsheet row.</p></div><span className="format-badge"><FileCheck2 size={13} /> {counts.valid} ready</span></div>
                <div className="card-body">
                  {counts.valid === 0 && <div className="notice warn"><CircleAlert size={14} /><span>No eligible records are ready. Go back to mapping and review missing values.</span></div>}
                  <div className="review-layout">
                    <div>
                      <div className="data-toolbar"><span className="step-kicker">Document preview</span><div className="record-selector"><select aria-label="Select preview record" className="select" value={previewRowId ?? ""} onChange={(event) => { setPreviewRowId(Number(event.target.value)); setPreviewUrl(""); setPreviewError(""); }}><option value="">Choose a record</option>{validRows.slice(0, 1000).map((row) => <option key={row.id} value={row.id}>Row {row.id} — {artifactBase(row, batch).split("_")[0]}</option>)}</select></div></div>
                      <div className="preview-frame">
                        {previewUrl ? <iframe title="Generated personalized document preview" src={previewUrl} /> : <div className="preview-placeholder"><FileText size={30} /><div>{previewError || (previewLoading ? `${engineMessage || "Preparing preview"}${engineProgress ? ` · ${engineProgress}%` : ""}` : "Choose a valid record and build its preview. This uses the same local renderer as the final PDF." )}</div>{previewError && <button className="button secondary small" style={{ marginTop: 13 }} onClick={() => void showPreview()}><RefreshCw size={13} /> Try again</button>}</div>}
                      </div>
                      <div className="button-row" style={{ marginTop: 11 }}><button className="button secondary small" disabled={!previewRowId || previewLoading} onClick={() => void showPreview()}>{previewLoading ? <LoaderCircle size={13} className="spin" /> : <Sparkles size={13} />}{previewLoading ? "Preparing preview" : previewUrl ? "Refresh preview" : "Build preview PDF"}</button><span className="subtle">First PDF can take a minute while the renderer loads.</span></div>
                    </div>
                    <div className="review-side">
                  <div className="review-box"><h3>This batch</h3><div className="review-row"><span>Template</span><strong title={templateName}>{templateName || "Not selected"}</strong></div><div className="review-row"><span>Spreadsheet</span><strong>{batch.datasetName || "Not selected"}</strong></div><div className="review-row"><span>Rows in file</span><strong>{counts.total}</strong></div><div className="review-row"><span>Ready</span><strong>{counts.valid}</strong></div><div className="review-row"><span>Excluded</span><strong>{counts.excluded}</strong></div><div className="review-row"><span>Placed fields</span><strong>{batch.fields.length}</strong></div></div>
                      <div className="generate-banner"><CloudOff size={17} /><div><strong>Private processing</strong><br />Your template and records stay on this device. The local PDF renderer is served by this app and never receives your documents.</div></div>
                      {!allDone && <button className="button" disabled={!canGenerate || busy} onClick={() => void generateBatch(false)}>{generating ? <><LoaderCircle size={14} className="spin" /> Generating {counts.completed}/{counts.valid}</> : <><Sparkles size={14} /> Generate {counts.valid} document{counts.valid === 1 ? "" : "s"}</>}</button>}
                      {generating && <><div className="progress-track"><div className="progress-fill" style={{ width: `${engineProgress}%` }} /></div><div className="subtle">{engineMessage || "Generating one record at a time"} · {engineProgress}%</div><button className="button secondary small" disabled={cancelRequested} onClick={requestCancel}><X size={13} /> {cancelRequested ? "Pausing after current record…" : "Pause batch"}</button></>}
                    </div>
                  </div>

                  {(counts.completed > 0 || counts.failed > 0 || allDone) && <div className="results-section">
                    <div className="section-label">Batch results</div>
                    <div className="validation-summary"><Stat label="Completed" value={counts.completed} color="#39704c" /><Stat label="Failed" value={counts.failed} color={counts.failed ? "#a25243" : undefined} /><Stat label="Excluded" value={counts.excluded} /><Stat label="Remaining" value={rows.filter((row) => row.included && (row.status === "pending" || row.status === "processing")).length} /></div>
                    {counts.failed > 0 && <div className="notice error"><CircleAlert size={14} /><div><strong>Some records need another try.</strong><ul className="error-list">{rows.filter((row) => row.status === "failed").slice(0, 6).map((row) => <li key={row.id}>Row {row.id}: {row.error}</li>)}</ul></div></div>}
                    <div className="result-actions" style={{ margin: "13px 0" }}>
                      <button className="button small" disabled={!counts.completed || busy || generating} onClick={() => void downloadZip()}><FileArchive size={14} /> Download ZIP{exportProgress !== null ? ` ${exportProgress}%` : ""}</button>
                      <button className="button secondary small" disabled={!counts.completed || busy || generating} onClick={() => void downloadCombinedPdf()}><FileText size={14} /> Combined print PDF{exportProgress !== null && busy ? ` ${exportProgress}%` : ""}</button>
                      {counts.failed > 0 && <button className="button secondary small" disabled={busy || generating} onClick={() => void generateBatch(true)}><RefreshCw size={13} /> Retry failed rows</button>}
                      {(counts.completed > 0 || counts.failed > 0) && <button className="button ghost small" disabled={generating} onClick={() => void generateBatch(false)}><RotateCcw size={13} /> Resume pending</button>}
                    </div>
                    <div className="table-scroll"><table className="batch-table"><thead><tr><th>Row</th><th>Recipient / filename</th><th>Status</th><th>Files</th></tr></thead><tbody>{rows.filter((row) => row.included || row.status === "excluded").slice(0, 40).map((row) => <tr key={row.id}><td>{row.id}</td><td>{artifactBase(row, batch)}</td><td><StatusPill status={row.included ? row.status : "excluded"} /></td><td>{row.status === "completed" ? <span className="button-row">{row.docx && <button className="small-link" onClick={() => downloadSingle(row, "docx")}>Word</button>}<button className="small-link" onClick={() => downloadSingle(row, "pdf")}>PDF</button></span> : row.error ? <span title={row.error} style={{ color: "#a25243" }}>View error</span> : "—"}</td></tr>)}</tbody></table></div>
                    {rows.filter((row) => row.included || row.status === "excluded").length > 40 && <div className="subtle" style={{ marginTop: 8 }}>Showing the first 40 rows. Every completed file is included in your exports.</div>}
                  </div>}

                  <div className="step-footer"><button className="button secondary" disabled={generating} onClick={() => setStep(3)}><ArrowLeft size={14} /> Back to mapping</button><div className="button-row"><button className="button ghost small" disabled={generating} onClick={() => void startOver()}><Trash2 size={13} /> Clear this batch</button></div></div>
                </div>
              </section>}
            </>}
          </section>
        </div>
        <div className="footer-note"><span>EasyDocs works in this browser. Local batches are removed after 7 days. &nbsp;·&nbsp; </span><button className="small-link" onClick={() => void deleteAllData()}>Delete all local data</button></div>
      </div>
      {toast && <div className="toast" role="status"><CheckCircle2 size={15} />{toast}</div>}
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return <div className="stat"><div className="stat-num" style={color ? { color } : undefined}>{value}</div><div className="stat-label">{label}</div></div>;
}

function DatasetTable({ headers, rows }: { headers: string[]; rows: DataRow[] }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>#</th>{headers.slice(0, 6).map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.id}</td>{headers.slice(0, 6).map((header, index) => <td key={`${header}-${index}`} title={row.values[header]}>{row.values[header] || "—"}</td>)}</tr>)}</tbody></table></div>;
}
