import type { Metadata } from "next";

import { MeScreen } from "@/components/screens/me-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page() {
  return <MeScreen />;
}
