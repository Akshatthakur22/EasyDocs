import type { Metadata } from "next";
import Workbench from "@/components/Workbench";

export const metadata: Metadata = {
  title: "Document Studio — Free Bulk PDF & Document Generator",
  description:
    "Open the EasyDocs Document Studio: upload your PDF or Word template, connect an Excel spreadsheet, visually place dynamic text and signatures, and export personalized PDF batches 100% locally.",
  alternates: {
    canonical: "/app",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AppPage() {
  return <Workbench />;
}
