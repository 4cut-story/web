"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorText } from "@/components/empty-state";
import { ProfileView } from "@/components/profile-view";
import { Button } from "@/components/ui/button";
import { api, errorMessage, navigation } from "@/lib/api";
import { useMe } from "@/lib/use-me";

async function logout() {
  await fetch("/auth/logout", { method: "POST" });
  navigation.toLogin();
}

/** 내 프로필: 프로필 본문 + 로그아웃, 탈퇴. */
export function MeScreen() {
  const me = useMe();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();

  async function withdraw() {
    setConfirm(false);
    try {
      await api.del("/me");
      await logout();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <AppShell
      title="프로필"
      tab="profile"
      actions={
        <Button variant="ghost" size="sm" onClick={logout}>
          로그아웃
        </Button>
      }
    >
      {me.error && (
        <ErrorText message={me.error.message} code={me.error.code} />
      )}
      {me.data && <ProfileView userId={me.data.id} self />}
      <div className="mt-auto flex justify-center pt-10">
        <Button
          variant="link"
          className="text-muted-foreground"
          onClick={() => setConfirm(true)}
        >
          탈퇴하기
        </Button>
      </div>
      {error && <ErrorText message={error} />}
      {confirm && (
        <ConfirmDialog
          title="정말 탈퇴할까요?"
          description="녹음, 만화, 게시물, 댓글이 모두 지워지고 되돌릴 수 없어요."
          confirmLabel="탈퇴"
          onConfirm={withdraw}
          onCancel={() => setConfirm(false)}
        />
      )}
    </AppShell>
  );
}
