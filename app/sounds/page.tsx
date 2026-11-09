import { Awaited } from "@/components/awaited";
import { SoundsScreen } from "@/components/screens/sounds-screen";
import { parseSoundFilter } from "@/lib/sounds";

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
