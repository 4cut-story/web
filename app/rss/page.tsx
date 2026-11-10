import type { Metadata } from "next";

import { RssScreen } from "@/components/screens/rss-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page() {
  return <RssScreen />;
}
