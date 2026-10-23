"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Image as ImageIcon, Maximize2, Minimize2, Redo2, Undo2, Upload } from "lucide-react";
import type { DocumentAsset, FieldType, ImageFit, ImageSourceMode, PageScope, PositionedField, TemplateFormat } from "@/lib/types";

interface Props {
  template: Blob;
  format: TemplateFormat;
  headers: string[];
  fields: PositionedField[];
  sample: Record<string, string>;
  sampleAssets?: Record<string, string>;
  assets?: Record<string, DocumentAsset>;
  onAdd: (column: string, page: number, type?: FieldType) => string;
  onUpdate: (id: string, update: Partial<PositionedField>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => string | undefined;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onContinue: () => void;
  onBack: () => void;
  canContinue: boolean;
  onUploadSharedAsset?: (fieldId: string, file: File) => Promise<void>;
}

type PageSize = { width: number; height: number };
type Point = { x: number; y: number };
type CancellableRender = { cancel: () => void; promise: Promise<void> };
type ResizeHandle = "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";
interface ResizeState {
  id: string;
  handle: ResizeHandle;
  startPoint: Point;
  initial: { x: number; y: number; width: number; height: number };
  preserveAspectRatio: boolean;
  aspectRatio: number;
}

const FONT_FAMILIES: Array<{ value: NonNullable<PositionedField["fontFamily"]>; label: string }> = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "TimesRoman", label: "Times New Roman" },
  { value: "Courier", label: "Courier" },
];
const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 5, minHeight: 34, padding: "6px 8px", border: "1px solid #e5e5ea", borderRadius: 7, background: "#fff", color: "#1d1d1f", font: "inherit" };
const toolButtonStyle: React.CSSProperties = { minHeight: 30, padding: "4px 8px", border: "1px solid #e5e5ea", borderRadius: 7, background: "#fff", cursor: "pointer", color: "#1d1d1f" };

