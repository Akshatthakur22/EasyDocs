# MailMyCertificate audit for EasyDocs

**Audited:** 22 October 2026  
**Reference repository:** `/Users/akshatthakur22/Desktop/open source/MailMyCertficate`  
**Scope:** Read-only repository inspection; no changes made to MailMyCertificate.

## Summary

MailMyCertificate is a Next.js 16 / React 19 / TypeScript browser application with a small Flask API. Its working document engine is specifically an image-backed certificate generator: it places text fields on a JPG or PNG and creates one-page PDFs with `pdf-lib`. CSV import, Google Sheets import, visual field placement, resumable batch generation, ZIP export, and optional Gmail delivery are implemented. The codebase does not currently provide a general document template engine.

The strongest reuse candidates are the browser-side batch/session pipeline, CSV parsing, image-to-PDF renderer, worker, IndexedDB persistence/recovery, ZIP handling, field editor patterns, and optional Gmail integration. Keep MailMyCertificate's certificate workflow intact. For EasyDocs, add format-specific adapters around the existing pipeline; image certificates can use the existing rendering behavior, while DOCX/PDF templates need separate processing strategies. Do not treat the existing renderer as a format-neutral engine.

## Architecture and repository

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS; 26 route `page.tsx` files, including `/tool`, `/email`, settings, guides, and marketing pages.
- **State and editing:** Zustand with localStorage persistence and `zundo` history. The visual editor stores positioned fields in image coordinates and supports drag/resize/style configuration.
- **Document generation:** `src/core/engine/pdfRenderer.ts` uses `pdf-lib` and Helvetica to draw fields over a raster background. `src/core/worker/pdf.worker.ts` runs rendering off the UI thread. `src/hooks/useGenerator.ts` coordinates jobs and stores results.
- **Storage and recovery:** Dexie / IndexedDB stores sessions, source files, rows, PDFs, and email queue entries. Session manager restores sessions and removes sessions older than seven days; a separate one-minute auto-cleanup is available in the email flow. Templates and data are not uploaded for generation.
- **Import:** PapaParse handles CSV in the browser. Google Sheets import fetches a publicly accessible sheet as CSV through Flask. Both paths cap a batch at 400 rows.
- **Export:** JSZip / ZIP generation is implemented. The generation screen packages completed PDFs by row ID. No combined print-ready PDF path was found.
- **Backend:** Flask routes handle Google OAuth, Gmail API delivery, public Google Sheets import, and analytics/admin functions. `vercel.json` routes `/api` to Flask and `/` to Next.js; local Next dev rewrites `/api/*` to `localhost:8000`.
- **Dependencies:** npm / `package-lock.json`; Python dependencies in `requirements.txt`. `package.json` exposes dev, build, start, lint, and HTML audit scripts.
- **Configuration:** Next config includes development API rewrite and CSP/security headers; Vercel service configuration is in `vercel.json`. `.env.example` was referenced by README but was not present in the repository file listing.
- **Tests:** Two Python tests exist for email attachment requirements and OAuth session credentials. No frontend unit, integration, or browser test files/configuration were found in the repository listing. `npm run lint` and `npm run build` are configured but were not run as part of this read-only audit.

## Reuse and feature mapping

| EasyDocs workflow / capability | Existing implementation | Assessment |
|---|---|---|
| Template upload | `templateService.ts`, upload view; JPG/PNG only | Reuse image loading and validation patterns. Add adapters for document formats. |
| Dataset import | `csvService.ts` / PapaParse; max 400 rows | Reuse parsing foundations; add XLSX and configurable limits. Current header sanitization can collapse distinct source headers to the same normalized name, so robust collision handling is needed. |
| Google Sheets | Flask public CSV export proxy and frontend service | Reuse optionally; currently requires a publicly accessible sheet, makes a network request, and caps at 400 rows. |
| Field mapping | Visual canvas editor places CSV columns as fields | Reuse editor concepts; current model binds each positioned field to one column and is certificate-layout oriented. No document placeholder extraction or general mapping/validation stage found. |
| Validation | Import/parser errors, basic empty checks | Partial. No workflow-level required-field rules, duplicate detection, row exclusion/correction, or preflight validation of all mapped fields found. |
| Preview | Certificate preview using the configured image and fields | Reuse the interaction pattern for compatible image templates. No arbitrary DOCX/PDF preview adapter. |
| Generation | Worker + `pdf-lib`, per-row result status, resume support | Reuse job/session orchestration with care. Renderer only accepts JPG/PNG background and Helvetica text overlays. The hook posts every pending row to one worker at once; large batches are limited to 400 but queued work is not back-pressured. |
| Individual PDF / ZIP | Completed PDFs stored in IndexedDB and zipped | ZIP is present. Individual download is available through existing UI affordances; filenames are generic row-based names. |
| Combined print PDF | No merge/concatenation path found | New implementation required. |
| Progress and failure recovery | Per-row completed/failed state, progress, resume and failure display | Strong reuse candidate; assess retry semantics and ensure progress counts failed rows consistently. |
| Local privacy and retention | Browser generation/storage; user data management; seven-day expiry | Reuse concepts. Google Sheets, Gmail, analytics, and admin functions are external/networked paths and should be disclosed precisely. |
| Gmail delivery | OAuth with `gmail.send`, CSRF token, Flask session credentials, attachment upload, sequential batch send and retry UI | Optional reuse if EasyDocs requires email. Existing backend validates PDF attachments; adapt naming/content and retain explicit user consent. |

