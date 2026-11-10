import type { Metadata } from "next";

import { VoicesScreen } from "@/components/screens/voices-screen";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "목소리",
  "4cut story 라이브 모드에서 대사를 읽어 주는 가상 인물 목소리를 성별·연령대·사투리와 감정별로 들어 볼 수 있어요.",
  "/voices",
);

export default function Page() {
  return <VoicesScreen />;
}
