import type { Metadata, Viewport } from "next";
import { pretendard } from "./fonts";
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
    <html lang="ko" className={`${pretendard.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