## Format and fidelity limits

- **Input template formats verified:** JPG and PNG images only. The upload service rejects other MIME types.
- **Generated output verified:** PDF, one per row, with a raster image background and text overlay; ZIP packages the PDFs.
- **XLSX:** No spreadsheet workbook parser or dependency found.
- **PDF templates:** No PDF import/edit/overlay adapter found in the active renderer.
- **DOCX templates:** No DOCX parser, placeholder engine, or conversion path found.
- **Fonts / multilingual output:** Active renderer embeds `StandardFonts.Helvetica`; custom font embedding is also listed as future work in README. Hindi rendering is therefore not established and must not be promised without a font strategy and output verification.
- **Layout:** A raster certificate background remains visually intact at its image dimensions, but this says nothing about editable document flow, text reflow, tables, headers/footers, or pagination in office documents.
- **Batch size:** Hard-coded cap of 400 rows in CSV and Google Sheets flows. It does not meet the PRD's hundreds-to-thousands aspiration without performance and memory work.

## Reuse-versus-new plan and proposed sequence

1. Preserve the existing MailMyCertificate product and renderer behavior.
2. Reuse or extract CSV normalization, batch result/progress types, IndexedDB/session recovery patterns, worker coordination, ZIP export, and selected UI patterns where package/repository boundaries allow.
3. Define a generic workflow contract for template adapters, dataset rows, mapping, validation, preview, generation, and export.
4. Add only the EasyDocs adapters needed for the MVP. Image-backed templates can initially route through the current renderer concept; DOCX and PDF fidelity require independent technical evaluation before choosing libraries or conversion infrastructure.
5. Add XLSX import, safe field validation, combined-PDF assembly, larger-batch back-pressure/chunking, and automated regression coverage as separately scoped work.
6. Treat Gmail and Sheets as optional integrations, not requirements of the local generation path.

## Risks and open technical decisions

- DOCX-to-PDF conversion with high layout fidelity is not available in this repository; browser-only conversion and external conversion services have different privacy, font, and deployment trade-offs.
- Overlaying text on PDFs is technically distinct from replacing DOCX placeholders and may not support dynamic text flow or page count changes.
- Helvetica and the current field model do not satisfy bilingual Hindi/English fidelity requirements.
- A 400-row cap and eager worker job submission are not evidence of reliable thousands-record processing.
- IndexedDB storage quotas and memory pressure need representative batch measurements before raising limits.
- The Python API contains analytics/admin database support in addition to the product integrations; these backend services should not be copied wholesale into EasyDocs.
- Cross-repository sharing is not yet justified by a package/release setup. Prefer a small, explicit extraction only after deciding which modules are stable and genuinely product-neutral.

## Conclusion

MailMyCertificate provides a proven certificate workflow and useful browser-side infrastructure. It does not already implement EasyDocs's generic template-to-document workflow. The low-risk reuse boundary is the data/session/batch/export infrastructure plus the image-PDF adapter. Generic placeholders, XLSX, PDF/DOCX templates, combined print output, broader validation, and multilingual fidelity remain new work.

## Follow-on implementation documents

- [EasyDocs technical specification](EASYDOCS_TECHNICAL_SPEC.md)
- [Phased coding prompt](EASYDOCS_PHASED_CODING_PROMPT.md)
