export async function GET() {
  const content = `# EasyDocs

> Free, local-first bulk document and PDF generator from spreadsheets and templates.

EasyDocs (https://easydocs.akshatt.in) is an open-source web application engineered by software developer Akshat Thakur (https://akshatt.in). It allows educators, HR managers, event coordinators, and small businesses to generate hundreds of personalized PDF documents—such as certificates, offer letters, event passes, and invoices—directly in the browser without uploading confidential data to cloud servers.

## Core Architecture & Privacy Model
- **100% In-Browser Execution**: All document rendering, text placement, and PDF generation occur client-side on the user's CPU using Web Workers, Dexie (IndexedDB), and pdf-lib.
- **Zero Cloud Storage**: Spreadsheets, recipient details, and template files are never uploaded to remote databases or external APIs.
- **Inactivity Protection**: Sessions automatically monitor inactivity; after 3 minutes without user activity, a warning banner appears and local cache can be cleaned up to protect shared computers.

## Key Capabilities
- **Template Compatibility**: PDF (.pdf), Word (.docx, .doc), and high-resolution images (.png, .jpg). Word files are converted client-side via a WebAssembly engine.
- **Data Import**: CSV (.csv), Excel (.xlsx, .xls, .xlsm). Every column automatically maps to a dynamic text or image field.
- **Visual Page Designer**: Visual drag-and-drop placement with real-time coordinate snapping, font selection, alignment, and multi-page repetition.
- **Dynamic Assets**: Support for signatures, stamps, seals, and photographs with 8-handle interactive resizing and preset dimensions.
- **Export Formats**:
  1. Merged Print PDF: All recipient records sequenced into a single multi-page file ready for double-sided office printers.
  2. ZIP Archive: Individual PDF files named cleanly by recipient column (e.g., "Certificate - Jane Doe.pdf").
  3. Individual PDF files.

## Technical Details
- **Framework**: Next.js 16 (App Router), TypeScript, React 19.
- **Styling**: Vanilla CSS with modern Apple-grade typography, dark obsidian contrast islands, and responsive design.
- **PDF Engine**: Client-side pdf-lib vector synthesis.
- **Storage**: IndexedDB via Dexie for temporary session persistence.
- **License**: MIT / Open Source.

## Author & Project Links
- **Creator**: Akshat Thakur (Software Developer)
- **Portfolio**: https://akshatt.in
- **GitHub**: https://github.com/Akshatthakur22/EasyDocs
- **LinkedIn**: https://www.linkedin.com/in/akshatthakur22/
- **Official Website**: https://easydocs.akshatt.in
- **Studio Application**: https://easydocs.akshatt.in/app
- **Privacy Architecture**: https://easydocs.akshatt.in/privacy
- **About the Project**: https://easydocs.akshatt.in/about
`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
