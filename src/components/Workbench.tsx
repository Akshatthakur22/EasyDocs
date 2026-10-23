"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import TemplateDesigner from "@/components/TemplateDesigner";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Clock,
  FileArchive, FileCheck2, FileSpreadsheet, FileText, FolderOpen,
  Image as ImageIcon, LoaderCircle, LockKeyhole, Plus, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Trash2,
  Upload, X, XCircle
} from "lucide-react";
import { cancelSessionCleanup, cleanSessionData, cleanupExpiredData, clearBatch, db, loadBatch, persistBatch, saveAsset, scheduleSessionCleanup } from "@/lib/database";
import { getFilenameValue, getRowValue, importCsv, importXlsx, validateDatasetFileSize } from "@/lib/dataset";
import { convertDocumentToPdf, convertLegacyXlsToXlsx } from "@/lib/office-engine";
import { createCombinedPdf, createPdfZip } from "@/lib/exports";
import { renderPositionedTemplate } from "@/lib/template";
import { createDocumentAsset, matchAssetsToRows } from "@/lib/assets";
import { createId, MAX_BATCH_ROWS, type Batch, type DataRow, type DocumentAsset, type FieldType, type ImportResult, type PositionedField, type SavedTemplate, type TemplateFormat } from "@/lib/types";

const STEPS = [
  { title: "Template", caption: "Choose a document" },
  { title: "Your data", caption: "Import a spreadsheet" },
  { title: "Place fields", caption: "Design the page" },
  { title: "Review", caption: "Check records" },
  { title: "Generate", caption: "Create and export" },
];

