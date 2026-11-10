import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { CharacterScreen } from "@/components/screens/character-screen";
import { parseFilter } from "@/lib/characters";
import { characterMetadata } from "@/lib/server/seo";

type Query = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return characterMetadata((await params).id);
}

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Query>;
}) {
  return (
    <Awaited
      value={Promise.all([params, searchParams])}
      render={([{ id }, query]) => (
        <CharacterScreen
          id={id}
          theme={query.theme ? parseFilter(query).theme : undefined}
        />
      )}
    />
  );
}
