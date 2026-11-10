import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { SoundsScreen } from "@/components/screens/sounds-screen";
import { parseSoundFilter } from "@/lib/sounds";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "배경음",
  "4cut story 라이브 모드에서 만화 장면에 깔리는 배경음과 효과음을 분위기·장소별로 들어 볼 수 있어요.",
  "/sounds",
);

type Query = Record<string, string | string[] | undefined>;

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  return (
    <Awaited
      value={searchParams}
      render={(query) => <SoundsScreen initial={parseSoundFilter(query)} />}
    />
  );
}
