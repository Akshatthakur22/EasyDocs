# EasyDocs UI/UX audit and implementation plan

## Existing system inventory

- The repository uses the Next.js App Router with one root layout and a single client-side `Workbench` that owns the live batch workflow.
- Batch state, template files, rows, field mappings, and generated PDFs are persisted in browser IndexedDB. Expired records are cleaned when the app starts.
- The workflow imports image/PDF/Word templates and CSV/Excel data, lets users position text fields on the rendered page, previews real output, generates per-row PDFs, retries failures, and exports ZIP or combined PDF results.
- Word and legacy Excel conversion use the local browser worker and runtime assets served by this application. There is no EasyDocs account backend or Gmail/Google Sheets integration in this repository.
- `TemplateDesigner` contains the live coordinate system, multi-page preview, zoom, fit/expand, pan-by-drag, snap-to-grid, field typography, keyboard movement, and delete behavior. These interactions are retained and undo/redo restores are saved with the design, with Ctrl/Cmd+Z, Ctrl+Y, and Ctrl/Cmd+Shift+Z shortcuts. The undo stack is limited to the current browser editing session.

## Route and screen structure

| Route | Purpose |
|---|---|
| `/` | Public landing page and product overview |
| `/about` | Supported workflow and format summary |
| `/contact` | Honest local-installation support guidance |
| `/privacy` | Browser storage, conversion, expiration, and deletion details |
| `/app` | Direct entry to the working batch tool |

The app uses five focused screens: choose template, import data, place fields, review records and preview a representative PDF, then generate and export. This preserves the actual editor as its own step rather than mixing placement with row validation.

## Design and implementation stages

1. Establish shared Apple-inspired color, type, spacing, border, focus, motion, and responsive tokens in `globals.css`.
2. Add a public shell, concise landing page, and meaningful About, Contact, and Privacy routes. Keep claims tied to the current local-first code and label sample content as illustrative.
3. Give the existing workbench its own `/app` route and compact application shell.
4. Render only the active workflow screen, with an accessible progress navigation, plain-language validation, sticky next/back actions, and a dedicated placement screen. Keep the desktop app shell within the viewport; use focused inner scroll regions for unusually dense content and natural page scroll on mobile.
5. Keep review, generation progress, partial failures, retry, and all existing export actions connected to their real batch state.
6. Verify with typecheck, lint, unit tests, production build, route responses, and manual browser use of the bundled template and sample dataset.

## Functionality and risk notes

- The data types, IndexedDB schema, import parsers, conversion workers, PDF renderer, and generation code should not change as part of the visual redesign.
- Recovery must reopen the correct screen for an unfinished or completed batch without dropping saved files.
- A PDF/image background is a static page; Word conversion can change pagination and typography. Users need to review the converted page and generated PDF.
- The app handles only the currently implemented local file formats. It must not suggest arbitrary-file editing, native Word reflow, cloud sync, or external mail delivery.
- Browser storage can be cleared or quota-limited. Existing seven-day cleanup and the delete-all action remain visible and documented.
- Mobile layout stacks the workbench and keeps the current step/action clear; detailed field placement is naturally easier on a large screen.
