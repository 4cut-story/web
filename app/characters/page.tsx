import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { CharactersScreen } from "@/components/screens/characters-screen";
import { parseFilter } from "@/lib/characters";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "캐릭터",
  "4cut story 만화에 나오는 캐릭터를 직업·나이·그림체별로 모아 봤어요. 캐릭터마다 여러 모습과 표정을 볼 수 있어요.",
  "/characters",
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
      render={(query) => <CharactersScreen initial={parseFilter(query)} />}
    />
  );
}
