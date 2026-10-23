import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://easydocs.akshatt.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EasyDocs — Free Local Bulk PDF & Document Generator",
    template: "%s | EasyDocs",
  },
  description:
    "Generate hundreds of personalized PDFs from an existing document and spreadsheet — 100% free, private, and processed in your browser. No cloud uploads, no account required.",
  keywords: [
    "bulk PDF generator",
    "free bulk document generator",
    "generate multiple PDFs from Excel",
    "CSV to personalized PDF",
    "bulk certificate generator",
    "merge spreadsheet data into PDF",
    "fill PDF from Excel",
    "local-first PDF tool",
    "offline document generator",
    "private document generation",
    "bulk offer letter generator",
    "admit card generator from Excel",
  ],
  authors: [{ name: "Akshat Thakur", url: "https://akshatt.in" }],
  creator: "Akshat Thakur",
  publisher: "Akshat Thakur",
  applicationName: "EasyDocs",
  alternates: {
    canonical: "/",
  },
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "EasyDocs",
    title: "EasyDocs — Free Local Bulk PDF & Document Generator",
    description:
      "Generate hundreds of personalized PDFs from an existing document and spreadsheet — 100% free, private, and local-first.",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "EasyDocs Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "EasyDocs — Free Local Bulk PDF Generator",
    description:
      "Turn your existing document and spreadsheet into personalized PDFs. Local-first, private, and free.",
    creator: "@akshatthakur22",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "Q_4iJe2-dQi-PaSKqqaQZW0Hijwbaid7u-VAEglI0ww",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "name": "EasyDocs",
      "url": siteUrl,
      "description":
        "Free, private, local-first bulk PDF and document generator from Excel spreadsheets and templates.",
      "publisher": {
        "@id": "https://akshatt.in/#person",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      "name": "EasyDocs",
      "url": siteUrl,
      "description":
        "A free, local-first web application that merges spreadsheet data into existing PDF, Word, or image templates to generate personalized PDFs in bulk.",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Document Automation & PDF Generation",
      "operatingSystem": "All modern web browsers",
      "browserRequirements": "Requires JavaScript. Runs on Chrome, Firefox, Safari, Edge.",
      "softwareVersion": "1.0.0",
      "license": "https://github.com/Akshatthakur22/EasyDocs/blob/main/LICENSE",
      "codeRepository": "https://github.com/Akshatthakur22/EasyDocs",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
      },
      "featureList": [
        "100% Free core document generation without paywalls",
        "Local-first browser processing ensuring document privacy",
        "Visual drag and drop field placement",
        "Dynamic signature, stamp, and photo resizing with live dimensions",
        "Multi-page repetition (current page, all pages, selected pages)",
        "Spreadsheet import supporting CSV, XLSX, XLS, and XLSM",
        "Template support for PDF, PNG, JPG, DOC, and DOCX",
        "Individual PDF exports, ZIP archive, and merged print-ready PDF",
        "Automatic 3-minute session inactivity protection with data cleanup",
      ],
      "author": {
        "@type": "Person",
        "@id": "https://akshatt.in/#person",
        "name": "Akshat Thakur",
        "url": "https://akshatt.in",
        "sameAs": [
          "https://github.com/Akshatthakur22",
          "https://www.linkedin.com/in/akshatthakur22/",
        ],
      },
    },
    {
      "@type": "Person",
      "@id": "https://akshatt.in/#person",
      "name": "Akshat Thakur",
      "jobTitle": "Software Developer",
      "url": "https://akshatt.in",
      "sameAs": [
        "https://github.com/Akshatthakur22",
        "https://www.linkedin.com/in/akshatthakur22/",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is EasyDocs really 100% free? Are there hidden fees or document limits?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, the core tool is 100% free and open source. There are no per-document fees, no subscription paywalls, no watermark additions, and no mandatory credit cards. You can generate batches of up to 500 documents per run as often as you need.",
          },
        },
        {
          "@type": "Question",
          "name": "Are my documents or spreadsheets uploaded to a server?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. All processing is 100% client-side in your browser. Your templates, spreadsheets, recipient names, signatures, and generated PDFs remain on your local device. EasyDocs does not send document contents to an external API or cloud storage.",
          },
        },
        {
          "@type": "Question",
          "name": "Can I use an existing PDF or certificate design I already have?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, absolutely. You do not need to recreate your certificates or letters in a proprietary editor. Upload your existing PDF, high-resolution PNG/JPG, or Word document (.docx/.doc). EasyDocs renders it as the page background and overlays your spreadsheet values on top.",
          },
        },
        {
          "@type": "Question",
          "name": "How do dynamic signatures, stamps, and photograph fields work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "EasyDocs allows you to add dynamic image fields for signatures, seals, stamps, and photos. You can resize them visually on the document canvas using 8 interactive drag-handles or quick presets (Signature: 160×60, Stamp: 100×100, Photo: 120×150). Images can be shared across all records or matched dynamically.",
          },
        },
        {
          "@type": "Question",
          "name": "Can I generate a single combined PDF for office batch printing?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. When generating documents, EasyDocs provides three export formats: a single Merged Print PDF with all recipient documents sequenced in order (ideal for double-sided office printers), a ZIP archive containing individual PDFs named by recipient, or individual PDF downloads.",
          },
        },
        {
          "@type": "Question",
          "name": "What happens if my spreadsheet has missing values or empty rows?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "EasyDocs includes pre-generation data validation. Before generating files, the studio scans your mapped columns and alerts you to any rows missing required fields. You can preview records with issues, skip invalid rows, or correct them before exporting.",
          },
        },
        {
          "@type": "Question",
          "name": "How does the 3-minute inactivity cleanup protect my data?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If you are working on a shared office or university computer, EasyDocs automatically monitors inactivity. After 3 minutes without user interaction, a persistent warning banner appears with a countdown. You can click 'Keep session' to extend your work, or let it clean up your local cache automatically to protect sensitive information.",
          },
        },
        {
          "@type": "Question",
          "name": "Can I repeat fields across all pages of a multi-page document?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. With multi-page templates (like 3-page employment contracts or transcripts), you can choose whether a field appears only on the current page, repeats across every page (perfect for recipient names, headers, or page numbers), or appears on specific selected pages.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
