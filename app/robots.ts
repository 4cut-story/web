import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/** 로그인해야 보이는 화면과 API는 막고, 공유 그림(/api/images)은 연다. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/images/"],
        disallow: [
          "/api/",
          "/auth/",
          "/login",
          "/me",
          "/comics",
          "/conversations",
          "/record",
          "/rss",
          "/article",
          "/lab",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
