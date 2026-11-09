import { Awaited } from "@/components/awaited";
import { SoundScreen } from "@/components/screens/sound-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Awaited value={params} render={({ id }) => <SoundScreen id={id} />} />
  );
}
