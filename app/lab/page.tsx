import type { Metadata } from "next";
import { Suspense } from "react";

import { Resolve } from "@/components/awaited";
import { LabScreen } from "@/components/screens/lab-screen";
import { labRounds } from "@/lib/server/lab";

export const metadata: Metadata = {
  title: "그림 모델 비교",
  description:
    "같은 콘티를 여러 그림 모델로 그린 테스트 기록을 컷끼리 나란히 비교합니다.",
  robots: { index: false, follow: false },
};

/** 서버가 모아 둔 기록을 받는 동안에는 불러오는 화면을 먼저 보인다. */
export default function Page() {
  return (
    <Suspense fallback={<LabScreen pending />}>
      <Resolve
        value={labRounds()}
        render={(rounds) => <LabScreen rounds={rounds} />}
      />
    </Suspense>
  );
}
