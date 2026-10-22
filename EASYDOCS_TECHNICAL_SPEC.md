# EasyDocs technical specification

**Status:** Implementation baseline derived from the EasyDocs PRD and the MailMyCertificate audit  
**Reference codebase:** `/Users/akshatthakur22/Desktop/open source/MailMyCertficate`  
**Product workspace:** `/Users/akshatthakur22/Desktop/open source/EasyDocs`

## 1. Product objective

EasyDocs turns one reusable document template and one structured dataset into accurately personalized files. Its primary workflow is:

**Template → Dataset → Mapping → Validation → Preview → Generation → Export**

It is a separate product from MailMyCertificate. Reuse is limited to verified, product-neutral behavior; MailMyCertificate remains unchanged.

## 2. Verified baseline and boundary

The reference implementation provides CSV import, JPG/PNG certificate templates, positioned text overlays rendered into PDFs with `pdf-lib`, a Web Worker, IndexedDB session/result storage, resumable batches, ZIP export, public Google Sheets import, and optional Gmail delivery. It does not provide XLSX parsing, DOCX placeholder replacement, PDF form filling, PDF template overlays, combined-PDF output, or Hindi-capable font embedding. Its 400-row import limit and eager worker submission are unsuitable evidence for thousand-row support.

EasyDocs should therefore use format-specific adapters. The certificate renderer is an image-template adapter, not a generic document engine. Do not import the reference repository wholesale, couple the apps, or modify MailMyCertificate as part of EasyDocs work.

## 3. MVP scope

### P0: first usable release

- Independent EasyDocs product identity and responsive web workflow.
- Upload a PNG/JPG image, PDF, or Word DOC/DOCX template. Treat each as static page artwork; convert Word documents to PDF locally, then let the user position data fields visually over the pages.
- Import CSV, XLS, and XLSX; convert legacy XLS locally and preserve values as strings by default to avoid losing leading zeroes and identifiers. Let users select the worksheet when an Excel workbook contains multiple sheets.
- List spreadsheet headers as available design fields. Users create positioned overlays and select the source column for each field.
- Validate that at least one field is placed, each field maps to an existing column, required row values are present, and filenames are safe. Let users exclude incomplete rows and continue with valid rows.
- Provide a visual designer with an accurate page preview, selectable spreadsheet columns, draggable field overlays, per-page placement, font size, alignment, and color controls. Store positions in page-relative coordinates so responsive preview scaling does not change print placement.
- Preview generated output with a representative record and accurate validation status.
- Generate one printable PDF per valid record with stable row identity and safe deterministic filenames.
- Export individual PDFs, a combined print PDF, and a ZIP of per-record outputs. The combined PDF must follow source row order and include only successful outputs.
- Report completed, failed, and excluded counts separately; retain successful outputs if other rows fail; retry failures without duplicating successes.
- Local-first data handling. No document or dataset upload for generation. Any conversion/network service is prohibited unless separately approved and clearly disclosed.
- Hindi/Unicode support must be demonstrated with representative output and explicit font support before it is marked supported.

### Format support boundary

The current implementation accepts `.png`/`.jpg`, PDF, DOC, and DOCX page backgrounds. DOC/DOCX convert locally to PDF before the user positions fields; PDFs can be flat or scanned because placement uses page coordinates. Printable output is PDF. CSV, `.xls`, `.xlsx`, and `.xlsm` provide row data; legacy `.xls` is converted locally before parsing. Arbitrary binary formats still need a dedicated conversion adapter and should not be silently accepted. Word conversion can change pagination and layout; users should inspect converted pages before placing fields.

Google Sheets, Gmail delivery, cross-device template libraries, editing Word text flow, advanced transformations, arbitrary additional formats, and cloud accounts remain deferred. Keep interfaces extensible but do not add empty navigation or speculative infrastructure.

### Format support declaration

The UI lists image, PDF, DOC, and DOCX templates and PDF output. Word conversion runs locally and may change layout. Flat and scanned PDFs support visual overlays. Hindi and other non-Latin text still need representative visual verification before being advertised as supported.

## 4. Architecture

Use the current EasyDocs workspace as the independent application. It is currently empty apart from the audit document and Git metadata; inspect Git state and add the app here rather than editing the reference project.

Recommended initial architecture:

- **Application:** Next.js App Router, React, TypeScript, Tailwind CSS, matching the reference stack where practical. No Flask/backend unless a tested local-only design cannot meet the requirements.
- **Workflow modules:** dataset import/normalization, positioned field mapping, validation, preview, generation orchestration, and export. Keep UI components thin over typed domain services.
- **Template adapters:** image and PDF page backgrounds render directly; DOC/DOCX convert to PDF locally before entering the same coordinate designer. Keep conversion separate from page-coordinate overlay rendering.
- **Background work:** Web Worker for browser-safe CPU work, with a bounded queue and configurable concurrency (start at one worker and small chunks; measure before increasing). Store each result as it completes. Never enqueue the whole dataset without back-pressure.
- **Persistence:** IndexedDB for template, normalized rows, mappings, job metadata, and completed outputs. Persist only non-sensitive UI preferences in localStorage. Define schema versioning and recovery behavior before storing job data.
- **Privacy and cleanup:** disclose local storage locations and external calls. Provide clear-this-batch and delete-all-local-data actions. Set a default seven-day local job expiry, with visible cleanup behavior; never retain data in analytics.
- **State model:** typed batch/job state with stable row IDs and per-row statuses: `pending`, `processing`, `completed`, `failed`, `excluded`. Persist template page backgrounds and page-relative field layouts. Derive progress from terminal rows; do not conflate excluded/failed with success.
- **Export:** use an adapter output contract for per-record artifacts. ZIP uses deterministic safe names. Combined PDF preserves row order and reports omitted failures. Validate browser memory before creating large combined files.

