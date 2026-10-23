import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { getFieldPdfPosition, imagePixelDimensionsToPdfPoints, inspectTemplate, renderDocxTemplate, renderPositionedTemplate } from "@/lib/template";
import type { PositionedField } from "@/lib/types";

const fixturePath = new URL("./fixtures/sample-attendance-warning.docx", import.meta.url);

async function fixtureBlob(): Promise<Blob> {
  return new Blob([await readFile(fixturePath)]);
}

describe("DOCX template adapter", () => {
  it("finds fields in paragraphs, tables, headers and footers", async () => {
    const result = await inspectTemplate(await fixtureBlob());
    expect(result.placeholders).toEqual([
      "meeting_date", "student_name", "enrollment_number", "attendance_percent", "mentor_name",
    ]);
    expect(result.unsupportedTokens).toEqual([]);
  });

  it("replaces values while retaining the package structure and Unicode text", async () => {
    const template = await fixtureBlob();
    const output = await renderDocxTemplate(template, {
      meeting_date: "15 Nov 2026",
      student_name: "Sana Patel",
      enrollment_number: "0001843",
      attendance_percent: "68%",
      mentor_name: "Dr. Meera Shah",
    });
    const zip = new PizZip(await output.arrayBuffer());
    const document = zip.file("word/document.xml")?.asText() ?? "";
    const header = zip.file("word/header1.xml")?.asText() ?? "";
    const footer = zip.file("word/footer1.xml")?.asText() ?? "";
    expect(document).toContain("Sana Patel");
    expect(document).toContain("0001843");
    expect(document).toContain("68%");
    expect(document).toContain("प्रिय");
    expect(header).toContain("EASYDOCS");
    expect(footer).toContain("approved wording");
    expect(document).not.toContain("{{student_name}}");
  });

  it("rejects incomplete values instead of exporting literal placeholders", async () => {
    await expect(renderDocxTemplate(await fixtureBlob(), { student_name: "Missing fields" })).rejects.toThrow();
  });
});

