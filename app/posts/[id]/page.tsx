import { Awaited } from "@/components/awaited";
import { PostScreen } from "@/components/screens/post-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Awaited value={params} render={({ id }) => <PostScreen id={id} />} />;
}
