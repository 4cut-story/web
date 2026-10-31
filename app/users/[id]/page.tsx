import { Awaited } from "@/components/awaited";
import { ProfileScreen } from "@/components/screens/profile-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Awaited
      value={params}
      render={({ id }) => <ProfileScreen userId={id} />}
    />
  );
}
