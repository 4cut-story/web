import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { LoginScreen } from "@/components/screens/login-screen";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "로그인", ...PRIVATE_PAGE };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Awaited
      value={searchParams}
      render={(q) => (
        <LoginScreen
          error={typeof q.error === "string" ? q.error : undefined}
        />
      )}
    />
  );
}
