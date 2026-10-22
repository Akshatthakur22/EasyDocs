# EasyDocs phased coding prompt

Paste this prompt into the coding agent working in the EasyDocs repository. The accompanying technical specification is the implementation contract.

---

## Role and objective

You are implementing **EasyDocs**, a separate, local-first bulk document automation web application. Read these project documents before coding:

1. `EASYDOCS_TECHNICAL_SPEC.md` — source of truth for architecture, MVP scope, gates, and acceptance criteria.
2. `MAILMYCERTIFICATE_AUDIT.md` — verified findings about the reference project and reuse boundaries.
3. The original PRD, if available at `/Users/akshatthakur22/.codex/attachments/3256283f-27d9-452e-bcc4-fe0f6f98cdc9/Pasted text.txt`.

Reference code is at `/Users/akshatthakur22/Desktop/open source/MailMyCertficate`. The current working repository is EasyDocs. **Do not edit MailMyCertificate.** Keep the products separate and preserve the reference app's working behavior by leaving its source untouched.

Build a functioning end-to-end MVP, not a static mockup. Follow the stages below in order, complete every stage whose exit conditions are met, and keep the implementation runnable. The PRD authorizes implementation tests and output verification; add and run relevant tests as each stage is built. Do not claim a feature works unless it is verified.

## Rules for the whole implementation

- Start by checking Git status, repository instructions, and the existing EasyDocs workspace. Preserve user changes.
- Base reuse decisions on the audit and actual source. Reuse ideas/modules only where product-neutral; do not copy the reference UI wholesale or import its analytics/admin backend.
- Prefer local browser processing. Do not upload templates, datasets, or generated files. Do not introduce a cloud conversion service, database, account system, or queue backend.
- Use a visual page-background editor as the core interaction. Reuse the reference's image-coordinate field placement and PDF overlay model; treat PDF and converted Word documents as static printable pages, not editable text flow.
- Keep source values intact, protect leading zeroes, detect normalized header collisions, and never silently guess ambiguous mappings.
- Keep row identity stable, preserve source order, bound concurrency/memory, and persist per-row outcomes.
- Be precise about format support and fidelity. Support image, PDF, DOC, and DOCX templates through image/PDF backgrounds and local Word-to-PDF conversion. Accept CSV/XLS/XLSX data. Do not claim arbitrary file-type support; each format needs a tested conversion path.
- If a technical gate fails, stop only the dependent scope, record reproducible evidence and options, and complete independent work. Do not hide the failure behind a fallback that violates local processing or fidelity requirements.
- Follow the technical specification's staged exit conditions. Commit only if explicitly requested; do not deploy or publish.

## Stage 0 — Inspect workspace and prove the document format path

1. Inspect the EasyDocs Git state and files. Read any applicable `AGENTS.md` and project guidance.
2. Recheck relevant reference implementation details only as needed; do not change that repository.
3. Confirm local image/PDF preview and Word-to-PDF conversion, noting layout changes. Include a multipage document and long sample values.
4. Confirm users can place spreadsheet fields over converted page backgrounds and generate printable PDFs without sending files to an external service.
5. Record supported formats, conversion constraints, and manual visual checks in the app documentation.

**Exit:** A viable local strategy meets the required DOCX, PDF, Unicode, and privacy criteria. If no single strategy meets all criteria, preserve the valid subset, document the exact limitation, and do not claim the full P0 release is achieved. Continue independent stages where meaningful.

## Stage 1 — Application foundation

1. Set up the independent Next.js/React/TypeScript application in the EasyDocs workspace, matching the reference's stack only where helpful.
2. Create a simple, distinct EasyDocs shell with a clear workflow for template, data, mapping, review, generation, and export. Avoid empty navigation and premature marketing pages.
3. Define typed domain models for templates, datasets, mappings, validation issues, batch jobs, row outcomes, and export artifacts.
4. Define the template-adapter contract from the technical specification. Add only the adapter proven by Stage 0.
5. Set up versioned IndexedDB persistence for batch inputs and outputs; localStorage may hold non-sensitive preferences only.
6. Implement visible retention/privacy explanation plus clear-current-batch and delete-all-local-data controls.

