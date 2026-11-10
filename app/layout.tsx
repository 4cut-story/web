import type { Metadata, Viewport } from "next";
// Pretendard Variable (OFL-1.1) 동적 서브셋. 자체 호스팅하고 외부 CDN을 부르지 않는다.
// 한 파일(2MB)을 통째로 받지 않고, 화면에 나온 글자가 든 조각(조각당 수십 KB)만 받는다.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import {
  openGraph,
  SEARCH_VERIFICATION,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  twitterCard,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "4컷 만화",
    "네컷 만화",
    "AI 만화",
    "대화 만화",
    "녹음 만화",
    "만화 만들기",
    "4cut story",
  ],
  openGraph: openGraph({}),
  twitter: twitterCard({}),
  formatDetection: { telephone: false },
  verification: SEARCH_VERIFICATION,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
