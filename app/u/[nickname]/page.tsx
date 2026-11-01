import { Awaited } from "@/components/awaited";
import { UserPageScreen } from "@/components/screens/user-page-screen";
import { decodeSegment } from "@/lib/auth-gate";

/** 사용자 페이지. 주소는 /@닉네임이고 proxy가 이 경로로 바꿔 그린다. */
export default function Page({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  return (
    <Awaited
      value={params}
      render={({ nickname }) => (
        <UserPageScreen nickname={decodeSegment(nickname)} />
      )}
    />
  );
}
