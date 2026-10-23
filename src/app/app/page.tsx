import type { Metadata } from "next";
import Workbench from "@/components/Workbench";

export const metadata: Metadata = {
  title: "Document Studio — Create Bulk Personalized PDFs",
  description:
    "Upload a document template, import your spreadsheet, place text and dynamic signatures, and generate personalized PDFs in bulk.",
  alternates: {
    canonical: "/app",
  },
  robots: {
    index: false, // The workbench tool is an application screen, avoid indexing user session state
    follow: true,
  },
};

export default function AppPage() {
  return <Workbench />;
}
