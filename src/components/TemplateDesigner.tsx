"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PositionedField, TemplateFormat } from "@/lib/types";

interface Props {
  template: Blob;
  format: TemplateFormat;
  headers: string[];
  fields: PositionedField[];
  sample: Record<string, string>;
  onAdd: (column: string, page: number) => void;
  onUpdate: (id: string, update: Partial<PositionedField>) => void;
  onRemove: (id: string) => void;
}

export default function TemplateDesigner({ template, format, headers, fields, sample, onAdd, onUpdate, onRemove }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [canvasWidth, setCanvasWidth] = useState(680);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [draftPositions, setDraftPositions] = useState<Record<string, { x: number; y: number }>>({});
  const activeField = useMemo(() => fields.find((field) => field.id === selected), [fields, selected]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    void (async () => {
      try {
        if (format === "image") {
          const url = URL.createObjectURL(template);
          const image = new Image();
          image.onload = () => {
            if (cancelled) return;
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            context.drawImage(image, 0, 0);
            setPageCount(1);
            URL.revokeObjectURL(url);
          };
          image.onerror = () => URL.revokeObjectURL(url);
          image.src = url;
          return;
        }
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
        const document = await pdfjs.getDocument({ data: new Uint8Array(await template.arrayBuffer()) }).promise;
        if (cancelled) return;
        setPageCount(document.numPages);
        const pdfPage = await document.getPage(Math.min(page + 1, document.numPages));
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        context.clearRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
      } catch (error) {
        console.error("Could not render template preview", error);
      }
    })();
    return () => { cancelled = true; };
  }, [template, format, page]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => setCanvasWidth(entries[0]?.contentRect.width ?? 680));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const currentFields = fields.filter((field) => field.page === page);

  return (
    <section className="template-designer" style={{ display: "grid", gridTemplateColumns: "minmax(145px, 190px) minmax(0, 1fr) minmax(170px, 220px)", minHeight: 520, border: "1px solid #e5e9e3", borderRadius: 16, overflow: "hidden", background: "#f5f6f3" }}>
      <aside style={{ background: "#fff", borderRight: "1px solid #e5e9e3", padding: 14, overflowY: "auto" }}>
        <strong style={{ fontSize: 13 }}>Spreadsheet fields</strong>
        <p style={{ fontSize: 11, color: "#78837c", margin: "6px 0 12px" }}>Add a column, then drag its label onto the page.</p>
        {headers.map((header) => <button key={header} onClick={() => { onAdd(header, page); }} style={{ display: "block", width: "100%", textAlign: "left", margin: "7px 0", padding: "9px 10px", borderRadius: 9, border: "1px solid #dfe5df", background: "#fbfcfa", cursor: "pointer", fontSize: 12 }}>{header} <span style={{ float: "right", color: "#517b65" }}>＋</span></button>)}
        {!headers.length && <p style={{ fontSize: 12, color: "#a15a4e" }}>Import your CSV or Excel file first.</p>}
        <div style={{ marginTop: 18, fontSize: 11, color: "#78837c" }}>Placed: {fields.length}</div>
      </aside>

      <div style={{ minWidth: 0, padding: 14, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, fontSize: 12, color: "#657269" }}>
          <span>Click a field to select it. Drag to position.</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>‹</button>
            Page {page + 1} / {pageCount}
            <button disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>›</button>
          </span>
        </div>
        <div style={{ position: "relative", width: "min(100%, 900px)", margin: "auto", boxShadow: "0 5px 24px #18372a24", lineHeight: 0, touchAction: "none" }}>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "auto", background: "white" }} />
          {currentFields.map((field) => {
            const position = draftPositions[field.id] ?? field;
            return <button
            key={field.id}
            onClick={() => setSelected(field.id)}
            onPointerDown={(event) => { event.preventDefault(); setSelected(field.id); setDragging(field.id); event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const rect = event.currentTarget.parentElement!.getBoundingClientRect();
              setDraftPositions((current) => ({ ...current, [field.id]: { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) } }));
            }}
            onPointerUp={(event) => {
              if (dragging === field.id) {
                const rect = event.currentTarget.parentElement!.getBoundingClientRect();
                const point = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
                onUpdate(field.id, point);
                setDraftPositions((current) => { const next = { ...current }; delete next[field.id]; return next; });
                setDragging(null);
              }
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            style={{ position: "absolute", left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: field.align === "center" ? "translate(-50%, -50%)" : field.align === "right" ? "translate(-100%, -50%)" : "translate(0, -50%)", padding: "3px 6px", lineHeight: 1.15, whiteSpace: "nowrap", color: field.color, fontSize: Math.max(10, Math.min(48, field.size * canvasWidth)), fontFamily: "Arial, sans-serif", fontWeight: 600, background: "#ffffffb8", border: selected === field.id ? "2px solid #2d684d" : "1px dashed #55816a", borderRadius: 4, cursor: "move" }}
          >{sample[field.id] || field.column}</button>;
          })}
        </div>
        {!fields.length && <p style={{ textAlign: "center", fontSize: 12, color: "#78837c", marginTop: 14 }}>Add a spreadsheet field to start designing.</p>}
      </div>

      <aside style={{ background: "#fff", borderLeft: "1px solid #e5e9e3", padding: 14 }}>
        <strong style={{ fontSize: 13 }}>Field settings</strong>
        {activeField ? <div style={{ display: "grid", gap: 14, marginTop: 14, fontSize: 12 }}>
          <label>Spreadsheet column <select value={activeField.column} onChange={(event) => onUpdate(activeField.id, { column: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }}>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
          <label>Text size <div>{Math.round(activeField.size * 1000) / 10}% of page width</div><input aria-label="Text size" type="range" min="0.012" max="0.065" step="0.002" value={activeField.size} onChange={(event) => onUpdate(activeField.id, { size: Number(event.target.value) })} style={{ width: "100%" }} /></label>
          <label>Color <input aria-label="Text color" type="color" value={activeField.color} onChange={(event) => onUpdate(activeField.id, { color: event.target.value })} style={{ display: "block", marginTop: 6 }} /></label>
          <label>Alignment <select value={activeField.align} onChange={(event) => onUpdate(activeField.id, { align: event.target.value as PositionedField["align"] })} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
          <button onClick={() => onRemove(activeField.id)} style={{ color: "#a34f43", border: "1px solid #efd7d3", background: "#fff8f7", padding: 8, borderRadius: 8, cursor: "pointer" }}>Remove field</button>
        </div> : <p style={{ fontSize: 12, color: "#78837c", marginTop: 8 }}>Select a placed field to adjust its style.</p>}
      </aside>
    </section>
  );
}
