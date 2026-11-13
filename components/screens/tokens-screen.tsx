"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

import { SoundApiGuide } from "./sound-api-guide";

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

const SCOPES: Record<string, string> = {
  publish: "게시",
  sounds: "소리 검색",
};

/**
 * 개인 액세스 토큰(/me/tokens). 권한 범위는 게시(자동화 도구가 쿠키 없이 게시)와 소리 검색(배경음·효과음
 * 검색 API) 둘이다. 원문은 발급할 때 한 번만 보인다. 아래에 소리 검색 API 사용법을 보여 준다.
 */
export function TokensScreen() {
  const list = useLoad("me:tokens", () =>
    api.get<{ items: AccessToken[] }>("/me/tokens"),
  );
  const [name, setName] = useState("");
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState("sounds");
  const [issued, setIssued] = useState<string>();
  const [error, setError] = useState<string>();

  async function issue() {
    setError(undefined);
    try {
      const result = await api.post<Issued>("/me/tokens", {
        name,
        expiresInDays: days,
        scope,
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
          로그인 쿠키 없이 프로그램에서 쓰는 토큰이에요. 요청 머리글에{" "}
          <code>Authorization: Bearer 토큰</code>을 넣어 보내요. 권한은 두
          가지예요. <strong>소리 검색</strong> 토큰은 배경음·효과음 검색 API만,{" "}
          <strong>게시</strong> 토큰은 대화를 올리고 4컷을 게시하는 기능만 쓸 수
          있어요. 댓글·탈퇴·토큰 관리는 어느 토큰으로도 할 수 없어요.
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
            권한
            <select
              className="h-12 rounded-lg border border-input px-3 text-base"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="sounds">소리 검색 (배경음·효과음 검색 API)</option>
              <option value="publish">게시 (대화 올리기·4컷 게시)</option>
            </select>
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
                  {t.hint}… · {SCOPES[t.scope] ?? t.scope} · {state(t)} · 만료{" "}
                  {day(t.expiresAt)} · 마지막 사용 {day(t.lastUsedAt)}
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
        <SoundApiGuide />
      </div>
    </AppShell>
  );
}