**Exit:** Application runs locally, the domain boundary is clear, and sample data can be persisted and removed locally.

## Stage 2 — Dataset import, visual field placement, and validation

1. Implement CSV import and XLSX import with worksheet selection. Preserve source headers/values and handle quoted CSV, blank rows, encoding, empty files, duplicate headers, and normalized-name collisions.
2. Show spreadsheet columns as draggable/addable fields on the template page preview. Let users add a field, choose its column, drag its position, set text size/color/alignment, and select a page.
3. Store field positions as normalized page-relative coordinates. Reuse saved field layouts and require remapping when a future spreadsheet lacks a previously selected column.
4. Validate that fields are placed and mapped, identify missing row values and duplicate/unsafe output names, and let users exclude invalid rows.
5. Show row-level issues and allow exclusion of invalid rows while valid rows remain eligible.
6. Add unit/integration tests for imports, normalization, placeholders, mapping ambiguity, and validation.

**Exit:** A user can import a dataset, place and map fields on the visual page, inspect errors, exclude rows, and reach a safe pre-generation state.

## Stage 3 — Preview and one-record output

1. Render the template background and draggable field overlays together, with representative row values and navigation among valid records.
2. Implement the one-record printable PDF path for image/PDF backgrounds and locally converted Word documents.
3. Verify overlay coordinates, text size/alignment/color, multipage selection, missing values, long names, and Word-to-PDF layout notes.
4. Add an individual file download with deterministic, sanitized naming.
5. Add automated tests for substitution, output naming, and adapter error handling; manually inspect rendered PDFs and note known limitations.

**Exit:** Preview shows fields at the designed locations, individual printable PDFs open correctly, and format limitations are documented.

## Stage 4 — Bounded batch generation and recovery

1. Build a bounded job queue (start with one worker and conservative chunks) and persist status/results after each record.
2. Track `pending`, `processing`, `completed`, `failed`, and `excluded` separately. Derive progress from terminal eligible rows and display all counts distinctly.
3. Support cancellation, interruption recovery, and retry of failed rows only. Never regenerate completed rows on retry.
4. Handle one bad row without losing successful documents. Show row-specific stage/error information.
5. Add integration tests for success, mixed failures, cancellation, recovery, retry, and stable ordering.
6. Measure a representative hundreds-row batch and adjust limits/concurrency based on memory and responsiveness. Do not claim thousands without evidence.

**Exit:** Partial failure, retry, recovery, and progress semantics satisfy the technical specification.

## Stage 5 — ZIP, combined PDF, and release quality

1. Export per-row artifacts into a ZIP using safe, collision-resistant filenames.
2. Assemble a combined print PDF in source-row order. Include successful outputs only and report any omitted failures. Bound memory and surface export failures.
3. Run the full end-to-end workflow from template import through mapping, validation, preview, batch generation, and all applicable exports.
4. Run relevant automated tests, lint, and production build. Perform and record visual checks for the representative fixtures.
5. Review privacy/network behavior and verify that generation does not make external requests.
6. Add run/build/deploy instructions appropriate to the actual implementation and publish a supported-format/known-limitations section in the application/docs.

**Exit:** Acceptance criteria in `EASYDOCS_TECHNICAL_SPEC.md` are satisfied or each outstanding requirement is clearly listed with evidence and impact.

## Completion report

At the end, provide:

- What works end to end and how to run it.
- Architecture and adapter/library choices, including rationale and license considerations.
- Reused concepts/modules and new modules.
- Exact supported input, template, and output formats.
- Tests, build/lint checks, batch measurements, and visual checks performed.
- Privacy and local retention behavior.
- Known fidelity/performance limits and unfinished requirements.
- Files changed and confirmation that MailMyCertificate was not modified.

Do not describe the result as complete if visual field placement, printable PDF generation, Unicode fidelity, or another P0 acceptance criterion remains unmet.

---
