import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
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
  for (const field of fields) {
    const page = pdf.getPage(Math.min(Math.max(0, field.page), pdf.getPageCount() - 1));
    const value = String(values[field.id] ?? "");
    if (!value) continue;
    const family = field.fontFamily ?? "Helvetica";
    const fontName = family === "TimesRoman"
      ? (field.bold ? (field.italic ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold) : (field.italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman))
      : family === "Courier"
        ? (field.bold ? (field.italic ? StandardFonts.CourierBoldOblique : StandardFonts.CourierBold) : (field.italic ? StandardFonts.CourierOblique : StandardFonts.Courier))
        : (field.bold ? (field.italic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold) : (field.italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica));
    const font = await pdf.embedFont(fontName);
    const crop = page.getCropBox();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const displayWidth = rotation === 90 || rotation === 270 ? crop.height : crop.width;
    const displayHeight = rotation === 90 || rotation === 270 ? crop.width : crop.height;
    const fontSize = Math.max(4, field.size * displayWidth);
    const width = font.widthOfTextAtSize(value, fontSize);
    const anchor = field.x * displayWidth;
    const displayX = field.align === "center" ? anchor - width / 2 : field.align === "right" ? anchor - width : anchor;
    const ascent = font.heightAtSize(fontSize, { descender: false });
    const baselineFromTop = field.y * displayHeight + ascent;
    const toPdfPoint = (x: number, yFromTop: number) => {
      if (rotation === 90) return { x: crop.x + yFromTop, y: crop.y + x };
      if (rotation === 180) return { x: crop.x + crop.width - x, y: crop.y + yFromTop };
      if (rotation === 270) return { x: crop.x + crop.width - yFromTop, y: crop.y + crop.height - x };
      return { x: crop.x + x, y: crop.y + crop.height - yFromTop };
    };
    const origin = toPdfPoint(displayX, baselineFromTop);
    const [r, g, b] = [1, 3, 5].map((offset) => parseInt(field.color.slice(offset, offset + 2), 16) / 255);
    page.drawText(value, {
      x: origin.x,
      y: origin.y,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      rotate: degrees(rotation),
    });
    if (field.underline) {
      const lineY = baselineFromTop + Math.max(0.8, fontSize * 0.06);
      page.drawLine({ start: toPdfPoint(displayX, lineY), end: toPdfPoint(displayX + width, lineY), thickness: Math.max(0.5, fontSize * 0.04), color: rgb(r, g, b) });
    }
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}
