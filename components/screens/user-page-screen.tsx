"use client";

import { Check, KeyRound, Link2, LogOut, Rss, UserX } from "lucide-react";
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
 * 내 페이지면 내 주소 복사, 개인 토큰 관리, 로그아웃, 탈퇴를 함께 둔다 (녹음은 메뉴의 만들기에서).
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

  const copyButton = (
    <Button
      variant="outline"
      onClick={copyAddress}
      className="grow basis-32 md:grow-0 md:basis-auto"
    >
      {copied ? (
        <Check aria-hidden className="text-success" />
      ) : (
        <Link2 aria-hidden />
      )}
      {copied ? "복사했어요" : "주소 복사"}
    </Button>
  );

  return (
    <AppShell
      title={nickname}
      back={anonymous ? HOME : undefined}
      tab={anonymous ? undefined : self ? "profile" : "feed"}
      width="wide"
      actions={
        anonymous ? (
          <LoginButton />
        ) : (
          self && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="로그아웃"
              title="로그아웃"
              onClick={logout}
            >
              <LogOut aria-hidden />
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
      {user.data && (
        <ProfileView
          userId={user.data.id}
          canFollow={Boolean(viewer.data) && !self}
          self={self}
          actions={
            self && (
              <>
                {copyButton}
                <Button
                  asChild
                  variant="outline"
                  className="grow basis-32 md:grow-0 md:basis-auto"
                >
                  <Link href="/rss">
                    <Rss aria-hidden />
                    RSS 구독
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="grow basis-32 md:grow-0 md:basis-auto"
                >
                  <Link href="/me/tokens">
                    <KeyRound aria-hidden />
                    개인 토큰
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirm(true)}
                  className="grow basis-32 text-destructive hover:text-destructive md:grow-0 md:basis-auto"
                >
                  <UserX aria-hidden />
                  탈퇴하기
                </Button>
              </>
            )
          }
        />
      )}
      {error && <ErrorText message={error} />}
      {confirm && (
        <ConfirmDialog
          title="정말 탈퇴할까요?"
          description="녹음, 4컷, 게시물, 댓글이 모두 지워지고 되돌릴 수 없어요."
          confirmLabel="탈퇴"
          onConfirm={withdraw}
          onCancel={() => setConfirm(false)}
        />
      )}
    </AppShell>
  );
}
