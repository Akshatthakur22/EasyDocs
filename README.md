# EasyDocs

EasyDocs is a local-first bulk document designer and batch generator. Upload an image, PDF, or Word document as a page background, import a spreadsheet, drag fields onto the preview, then generate a printable PDF for each valid row.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. A sample attendance letter and sample CSV are linked in the upload steps.

## Workflow and formats

- **Templates:** `.png`, `.jpg`, `.pdf`, `.doc`, and `.docx`. Word files are converted locally to PDF pages; every template becomes a static background that can have fields placed on top. PDFs can be flat or scanned because placement is visual; DOC/DOCX conversion may affect layout.
- **Data:** `.csv`, `.xls`, `.xlsx`, and `.xlsm`; older `.xls` workbooks are converted locally before parsing. XLSX workbooks can contain multiple sheets. Text values, quoted CSV values, and text-based leading zeroes are preserved. The current local batch limit is 500 records.
- **Design:** Add any spreadsheet column to the page preview, drag it to an exact position, and set text size, color, alignment, page, and source column.
- **Per-record output:** printable `.pdf` files with the selected template background and personalized text overlays.
- **Batch output:** ZIP of successful PDFs and a combined PDF in input row order.

PDF rendering uses the LibreOffice WebAssembly runtime through the same-origin `/office-runtime/*` route. The first PDF preview or batch requests the runtime files (about 75 MB plus 28 MB compressed) from the EasyDocs host and browsers may cache them. The runtime is public software; templates, spreadsheet rows, and generated documents are not sent to an external conversion service. COOP and COEP response headers are enabled because the renderer uses shared memory.

### Fidelity notes

Fields are positioned relative to each page, so they stay aligned when the preview scales. Word documents are flattened to PDF backgrounds before field design; their text does not reflow around added values. LibreOffice may change pagination, fonts, or layout during this conversion. Text overlays currently use a standard Latin font; Hindi and other non-Latin scripts need a separate embedded-font pass before they can be promised. Review the generated preview and print a sample before relying on a template.

## Local data and privacy

EasyDocs does not require an account or product backend. Templates, normalized rows, mappings, batch state, and outputs are stored in IndexedDB in this browser. Old batches and templates are removed after seven days. Use **Delete all local data** to clear everything immediately. Browser storage quotas vary by browser and device; keep batches modest and download results before clearing site data.

The converter runtime is served by this application from its installed package. The application does not send files to analytics, Google Sheets, Gmail, or a document-conversion service. Network requests are limited to loading the app and its same-origin static/runtime assets.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The existing unit tests include legacy DOCX placeholder utilities and import helpers. The visual document designer and final PDF placement still need a manual browser check with your own template and spreadsheet; confirm page alignment and text appearance before using PDFs in production.

## Hosting

Run the production build with `npm run build` and `npm start` on a Node.js host that supports Next.js route handlers, custom response headers, streaming, and large same-origin responses. COOP and COEP headers must reach the browser unchanged. The `/office-runtime/*` handler streams compressed WASM files from the installed converter package. Verify hosting response-size and function-duration limits before deploying; serverless platforms may impose limits on the runtime asset route.

## Reference and product boundary

MailMyCertificate at `/Users/akshatthakur22/Desktop/open source/MailMyCertficate` was audited as the reference project. Its certificate generator is not used as a generic document engine, and this EasyDocs implementation does not modify that repository.
