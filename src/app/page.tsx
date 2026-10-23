import type { Metadata } from "next";
import { LandingPage } from "@/components/PublicSite";

export const metadata: Metadata = {
  title: "EasyDocs — Free Local Bulk PDF & Document Generator",
  description:
    "Generate hundreds of personalized PDFs from an existing document and spreadsheet. Free, local-first in your browser, no account needed.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <LandingPage />;
}
