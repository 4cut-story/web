import { Awaited } from "@/components/awaited";
import { ProfileScreen } from "@/components/screens/profile-screen";

export default function Page({ params }: PageProps<"/users/[id]">) {
  return (
    <Awaited
      value={params}
      render={({ id }) => <ProfileScreen userId={id} />}
    />
  );
}
