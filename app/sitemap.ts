import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";

import { sitemapEntries } from "@/lib/server/seo";

/** 게시물이 계속 늘어 빌드 때 만들지 않고, 요청 때 만들어 한 시간 둔다. */
async function cachedEntries(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  return sitemapEntries();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return cachedEntries();
}
