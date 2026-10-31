import { Awaited } from "@/components/awaited";
import { ProgressScreen } from "@/components/screens/progress-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Awaited value={params} render={({ id }) => <ProgressScreen id={id} />} />
  );
}
