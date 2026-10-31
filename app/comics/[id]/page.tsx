import { Awaited } from "@/components/awaited";
import { ComicScreen } from "@/components/screens/comic-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Awaited value={params} render={({ id }) => <ComicScreen id={id} />} />
  );
}
