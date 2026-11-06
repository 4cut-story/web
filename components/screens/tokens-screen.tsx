"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

export type AccessToken = {
  id: string;
  name: string;
  hint: string;
  scope: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type Issued = { token: string; info: AccessToken };

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("ko-KR") : "-";
}

function state(t: AccessToken): string {
  if (t.revokedAt) {
    return "폐기됨";
  }
  return new Date(t.expiresAt) <= new Date() ? "만료됨" : "사용 중";
}

/**
 * 개인 액세스 토큰(/me/tokens). 자동화 도구가 쿠키 없이 게시할 때 쓴다. 게시에 필요한 기능만 열리고,
 * 원문은 발급할 때 한 번만 보인다.
 */
export function TokensScreen() {
  const list = useLoad("me:tokens", () =>
    api.get<{ items: AccessToken[] }>("/me/tokens"),
  );
  const [name, setName] = useState("");
  const [days, setDays] = useState(30);
  const [issued, setIssued] = useState<string>();
  const [error, setError] = useState<string>();

  async function issue() {
    setError(undefined);
    try {
      const result = await api.post<Issued>("/me/tokens", {
        name,
        expiresInDays: days,
      });
      setIssued(result.token);
      setName("");
      list.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function revoke(id: string) {
    setError(undefined);
    try {
      await api.del(`/me/tokens/${id}`);
      list.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <AppShell title="개인 토큰">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          자동화 도구가 로그인 쿠키 없이 대화를 올리고 4컷을 게시할 때 쓰는
          토큰이에요. 게시에 필요한 기능만 쓸 수 있고, 삭제·댓글·탈퇴·토큰
          관리는 할 수 없어요. 요청 머리글에{" "}
          <code>Authorization: Bearer 토큰</code>을 넣어 보내요.
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void issue();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            이름
            <input
              className="h-12 rounded-lg border border-input px-3 text-base"
              value={name}
              maxLength={50}
              required
              placeholder="예: 스토리 자동화"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            유효 기간
            <select
              className="h-12 rounded-lg border border-input px-3 text-base"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7일</option>
              <option value={30}>30일</option>
              <option value={90}>90일</option>
            </select>
          </label>
          <Button type="submit" disabled={!name.trim()}>
            토큰 발급
          </Button>
        </form>
        {issued && (
          <div className="flex flex-col gap-2 rounded-lg bg-muted p-4 text-sm">
            <strong>지금만 보여요. 안전한 곳에 복사해 두세요.</strong>
            <code className="break-all" data-testid="issued-token">
              {issued}
            </code>
          </div>
        )}
        {error && <ErrorText message={error} />}
        {list.error && (
          <ErrorText message={list.error.message} code={list.error.code} />
        )}
        <ul className="flex flex-col gap-3">
          {list.data?.items.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-input p-3 text-sm"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-semibold">{t.name}</span>
                <span className="text-muted-foreground">
                  {t.hint}… · {state(t)} · 만료 {day(t.expiresAt)} · 마지막 사용{" "}
                  {day(t.lastUsedAt)}
                </span>
              </div>
              {state(t) === "사용 중" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void revoke(t.id)}
                >
                  폐기
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
