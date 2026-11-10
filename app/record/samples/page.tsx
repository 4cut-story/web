import type { Metadata } from "next";

import { SamplesScreen } from "@/components/screens/samples-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page() {
  return <SamplesScreen />;
}
