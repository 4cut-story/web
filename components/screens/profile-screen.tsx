"use client";

import { AppShell } from "@/components/app-shell";
import { ProfileView } from "@/components/profile-view";
import { useMe } from "@/lib/use-me";

/** 다른 사람 프로필. 내 프로필이면 팔로우 버튼을 숨긴다. */
export function ProfileScreen({ userId }: { userId: string }) {
  const me = useMe();
  return (
    <AppShell title="프로필" tab={me.data?.id === userId ? "profile" : "feed"}>
      <ProfileView userId={userId} self={me.data?.id === userId} />
    </AppShell>
  );
}
