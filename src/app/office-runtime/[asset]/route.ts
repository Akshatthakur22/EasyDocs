import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { resolve } from "node:path";

export const runtime = "nodejs";

const ASSETS: Record<string, { path: string; type: string; gzip?: boolean }> = {
  "soffice.js": { path: "wasm/soffice.js", type: "text/javascript; charset=utf-8" },
  "soffice.worker.js": { path: "wasm/soffice.worker.js", type: "text/javascript; charset=utf-8" },
  "browser.worker.global.js": { path: "dist/browser.worker.global.js", type: "text/javascript; charset=utf-8" },
  "soffice.wasm": { path: "wasm/soffice.wasm.gz", type: "application/wasm", gzip: true },
  "soffice.data": { path: "wasm/soffice.data.gz", type: "application/octet-stream", gzip: true },
};

export async function GET(_request: Request, context: { params: Promise<{ asset: string }> }) {
  const { asset } = await context.params;
  const entry = ASSETS[asset];
  if (!entry) return new Response("Not found", { status: 404 });
  const packageRoot = resolve(process.cwd(), "node_modules/@matbee/libreoffice-converter");
  const isProjectAsset = asset === "NotoSansDevanagari-v2.ttf";
  const assetPath = isProjectAsset ? resolve(process.cwd(), entry.path) : resolve(packageRoot, entry.path);
  const headers = new Headers({
    "Content-Type": entry.type,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (entry.gzip) headers.set("Content-Encoding", "gzip");

  const stream = createReadStream(assetPath);
  return new Response(Readable.toWeb(stream) as ReadableStream, { headers });
}
