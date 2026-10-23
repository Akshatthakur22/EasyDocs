import { createId, type DataRow, type DocumentAsset } from "@/lib/types";

/**
 * Creates a DocumentAsset from a File or Blob with safe metadata and an embedded preview data URL.
 */
export async function createDocumentAsset(file: File | Blob, customName?: string): Promise<DocumentAsset> {
  const name = customName || ("name" in file ? (file as File).name : "image.png");
  const mimeType = file.type || "image/png";
  const size = file.size;
  const id = createId();

  let dataUrl: string | undefined;
  let width: number | undefined;
  let height: number | undefined;

  if (typeof FileReader !== "undefined") {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read asset "${name}"`));
      reader.readAsDataURL(file);
    });
  }

  // Measure natural dimensions in browser if Image is available
  if (typeof Image !== "undefined" && dataUrl) {
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          width = img.naturalWidth;
          height = img.naturalHeight;
          resolve();
        };
        img.onerror = () => reject();
        img.src = dataUrl!;
      });
    } catch {
      // Dimension detection failed, continue with undefined width/height
    }
  }

  return {
    id,
    name,
    mimeType,
    size,
    blob: file,
    dataUrl,
    width,
    height,
  };
}

/**
 * Strips directory path and file extension, and normalizes for comparison.
 */
export function normalizeFilenameKey(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const withoutExt = base.replace(/\.[a-zA-Z0-9]+$/, "");
  return withoutExt.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Matches a collection of uploaded image assets against dataset rows based on:
 * 1. Cell value in the designated column (with or without extension)
 * 2. Row ID (e.g. "1.png", "row-1.png", "001.jpg")
 *
 * Emits clear warnings if duplicate/ambiguous matches are found.
 */
export function matchAssetsToRows(
  assets: DocumentAsset[],
  rows: DataRow[],
  column: string
): {
  matches: Record<number, string>; // rowId -> assetId
  warnings: string[];
  unmatchedAssets: string[];
  missingRows: number[];
} {
  const matches: Record<number, string> = {};
  const warnings: string[] = [];
  const matchedAssetIds = new Set<string>();

  // Map normalized keys to asset IDs: normalized key -> DocumentAsset[]
  const keyToAssets = new Map<string, DocumentAsset[]>();
  for (const asset of assets) {
    const key = normalizeFilenameKey(asset.name);
    const list = keyToAssets.get(key) ?? [];
    list.push(asset);
    keyToAssets.set(key, list);
  }

  for (const row of rows) {
    const cellValue = String(row.values[column] ?? "").trim();
    let candidates: DocumentAsset[] = [];

    if (cellValue) {
      const cellKey = normalizeFilenameKey(cellValue);
      candidates = keyToAssets.get(cellKey) ?? [];
    }

    // Secondary match: row ID (e.g. "1", "row1", "001", "0001")
    if (candidates.length === 0) {
      const rowIdStr = String(row.id);
      candidates =
        keyToAssets.get(rowIdStr) ??
        keyToAssets.get(`row${rowIdStr}`) ??
        keyToAssets.get(rowIdStr.padStart(3, "0")) ??
        keyToAssets.get(rowIdStr.padStart(4, "0")) ??
        [];
    }

    if (candidates.length === 1) {
      matches[row.id] = candidates[0].id;
      matchedAssetIds.add(candidates[0].id);
    } else if (candidates.length > 1) {
      warnings.push(
        `Row ${row.id} has multiple matching image files (${candidates.map((a) => a.name).join(", ")}). The first file was assigned; review and adjust if needed.`
      );
      matches[row.id] = candidates[0].id;
      matchedAssetIds.add(candidates[0].id);
    }
  }

  const unmatchedAssets = assets.filter((a) => !matchedAssetIds.has(a.id)).map((a) => a.name);
  const missingRows = rows.filter((r) => r.included && !matches[r.id]).map((r) => r.id);

  return {
    matches,
    warnings,
    unmatchedAssets,
    missingRows,
  };
}

/**
 * Validates that an image blob is PNG or JPEG for pdf-lib compatibility.
 * Converts WebP or other formats via canvas in browser if possible.
 */
export async function ensurePdfCompatibleImage(blob: Blob): Promise<{ bytes: Uint8Array; format: "png" | "jpg" }> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check PNG magic bytes: 89 50 4E 47
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { bytes, format: "png" };
  }

  // Check JPEG magic bytes: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { bytes, format: "jpg" };
  }

  // Browser conversion fallback for WebP, GIF, etc.
  if (typeof document !== "undefined" && typeof Image !== "undefined") {
    try {
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image decoding failed"));
        img.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 100;
      canvas.height = img.naturalHeight || 100;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context for image conversion");
      ctx.drawImage(img, 0, 0);

      const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!pngBlob) throw new Error("Could not export canvas to PNG");

      const convertedBytes = new Uint8Array(await pngBlob.arrayBuffer());
      return { bytes: convertedBytes, format: "png" };
    } catch {
      // Fall through to error
    }
  }

  throw new Error("Unsupported image format. Provide a PNG or JPG/JPEG image.");
}
