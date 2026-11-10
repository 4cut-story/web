import type { Metadata } from "next";

import { InboxScreen } from "@/components/screens/inbox-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page() {
  return <InboxScreen />;
}
