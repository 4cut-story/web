import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { JsonLd } from "@/components/json-ld";
import { UserPageScreen } from "@/components/screens/user-page-screen";
import { decodeSegment } from "@/lib/auth-gate";
import { userJsonLd, userMetadata } from "@/lib/server/seo";

type Props = { params: Promise<{ nickname: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return userMetadata(decodeSegment((await params).nickname));
}

/** 사용자 페이지. 주소는 /@닉네임이고 proxy가 이 경로로 바꿔 그린다. */
export default function Page({ params }: Props) {
  return (
    <>
      <Awaited
        value={params}
        render={({ nickname }) => (
          <UserPageScreen nickname={decodeSegment(nickname)} />
        )}
      />
      <Awaited
        value={params.then(({ nickname }) =>
          userJsonLd(decodeSegment(nickname)),
        )}
        render={(data) => <JsonLd data={data} />}
      />
    </>
  );
}
