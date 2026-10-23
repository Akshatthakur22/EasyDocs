import type { Metadata } from "next";
import { AboutPage } from "@/components/PublicSite";

export const metadata: Metadata = {
  title: "About EasyDocs & Creator Akshat Thakur",
  description:
    "Learn about EasyDocs: a free, privacy-first bulk document generator engineered by Akshat Thakur. Local browser processing, zero server storage.",
  alternates: {
    canonical: "/about",
  },
};

export default function Page() {
  return <AboutPage />;
}
