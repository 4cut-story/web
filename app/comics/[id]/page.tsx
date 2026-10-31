import { Awaited } from "@/components/awaited";
import { ComicScreen } from "@/components/screens/comic-screen";

export default function Page({ params }: PageProps<"/comics/[id]">) {
  return (
    <Awaited value={params} render={({ id }) => <ComicScreen id={id} />} />
  );
}
