import type { Metadata } from "next";
import { ContactPage } from "@/components/PublicSite";

export const metadata: Metadata = {
  title: "Contact & Community Help — EasyDocs",
  description:
    "Get assistance with EasyDocs, view documentation, report issues on GitHub, or get in touch with creator Akshat Thakur.",
  alternates: {
    canonical: "/contact",
  },
};

export default function Page() {
  return <ContactPage />;
}
