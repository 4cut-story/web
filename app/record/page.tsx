import type { Metadata } from "next";

import { RecordScreen } from "@/components/screens/record-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page() {
  return <RecordScreen />;
}
