import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { ProfileScreen } from "@/components/screens/profile-screen";
import { profileMetadata } from "@/lib/server/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return profileMetadata((await params).id);
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Awaited
      value={params}
      render={({ id }) => <ProfileScreen userId={id} />}
    />
  );
}
