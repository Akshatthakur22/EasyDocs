import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import type { PositionedField, TemplateFormat } from "@/lib/types";
import type { TemplateInspection } from "@/lib/types";
import { ensurePdfCompatibleImage } from "@/lib/assets";

const SUPPORTED_NAME = /^[\p{L}_][\p{L}\p{N}_. -]*$/u;
const TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
/** Image pixels are interpreted as CSS pixels at 96 px/in when creating printable PDFs. */
export const IMAGE_TEMPLATE_DPI = 96;

export function imagePixelDimensionsToPdfPoints(width: number, height: number) {
  const pointsPerPixel = 72 / IMAGE_TEMPLATE_DPI;
  return { width: width * pointsPerPixel, height: height * pointsPerPixel };
}

export function getFieldPdfPosition(field: PositionedField, pageWidth: number, pageHeight: number, textWidth: number, ascent: number) {
  const anchor = field.x * pageWidth;
  const x = field.align === "center" ? anchor - textWidth / 2 : field.align === "right" ? anchor - textWidth : anchor;
  const baselineFromTop = field.y * pageHeight + ascent;
  return { x, baselineFromTop };
}

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

export async function renderPositionedTemplate(
  template: Blob,
  format: TemplateFormat,
  fields: PositionedField[],
  values: Record<string, string>,
  assets?: Record<string, Blob>
): Promise<Blob> {
  const pdf = format === "pdf" ? await PDFDocument.load(await template.arrayBuffer()) : await PDFDocument.create();
  if (format === "image") {
    const bytes = new Uint8Array(await template.arrayBuffer());
    const image = template.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const dimensions = imagePixelDimensionsToPdfPoints(image.width, image.height);
    pdf.addPage([dimensions.width, dimensions.height]).drawImage(image, { x: 0, y: 0, width: dimensions.width, height: dimensions.height });
  }
  const pageCount = pdf.getPageCount();
  if (!pageCount) throw new Error("The selected template has no printable pages.");

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = pdf.getPage(pageIndex);
    const crop = page.getCropBox();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const displayWidth = rotation === 90 || rotation === 270 ? crop.height : crop.width;
    const displayHeight = rotation === 90 || rotation === 270 ? crop.width : crop.height;

    const toPdfPoint = (x: number, yFromTop: number) => {
      if (rotation === 90) return { x: crop.x + yFromTop, y: crop.y + x };
      if (rotation === 180) return { x: crop.x + crop.width - x, y: crop.y + yFromTop };
      if (rotation === 270) return { x: crop.x + crop.width - yFromTop, y: crop.y + crop.height - x };
      return { x: crop.x + x, y: crop.y + crop.height - yFromTop };
    };

    // Filter fields according to pageScope ("all", "selected", or "current")
    const pageFields = fields.filter((field) => {
      const scope = field.pageScope ?? "current";
      if (scope === "all") return true;
      if (scope === "selected") return (field.targetPages ?? [field.page]).includes(pageIndex);
      return field.page === pageIndex;
    });

    for (const field of pageFields) {
      if (field.type === "image") {
        const imageBlob = assets?.[field.id];
        if (!imageBlob) {
          if (field.required === true) {
            throw new Error(`Missing required image for field “${field.name || field.column || "Image"}”.`);
          }
          continue;
        }

        const { bytes, format: imgFormat } = await ensurePdfCompatibleImage(imageBlob);
        const embeddedImage = imgFormat === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

        const boxWidth = Math.max(4, (field.width ?? 0.2) * displayWidth);
        const boxHeight = Math.max(4, (field.height ?? 0.1) * displayHeight);
        const anchorX = field.x * displayWidth;
        const anchorY = field.y * displayHeight;

        const imgAspect = embeddedImage.width / embeddedImage.height;
        const boxAspect = boxWidth / boxHeight;

        let drawWidth = boxWidth;
        let drawHeight = boxHeight;

        if (field.preserveAspectRatio !== false) {
          if (field.fit === "cover") {
            if (imgAspect > boxAspect) {
              drawHeight = boxHeight;
              drawWidth = boxHeight * imgAspect;
            } else {
              drawWidth = boxWidth;
              drawHeight = boxWidth / imgAspect;
            }
          } else {
            // Default "contain"
            if (imgAspect > boxAspect) {
              drawWidth = boxWidth;
              drawHeight = boxWidth / imgAspect;
            } else {
              drawHeight = boxHeight;
              drawWidth = boxHeight * imgAspect;
            }
          }
        }

        const displayX = anchorX + (boxWidth - drawWidth) / 2;
        const displayY = anchorY + (boxHeight - drawHeight) / 2;

        if (displayX < 0 || displayX + drawWidth > displayWidth || displayY < 0 || displayY + drawHeight > displayHeight) {
          throw new Error(`The image for “${field.name || field.column || "Image"}” extends beyond the page. Move the field inward or reduce its dimensions.`);
        }

        let imgOrigin: { x: number; y: number };
        if (rotation === 0) {
          imgOrigin = toPdfPoint(displayX, displayY + drawHeight);
        } else if (rotation === 90) {
          imgOrigin = toPdfPoint(displayX, displayY + drawHeight);
        } else if (rotation === 180) {
          imgOrigin = toPdfPoint(displayX + drawWidth, displayY + drawHeight);
        } else {
          imgOrigin = toPdfPoint(displayX + drawWidth, displayY);
        }

        page.drawImage(embeddedImage, {
          x: imgOrigin.x,
          y: imgOrigin.y,
          width: drawWidth,
          height: drawHeight,
          rotate: degrees(rotation),
        });
        continue;
      }

      // Text field rendering
      const value = String(values[field.id] ?? "");
      if (!value) continue;
      const family = field.fontFamily ?? "Helvetica";
      const fontName = family === "TimesRoman"
        ? (field.bold ? (field.italic ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold) : (field.italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman))
        : family === "Courier"
          ? (field.bold ? (field.italic ? StandardFonts.CourierBoldOblique : StandardFonts.CourierBold) : (field.italic ? StandardFonts.CourierOblique : StandardFonts.Courier))
          : (field.bold ? (field.italic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold) : (field.italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica));
      const font = await pdf.embedFont(fontName);
      if (/[\r\n]/.test(value)) throw new Error(`The value for “${field.column}” contains multiple lines. EasyDocs currently places one line per field.`);
      const fontSize = Math.max(4, field.size * displayWidth);
      let width: number;
      let ascent: number;
      try {
        font.encodeText(value);
        width = font.widthOfTextAtSize(value, fontSize);
        ascent = font.heightAtSize(fontSize, { descender: false });
      } catch {
        throw new Error(`The value for “${field.column}” contains characters the built-in PDF fonts cannot render. Hindi and other scripts need font support that is not available yet; use supported Latin characters for this field.`);
      }
      const { x: displayX, baselineFromTop } = getFieldPdfPosition(field, displayWidth, displayHeight, width, ascent);
      if (displayX < 0 || displayX + width > displayWidth || field.y < 0 || field.y * displayHeight + fontSize > displayHeight) {
        throw new Error(`The value for “${field.column}” extends beyond the page. Move the field inward or reduce its font size.`);
      }
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
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}

