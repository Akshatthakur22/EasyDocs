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
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      "name": "EasyDocs",
      "url": siteUrl,
      "description":
        "A free, local-first web application that merges spreadsheet data into existing PDF, Word, or image templates to generate personalized PDFs in bulk.",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All modern web browsers",
      "browserRequirements": "Requires JavaScript. Runs on Chrome, Firefox, Safari, Edge.",
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
          "https://www.linkedin.com/in/akshatthakur22/"
        ]
      }
    },
    {
      "@type": "Person",
      "@id": "https://akshatt.in/#person",
      "name": "Akshat Thakur",
      "jobTitle": "Software Developer",
      "url": "https://akshatt.in",
      "sameAs": [
        "https://github.com/Akshatthakur22",
        "https://www.linkedin.com/in/akshatthakur22/"
      ]
    }
  ]
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
