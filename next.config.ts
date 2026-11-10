import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // 메타데이터를 <head>에 바로 넣어 줄 로봇. Next 기본 목록에 Googlebot(대표 주소·noindex를 <head>에서 읽는다)과
  // 카카오톡·다음·텔레그램 미리보기를 더한다. 나머지 사용자는 메타데이터를 스트리밍으로 받는다.
  htmlLimitedBots: new RegExp(
    [
      "[\\w-]+-Google|Google-[\\w-]+|Googlebot|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou",
      "bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot",
      "facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp",
      "SkypeUriPreview|Yeti|googleweblight|kakaotalk-scrap|Daumoa|TelegramBot",
    ].join("|"),
    "i",
  ),
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