### Adapter contract (conceptual)

Each template adapter must expose typed operations equivalent to:

1. `prepare(file)` → normalized page background, page count/dimensions, conversion warnings.
2. `preview(template, positionedFields, record)` → preview artifact with coordinate-accurate overlay text.
3. `generate(template, positionedFields, record, options)` → printable PDF or a structured row error.
4. `combine(artifacts, options)` where format supports deterministic combination.

All user-visible errors should identify the stage and affected row/template. Adapters must not silently drop positioned fields or unsupported content.

## 5. Data and mapping rules

- Keep original column names and source values; create normalized aliases separately. Detect normalized-name collisions and require explicit disambiguation.
- Give every record a stable batch-local row ID independent of duplicate values.
- Each placed field has a stable ID, source column, page index, normalized x/y position, text size, color, and alignment.
- Source column selection is explicit. When a saved layout is used with a different spreadsheet, missing source columns must be remapped before preview/generation.
- Every placed field is required by default. Missing values are row-level validation errors unless a field is explicitly optional.
- Formatting is limited to documented text overlay controls. No arbitrary formulas or scripting.
- Ensure output filenames remove path separators/control characters, avoid collisions, and have a row-ID fallback.

## 6. Generation and failure semantics

- Validate the whole batch before starting. Show total, valid, invalid, and excluded counts.
- Generate only eligible rows. Persist status/output/error after each row.
- On failure, retain all successful outputs. Retry only failed rows unless the user explicitly starts a fresh batch.
- Progress denominator is the eligible row count and the UI separately shows excluded/failed counts.
- Cancellation stops new work and allows in-flight work to finish or be marked interrupted; recovery resumes pending/interrupted/failed work without redoing completed rows.
- Set a conservative initial batch-size limit based on measured memory/performance. Do not promise thousands until representative performance checks demonstrate it.

## 7. Document conversion and print fidelity

The current flow converts DOC/DOCX files locally to PDF and places text overlays at normalized page coordinates. The generated PDF preserves the converted page background and adds the selected row values. Verify conversion output and overlay placement with representative real documents, including multipage files, long values, headers/footers, and non-Latin text. Word-to-PDF conversion may change pagination or layout; show the converted pages in the designer before field placement. Do not quietly add cloud conversion.

## 8. Acceptance criteria

1. Image, PDF, and Word templates show a page preview; Word files convert locally and preserve a printable background.
2. Users can add spreadsheet columns to the visual canvas, drag them into place, change formatting, and preview actual row values.
3. Unmapped placed fields and required missing row values block unsafe generation and identify affected rows/fields.
4. Valid rows can proceed when other rows are excluded; counts remain accurate.
5. A partial failure preserves successful outputs; retry produces no duplicate success files.
6. Individual printable PDFs, ZIP, and ordered combined PDF open and contain the expected documents.
7. Hindi/English fixture output is visually inspected and documented before Unicode support is claimed.
8. A representative hundreds-row batch keeps the interface responsive, survives cancellation/recovery, and stays within measured memory bounds.
9. Generation runs locally; network requests are limited to documented integration needs.
10. MailMyCertificate source and behavior remain untouched.

## 9. Delivery stages

| Stage | Deliverable | Exit condition |
|---|---|---|
| 0. Workspace and format spike | Confirm workspace state, choose/validate DOCX and local PDF strategy, fixture report | Fidelity, Unicode, and privacy constraints are evidenced; unresolved blockers are reported |
| 1. App foundation | Independent shell, routes, typed domain models, storage schema, privacy disclosure | App runs locally and contains no copied certificate-specific UI assumptions |
| 2. Import, mapping, validation | CSV/Excel import, positioned fields, column mappings, row review | Invalid/ambiguous cases are visible and prevent unsafe generation |
| 3. Preview and single-record generation | Image/PDF background renderer, local Word conversion, preview, individual PDF | Representative fixtures pass visual and content review |
| 4. Batch engine and recovery | Bounded worker queue, per-row persistence, progress, cancellation/retry | Partial failures and resume behavior meet acceptance criteria |
| 5. Export and quality | ZIP, combined PDF, supported-format documentation, privacy/performance review | End-to-end batch scenario is complete and limitations are published |

## 10. Testing and verification plan

Add tests alongside each stage: unit tests for normalization, mapping, validation, naming, placeholder detection, and adapter operations; integration tests for import-to-generation and generation-to-export; regression fixtures for output content and ordering; manual visual checks for layout, long strings, headers/footers, tables, page breaks, and Hindi/English. Run the project's lint/build and relevant tests after implementation changes. Do not claim layout fidelity based only on a successful build.

## 11. Required final report

Report the app architecture, modules reused or adapted from MailMyCertificate, newly added modules, supported template/input/output formats, local storage and retention behavior, measured batch limit, tests and visual checks performed, known limitations, deployment/run instructions, and unfinished requirements. Explicitly state that MailMyCertificate was not modified.
