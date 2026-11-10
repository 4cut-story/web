import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { FeedScreen } from "@/components/screens/feed-screen";
import { pageMetadata, SITE_DESCRIPTION, siteJsonLd } from "@/lib/seo";

const TITLE = "4cut story · 대화를 녹음하면 4컷 만화가 돼요";

export const metadata: Metadata = {
  ...pageMetadata(TITLE, SITE_DESCRIPTION, "/"),
  title: { absolute: TITLE },
};

export default function Page() {
  return (
    <>
      <FeedScreen />
      <JsonLd data={siteJsonLd()} />
    </>
  );
}
