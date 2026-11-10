import type { Metadata } from "next";

import { AboutScreen } from "@/components/screens/about-screen";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "서비스 소개",
  "4cut story의 아키텍처, 생성 흐름, 하드웨어, AI 모델, 튜닝 기록을 소개합니다.",
  "/about",
);

export default function Page() {
  return <AboutScreen />;
}
