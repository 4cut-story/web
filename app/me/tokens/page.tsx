import type { Metadata } from "next";

import { TokensScreen } from "@/components/screens/tokens-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page() {
  return <TokensScreen />;
}
