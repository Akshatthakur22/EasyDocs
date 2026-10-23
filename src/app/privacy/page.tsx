import type { Metadata } from "next";
import { PrivacyPage } from "@/components/PublicSite";

export const metadata: Metadata = {
  title: "Privacy & Local-First Architecture — EasyDocs",
  description:
    "How EasyDocs protects your data. All templates, spreadsheets, signatures, and PDFs stay strictly in your browser. 3-minute session cleanup and zero cloud uploads.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function Page() {
  return <PrivacyPage />;
}
