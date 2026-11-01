"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import { api, userPath } from "@/lib/api";
import type { User } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

/** 예전 프로필 주소(/users/ID). 사용자 페이지 주소(/@닉네임)로 보낸다. */
export function ProfileScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const user = useLoad(`user:${userId}`, () =>
    api.get<User>(`/users/${userId}`),
  );
  const nickname = user.data?.nickname;

  useEffect(() => {
    if (nickname) {
      router.replace(userPath(nickname));
    }
  }, [nickname, router]);

  return (
    <AppShell title="프로필">
      {user.error && (
        <ErrorText message={user.error.message} code={user.error.code} />
      )}
    </AppShell>
  );
}
