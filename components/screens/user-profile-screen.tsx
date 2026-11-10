"use client";

import { KeyRound, LogOut, Rss, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorText } from "@/components/empty-state";
import { ProfileView } from "@/components/profile-view";
import { Button } from "@/components/ui/button";
import { UserShell } from "@/components/user-shell";
import { api, errorMessage, navigation } from "@/lib/api";
import type { User } from "@/lib/types";

/** 닉네임 최대 길이 (auth-service와 같다). */
const MAX_NAME = 20;

async function logout() {
  await fetch("/auth/logout", { method: "POST" });
  navigation.toLogin();
}

/**
 * 사용자 프로필 (/@아이디/profile). 누구나 열 수 있다. 주인이면 닉네임 바꾸기와 계정 관리(RSS, 개인 토큰,
 * 로그아웃, 탈퇴)를 함께 둔다. 4컷은 스토리(/@아이디)에서 본다.
 */
export function UserProfileScreen({ nickname }: { nickname: string }) {
  // 닉네임을 바꾸면 이 화면의 이름도 바로 바뀌도록 바꾼 값을 따로 둔다
  const [renamed, setRenamed] = useState<User>();
  return (
    <UserShell nickname={nickname} title={() => "프로필"} selfTab="profile">
      {(found, self, signedIn) => {
        const user = renamed?.id === found.id ? renamed : found;
        return (
          <ProfileView user={user} canFollow={signedIn && !self} self={self}>
            {self && (
              <>
                <NameForm user={user} onSaved={setRenamed} />
                <AccountSection />
              </>
            )}
          </ProfileView>
        );
      }}
    </UserShell>
  );
}

/** 닉네임 바꾸기. 비우면 로그인 아이디가 보인다. 주소(/@아이디)는 바뀌지 않는다. */
function NameForm({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (user: User) => void;
}) {
  const [name, setName] = useState(user.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const changed = name.trim() !== (user.displayName ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const me = await api.patch<User>("/me", {
        displayName: name.trim() || null,
      });
      onSaved({ ...user, displayName: me.displayName ?? null });
      setName(me.displayName ?? "");
      setSaved(true);
      setError(undefined);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="name-heading"
      className="flex flex-col gap-3 rounded-xl border border-border p-5"
    >
      <h2 id="name-heading" className="text-base font-semibold">
        닉네임
      </h2>
      <p className="text-sm text-muted-foreground">
        4컷과 댓글에 보이는 이름이에요. 비워 두면 로그인 아이디(@
        {user.nickname})가 보여요. 주소는 바뀌지 않아요.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="닉네임"
          placeholder={user.nickname}
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className="h-11 min-w-0 flex-1 rounded-lg bg-muted px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={!changed || saving} className="h-11">
          {saved && !changed ? "저장했어요" : "저장"}
        </Button>
      </form>
      {error && <ErrorText message={error} />}
    </section>
  );
}

/** 계정 관리: RSS 구독, 개인 토큰, 탈퇴. */
function AccountSection() {
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
    <section
      aria-labelledby="account-heading"
      className="flex flex-col gap-3 rounded-xl border border-border p-5"
    >
      <h2 id="account-heading" className="text-base font-semibold">
        계정
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild variant="outline">
          <Link href="/rss">
            <Rss aria-hidden />
            RSS 구독
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/me/tokens">
            <KeyRound aria-hidden />
            개인 토큰
          </Link>
        </Button>
        <Button variant="outline" onClick={logout}>
          <LogOut aria-hidden />
          로그아웃
        </Button>
        <Button
          variant="outline"
          onClick={() => setConfirm(true)}
          className="text-destructive hover:text-destructive"
        >
          <UserX aria-hidden />
          탈퇴하기
        </Button>
      </div>
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
    </section>
  );
}
