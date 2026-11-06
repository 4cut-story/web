import { Awaited } from "@/components/awaited";
import { CharactersScreen } from "@/components/screens/characters-screen";
import { parseFilter } from "@/lib/characters";

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
