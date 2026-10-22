import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { inspectTemplate, renderDocxTemplate } from "@/lib/template";

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