function freshBatch(templateId: string | null = null): Batch {
  const now = Date.now();
  return {
    id: createId(), createdAt: now, updatedAt: now, status: "draft", templateId,
    datasetName: null, sourceType: null, headers: [], mapping: {}, placeholders: [], fields: [],
    unsupportedTokens: [], datasetWarnings: [], rowCount: 0,
    assets: {}, sharedAssets: {},
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
    assets: row.assets,
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
  const [designCanUndo, setDesignCanUndo] = useState(false);
  const [designCanRedo, setDesignCanRedo] = useState(false);
  const [cleanupExpiresAt, setCleanupExpiresAt] = useState<number | null>(null);
  const [cleanupCountdown, setCleanupCountdown] = useState<number | null>(null);
  const templateInput = useRef<HTMLInputElement>(null);
  const dataInput = useRef<HTMLInputElement>(null);
  const batchImageInput = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const designUndoRef = useRef<PositionedField[][]>([]);
  const designRedoRef = useRef<PositionedField[][]>([]);
  const designHistoryBatchRef = useRef(batch.id);
  const rowEditVersionsRef = useRef(new Map<string, number>());

  const syncDesignHistory = useCallback(() => {
    setDesignCanUndo(designUndoRef.current.length > 0);
    setDesignCanRedo(designRedoRef.current.length > 0);
  }, []);

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
            const recoveredBatch: Batch = {
              ...saved.batch,
              assets: saved.assets ?? saved.batch.assets ?? {},
              sharedAssets: saved.batch.sharedAssets ?? {},
              fields: saved.batch.fields ?? template?.fields ?? [],
              templateFormat: template?.format ?? saved.batch.templateFormat ?? "pdf",
              status: saved.batch.status === "generating" ? "partial" as const : saved.batch.status,
            };
            setBatch(recoveredBatch);
            setRows(recoveredRows);
            setTemplateBlob(template?.blob ?? null);
            setTemplateName(template?.name ?? "");
            const hasGenerationState = ["generating", "partial", "complete", "failed"].includes(saved.batch.status);
            setStep(hasGenerationState ? 5 : recoveredRows.length ? (recoveredBatch.fields.length ? 4 : 3) : template ? 2 : 1);
            if (recoveredBatch.cleanupExpiresAt && recoveredBatch.cleanupExpiresAt > Date.now()) {
              setCleanupExpiresAt(recoveredBatch.cleanupExpiresAt);
              setCleanupCountdown(Math.ceil((recoveredBatch.cleanupExpiresAt - Date.now()) / 1000));
            }
            if (recoveredRows.some((row) => row.status === "processing")) {
              await persistBatch(recoveredBatch, recoveredRows, Object.values(recoveredBatch.assets ?? {}));
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

  const commitBatch = useCallback(async (nextBatch: Batch, nextRows: DataRow[]) => {
    setBatch(nextBatch);
    setRows(nextRows);
    try {
      await persistBatch(nextBatch, nextRows, Object.values(nextBatch.assets ?? {}));
    } catch (reason) {
      setError(`Local storage could not save this change. ${reason instanceof Error ? reason.message : "Check available browser storage."}`);
    }
  }, []);

  const newBatch = useCallback(async () => {
    setError("");
    setPreviewUrl("");
    setPreviewError("");
    setCleanupExpiresAt(null);
    setCleanupCountdown(null);
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

  const executeSessionCleanup = useCallback(async () => {
    if (generating || busy) return;
    try {
      await cleanSessionData(batch.id);
      setCleanupExpiresAt(null);
      setCleanupCountdown(null);
      await newBatch();
      say("Temporary session data cleared for your privacy.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear session data.");
    }
  }, [batch.id, busy, generating, newBatch, say]);

  const cancelCleanup = useCallback(async () => {
    await cancelSessionCleanup(batch.id);
    setCleanupExpiresAt(null);
    setCleanupCountdown(null);
    say("Automatic session cleanup cancelled.");
  }, [batch.id, say]);

  const triggerDownloadCleanup = useCallback(async () => {
    if (generating || busy) return;
    const delayMs = 3 * 60 * 1000;
    const expiresAt = await scheduleSessionCleanup(batch.id, delayMs);
    setCleanupExpiresAt(expiresAt);
    setCleanupCountdown(180);
  }, [batch.id, busy, generating]);

  useEffect(() => {
    if (cleanupExpiresAt === null) return;
    const tick = () => {
      const remainingMs = cleanupExpiresAt - Date.now();
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      setCleanupCountdown(remainingSecs);
      if (remainingSecs <= 0) {
        void executeSessionCleanup();
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [cleanupExpiresAt, executeSessionCleanup]);

  const mappedMissing = useMemo(() => {
    return batch.fields.filter((field) => {
      if (field.type === "image") {
        if (field.imageSourceMode === "shared") {
          return field.required !== false && (!field.sharedAssetId || !batch.assets?.[field.sharedAssetId]);
        }
        return false;
      }
      return !batch.mapping[field.id] || !batch.headers.includes(batch.mapping[field.id]);
    }).map((f) => f.id);
  }, [batch.fields, batch.mapping, batch.headers, batch.assets]);

  const unsupported = batch.unsupportedTokens;

  const missingForRow = useCallback((row: DataRow) => {
    const missing: string[] = [];
    for (const field of batch.fields) {
      if (field.type === "image") {
        if (field.required === false) continue;
        if (field.imageSourceMode === "shared") {
          const assetId = field.sharedAssetId ?? batch.sharedAssets?.[field.id];
          if (!assetId || !batch.assets?.[assetId]) {
            missing.push(field.id);
          }
        } else {
          const assetId = row.assets?.[field.id];
          if (!assetId || !batch.assets?.[assetId]) {
            missing.push(field.id);
          }
        }
      } else {
        const header = batch.mapping[field.id];
        if (!header || !String(row.values[header] ?? "").trim()) {
          missing.push(field.id);
        }
      }
    }
    return missing;
  }, [batch.fields, batch.mapping, batch.assets, batch.sharedAssets]);

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
  const includedRows = rows.filter((row) => row.included).length;
  const allDone = includedRows > 0 && counts.completed + counts.failed >= includedRows && !generating;

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
      if (template.id !== batch.templateId) {
        designUndoRef.current = [];
        designRedoRef.current = [];
        designHistoryBatchRef.current = batch.id;
        syncDesignHistory();
      }
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
  }, [batch, commitBatch, rows, syncDesignHistory]);

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
      designUndoRef.current = [];
      designRedoRef.current = [];
      designHistoryBatchRef.current = batch.id;
      syncDesignHistory();
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
  }, [batch, commitBatch, refreshTemplates, rows, say, syncDesignHistory]);

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
    setStep(2);
    say(`${nextRows.length} rows imported${imported.sheetName ? ` from ${imported.sheetName}` : ""}.`);
  }, [batch, commitBatch, say]);

  const saveDesign = useCallback(async (fields: PositionedField[], recordHistory = true) => {
    if (designHistoryBatchRef.current !== batch.id) {
      designUndoRef.current = [];
      designRedoRef.current = [];
      designHistoryBatchRef.current = batch.id;
    }
    if (recordHistory) {
      designUndoRef.current.push(batch.fields.map((field) => ({ ...field })));
      if (designUndoRef.current.length > 100) designUndoRef.current.shift();
      designRedoRef.current = [];
    }
    syncDesignHistory();
    const placeholders = fields.map((field) => field.id);
    const mapping = Object.fromEntries(fields.map((field) => [field.id, field.column]));
    const nextBatch = { ...batch, fields, placeholders, mapping, updatedAt: Date.now(), status: "draft" as const };
    await commitBatch(nextBatch, clearRowOutputs(rows));
    if (batch.templateId) await db.templates.update(batch.templateId, { fields, placeholders });
  }, [batch, commitBatch, rows, syncDesignHistory]);

  const undoDesign = useCallback(async () => {
    if (designHistoryBatchRef.current !== batch.id) {
      designUndoRef.current = [];
      designRedoRef.current = [];
      designHistoryBatchRef.current = batch.id;
      syncDesignHistory();
      return;
    }
    const previous = designUndoRef.current.pop();
    if (!previous) return;
    designRedoRef.current.push(batch.fields.map((field) => ({ ...field })));
    syncDesignHistory();
    await saveDesign(previous, false);
  }, [batch.id, batch.fields, saveDesign, syncDesignHistory]);

  const redoDesign = useCallback(async () => {
    if (designHistoryBatchRef.current !== batch.id) {
      designUndoRef.current = [];
      designRedoRef.current = [];
      designHistoryBatchRef.current = batch.id;
      syncDesignHistory();
      return;
    }
    const next = designRedoRef.current.pop();
    if (!next) return;
    designUndoRef.current.push(batch.fields.map((field) => ({ ...field })));
    syncDesignHistory();
    await saveDesign(next, false);
  }, [batch.id, batch.fields, saveDesign, syncDesignHistory]);

  const resolveRowAssets = useCallback((row: DataRow): Record<string, Blob> => {
    const assets: Record<string, Blob> = {};
    for (const field of batch.fields) {
      if (field.type === "image") {
        const assetId = field.imageSourceMode === "shared"
          ? (field.sharedAssetId ?? batch.sharedAssets?.[field.id])
          : row.assets?.[field.id];
        const asset = assetId ? batch.assets?.[assetId] : undefined;
        if (asset?.blob) {
          assets[field.id] = asset.blob;
        }
      }
    }
    return assets;
  }, [batch.fields, batch.assets, batch.sharedAssets]);

  const uploadSharedAsset = useCallback(async (fieldId: string, file: File) => {
    setBusy(true);
    try {
      const asset = await createDocumentAsset(file);
      await saveAsset(asset, batch.id);
      const nextAssets = { ...batch.assets, [asset.id]: asset };
      const nextSharedAssets = { ...batch.sharedAssets, [fieldId]: asset.id };
      const nextFields = batch.fields.map((f) => f.id === fieldId ? { ...f, sharedAssetId: asset.id } : f);
      const nextBatch = {
        ...batch,
        assets: nextAssets,
        sharedAssets: nextSharedAssets,
        fields: nextFields,
        updatedAt: Date.now(),
      };
      await commitBatch(nextBatch, clearRowOutputs(rows));
      say(`Shared image “${asset.name}” applied.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setBusy(false);
    }
  }, [batch, commitBatch, rows, say]);

  const handleBatchImageUpload = useCallback(async (files: File[]) => {
    setBusy(true);
    setError("");
    try {
      const recordFields = batch.fields.filter((f) => f.type === "image" && f.imageSourceMode === "record");
      const targetField = recordFields[0];
      if (!targetField) {
        throw new Error("Add an image field configured as “One image per record” first.");
      }

      const newAssets: DocumentAsset[] = [];
      for (const file of files) {
        const asset = await createDocumentAsset(file);
        newAssets.push(asset);
        await saveAsset(asset, batch.id);
      }

      const allAssetsMap = { ...batch.assets };
      for (const a of newAssets) allAssetsMap[a.id] = a;

      const matchingResult = matchAssetsToRows(
        Object.values(allAssetsMap),
        rows,
        targetField.column
      );

      const updatedRows = rows.map((row) => {
        const matchedAssetId = matchingResult.matches[row.id];
        if (matchedAssetId) {
          return {
            ...row,
            assets: { ...row.assets, [targetField.id]: matchedAssetId },
            status: "pending" as const,
            pdf: undefined,
          };
        }
        return row;
      });

      const nextBatch = {
        ...batch,
        assets: allAssetsMap,
        updatedAt: Date.now(),
      };

      await commitBatch(nextBatch, updatedRows);
      if (matchingResult.warnings.length) {
        matchingResult.warnings.forEach((w) => say(w));
      } else {
        say(`Matched ${Object.keys(matchingResult.matches).length} of ${rows.length} records with images.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image files.");
    } finally {
      setBusy(false);
    }
  }, [batch, commitBatch, rows, say]);

  const handleSingleRowImageUpload = useCallback(async (rowId: number, fieldId: string, file: File) => {
    try {
      const asset = await createDocumentAsset(file);
      await saveAsset(asset, batch.id);
      const allAssets = { ...batch.assets, [asset.id]: asset };
      const updatedRows = rows.map((row) =>
        row.id === rowId
          ? { ...row, assets: { ...row.assets, [fieldId]: asset.id }, status: "pending" as const, pdf: undefined }
          : row
      );
      const nextBatch = { ...batch, assets: allAssets, updatedAt: Date.now() };
      await commitBatch(nextBatch, updatedRows);
      say(`Image attached to record ${rowId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach image.");
    }
  }, [batch, commitBatch, rows, say]);

  const addPositionedField = useCallback((column: string, page: number, type: FieldType = "text") => {
    const fields = batch.fields ?? [];
    const offset = fields.length % 7;
    const field: PositionedField = type === "image" ? {
      id: createId(),
      type: "image",
      name: column || "Signature",
      column: batch.headers[0] ?? "",
      page,
      pageScope: "current",
      imageSourceMode: "shared",
      x: 0.12,
      y: Math.min(0.85, 0.16 + offset * 0.08),
      width: 0.22,
      height: 0.1,
      size: 0.025,
      color: "#202622",
      align: "left",
      fit: "contain",
      preserveAspectRatio: true,
      required: true,
    } : {
      id: createId(),
      type: "text",
      column,
      page,
      pageScope: "current",
      x: 0.12,
      y: Math.min(0.88, 0.14 + offset * 0.075),
      size: 0.025,
      color: "#202622",
      align: "left",
      fontFamily: "Helvetica",
      bold: false,
      italic: false,
    };
    void saveDesign([...fields, field]);
    return field.id;
  }, [batch.fields, batch.headers, saveDesign]);

  const duplicatePositionedField = useCallback((id: string) => {
    const source = (batch.fields ?? []).find((field) => field.id === id);
    if (!source) return undefined;
    const copy = { ...source, id: createId(), x: Math.min(0.98, source.x + 0.025), y: Math.min(0.98, source.y + 0.025) };
    void saveDesign([...(batch.fields ?? []), copy]);
    return copy.id;
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
      validateDatasetFileSize(file);
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

  const updateRowValue = useCallback(async (rowId: number, header: string, value: string) => {
    const currentRow = rows.find((row) => row.id === rowId);
    if (!currentRow) return;
    const updatedRow = { ...currentRow, values: { ...currentRow.values, [header]: value }, status: "pending" as const, error: undefined, docx: undefined, pdf: undefined };
    const nextBatch = { ...batch, updatedAt: Date.now(), status: "draft" as const };
    const editKey = `${rowId}:${header}`;
    const version = (rowEditVersionsRef.current.get(editKey) ?? 0) + 1;
    rowEditVersionsRef.current.set(editKey, version);
    setRows((current) => current.map((row) => row.id === rowId ? updatedRow : row));
    setBatch(nextBatch);
    try {
      await db.transaction("rw", db.rows, db.batches, async () => {
        await db.rows.put({ ...updatedRow, batchId: batch.id });
        await db.batches.put(nextBatch);
      });
      if (rowEditVersionsRef.current.get(editKey) === version) setError("");
    } catch {
      if (rowEditVersionsRef.current.get(editKey) === version) {
        setRows((current) => current.map((row) => row.id === rowId ? currentRow : row));
        setError("This edit could not be saved and was reverted. Check available browser storage, then try again.");
      }
    }
    setPreviewUrl("");
    setPreviewError("");
  }, [batch, rows]);

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
      const rowAssets = resolveRowAssets(row);
      const pdf = await renderPositionedTemplate(templateBlob, batch.templateFormat ?? "pdf", batch.fields, values, rowAssets);
      const url = URL.createObjectURL(pdf);
      setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return url; });
      setPreviewRowId(row.id);
    } catch (reason) {
      setPreviewError(reason instanceof Error ? reason.message : "Could not render this preview.");
    } finally {
      setPreviewLoading(false);
      setEngineMessage("");
    }
  }, [batch, previewRowId, resolveRowAssets, rows, templateBlob, validRows]);

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
        const rowAssets = resolveRowAssets(row);
        setEngineMessage(`Rendering record ${completedNow + 1} of ${work.length}`);
        const pdf = await renderPositionedTemplate(templateBlob, batch.templateFormat ?? "pdf", batch.fields, values, rowAssets);
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
  }, [batch, missingForRow, resolveRowAssets, rows, say, templateBlob]);

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
      const blob = await createPdfZip(completed, (row) => artifactBase(row, batch), `EasyDocs batch export\nTemplate: ${templateName}\nSpreadsheet: ${batch.datasetName ?? ""}\nGenerated PDFs: ${completed.length}\nFailed: ${counts.failed}\nExcluded: ${counts.excluded}\n\nPrintable files are in PDF/.\n`, setExportProgress);
      saveFile(blob, `easydocs_${batch.id.slice(0, 8)}.zip`);
      say("ZIP export downloaded.");
      void triggerDownloadCleanup();
    } catch (reason) {
      setError(`Could not create the ZIP: ${reason instanceof Error ? reason.message : "Browser storage limit reached."}`);
    } finally {
      setBusy(false);
      setExportProgress(null);
    }
  }, [batch, counts.excluded, counts.failed, rows, say, templateName, triggerDownloadCleanup]);

  const downloadCombinedPdf = useCallback(async () => {
    const completed = rows.filter((row) => row.status === "completed" && row.pdf).sort((a, b) => a.id - b.id);
    if (!completed.length) return;
    setBusy(true);
    setExportProgress(0);
    try {
      const blob = await createCombinedPdf(completed, (percent) => setExportProgress(percent));
      saveFile(blob, `easydocs_print_${batch.id.slice(0, 8)}.pdf`);
      say(`${completed.length} documents combined in spreadsheet order.`);
      void triggerDownloadCleanup();
    } catch (reason) {
      setError(`Could not create the combined PDF: ${reason instanceof Error ? reason.message : "The file is too large for available browser memory."}`);
    } finally {
      setBusy(false);
      setExportProgress(null);
    }
  }, [batch.id, rows, say, triggerDownloadCleanup]);

  const downloadSingle = useCallback((row: DataRow, format: "docx" | "pdf") => {
    const blob = row[format];
    if (blob) {
      saveFile(blob, `${artifactBase(row, batch)}.${format}`);
      void triggerDownloadCleanup();
    }
  }, [batch, triggerDownloadCleanup]);

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
  const reviewColumns = [...new Set([...batch.headers.slice(0, 4), ...batch.fields.map((field) => batch.mapping[field.id]).filter((value): value is string => Boolean(value))])];
  const recordImageFields = useMemo(() => batch.fields.filter((field) => field.type === "image" && field.imageSourceMode === "record"), [batch.fields]);
  const sampleDataUrls = useMemo(() => {
    const row = rows.find((r) => r.included) ?? rows[0];
    if (!row?.assets || !batch.assets) return {};
    const urls: Record<string, string> = {};
    for (const [fieldId, assetId] of Object.entries(row.assets)) {
      const asset = batch.assets[assetId];
      if (asset?.dataUrl) urls[fieldId] = asset.dataUrl;
    }
    return urls;
  }, [rows, batch.assets]);
  const continueTo = () => {
    if (step === 1 && hasTemplate) setStep(2);
    else if (step === 2 && rows.length) setStep(hasTemplate ? 3 : 1);
    else if (step === 3 && canMap) setStep(4);
    else if (step === 4 && canMap && validRows.length > 0 && !hasUnexcludedInvalid) setStep(5);
  };
  const chooseStep = (target: number) => {
    if (target < step) setStep(target);
    else if (target === 2 && hasTemplate) setStep(2);
    else if (target === 3 && hasTemplate && rows.length) setStep(3);
    else if (target === 4 && canMap) setStep(4);
    else if (target === 5 && canMap && validRows.length > 0 && !hasUnexcludedInvalid) setStep(5);
  };

  if (!loaded) return <div className="loading-screen"><div className="loading-brand">EasyDocs</div><LoaderCircle className="spin" size={22} /></div>;

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <Link className="brand" href="/" aria-label="EasyDocs home">
          <span className="brand-mark"><FileText size={18} strokeWidth={2.2} /></span>
          <span className="brand-name">easy<span>docs</span></span>
        </Link>
        <div className="app-top-actions">
          <Link className="privacy-chip" href="/privacy" title="Templates, rows, and generated files are stored locally in this browser."><LockKeyhole size={14} /><span>Stored in this browser</span></Link>
          <button className="quiet-button" onClick={() => void newBatch()}><Plus size={15} /> New batch</button>
          <button className="quiet-button" onClick={() => setRecentTemplatePage((value) => !value)}><FolderOpen size={15} /> <span className="library-label">Templates</span></button>
        </div>
      </header>

      <div className={`app-content${recentTemplatePage ? " library-mode" : ""}`}>
        <div className="app-heading">
          <div><span className="eyebrow">YOUR WORKSPACE</span><h1>{recentTemplatePage ? pageTitle : "Create a batch"}</h1><p>{recentTemplatePage ? "Reuse a saved template with a new spreadsheet." : "Follow the steps to prepare, review, and create your documents."}</p></div>
          {!recentTemplatePage && <span className="batch-save-state"><ShieldCheck size={15} /> Local browser workspace</span>}
        </div>

        {!recentTemplatePage && <nav className="workflow-steps" aria-label="Batch progress">
          {STEPS.map((item, index) => {
            const number = index + 1;
            const done = (number === 1 && hasTemplate) || (number === 2 && rows.length > 0) || (number === 3 && canMap) || (number === 4 && canMap && validRows.length > 0 && !hasUnexcludedInvalid) || (number === 5 && allDone);
            const accessible = number < step || number === 1 || (number === 2 && hasTemplate) || (number === 3 && hasTemplate && rows.length > 0) || (number === 4 && canMap) || (number === 5 && canMap && validRows.length > 0 && !hasUnexcludedInvalid);
            return <button key={item.title} className={`workflow-step ${step === number ? "active" : ""} ${done && step !== number ? "done" : ""}`} disabled={!accessible || generating} onClick={() => chooseStep(number)} aria-current={step === number ? "step" : undefined}>
              <span className="workflow-step-number">{done && step !== number ? <Check size={14} /> : number}</span><span className="workflow-step-copy"><strong>{item.title}</strong><small>{item.caption}</small></span>
            </button>;
          })}
        </nav>}

        <section className="main-panel">
          {error && <div className="notice error" role="alert"><CircleAlert size={15} /><span>{error}</span><button className="button ghost small" aria-label="Dismiss" onClick={() => setError("")}><X size={14} /></button></div>}

          {recentTemplatePage ? <section className="card">
            <div className="card-head"><div><div className="step-kicker">SAVED ON THIS DEVICE</div><h2>Your template library</h2><p>Reuse a document template with another spreadsheet whenever you need it.</p></div><button className="button secondary small" onClick={() => setRecentTemplatePage(false)}><ArrowLeft size={14} /> Back to batch</button></div>
            <div className="card-body">
              {templates.length ? <div className="template-grid">{templates.map((template) => <button key={template.id} className="template-tile" onClick={() => void selectTemplate(template)}>
                <span className="file-icon"><FileText size={20} /></span><span className="template-tile-name">{template.name}</span><span className="template-tile-meta">{template.fields?.length ?? 0} placed fields · updated {new Date(template.updatedAt).toLocaleDateString()}</span>
              </button>)}</div> : <div className="empty-state"><FolderOpen size={28} /><div>No templates saved yet.</div><p>Upload an image, PDF, or Word document to save a reusable layout.</p><button className="button small" onClick={() => { setRecentTemplatePage(false); setStep(1); }}>Choose a template</button></div>}
              <div className="step-footer"><span className="subtle">Templates and batches stay in this browser for up to seven days.</span><button className="button danger small" onClick={() => void deleteAllData()}><Trash2 size={13} /> Delete all local data</button></div>
            </div>
          </section> : <>
            {step === 1 && <section className="card">
              <div className="card-head"><div><div className="step-kicker">STEP 01 · TEMPLATE</div><h2>Choose your document</h2><p>Upload a page to personalize. Word files are converted to PDF before placement.</p></div><span className="format-badge"><FileText size={13} /> PNG · JPG · PDF · WORD</span></div>
              <div className="card-body">
                {templateBlob ? <div className="file-card"><span className="file-icon"><FileCheck2 size={20} /></span><span className="file-meta"><span className="file-name">{templateName}</span><span className="file-sub">{fileSize(templateBlob.size)} · {batch.fields.length} placed fields{batch.templateFormat === "image" ? " · image size at 96 px/in" : ""}</span></span><span className="file-actions"><button className="button secondary small" onClick={() => templateInput.current?.click()} disabled={busy}><RotateCcw size={13} /><span>Replace</span></button><button className="button ghost small" onClick={() => setRecentTemplatePage(true)}>Library</button></span></div> : <div className={`dropzone ${draggingTemplate ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDraggingTemplate(true); }} onDragLeave={() => setDraggingTemplate(false)} onDrop={(event) => dropFile(event, "template")}>
                  <div className="drop-icon"><Upload size={21} /></div><div className="drop-title">Drop a document here to begin</div><div className="drop-help">PNG, JPG, PDF, DOC, DOCX · up to 25 MB · kept on this device. Image print size uses a documented 96 px/in policy.</div><button className="button" onClick={() => templateInput.current?.click()} disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <FolderOpen size={14} />} Choose a template</button><a className="small-link sample-link" href="/sample-attendance-warning.docx" download>Download sample template</a>
                </div>}
                <input ref={templateInput} type="file" accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" hidden onChange={handleTemplateInput} />
                {templateBlob && batch.fields.length > 0 && <><div className="section-label">Saved fields</div><div className="placeholder-chips">{batch.fields.map((field) => <span className="mapping-tag" key={field.id}>{field.column}</span>)}</div></>}
                <div className="notice info" style={{ marginTop: 20 }}><LockKeyhole size={14} /><span>Your template is stored in this browser. Word conversion can affect pagination, so review the page before placing fields.</span></div>
                <div className="step-footer"><span className="subtle">Your original file is not sent to a document conversion service.</span><button className="button" disabled={!hasTemplate || busy} onClick={continueTo}>Continue to data <ArrowRight size={14} /></button></div>
              </div>
            </section>}

            {step === 2 && <section className="card">
              <div className="card-head"><div><div className="step-kicker">STEP 02 · DATA</div><h2>Import your spreadsheet</h2><p>Use one header row and one record per row. You can review the imported values before mapping.</p></div><span className="format-badge"><FileSpreadsheet size={13} /> CSV · XLS · XLSX · XLSM</span></div>
              <div className="card-body">
                {rows.length ? <div className="file-card"><span className="file-icon"><FileSpreadsheet size={20} /></span><span className="file-meta"><span className="file-name">{batch.datasetName}</span><span className="file-sub">{rows.length} records · {batch.headers.length} columns{batch.sheetName ? ` · ${batch.sheetName}` : ""}</span></span><span className="file-actions"><button className="button secondary small" onClick={() => dataInput.current?.click()} disabled={busy}><RotateCcw size={13} /> Replace data</button></span></div> : <div className={`dropzone ${draggingData ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDraggingData(true); }} onDragLeave={() => setDraggingData(false)} onDrop={(event) => dropFile(event, "data")}>
                  <div className="drop-icon"><FileSpreadsheet size={21} /></div><div className="drop-title">Drop your CSV or Excel file here</div><div className="drop-help">CSV, XLS, XLSX, XLSM · up to 25 MB and {MAX_BATCH_ROWS} rows · processed in this browser</div><button className="button" onClick={() => dataInput.current?.click()} disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <FolderOpen size={14} />} Choose spreadsheet</button><a className="small-link sample-link" href="/sample-students.csv" download>Download sample data</a>
                </div>}
                <input ref={dataInput} type="file" accept=".csv,.xlsx,.xlsm,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={handleDataInput} />
                {rows.length > 0 && sheetNames.length > 1 && datasetFile && <div className="sheet-select"><label htmlFor="sheet-select">Worksheet</label><select id="sheet-select" className="select" value={selectedSheet} onChange={(event) => { setSelectedSheet(event.target.value); void handleDataFile(datasetFile, event.target.value); }}>{sheetNames.map((name) => <option key={name}>{name}</option>)}</select></div>}
                {batch.datasetWarnings.map((warning) => <div className="notice warn" key={warning} style={{ marginTop: 10 }}><CircleAlert size={14} /><span>{warning}</span></div>)}
                {rows.length > 0 && <><div className="dataset-summary"><div><strong>{rows.length}</strong><span>records found</span></div><div><strong>{batch.headers.length}</strong><span>columns found</span></div><div><strong>{invalidRowIds.size}</strong><span>rows needing attention</span></div></div><div className="section-label">Data preview · first 4 records</div><DatasetTable headers={batch.headers} rows={rows.slice(0, 4)} /></>}
                <div className="notice info" style={{ marginTop: 20 }}><ShieldCheck size={14} /><span>Leading zeroes are preserved when spreadsheet values are stored as text. Check Excel formatting for IDs stored as numbers.</span></div>
                <div className="step-footer"><button className="button secondary" onClick={() => setStep(1)}><ArrowLeft size={14} /> Back</button><button className="button" disabled={!rows.length || busy} onClick={continueTo}>{hasTemplate ? "Continue to field placement" : "Choose a template"} <ArrowRight size={14} /></button></div>
              </div>
            </section>}

            {step === 3 && <section className="card placement-card">
              <div className="card-head"><div><div className="step-kicker">STEP 03 · PLACE FIELDS</div><h2>Put each value where it belongs</h2><p>Add a spreadsheet column, then position and style it on the document preview.</p></div><span className="format-badge"><Sparkles size={13} /> {batch.fields.length} fields</span></div>
              <div className="card-body">
                {!hasTemplate && <div className="notice error"><CircleAlert size={15} /><span>Choose a document template before placing spreadsheet fields.</span></div>}
                {templateBlob && (batch.templateFormat === "image" || batch.templateFormat === "pdf") && (
                  <TemplateDesigner
                    template={templateBlob}
                    format={batch.templateFormat}
                    headers={batch.headers}
                    fields={batch.fields}
                    sample={Object.fromEntries(batch.fields.map((field) => [field.id, getRowValue((rows.find((row) => row.included) ?? rows[0])?.values ?? {}, batch.mapping[field.id])]))}
                    sampleAssets={sampleDataUrls}
                    assets={batch.assets}
                    onUploadSharedAsset={uploadSharedAsset}
                    onAdd={addPositionedField}
                    onUpdate={updatePositionedField}
                    onRemove={removePositionedField}
                    onDuplicate={duplicatePositionedField}
                    onUndo={undoDesign}
                    onRedo={redoDesign}
                    canUndo={designCanUndo}
                    canRedo={designCanRedo}
                    onContinue={continueTo}
                    onBack={() => setStep(2)}
                    canContinue={canMap}
                  />
                )}
                {batch.datasetWarnings.map((warning) => <div className="notice warn" key={warning} style={{ marginTop: 10 }}><CircleAlert size={14} /><span>{warning}</span></div>)}
                {!batch.fields.length && <div className="notice info" style={{ marginTop: 14 }}><CircleAlert size={14} /><span>Add a field from the left panel. You can edit its position, font, size, and color.</span></div>}
                <div className="step-footer"><button className="button secondary" onClick={() => setStep(2)}><ArrowLeft size={14} /> Back to data</button><button className="button" disabled={!canMap} onClick={continueTo}>Review records <ArrowRight size={14} /></button></div>
              </div>
            </section>}

            {step === 4 && <section className="card">
              <div className="card-head"><div><div className="step-kicker">STEP 04 · REVIEW</div><h2>Check the document and records</h2><p>Preview a real record, then correct or exclude rows with missing required information.</p></div><span className="format-badge"><FileCheck2 size={13} /> {validRows.length} ready</span></div>
              <div className="card-body">
                <div className="validation-summary"><Stat label="Records" value={counts.total} /><Stat label="Ready" value={counts.valid} color="#287d48" /><Stat label="Need attention" value={invalidRowIds.size} color={invalidRowIds.size ? "#a25243" : undefined} /><Stat label="Excluded" value={counts.excluded} /></div>
                {hasUnexcludedInvalid && <div className="notice warn"><CircleAlert size={14} /><span>{invalidRowIds.size} included record{invalidRowIds.size === 1 ? " is" : "s are"} missing required values. Correct the cells or exclude those rows to continue.</span></div>}
                {recordImageFields.length > 0 && (
                  <div style={{ marginTop: 14, marginBottom: 14, padding: "14px 18px", border: "1px solid #e5e5ea", borderRadius: 8, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                          <ImageIcon size={15} /> Recipient images &amp; signatures
                        </strong>
                        <p className="subtle" style={{ margin: "3px 0 0 0", fontSize: 13 }}>
                          Upload individual images or signatures for {recordImageFields.map((f) => f.name || f.column).join(", ")}. Files match by filename (e.g. <code>rahul.png</code>) or record ID.
                        </p>
                      </div>
                      <button className="button secondary small" disabled={busy} onClick={() => batchImageInput.current?.click()}>
                        <Upload size={13} /> Upload recipient images
                      </button>
                      <input
                        ref={batchImageInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        multiple
                        hidden
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length) void handleBatchImageUpload(files);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>
                )}
                {validRows.length > 0 && <div className="review-layout">
                  <div>
                    <div className="data-toolbar"><span className="step-kicker">PRINT PREVIEW</span><div className="record-selector"><select aria-label="Select preview record" className="select" value={previewRowId ?? ""} onChange={(event) => { setPreviewRowId(Number(event.target.value)); setPreviewUrl(""); setPreviewError(""); }}><option value="">Choose a record</option>{validRows.slice(0, 1000).map((row) => <option key={row.id} value={row.id}>Row {row.id} — {artifactBase(row, batch).split("_")[0]}</option>)}</select></div></div>
                    <div className="preview-frame">{previewUrl ? <iframe title="Generated personalized document preview" src={previewUrl} /> : <div className="preview-placeholder"><FileText size={30} /><div>{previewError || (previewLoading ? `${engineMessage || "Preparing preview"}${engineProgress ? ` · ${engineProgress}%` : ""}` : "Choose a record and create a preview using the final PDF renderer.")}</div>{previewError && <button className="button secondary small" style={{ marginTop: 13 }} onClick={() => void showPreview()}><RefreshCw size={13} /> Try again</button>}</div>}</div>
                    <div className="button-row" style={{ marginTop: 11 }}><button className="button secondary small" disabled={!previewRowId || previewLoading} onClick={() => void showPreview()}>{previewLoading ? <LoaderCircle size={13} className="spin" /> : <Sparkles size={13} />}{previewLoading ? "Preparing preview" : previewUrl ? "Refresh preview" : "Build preview PDF"}</button><span className="subtle">This uses the same renderer as your batch output.</span></div>
                  </div>
                  <aside className="review-side"><div className="review-box"><h3>Ready to create</h3><div className="review-row"><span>Template</span><strong title={templateName}>{templateName}</strong></div><div className="review-row"><span>Spreadsheet</span><strong>{batch.datasetName}</strong></div><div className="review-row"><span>Printable PDFs</span><strong>{validRows.length}</strong></div><div className="review-row"><span>Placed fields</span><strong>{batch.fields.length}</strong></div><div className="review-row"><span>Output</span><strong>PDF</strong></div></div><div className="notice info"><ShieldCheck size={14} /><span>Review the sample PDF and correct any missing values below before creating the batch.</span></div></aside>
                </div>}
                {rows.length > 0 && <><div className="section-label">Record checks <span className="subtle">· correct a value or exclude that record</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Include</th><th>Record</th>{reviewColumns.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}{recordImageFields.map((field) => <th key={field.id}>{field.name || field.column || "Image"}</th>)}<th>Status</th></tr></thead><tbody>
                  {(showAllRows ? rows : rows.slice(0, 10)).map((row) => {
                    const missing = missingForRow(row);
                    return (
                      <tr key={row.id} className={!row.included ? "row-exclude" : ""}>
                        <td><input aria-label={`Include row ${row.id}`} className="checkbox" type="checkbox" checked={row.included} onChange={() => void toggleRow(row.id)} disabled={generating} /></td>
                        <td>{row.id}</td>
                        {reviewColumns.map((header, index) => {
                          const needsValue = missing.some((field) => batch.mapping[field] === header);
                          return <td key={`${header}-${index}`} title={row.values[header]}>{needsValue && row.included ? <input className="text-input cell-input" aria-label={`Correct ${header} for row ${row.id}`} placeholder="Enter value" value={row.values[header] ?? ""} onChange={(event) => updateRowValue(row.id, header, event.target.value)} disabled={generating} /> : row.values[header] || "—"}</td>;
                        })}
                        {recordImageFields.map((field) => {
                          const assetId = row.assets?.[field.id];
                          const asset = assetId ? batch.assets?.[assetId] : undefined;
                          return (
                            <td key={field.id} style={{ minWidth: 120 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {asset?.dataUrl ? (
                                  <img src={asset.dataUrl} alt={asset.name} style={{ width: 28, height: 28, objectFit: "contain", border: "1px solid #ddd", borderRadius: 4, background: "#fff" }} />
                                ) : (
                                  <span style={{ fontSize: 11, color: "#8e8e93", fontStyle: "italic" }}>None</span>
                                )}
                                <label className="small-link" style={{ cursor: "pointer", fontSize: 11 }}>
                                  {asset ? "Change" : "Upload"}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/jpg"
                                    hidden
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) void handleSingleRowImageUpload(row.id, field.id, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              </div>
                            </td>
                          );
                        })}
                        <td>
                          {!row.included ? (
                            "Excluded"
                          ) : missing.length ? (
                            <span className="validation-error">
                              Missing: {missing.map((id) => {
                                const f = batch.fields.find((field) => field.id === id);
                                return f?.name || f?.column || batch.mapping[id] || id;
                              }).join(", ")}
                            </span>
                          ) : (
                            <span className="validation-ok">Ready</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody></table></div>{rows.length > 10 && <button className="small-link" style={{ marginTop: 10 }} onClick={() => setShowAllRows((value) => !value)}>{showAllRows ? "Show fewer records" : `Show all ${rows.length} records`}</button>}</>}
                <div className="step-footer"><button className="button secondary" onClick={() => setStep(3)}><ArrowLeft size={14} /> Back to field placement</button><button className="button" disabled={!canMap || hasUnexcludedInvalid || validRows.length === 0} onClick={() => setStep(5)}>Continue to generation <ArrowRight size={14} /></button></div>
              </div>
            </section>}

            {step === 5 && <section className="card">
              <div className="card-head"><div><div className="step-kicker">STEP 05 · GENERATE</div><h2>{allDone ? "Your batch is ready" : generating ? "Creating your documents" : "Generate personalized PDFs"}</h2><p>{allDone ? "Download individual files, a ZIP archive, or one combined print PDF." : "Your reviewed records will become individual PDFs, one document per record."}</p></div><span className="format-badge"><FileCheck2 size={13} /> {counts.valid} eligible</span></div>
              <div className="card-body">
                {cleanupCountdown !== null && (
                  <div className="notice warn" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={16} />
                      <span>
                        Download started. For your privacy, temporary document data will be cleared in{" "}
                        <strong>
                          {Math.floor(cleanupCountdown / 60)}:{String(cleanupCountdown % 60).padStart(2, "0")}
                        </strong>.
                      </span>
                    </div>
                    <div className="button-row" style={{ margin: 0, gap: 6 }}>
                      <button className="button danger small" onClick={() => void executeSessionCleanup()}>
                        <Trash2 size={13} /> Clean now
                      </button>
                      <button className="button secondary small" onClick={() => void cancelCleanup()}>
                        Keep session
                      </button>
                    </div>
                  </div>
                )}
                {!allDone && <div className="generation-summary"><div><span>Template</span><strong title={templateName}>{templateName || "Not selected"}</strong></div><div><span>Spreadsheet</span><strong title={batch.datasetName ?? ""}>{batch.datasetName || "Not selected"}</strong></div><div><span>Records to generate</span><strong>{validRows.length}</strong></div><div><span>Output format</span><strong>Printable PDF</strong></div></div>}
                {!allDone && !generating && <div className="notice info" style={{ marginTop: 15 }}><LockKeyhole size={14} /><span>Generation runs in this browser. Completed PDFs are saved with your batch and remain available if some records fail.</span></div>}
                {counts.valid === 0 && <div className="notice warn"><CircleAlert size={14} /><span>No eligible records are ready. Return to review and resolve the row issues.</span></div>}
                {!allDone && !generating && <button className="button button-large generate-action" disabled={!canGenerate || busy} onClick={() => void generateBatch(false)}><Sparkles size={15} />{counts.completed || counts.failed ? "Resume document generation" : `Generate ${validRows.length} PDF${validRows.length === 1 ? "" : "s"}`}</button>}
                {generating && <div className="generation-progress" role="status" aria-live="polite"><div className="progress-copy"><div><strong>{engineMessage || "Creating documents"}</strong><span>{counts.completed} completed · {counts.failed} failed · {counts.pending} remaining</span></div><strong>{engineProgress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${engineProgress}%` }} /></div><button className="button secondary small" disabled={cancelRequested} onClick={requestCancel}><X size={13} /> {cancelRequested ? "Pausing after current document…" : "Pause batch"}</button></div>}
                {(counts.completed > 0 || counts.failed > 0) && <div className="results-section">
                  <div className="section-label">Batch results</div><div className="validation-summary"><Stat label="Completed" value={counts.completed} color="#287d48" /><Stat label="Failed" value={counts.failed} color={counts.failed ? "#a25243" : undefined} /><Stat label="Excluded" value={counts.excluded} /><Stat label="Remaining" value={rows.filter((row) => row.included && (row.status === "pending" || row.status === "processing")).length} /></div>
                  {allDone && counts.failed > 0 && <div className="notice warn"><CircleAlert size={14} /><span>Some documents need another try. Successful PDFs are ready to download now.</span></div>}
                  {counts.failed > 0 && <div className="notice error"><CircleAlert size={14} /><div><strong>Records that failed</strong><ul className="error-list">{rows.filter((row) => row.status === "failed").slice(0, 6).map((row) => <li key={row.id}>Record {row.id}: {row.error}</li>)}</ul></div></div>}
                  <div className="result-actions" style={{ margin: "13px 0" }}>
                    <button className="button small" disabled={!counts.completed || busy || generating} onClick={() => void downloadZip()}><FileArchive size={14} /> Download ZIP{exportProgress !== null ? ` ${exportProgress}%` : ""}</button>
                    <button className="button secondary small" disabled={!counts.completed || busy || generating} onClick={() => void downloadCombinedPdf()}><FileText size={14} /> Combined print PDF{exportProgress !== null && busy ? ` ${exportProgress}%` : ""}</button>
                    {counts.failed > 0 && <button className="button secondary small" disabled={busy || generating} onClick={() => void generateBatch(true)}><RefreshCw size={13} /> Retry failed</button>}
                    {rows.some((row) => row.included && row.status === "pending") && (counts.completed > 0 || counts.failed > 0) && <button className="button ghost small" disabled={generating} onClick={() => void generateBatch(false)}><RotateCcw size={13} /> Resume remaining</button>}
                  </div>
                  <div className="table-scroll"><table className="batch-table"><thead><tr><th>Record</th><th>Document filename</th><th>Status</th><th>Download</th></tr></thead><tbody>{rows.filter((row) => row.included || row.status === "excluded").slice(0, 40).map((row) => <tr key={row.id}><td>{row.id}</td><td>{artifactBase(row, batch)}</td><td><StatusPill status={row.included ? row.status : "excluded"} /></td><td>{row.status === "completed" && row.pdf ? <button className="small-link" onClick={() => downloadSingle(row, "pdf")}>Download PDF</button> : row.error ? <span title={row.error} className="validation-error">See error above</span> : "—"}</td></tr>)}</tbody></table></div>
                  {rows.filter((row) => row.included || row.status === "excluded").length > 40 && <div className="subtle" style={{ marginTop: 8 }}>Showing the first 40 records. All completed files are included in exports.</div>}
                </div>}
                <div className="step-footer"><button className="button secondary" disabled={generating} onClick={() => setStep(4)}><ArrowLeft size={14} /> Back to review</button><div className="button-row"><button className="button ghost small" disabled={generating} onClick={() => void newBatch()}><Plus size={13} /> New batch</button><button className="button danger small" disabled={generating} onClick={() => void startOver()}><Trash2 size={13} /> Clear this batch</button></div></div>
              </div>
            </section>}
          </>}
        </section>
        <div className="app-footer"><span>Local batches expire after seven days. <Link href="/privacy">How local storage works</Link></span><button className="small-link" onClick={() => void deleteAllData()}>Delete all local data</button></div>
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
