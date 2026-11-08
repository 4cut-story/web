import type { Metadata } from "next";

import { LabScreen } from "@/components/screens/lab-screen";

export const metadata: Metadata = {
  title: "그림 모델 비교 · 4cut story",
  description:
    "같은 콘티를 여러 그림 모델로 그린 테스트 기록을 컷끼리 나란히 비교합니다.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <LabScreen />;
}
