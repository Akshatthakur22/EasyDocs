import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyDocs — Documents, created in bulk",
  description: "Turn a document and spreadsheet into personalized, print-ready PDFs with EasyDocs.",
  applicationName: "EasyDocs",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
