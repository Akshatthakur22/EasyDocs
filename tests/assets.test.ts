import { describe, expect, it } from "vitest";
import { ensurePdfCompatibleImage, matchAssetsToRows, normalizeFilenameKey } from "@/lib/assets";
import type { DataRow, DocumentAsset } from "@/lib/types";

// 1x1 PNG base64
const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gAAAAABJRU5ErkJggg==";
const ONE_PIXEL_PNG_BUFFER = Buffer.from(ONE_PIXEL_PNG_BASE64, "base64");

// 1x1 JPEG bytes
const ONE_PIXEL_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9,
]);

function createTestAsset(id: string, name: string): DocumentAsset {
  return {
    id,
    name,
    mimeType: name.endsWith(".jpg") ? "image/jpeg" : "image/png",
    size: 100,
    width: 50,
    height: 50,
    dataUrl: "data:image/png;base64,placeholder",
    blob: new Blob([ONE_PIXEL_PNG_BUFFER]),
  };
}

describe("Asset filename and key normalization", () => {
  it("normalizes filenames by stripping extensions, paths, and punctuation", () => {
    expect(normalizeFilenameKey("Rahul_Sharma.png")).toBe("rahulsharma");
    expect(normalizeFilenameKey("/uploads/signatures/Priya-Verma.JPEG")).toBe("priyaverma");
    expect(normalizeFilenameKey("ID_001.webp")).toBe("id001");
    expect(normalizeFilenameKey("  Aarav   Patel  ")).toBe("aaravpatel");
  });
});

describe("Asset-to-record matching", () => {
  const rows: DataRow[] = [
    { id: 1, included: true, status: "pending", values: { "Student ID": "001", Name: "Rahul", SignatureCol: "rahul_sign.png" } },
    { id: 2, included: true, status: "pending", values: { "Student ID": "002", Name: "Priya", SignatureCol: "priya_sign.png" } },
    { id: 3, included: true, status: "pending", values: { "Student ID": "003", Name: "Aarav", SignatureCol: "" } },
  ];

  it("matches assets by column cell values", () => {
    const assets = [
      createTestAsset("a1", "rahul_sign.png"),
      createTestAsset("a2", "priya_sign.png"),
    ];

    const result = matchAssetsToRows(assets, rows, "SignatureCol");
    expect(result.matches[1]).toBe("a1");
    expect(result.matches[2]).toBe("a2");
    expect(result.matches[3]).toBeUndefined();
    expect(result.unmatchedAssets).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("matches assets by record ID or record values when column is empty", () => {
    const assets = [
      createTestAsset("a1", "row-1.png"),
      createTestAsset("a2", "priya.png"),
      createTestAsset("a3", "003.png"),
    ];

    const result = matchAssetsToRows(assets, rows, "Name");
    expect(result.matches[1]).toBe("a1");
    expect(result.matches[2]).toBe("a2");
    expect(result.matches[3]).toBe("a3");
  });

  it("warns about ambiguous multiple matching assets without assigning silently", () => {
    const assets = [
      createTestAsset("a1", "rahul.png"),
      createTestAsset("a2", "rahul.jpg"),
    ];

    const result = matchAssetsToRows(assets, rows, "Name");
    expect(result.warnings.some((w) => w.includes("multiple matching image files"))).toBe(true);
  });
});

describe("PDF-compatible image verification", () => {
  it("recognizes valid PNG magic bytes", async () => {
    const pngBlob = new Blob([ONE_PIXEL_PNG_BUFFER], { type: "image/png" });
    const { format, bytes } = await ensurePdfCompatibleImage(pngBlob);
    expect(format).toBe("png");
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
  });

  it("recognizes valid JPEG magic bytes", async () => {
    const jpegBlob = new Blob([ONE_PIXEL_JPEG_BUFFER], { type: "image/jpeg" });
    const { format, bytes } = await ensurePdfCompatibleImage(jpegBlob);
    expect(format).toBe("jpg");
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
  });
});
