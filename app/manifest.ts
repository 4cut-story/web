import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/** 홈 화면에 추가했을 때의 이름·아이콘·색 (웹 앱 매니페스트). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "4cut",
    description: SITE_DESCRIPTION,
    lang: "ko-KR",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f04e23",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
