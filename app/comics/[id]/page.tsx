import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { ComicScreen } from "@/components/screens/comic-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = PRIVATE_PAGE;

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Awaited value={params} render={({ id }) => <ComicScreen id={id} />} />
  );
}
