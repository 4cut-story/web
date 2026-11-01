"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import { userPath } from "@/lib/api";
import { useMe } from "@/lib/use-me";

/** 내 프로필 탭(/me). 내 페이지 주소(/@닉네임)로 바로 보낸다. 로그인을 마치면 여기로 온다. */
export function MeScreen() {
  const router = useRouter();
  const me = useMe();
  const nickname = me.data?.nickname;

  useEffect(() => {
    if (nickname) {
      router.replace(userPath(nickname));
    }
  }, [nickname, router]);

  return (
    <AppShell title="프로필" tab="profile">
      {me.error && (
        <ErrorText message={me.error.message} code={me.error.code} />
      )}
    </AppShell>
  );
}