describe("printable PDF rendering", () => {
  it("uses the documented 96 pixels-per-inch image page policy", async () => {
    expect(imagePixelDimensionsToPdfPoints(2480, 3508)).toEqual({ width: 1860, height: 2631 });

    const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gAAAAABJRU5ErkJggg==", "base64");
    const output = await renderPositionedTemplate(new Blob([onePixelPng], { type: "image/png" }), "image", [], {});
    const pdf = await PDFDocument.load(await output.arrayBuffer());
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 0.75, height: 0.75 });
  });

  it("keeps multi-page PDF dimensions and draws on the selected page", async () => {
    const source = await PDFDocument.create();
    source.addPage([612, 792]);
    source.addPage([420, 300]);
    const template = new Blob([new Uint8Array(await source.save()).buffer as ArrayBuffer], { type: "application/pdf" });
    const field: PositionedField = { id: "name", column: "Name", page: 1, x: 0.25, y: 0.2, size: 0.05, color: "#202622", align: "left", fontFamily: "Helvetica" };
    const output = await renderPositionedTemplate(template, "pdf", [field], { name: "Aarav" });
    const pdf = await PDFDocument.load(await output.arrayBuffer());
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    expect(pdf.getPage(1).getSize()).toEqual({ width: 420, height: 300 });
    expect(pdf.getPage(0).node.Contents()).toBeUndefined();
    expect(pdf.getPage(1).node.Contents()).toBeDefined();
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(await output.arrayBuffer()), verbosity: 0 }).promise;
    const text = await parsed.getPage(2).then((page) => page.getTextContent());
    const name = text.items.find((item) => "str" in item && item.str === "Aarav");
    expect(name).toBeDefined();
    if (!name || !("transform" in name)) throw new Error("Generated name text was not found in page content.");
    expect(name.transform[4]).toBeCloseTo(105, 1);
    expect(name.transform[5]).toBeCloseTo(224.9, 1);
    await parsed.destroy();
  });

  it("computes left, center, and right anchors from the same page coordinate system", () => {
    const field: PositionedField = { id: "field", column: "Name", page: 0, x: 0.5, y: 0.25, size: 0.02, color: "#202622", align: "left" };
    expect(getFieldPdfPosition(field, 600, 800, 120, 10)).toEqual({ x: 300, baselineFromTop: 210 });
    expect(getFieldPdfPosition({ ...field, align: "center" }, 600, 800, 120, 10)).toEqual({ x: 240, baselineFromTop: 210 });
    expect(getFieldPdfPosition({ ...field, align: "right" }, 600, 800, 120, 10)).toEqual({ x: 180, baselineFromTop: 210 });
  });

  it("reports unsupported scripts, multiline content, and page overflow clearly", async () => {
    const source = await PDFDocument.create();
    source.addPage([300, 300]);
    const template = new Blob([new Uint8Array(await source.save()).buffer as ArrayBuffer], { type: "application/pdf" });
    const field: PositionedField = { id: "name", column: "Student name", page: 0, x: 0.2, y: 0.2, size: 0.05, color: "#202622", align: "left" };
    await expect(renderPositionedTemplate(template, "pdf", [field], { name: "नाम" })).rejects.toThrow("Hindi and other scripts need font support");
    await expect(renderPositionedTemplate(template, "pdf", [field], { name: "Line one\nLine two" })).rejects.toThrow("currently places one line per field");
    await expect(renderPositionedTemplate(template, "pdf", [{ ...field, x: 0.95 },], { name: "A very long student name" })).rejects.toThrow("extends beyond the page");
  });

  it("repeats fields on all pages when pageScope is 'all'", async () => {
    const source = await PDFDocument.create();
    source.addPage([400, 600]);
    source.addPage([400, 600]);
    source.addPage([400, 600]);
    const template = new Blob([new Uint8Array(await source.save()).buffer as ArrayBuffer], { type: "application/pdf" });
    const field: PositionedField = {
      id: "watermark",
      column: "Watermark",
      page: 0,
      pageScope: "all",
      x: 0.3,
      y: 0.1,
      size: 0.04,
      color: "#202622",
      align: "left",
      fontFamily: "Helvetica",
    };
    const output = await renderPositionedTemplate(template, "pdf", [field], { watermark: "CONFIDENTIAL" });
    const pdf = await PDFDocument.load(await output.arrayBuffer());
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getPage(0).node.Contents()).toBeDefined();
    expect(pdf.getPage(1).node.Contents()).toBeDefined();
    expect(pdf.getPage(2).node.Contents()).toBeDefined();
  });

  it("renders fields only on selected pages when pageScope is 'selected'", async () => {
    const source = await PDFDocument.create();
    source.addPage([400, 600]);
    source.addPage([400, 600]);
    source.addPage([400, 600]);
    const template = new Blob([new Uint8Array(await source.save()).buffer as ArrayBuffer], { type: "application/pdf" });
    const field: PositionedField = {
      id: "footer",
      column: "Footer",
      page: 0,
      pageScope: "selected",
      targetPages: [0, 2],
      x: 0.3,
      y: 0.9,
      size: 0.03,
      color: "#202622",
      align: "left",
      fontFamily: "Helvetica",
    };
    const output = await renderPositionedTemplate(template, "pdf", [field], { footer: "Page Notice" });
    const pdf = await PDFDocument.load(await output.arrayBuffer());
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getPage(0).node.Contents()).toBeDefined();
    expect(pdf.getPage(1).node.Contents()).toBeUndefined();
    expect(pdf.getPage(2).node.Contents()).toBeDefined();
  });

  it("renders dynamic image fields across pages with fit options", async () => {
    const source = await PDFDocument.create();
    source.addPage([500, 700]);
    source.addPage([500, 700]);
    const template = new Blob([new Uint8Array(await source.save()).buffer as ArrayBuffer], { type: "application/pdf" });

    const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gAAAAABJRU5ErkJggg==", "base64");
    const imageBlob = new Blob([onePixelPng], { type: "image/png" });

    const field: PositionedField = {
      id: "sig",
      type: "image",
      name: "Signature",
      column: "Signature",
      page: 0,
      pageScope: "all",
      x: 0.6,
      y: 0.8,
      width: 0.25,
      height: 0.1,
      fit: "contain",
      preserveAspectRatio: true,
      color: "#000",
      size: 0.02,
      align: "left",
    };

    const output = await renderPositionedTemplate(template, "pdf", [field], {}, { sig: imageBlob });
    const pdf = await PDFDocument.load(await output.arrayBuffer());
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).node.Contents()).toBeDefined();
    expect(pdf.getPage(1).node.Contents()).toBeDefined();
  });

  it("enforces required image fields and allows optional missing image fields", async () => {
    const source = await PDFDocument.create();
    source.addPage([400, 400]);
    const template = new Blob([new Uint8Array(await source.save()).buffer as ArrayBuffer], { type: "application/pdf" });

    const requiredField: PositionedField = {
      id: "photo",
      type: "image",
      name: "Profile Photo",
      column: "Photo",
      page: 0,
      pageScope: "current",
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.2,
      required: true,
      color: "#000",
      size: 0.02,
      align: "left",
    };

    await expect(renderPositionedTemplate(template, "pdf", [requiredField], {}, {})).rejects.toThrow("Missing required image");

    const optionalField: PositionedField = { ...requiredField, required: false };
    const output = await renderPositionedTemplate(template, "pdf", [optionalField], {}, {});
    const pdf = await PDFDocument.load(await output.arrayBuffer());
    expect(pdf.getPageCount()).toBe(1);

    const defaultField: PositionedField = { ...requiredField, required: undefined };
    const defaultOutput = await renderPositionedTemplate(template, "pdf", [defaultField], {}, {});
    const defaultPdf = await PDFDocument.load(await defaultOutput.arrayBuffer());
    expect(defaultPdf.getPageCount()).toBe(1);
  });
});
