import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { ProgressScreen } from "@/components/screens/progress-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Awaited value={params} render={({ id }) => <ProgressScreen id={id} />} />
  );
}
