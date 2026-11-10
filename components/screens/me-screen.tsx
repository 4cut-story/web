"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import type { Tab } from "@/components/main-nav";
import { profilePath, userPath } from "@/lib/api";
import { useMe } from "@/lib/use-me";

/**
 * 메뉴의 프로필(/me)과 스토리(/comics)는 내 주소로 보낸다: 프로필은 /@아이디/profile, 스토리는 /@아이디.
 * 로그인을 마치면 /me로 온다.
 */
export function MeRedirect({ to }: { to: "profile" | "story" }) {
  const router = useRouter();
  const me = useMe();
  const nickname = me.data?.nickname;
  const tab: Tab = to === "profile" ? "profile" : "inbox";

  useEffect(() => {
    if (nickname) {
      router.replace(
        to === "profile" ? profilePath(nickname) : userPath(nickname),
      );
    }
  }, [nickname, router, to]);

  return (
    <AppShell title={to === "profile" ? "프로필" : "스토리"} tab={tab}>
      {me.error && (
        <ErrorText message={me.error.message} code={me.error.code} />
      )}
    </AppShell>
  );
}

/** 내 프로필 탭(/me). */
export function MeScreen() {
  return <MeRedirect to="profile" />;
}
