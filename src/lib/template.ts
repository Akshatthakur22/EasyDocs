import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PositionedField, TemplateFormat } from "@/lib/types";
import type { TemplateInspection } from "@/lib/types";

const SUPPORTED_NAME = /^[\p{L}_][\p{L}\p{N}_. -]*$/u;
const TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

function wordXmlFiles(zip: PizZip) {
  return zip.file(/^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/);
}

function flattenXml(xml: string): string {
  return xml.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export function inspectTemplate(blob: Blob): Promise<TemplateInspection> {
  return blob.arrayBuffer().then((buffer) => {
    let zip: PizZip;
    try {
      zip = new PizZip(buffer);
    } catch {
      throw new Error("This file is not a readable DOCX package. Choose a .docx Word document.");
    }
    const text = wordXmlFiles(zip).map((file) => flattenXml(file.asText())).join("\n");
    const placeholders = new Set<string>();
    const unsupportedTokens = new Set<string>();
    for (const match of text.matchAll(TOKEN_PATTERN)) {
      const name = match[1].trim();
      if (SUPPORTED_NAME.test(name)) placeholders.add(name);
      else unsupportedTokens.add(`{{${name}}}`);
    }
    return { placeholders: [...placeholders], unsupportedTokens: [...unsupportedTokens] };
  });
}

export function renderDocxTemplate(template: Blob, values: Record<string, string>): Promise<Blob> {
  return template.arrayBuffer().then(async (buffer) => {
    try {
      const zip = new PizZip(buffer);
      const found = new Set<string>();
      for (const file of wordXmlFiles(zip)) {
        for (const match of flattenXml(file.asText()).matchAll(TOKEN_PATTERN)) found.add(match[1].trim());
      }
      const missing = [...found].filter((name) => !String(values[name] ?? "").trim());
      if (missing.length) throw new Error(`Missing required template values: ${missing.map((name) => `{{${name}}}`).join(", ")}.`);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
      });
      doc.render(values);
      const generated = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      const check = new PizZip(await generated.arrayBuffer());
      const leftovers = wordXmlFiles(check).flatMap((file) => [...flattenXml(file.asText()).matchAll(TOKEN_PATTERN)].map((match) => match[0]));
      if (leftovers.length) throw new Error(`Unreplaced placeholder${leftovers.length > 1 ? "s" : ""}: ${[...new Set(leftovers)].join(", ")}. Keep each placeholder together in one Word text run, like {{student_name}}.`);
      return generated;
    } catch (error) {
      const message = error instanceof Error ? error.message : "DOCX merge failed.";
      if (message.includes("Unreplaced placeholder") || message.includes("Missing required template values")) throw error;
      if (message.includes("Multi error")) throw new Error(`The template could not be merged: ${message}`);
      throw new Error(`The template could not be merged. Check that every tag is written as {{field_name}} and is in a supported Word text area. ${message}`);
    }
  });
}

export async function renderPositionedTemplate(template: Blob, format: TemplateFormat, fields: PositionedField[], values: Record<string, string>): Promise<Blob> {
  const pdf = format === "pdf" ? await PDFDocument.load(await template.arrayBuffer()) : await PDFDocument.create();
  if (format === "image") {
    const bytes = new Uint8Array(await template.arrayBuffer());
    const image = template.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    pdf.addPage([image.width, image.height]).drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  if (!pdf.getPageCount()) throw new Error("The selected template has no printable pages.");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const field of fields) {
    const page = pdf.getPage(Math.min(Math.max(0, field.page), pdf.getPageCount() - 1));
    const value = String(values[field.id] ?? "");
    if (!value) continue;
    const fontSize = Math.max(4, field.size * page.getWidth());
    const width = font.widthOfTextAtSize(value, fontSize);
    const anchor = field.x * page.getWidth();
    const x = field.align === "center" ? anchor - width / 2 : field.align === "right" ? anchor - width : anchor;
    const [r, g, b] = [1, 3, 5].map((offset) => parseInt(field.color.slice(offset, offset + 2), 16) / 255);
    page.drawText(value, {
      x: Math.max(0, x),
      y: page.getHeight() * (1 - field.y) - fontSize * 0.82,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      maxWidth: Math.max(16, page.getWidth() - Math.max(0, x) - 8),
    });
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}