export default function TemplateDesigner({
  template,
  format,
  headers,
  fields,
  sample,
  sampleAssets,
  assets,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onContinue,
  onBack,
  canContinue,
  onUploadSharedAsset,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageSurfaceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pdfRenderRef = useRef<CancellableRender | null>(null);
  const dragRef = useRef<{ id: string; offset: Point } | null>(null);
  const panRef = useRef<{ pointerX: number; pointerY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>({ width: 612, height: 792 });
  const [canvasWidth, setCanvasWidth] = useState(680);
  const [selected, setSelected] = useState<string | null>(null);
  const [draftPositions, setDraftPositions] = useState<Record<string, Point>>({});
  const resizeRef = useRef<ResizeState | null>(null);
  const [draftSizes, setDraftSizes] = useState<Record<string, { width: number; height: number; x?: number; y?: number }>>({});
  const [zoom, setZoom] = useState(100);
  const initialFitDoneRef = useRef(false);
  const [snap, setSnap] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [panActive, setPanActive] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(800);
  const activeField = useMemo(() => fields.find((field) => field.id === selected), [fields, selected]);
  const currentFields = fields.filter((field) => {
    const scope = field.pageScope ?? "current";
    if (scope === "all") return true;
    if (scope === "selected") return (field.targetPages ?? [field.page]).includes(page);
    return field.page === page;
  });
  const units = format === "pdf" ? "pt" : "px";

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    void (async () => {
      try {
        const previousRender = pdfRenderRef.current;
        if (previousRender) {
          previousRender.cancel();
          await previousRender.promise.catch(() => undefined);
          if (pdfRenderRef.current === previousRender) pdfRenderRef.current = null;
          if (cancelled) return;
        }
        if (format === "image") {
          objectUrl = URL.createObjectURL(template);
          const image = new Image();
          image.onload = () => {
            if (cancelled) return;
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            context.drawImage(image, 0, 0);
            setPageSize({ width: image.naturalWidth, height: image.naturalHeight });
            setPageCount(1);
          };
          image.onerror = () => { if (!cancelled) console.error("Could not load template image preview"); };
          image.src = objectUrl;
          return;
        }
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
        const document = await pdfjs.getDocument({ data: new Uint8Array(await template.arrayBuffer()) }).promise;
        if (cancelled) return;
        setPageCount(document.numPages);
        const pdfPage = await document.getPage(Math.min(page + 1, document.numPages));
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        setPageSize({ width: baseViewport.width, height: baseViewport.height });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        context.clearRect(0, 0, canvas.width, canvas.height);
        renderTask = pdfPage.render({ canvas, canvasContext: context, viewport });
        pdfRenderRef.current = renderTask;
        await renderTask.promise;
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) console.error("Could not render template preview", error);
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [template, format, page]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => setCanvasWidth(entries[0]?.contentRect.width ?? 680));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver((entries) => setViewportWidth(entries[0]?.contentRect.width ?? 800));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const pointAt = useCallback((clientX: number, clientY: number): Point => {
    const rect = pageSurfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const raw = { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
    if (!snap) return { x: clamp(raw.x), y: clamp(raw.y) };
    const gridX = 5 / Math.max(1, rect.width);
    const gridY = 5 / Math.max(1, rect.height);
    return { x: clamp(Math.round(raw.x / gridX) * gridX), y: clamp(Math.round(raw.y / gridY) * gridY) };
  }, [snap]);

  const moveSelected = useCallback((dx: number, dy: number) => {
    if (!activeField) return;
    onUpdate(activeField.id, { x: clamp(activeField.x + dx / pageSize.width), y: clamp(activeField.y + dy / pageSize.height) });
  }, [activeField, onUpdate, pageSize]);

  const handleKeys = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && expanded) { setExpanded(false); return; }
    const target = event.target as HTMLElement;
    if (target.closest("input, select, textarea, [contenteditable='true']")) return;
    const hasCommandModifier = event.metaKey || event.ctrlKey;
    if (hasCommandModifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) onRedo();
      else onUndo();
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === "y") {
      event.preventDefault();
      onRedo();
      return;
    }
    if (event.key === "Escape") { setSelected(null); return; }
    if ((event.key === "Delete" || event.key === "Backspace") && activeField) {
      event.preventDefault();
      onRemove(activeField.id);
      setSelected(null);
      return;
    }
    if (activeField?.type === "image" && event.shiftKey) {
      const currentW = activeField.width ?? 0.2;
      const currentH = activeField.height ?? 0.1;
      const stepSize = event.altKey ? 0.005 : 0.02;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onUpdate(activeField.id, { width: clamp(currentW + stepSize, 0.02, 1) });
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onUpdate(activeField.id, { width: clamp(currentW - stepSize, 0.02, 1) });
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        onUpdate(activeField.id, { height: clamp(currentH + stepSize, 0.02, 1) });
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onUpdate(activeField.id, { height: clamp(currentH - stepSize, 0.02, 1) });
        return;
      }
    }
    const steps: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
    const step = steps[event.key];
    if (!step || !activeField) return;
    event.preventDefault();
    const multiplier = event.altKey ? 0.1 : event.shiftKey ? 10 : 1;
    moveSelected(step.x * multiplier, step.y * multiplier);
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>, field: PositionedField) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const pointer = pointAt(event.clientX, event.clientY);
    dragRef.current = { id: field.id, offset: { x: pointer.x - field.x, y: pointer.y - field.y } };
    setSelected(field.id);
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const dragTo = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointAt(event.clientX, event.clientY);
    setDraftPositions((current) => ({ ...current, [drag.id]: { x: clamp(point.x - drag.offset.x), y: clamp(point.y - drag.offset.y) } }));
  };

  const finishDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (drag) {
      const point = pointAt(event.clientX, event.clientY);
      const position = { x: clamp(point.x - drag.offset.x), y: clamp(point.y - drag.offset.y) };
      onUpdate(drag.id, position);
      setDraftPositions((current) => { const next = { ...current }; delete next[drag.id]; return next; });
      dragRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const startResize = (event: React.PointerEvent<HTMLElement>, field: PositionedField, handle: ResizeHandle) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const pointer = pointAt(event.clientX, event.clientY);
    const w = field.width ?? 0.2;
    const h = field.height ?? 0.1;
    const ratio = (w * pageSize.width) / Math.max(1, h * pageSize.height);
    resizeRef.current = {
      id: field.id,
      handle,
      startPoint: pointer,
      initial: { x: field.x, y: field.y, width: w, height: h },
      preserveAspectRatio: Boolean(field.preserveAspectRatio),
      aspectRatio: ratio > 0 ? ratio : 1,
    };
    setSelected(field.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const resizeTo = (event: React.PointerEvent<HTMLElement>) => {
    const resize = resizeRef.current;
    if (!resize || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    const current = pointAt(event.clientX, event.clientY);
    const dx = current.x - resize.startPoint.x;
    const dy = current.y - resize.startPoint.y;

    let newX = resize.initial.x;
    let newY = resize.initial.y;
    let newW = resize.initial.width;
    let newH = resize.initial.height;

    if (resize.handle.includes("e")) {
      newW = Math.max(0.03, resize.initial.width + dx);
    }
    if (resize.handle.includes("s")) {
      newH = Math.max(0.02, resize.initial.height + dy);
    }
    if (resize.handle.includes("w")) {
      const maxDx = resize.initial.width - 0.03;
      const clampedDx = Math.min(maxDx, dx);
      newX = resize.initial.x + clampedDx;
      newW = resize.initial.width - clampedDx;
    }
    if (resize.handle.includes("n")) {
      const maxDy = resize.initial.height - 0.02;
      const clampedDy = Math.min(maxDy, dy);
      newY = resize.initial.y + clampedDy;
      newH = resize.initial.height - clampedDy;
    }

    if (resize.preserveAspectRatio && (resize.handle === "se" || resize.handle === "sw" || resize.handle === "ne" || resize.handle === "nw")) {
      const pageRatio = pageSize.width / pageSize.height;
      const targetH = (newW * pageRatio) / resize.aspectRatio;
      if (resize.handle.includes("n")) {
        newY = resize.initial.y + (resize.initial.height - targetH);
      }
      newH = Math.max(0.02, targetH);
    }

    setDraftSizes((prev) => ({
      ...prev,
      [resize.id]: {
        x: clamp(newX, 0, 0.98),
        y: clamp(newY, 0, 0.98),
        width: clamp(newW, 0.03, 1),
        height: clamp(newH, 0.02, 1),
      },
    }));
  };

  const finishResize = (event: React.PointerEvent<HTMLElement>) => {
    const resize = resizeRef.current;
    if (resize) {
      const draft = draftSizes[resize.id];
      if (draft) {
        onUpdate(resize.id, {
          ...(draft.x !== undefined ? { x: draft.x } : {}),
          ...(draft.y !== undefined ? { y: draft.y } : {}),
          width: draft.width,
          height: draft.height,
        });
        setDraftSizes((prev) => {
          const next = { ...prev };
          delete next[resize.id];
          return next;
        });
      }
      resizeRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const setCoordinate = (axis: "x" | "y", value: string) => {
    if (!activeField) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    const maximum = axis === "x" ? pageSize.width : pageSize.height;
    onUpdate(activeField.id, { [axis]: clamp(number / maximum) });
  };

  const changeZoom = useCallback((next: number, focalPoint?: Point) => {
    const viewport = viewportRef.current;
    const value = clamp(next, 20, 250);
    const pageRect = pageSurfaceRef.current?.getBoundingClientRect();
    if (viewport && pageRect) {
      const viewportRect = viewport.getBoundingClientRect();
      const focal = focalPoint ?? { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 };
      const focalClientX = viewportRect.left + focal.x;
      const focalClientY = viewportRect.top + focal.y;
      const pageFractionX = clamp((focalClientX - pageRect.left) / pageRect.width);
      const pageFractionY = clamp((focalClientY - pageRect.top) / pageRect.height);
      requestAnimationFrame(() => {
        const nextPageRect = pageSurfaceRef.current?.getBoundingClientRect();
        if (!nextPageRect) return;
        viewport.scrollLeft += nextPageRect.left + pageFractionX * nextPageRect.width - focalClientX;
        viewport.scrollTop += nextPageRect.top + pageFractionY * nextPageRect.height - focalClientY;
      });
    }
    setZoom(value);
  }, []);

  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.button !== 0 && event.button !== 1) || (event.target as HTMLElement).closest("input, select, textarea")) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    panRef.current = { pointerX: event.clientX, pointerY: event.clientY, scrollLeft: event.currentTarget.scrollLeft, scrollTop: event.currentTarget.scrollTop };
    setPanActive(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const panTo = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = panRef.current;
    if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.scrollLeft = start.scrollLeft - (event.clientX - start.pointerX);
    event.currentTarget.scrollTop = start.scrollTop - (event.clientY - start.pointerY);
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    panRef.current = null;
    setPanActive(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const basePageWidth = Math.max(280, Math.min(900, viewportWidth - 28));
  const pageDisplayWidth = basePageWidth * zoom / 100;
  const fitPage = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pageSize.width) {
      setZoom(100);
      return;
    }
    const widthAt100 = basePageWidth;
    const heightAt100 = pageSize.height * widthAt100 / pageSize.width;
    const availableHeight = Math.max(240, viewport.clientHeight - 28);
    setZoom(Math.min(100, Math.floor(availableHeight / heightAt100 * 100)));
    requestAnimationFrame(() => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }, [basePageWidth, pageSize.height, pageSize.width]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (initialFitDoneRef.current || !pageSize.width || !viewport?.clientHeight) return;
    initialFitDoneRef.current = true;
    requestAnimationFrame(() => setZoom(100));
  }, [pageSize.height, pageSize.width, viewportWidth]);

  useEffect(() => {
    if (!expanded) return;
    const frame = requestAnimationFrame(fitPage);
    return () => cancelAnimationFrame(frame);
  }, [expanded, fitPage]);

  return (
    <section className={`template-designer${expanded ? " template-designer-expanded" : ""}`} onKeyDown={handleKeys} style={{ position: expanded ? "fixed" : "relative", inset: expanded ? 12 : undefined, zIndex: expanded ? 1000 : undefined, display: "grid", gridTemplateColumns: "minmax(160px, 220px) minmax(0, 1fr) minmax(210px, 270px)", gridTemplateRows: expanded ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)", minHeight: 0, height: expanded ? "calc(100dvh - 24px)" : "100%", border: "1px solid #e5e5ea", borderRadius: 16, overflow: "hidden", background: "#f5f5f7", boxShadow: expanded ? "0 20px 80px #1d1d1f40" : undefined }}>
      <aside style={{ background: "#fff", borderRight: "1px solid #e5e5ea", padding: 14, overflowY: "auto" }}>
        <strong style={{ fontSize: 13 }}>Place document fields</strong>
        <p style={{ fontSize: 11, color: "#6e6e73", margin: "6px 0 12px" }}>Add text or image fields, then position them on the page.</p>

        <button
          type="button"
          onClick={() => setSelected(onAdd("Signature", page, "image"))}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", margin: "8px 0 14px", padding: "9px 11px", borderRadius: 9, border: "1px solid #007aff", background: "#eaf3ff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#0067dc" }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ImageIcon size={15} /> Add image / signature</span>
          <span>＋</span>
        </button>

        <strong style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8e8e93", display: "block", marginTop: 10, marginBottom: 6 }}>Spreadsheet text columns</strong>
        {headers.map((header) => <button key={header} onClick={() => setSelected(onAdd(header, page, "text"))} style={{ display: "block", width: "100%", textAlign: "left", margin: "6px 0", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e5ea", background: "#fff", cursor: "pointer", fontSize: 12 }}>{header}<span style={{ float: "right", color: "#007aff" }}>＋</span></button>)}
        {!headers.length && <p style={{ fontSize: 12, color: "#b33e36" }}>Import your CSV or Excel file first.</p>}
        <div style={{ marginTop: 18, fontSize: 11, color: "#6e6e73" }}>Placed: {fields.length}</div>
        <p style={{ marginTop: 15, fontSize: 10, color: "#6e6e73", lineHeight: 1.5 }}>Tip: select a field and use arrow keys to move it by 1 {units}. Shift + arrow moves 10 {units}; Alt + arrow moves 0.1 {units}.</p>
      </aside>

      <div style={{ minWidth: 0, minHeight: 0, height: "100%", padding: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 12, color: "#6e6e73" }}>
          <span>Drag the page to pan · drag a field to position · arrows move precisely</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button type="button" style={{ ...toolButtonStyle, opacity: canUndo ? 1 : 0.45 }} disabled={!canUndo} onClick={onUndo} aria-label="Undo field edit" title="Undo (Ctrl/⌘ Z)"><Undo2 size={14} /></button>
            <button type="button" style={{ ...toolButtonStyle, opacity: canRedo ? 1 : 0.45 }} disabled={!canRedo} onClick={onRedo} aria-label="Redo field edit" title="Redo (Ctrl/⌘ Shift Z · Ctrl Y)"><Redo2 size={14} /></button>
            <button style={toolButtonStyle} disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>‹</button>
            Page {page + 1} / {pageCount}
            <button style={toolButtonStyle} disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>›</button>
            <span style={{ marginLeft: 8 }} />
            <button style={toolButtonStyle} onClick={() => changeZoom(zoom - 10)} aria-label="Zoom out">−</button>
            <button style={{ ...toolButtonStyle, minWidth: 48 }} onClick={() => changeZoom(100)} title="Reset to 100%">{zoom}%</button>
            <button style={toolButtonStyle} onClick={() => changeZoom(zoom + 10)} aria-label="Zoom in">＋</button>
            <button style={toolButtonStyle} onClick={() => changeZoom(100)} title="Fit the page width to the workspace">Fit width</button>
            <button style={toolButtonStyle} onClick={fitPage} title="Fit the entire page in the workspace">Fit page</button>
            <button type="button" style={toolButtonStyle} onClick={() => setExpanded((value) => !value)} title={expanded ? "Close expanded editor (Esc)" : "Open larger editor"}>{expanded ? <><Minimize2 size={14} /> Close</> : <><Maximize2 size={14} /> Expand</>}</button>
          </span>
        </div>
        <div ref={viewportRef} tabIndex={0} aria-label="Document canvas. Drag the page to pan; select a field and use arrow keys to move it." onPointerDown={beginPan} onPointerMove={panTo} onPointerUp={endPan} onPointerCancel={endPan} style={{ minWidth: 0, minHeight: 0, flex: "1 1 0", overflow: "auto", overscrollBehavior: "contain", cursor: panActive ? "grabbing" : "grab", touchAction: "none", background: "#f5f5f7", borderRadius: 10, padding: 14, scrollbarGutter: "stable", userSelect: "none" }}>
          <div style={{ width: `${pageDisplayWidth}px`, minHeight: "100%", margin: "0 auto" }}>
          <div ref={pageSurfaceRef} style={{ position: "relative", width: "100%", boxShadow: "0 5px 24px #1d1d1f24", lineHeight: 0, touchAction: "none", background: "white", cursor: panActive ? "grabbing" : "grab" }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "auto", background: "white" }} />
            {currentFields.map((field) => {
              const isSelected = selected === field.id;
              const isImage = field.type === "image";
              const draftPos = draftPositions[field.id];
              const draftSize = draftSizes[field.id];

              const posX = draftSize?.x ?? draftPos?.x ?? field.x;
              const posY = draftSize?.y ?? draftPos?.y ?? field.y;
              const position = { x: posX, y: posY };
              const widthRatio = draftSize?.width ?? field.width ?? 0.2;
              const heightRatio = draftSize?.height ?? field.height ?? 0.1;

              if (isImage) {
                const assetDataUrl = sampleAssets?.[field.id] || (field.sharedAssetId && assets?.[field.sharedAssetId]?.dataUrl);
                const boxWidth = Math.max(20, widthRatio * canvasWidth);
                const boxHeight = Math.max(16, heightRatio * (canvasWidth * (pageSize.height / pageSize.width)));
                const widthPoints = Math.round(widthRatio * pageSize.width);
                const heightPoints = Math.round(heightRatio * pageSize.height);

                return (
                  <div
                    key={field.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Position image ${field.name || field.column}: ${Math.round(posX * pageSize.width * 10) / 10} ${units} from left, size ${widthPoints} by ${heightPoints} ${units}`}
                    onClick={() => setSelected(field.id)}
                    onPointerDown={(event) => startDrag(event, field)}
                    onPointerMove={dragTo}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    style={{
                      position: "absolute",
                      left: `${posX * 100}%`,
                      top: `${posY * 100}%`,
                      width: `${boxWidth}px`,
                      height: `${boxHeight}px`,
                      padding: 0,
                      background: "transparent",
                      borderRadius: 4,
                      cursor: "move",
                      outline: isSelected ? "2px solid #007aff" : "1px dashed #007affb0",
                      outlineOffset: 1,
                      userSelect: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: isSelected ? 8 : 2,
                    }}
                  >
                    <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      {assetDataUrl ? (
                        <img
                          src={assetDataUrl}
                          alt={field.name || "Image preview"}
                          style={{ width: "100%", height: "100%", objectFit: field.fit ?? "contain", pointerEvents: "none" }}
                        />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f0f5ffcc", color: "#0067dc", fontSize: 10, padding: 4 }}>
                          <ImageIcon size={15} />
                          <span style={{ marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "95%" }}>{field.name || field.column || "Image"}</span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            bottom: -22,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#1d1d1f",
                            color: "#fff",
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            zIndex: 20,
                            lineHeight: "14px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                          }}
                        >
                          {widthPoints} × {heightPoints} {units}
                        </div>

                        <span
                          onPointerDown={(e) => startResize(e, field, "nw")}
                          onPointerMove={resizeTo}
                          onPointerUp={finishResize}
                          onPointerCancel={finishResize}
                          style={{ position: "absolute", top: -5, left: -5, width: 10, height: 10, background: "#fff", border: "2px solid #007aff", borderRadius: "50%", cursor: "nwse-resize", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                          title="Resize top-left"
                        />
                        <span
                          onPointerDown={(e) => startResize(e, field, "ne")}
                          onPointerMove={resizeTo}
                          onPointerUp={finishResize}
                          onPointerCancel={finishResize}
                          style={{ position: "absolute", top: -5, right: -5, width: 10, height: 10, background: "#fff", border: "2px solid #007aff", borderRadius: "50%", cursor: "nesw-resize", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                          title="Resize top-right"
                        />
                        <span
                          onPointerDown={(e) => startResize(e, field, "se")}
                          onPointerMove={resizeTo}
                          onPointerUp={finishResize}
                          onPointerCancel={finishResize}
                          style={{ position: "absolute", bottom: -5, right: -5, width: 10, height: 10, background: "#fff", border: "2px solid #007aff", borderRadius: "50%", cursor: "nwse-resize", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                          title="Resize bottom-right"
                        />
                        <span
                          onPointerDown={(e) => startResize(e, field, "sw")}
                          onPointerMove={resizeTo}
                          onPointerUp={finishResize}
                          onPointerCancel={finishResize}
                          style={{ position: "absolute", bottom: -5, left: -5, width: 10, height: 10, background: "#fff", border: "2px solid #007aff", borderRadius: "50%", cursor: "nesw-resize", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                          title="Resize bottom-left"
                        />
                        <span
                          onPointerDown={(e) => startResize(e, field, "e")}
                          onPointerMove={resizeTo}
                          onPointerUp={finishResize}
                          onPointerCancel={finishResize}
                          style={{ position: "absolute", top: "50%", right: -4, transform: "translateY(-50%)", width: 8, height: 12, background: "#fff", border: "2px solid #007aff", borderRadius: 2, cursor: "ew-resize", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                          title="Resize width"
                        />
                        <span
                          onPointerDown={(e) => startResize(e, field, "w")}
                          onPointerMove={resizeTo}
                          onPointerUp={finishResize}
                          onPointerCancel={finishResize}
                          style={{ position: "absolute", top: "50%", left: -4, transform: "translateY(-50%)", width: 8, height: 12, background: "#fff", border: "2px solid #007aff", borderRadius: 2, cursor: "ew-resize", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                          title="Resize width"
                        />
                        <span
                          onPointerDown={(e) => startResize(e, field, "s")}
                          onPointerMove={resizeTo}
                          onPointerUp={finishResize}
                          onPointerCancel={finishResize}
                          style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 12, height: 8, background: "#fff", border: "2px solid #007aff", borderRadius: 2, cursor: "ns-resize", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                          title="Resize height"
                        />
                        <span
                          onPointerDown={(e) => startResize(e, field, "n")}
                          onPointerMove={resizeTo}
                          onPointerUp={finishResize}
                          onPointerCancel={finishResize}
                          style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 12, height: 8, background: "#fff", border: "2px solid #007aff", borderRadius: 2, cursor: "ns-resize", zIndex: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                          title="Resize height"
                        />
                      </>
                    )}
                  </div>
                );
              }

              const cssFamily = field.fontFamily === "TimesRoman" ? "Times New Roman, Times, serif" : field.fontFamily === "Courier" ? "Courier, Courier New, monospace" : "Helvetica, Arial, sans-serif";
              const text = sample[field.id] || field.column;
              return <button
                key={field.id}
                type="button"
                aria-label={`Position ${field.column}: ${Math.round(position.x * pageSize.width * 10) / 10} ${units} from left, ${Math.round(position.y * pageSize.height * 10) / 10} ${units} from top`}
                onClick={() => setSelected(field.id)}
                onPointerDown={(event) => startDrag(event, field)}
                onPointerMove={dragTo}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                style={{ position: "absolute", left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: field.align === "center" ? "translateX(-50%)" : field.align === "right" ? "translateX(-100%)" : "none", padding: 0, lineHeight: 1, whiteSpace: "pre", textAlign: field.align, color: field.color, fontSize: `${Math.max(4, field.size * canvasWidth)}px`, fontFamily: cssFamily, fontWeight: field.bold ? 700 : 400, fontStyle: field.italic ? "italic" : "normal", textDecoration: field.underline ? "underline" : "none", background: "transparent", border: 0, borderRadius: 0, cursor: "move", outline: isSelected ? "1px solid #007aff" : "1px dashed #007aff80", outlineOffset: 2, userSelect: "none" }}
              >{text}</button>;
            })}
          </div>
          </div>
        </div>
        {!fields.length && <p style={{ textAlign: "center", fontSize: 12, color: "#6e6e73", marginTop: 14 }}>Add a spreadsheet field or image to start designing.</p>}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10, fontSize: 11, color: "#6e6e73" }}><label style={{ display: "flex", alignItems: "center", gap: 5 }}><input type="checkbox" checked={snap} onChange={(event) => setSnap(event.target.checked)} /> Snap to 5 px grid while dragging</label></div>
      </div>

      <aside style={{ background: "#fff", borderLeft: "1px solid #e5e5ea", padding: 14, overflowY: "auto" }}>
        <strong style={{ fontSize: 13 }}>Field settings</strong>
        {activeField ? (
          <div style={{ display: "grid", gap: 12, marginTop: 14, fontSize: 12 }}>
            <label>
              Page scope
              <select
                value={activeField.pageScope ?? "current"}
                onChange={(event) => onUpdate(activeField.id, { pageScope: event.target.value as PageScope })}
                style={inputStyle}
              >
                <option value="current">Current page only (Page {page + 1})</option>
                <option value="all">All pages (repeat across document)</option>
                <option value="selected">Selected pages</option>
              </select>
            </label>
            {activeField.pageScope === "selected" && (
              <label>
                Target page numbers (1 to {pageCount}, comma separated)
                <input
                  type="text"
                  placeholder="e.g. 1, 2"
                  value={(activeField.targetPages ?? [activeField.page]).map((p) => p + 1).join(", ")}
                  onChange={(event) => {
                    const parsed = event.target.value
                      .split(",")
                      .map((s) => parseInt(s.trim(), 10) - 1)
                      .filter((n) => Number.isFinite(n) && n >= 0 && n < pageCount);
                    onUpdate(activeField.id, { targetPages: parsed.length ? parsed : [activeField.page] });
                  }}
                  style={inputStyle}
                />
              </label>
            )}

            {activeField.type === "image" ? (
              <>
                <label>
                  Field label
                  <input
                    type="text"
                    value={activeField.name ?? activeField.column ?? "Signature"}
                    placeholder="e.g. Authorized Signature"
                    onChange={(event) => onUpdate(activeField.id, { name: event.target.value })}
                    style={inputStyle}
                  />
                </label>
                <label>
                  Image source mode
                  <select
                    value={activeField.imageSourceMode ?? "shared"}
                    onChange={(event) => onUpdate(activeField.id, { imageSourceMode: event.target.value as ImageSourceMode })}
                    style={inputStyle}
                  >
                    <option value="shared">One shared image (same for all records)</option>
                    <option value="record">One image per record (e.g. photo/signature)</option>
                  </select>
                </label>

                {activeField.imageSourceMode === "shared" ? (
                  <div>
                    <span style={{ display: "block", marginBottom: 4, color: "#6e6e73", fontSize: 11 }}>Shared image asset:</span>
                    {activeField.sharedAssetId && assets?.[activeField.sharedAssetId] ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, border: "1px solid #e5e5ea", borderRadius: 8, background: "#fafafa" }}>
                        {assets[activeField.sharedAssetId].dataUrl && (
                          <img src={assets[activeField.sharedAssetId].dataUrl} alt="Thumbnail" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4, background: "#fff", border: "1px solid #eee" }} />
                        )}
                        <span style={{ flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {assets[activeField.sharedAssetId].name}
                        </span>
                        <label style={{ ...toolButtonStyle, cursor: "pointer", fontSize: 11 }}>
                          Change
                          <input type="file" accept="image/*" hidden onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onUploadSharedAsset) void onUploadSharedAsset(activeField.id, file);
                            e.target.value = "";
                          }} />
                        </label>
                      </div>
                    ) : (
                      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 8, border: "1.5px dashed #007aff80", borderRadius: 8, background: "#f5f9ff", cursor: "pointer", color: "#007aff", fontSize: 11 }}>
                        <Upload size={13} /> Upload shared image
                        <input type="file" accept="image/*" hidden onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && onUploadSharedAsset) void onUploadSharedAsset(activeField.id, file);
                          e.target.value = "";
                        }} />
                      </label>
                    )}
                  </div>
                ) : (
                  <label>
                    Matching spreadsheet column
                    <select
                      value={activeField.column}
                      onChange={(event) => onUpdate(activeField.id, { column: event.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select column (or match by ID)</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span style={{ display: "block", marginTop: 4, fontSize: 10, color: "#8e8e93" }}>
                      Upload images in the Review step to match filenames or IDs.
                    </span>
                  </label>
                )}

                <div>
                  <span style={{ display: "block", marginBottom: 5, color: "#6e6e73", fontSize: 11 }}>Size presets:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    <button
                      type="button"
                      style={{ ...toolButtonStyle, fontSize: 11, padding: "3px 8px" }}
                      onClick={() => onUpdate(activeField.id, { width: 0.22, height: 0.08, fit: "contain" })}
                      title="Set signature proportions (horizontal rect)"
                    >
                      Signature
                    </button>
                    <button
                      type="button"
                      style={{ ...toolButtonStyle, fontSize: 11, padding: "3px 8px" }}
                      onClick={() => onUpdate(activeField.id, { width: 0.16, height: 0.16, fit: "contain" })}
                      title="Set square stamp or logo proportions"
                    >
                      Stamp / Logo
                    </button>
                    <button
                      type="button"
                      style={{ ...toolButtonStyle, fontSize: 11, padding: "3px 8px" }}
                      onClick={() => onUpdate(activeField.id, { width: 0.20, height: 0.24, fit: "cover" })}
                      title="Set portrait photograph (3:4)"
                    >
                      Photo (3:4)
                    </button>
                    <button
                      type="button"
                      style={{ ...toolButtonStyle, fontSize: 11, padding: "3px 8px" }}
                      onClick={() => onUpdate(activeField.id, { width: 0.40, height: 0.12, fit: "contain" })}
                      title="Set banner proportions"
                    >
                      Banner
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label>
                    Width ({units})
                    <input
                      type="number"
                      min="10"
                      max={pageSize.width}
                      step="1"
                      value={round((activeField.width ?? 0.2) * pageSize.width)}
                      onChange={(event) => {
                        const n = Number(event.target.value);
                        if (Number.isFinite(n)) onUpdate(activeField.id, { width: clamp(n / pageSize.width, 0.02, 1) });
                      }}
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    Height ({units})
                    <input
                      type="number"
                      min="10"
                      max={pageSize.height}
                      step="1"
                      value={round((activeField.height ?? 0.1) * pageSize.height)}
                      onChange={(event) => {
                        const n = Number(event.target.value);
                        if (Number.isFinite(n)) onUpdate(activeField.id, { height: clamp(n / pageSize.height, 0.02, 1) });
                      }}
                      style={inputStyle}
                    />
                  </label>
                </div>
                <span style={{ display: "block", fontSize: 10, color: "#8e8e93", lineHeight: 1.4 }}>
                  Drag corner/edge handles on page to resize, or use Shift + Arrow keys to adjust size.
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label>X from left ({units})<input type="number" min="0" max={pageSize.width} step="0.1" value={round(activeField.x * pageSize.width)} onChange={(event) => setCoordinate("x", event.target.value)} style={inputStyle} /></label>
                  <label>Y from top ({units})<input type="number" min="0" max={pageSize.height} step="0.1" value={round(activeField.y * pageSize.height)} onChange={(event) => setCoordinate("y", event.target.value)} style={inputStyle} /></label>
                </div>

                <label>
                  Fit behavior
                  <select
                    value={activeField.fit ?? "contain"}
                    onChange={(event) => onUpdate(activeField.id, { fit: event.target.value as ImageFit })}
                    style={inputStyle}
                  >
                    <option value="contain">Contain (preserve proportions inside box)</option>
                    <option value="cover">Cover (fill entire bounding box)</option>
                    <option value="fill">Fill (stretch to exact box dimensions)</option>
                  </select>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={activeField.preserveAspectRatio !== false}
                    onChange={(event) => onUpdate(activeField.id, { preserveAspectRatio: event.target.checked })}
                  />
                  Preserve aspect ratio
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={activeField.required !== false}
                    onChange={(event) => onUpdate(activeField.id, { required: event.target.checked })}
                  />
                  Require image for every record
                </label>
              </>
            ) : (
              <>
                <label>Spreadsheet column<select value={activeField.column} onChange={(event) => onUpdate(activeField.id, { column: event.target.value })} style={inputStyle}>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label>X from left ({units})<input type="number" min="0" max={pageSize.width} step="0.1" value={round(activeField.x * pageSize.width)} onChange={(event) => setCoordinate("x", event.target.value)} style={inputStyle} /></label>
                  <label>Y from top ({units})<input type="number" min="0" max={pageSize.height} step="0.1" value={round(activeField.y * pageSize.height)} onChange={(event) => setCoordinate("y", event.target.value)} style={inputStyle} /></label>
                </div>
                <label>Font size ({units})<input type="number" min="4" max="200" step="0.5" value={round(activeField.size * pageSize.width)} onChange={(event) => { const n = Number(event.target.value); if (Number.isFinite(n)) onUpdate(activeField.id, { size: clamp(n, 4, 200) / pageSize.width }); }} style={inputStyle} /></label>
                <input aria-label="Font size slider" type="range" min={4 / pageSize.width} max={96 / pageSize.width} step={0.5 / pageSize.width} value={activeField.size} onChange={(event) => onUpdate(activeField.id, { size: Number(event.target.value) })} style={{ width: "100%", marginTop: -8 }} />
                <label>Font family<select value={activeField.fontFamily ?? "Helvetica"} onChange={(event) => onUpdate(activeField.id, { fontFamily: event.target.value as PositionedField["fontFamily"] })} style={inputStyle}>{FONT_FAMILIES.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}</select></label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" aria-pressed={!!activeField.bold} onClick={() => onUpdate(activeField.id, { bold: !activeField.bold })} style={{ ...toolButtonStyle, minWidth: 38, fontWeight: 700, background: activeField.bold ? "#eaf3ff" : "#fff" }}>B</button>
                  <button type="button" aria-pressed={!!activeField.italic} onClick={() => onUpdate(activeField.id, { italic: !activeField.italic })} style={{ ...toolButtonStyle, minWidth: 38, fontStyle: "italic", background: activeField.italic ? "#eaf3ff" : "#fff" }}>I</button>
                  <button type="button" aria-pressed={!!activeField.underline} onClick={() => onUpdate(activeField.id, { underline: !activeField.underline })} style={{ ...toolButtonStyle, minWidth: 38, textDecoration: "underline", background: activeField.underline ? "#eaf3ff" : "#fff" }}>U</button>
                </div>
                <label>Color<input aria-label="Text color" type="color" value={activeField.color} onChange={(event) => onUpdate(activeField.id, { color: event.target.value })} style={{ ...inputStyle, height: 38, padding: 3 }} /></label>
                <label>Alignment<select value={activeField.align} onChange={(event) => onUpdate(activeField.id, { align: event.target.value as PositionedField["align"] })} style={inputStyle}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
              </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 6 }}>
              <button onClick={() => { const id = onDuplicate(activeField.id); if (id) setSelected(id); }} style={toolButtonStyle}>Duplicate</button>
              <button onClick={() => { onRemove(activeField.id); setSelected(null); }} style={{ ...toolButtonStyle, color: "#b33e36", borderColor: "#efd2ce" }}>Remove</button>
            </div>
            <p style={{ margin: 0, color: "#6e6e73", fontSize: 10, lineHeight: 1.45 }}>Coordinates are measured from the page’s top-left. Arrow keys move the selected field. Delete removes it. PDF sizes use points; image sizes use image pixels.</p>
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: 13, borderRadius: 10, background: "#f5f5f7", color: "#6e6e73", fontSize: 11, lineHeight: 1.55 }}>
            <strong style={{ display: "block", color: "#1d1d1f", marginBottom: 7 }}>How to place your information</strong>
            <span>1. Click a column or “Add image / signature”.</span><br />
            <span>2. Drag the field to position it on the document.</span><br />
            <span>3. Choose page scope (e.g. repeat on All pages).</span><br />
            <span>4. Adjust dimensions, fit, or font here.</span>
          </div>
        )}
      </aside>
      {expanded && <footer style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 16px", background: "#fff", borderTop: "1px solid #e5e5ea" }}>
        <button type="button" className="button secondary" onClick={onBack}><span aria-hidden="true">←</span> Back to data</button>
        <button type="button" className="button" disabled={!canContinue} onClick={onContinue}>Review records <span aria-hidden="true">→</span></button>
      </footer>}
    </section>
  );
}

function clamp(value: number, min = 0, max = 1): number { return Math.max(min, Math.min(max, value)); }
function round(value: number): number { return Math.round(value * 10) / 10; }
