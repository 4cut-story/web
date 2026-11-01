"use client";

import { Mic } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppShell, HOME, LoginButton } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorText } from "@/components/empty-state";
import { ProfileView } from "@/components/profile-view";
import { Button } from "@/components/ui/button";
import { api, errorMessage, navigation, userPath } from "@/lib/api";
import type { User } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { useViewer } from "@/lib/use-me";

async function logout() {
  await fetch("/auth/logout", { method: "POST" });
  navigation.toLogin();
}

/**
 * 사용자 페이지 (/@닉네임). 누구나 열 수 있고, 게시물은 보는 사람 기준 공개 범위대로 보인다.
 * 내 페이지면 녹음하기, 내 주소 복사, 로그아웃, 탈퇴를 함께 둔다.
 */
export function UserPageScreen({ nickname }: { nickname: string }) {
  const viewer = useViewer();
  const user = useLoad(`lookup:${nickname}`, () =>
    api.get<User>(`/users/lookup?nickname=${encodeURIComponent(nickname)}`),
  );
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const anonymous = viewer.data === null;
  const self = Boolean(viewer.data && viewer.data.id === user.data?.id);

  async function withdraw() {
    setConfirm(false);
    try {
      await api.del("/me");
      await logout();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + userPath(nickname),
      );
      setCopied(true);
    } catch {
      setError("주소를 복사하지 못했어요.");
    }
  }

  return (
    <AppShell
      title={nickname}
      back={anonymous ? HOME : undefined}
      tab={anonymous ? undefined : self ? "profile" : "feed"}
      actions={
        anonymous ? (
          <LoginButton />
        ) : (
          self && (
            <Button variant="ghost" size="sm" onClick={logout}>
              로그아웃
            </Button>
          )
        )
      }
    >
      {user.error && (
        <ErrorText
          message={
            user.error.code === "NOT_FOUND"
              ? "없는 사용자예요. 주소를 다시 확인해 주세요."
              : user.error.message
          }
          code={user.error.code}
        />
      )}
      {self && (
        <div className="mb-6 flex flex-col gap-3">
          <Button asChild>
            <Link href="/record">
              <Mic aria-hidden />
              녹음해서 만화 만들기
            </Link>
          </Button>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-4 py-3 text-sm">
            <span className="truncate text-muted-foreground">
              내 주소{" "}
              <span className="font-medium text-foreground">@{nickname}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={copyAddress}>
              {copied ? "복사했어요" : "주소 복사"}
            </Button>
          </div>
        </div>
      )}
      {user.data && (
        <ProfileView
          userId={user.data.id}
          canFollow={Boolean(viewer.data) && !self}
        />
      )}
      {error && <ErrorText message={error} />}
      {self && (
        <div className="mt-auto flex justify-center pt-10">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() => setConfirm(true)}
          >
            탈퇴하기
          </Button>
        </div>
      )}
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
