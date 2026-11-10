import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { UserProfileScreen } from "@/components/screens/user-profile-screen";
import { decodeSegment } from "@/lib/auth-gate";
import { userMetadata } from "@/lib/server/seo";

type Props = { params: Promise<{ nickname: string }> };

/** 프로필은 스토리(/@아이디)와 같은 사람이라 대표 주소를 스토리로 둔다. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return userMetadata(decodeSegment((await params).nickname));
}

/** 사용자 프로필. 주소는 /@아이디/profile이고 proxy가 이 경로로 바꿔 그린다. */
export default function Page({ params }: Props) {
  return (
    <Awaited
      value={params}
      render={({ nickname }) => (
        <UserProfileScreen nickname={decodeSegment(nickname)} />
      )}
    />
  );
}
