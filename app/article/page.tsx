import type { Metadata } from "next";

import { ArticleScreen } from "@/components/screens/article-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page() {
  return <ArticleScreen />;
}
