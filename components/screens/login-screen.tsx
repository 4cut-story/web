"use client";

import { useEffect, useState } from "react";

import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

const LABELS: Record<string, string> = {
  github: "GitHub로 계속하기",
  google: "Google로 계속하기",
};

const ERRORS: Record<string, string> = {
  PROVIDER_NOT_CONFIGURED:
    "이 로그인 방식은 아직 준비 중이에요. 다른 방식으로 해 주세요.",
  LOGIN_UNAVAILABLE: "로그인 서버에 닿지 못했어요. 잠시 뒤 다시 해 주세요.",
  ACCOUNT_DELETED:
    "탈퇴한 계정이에요. 같은 계정으로는 30일 뒤 다시 가입할 수 있어요.",
};

type Providers = { items: string[]; devLogin: boolean };

/** 로그인 화면. 켜진 공급자 버튼만 보여 준다. */
export function LoginScreen({ error }: { error?: string }) {
  const [providers, setProviders] = useState<Providers>();
  const [nickname, setNickname] = useState("");
  const [devError, setDevError] = useState<string>();

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json() as Promise<Providers>)
      .then(setProviders)
      .catch(() => setProviders({ items: [], devLogin: false }));
  }, []);

  async function devLogin(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    if (response.ok) {
      window.location.assign(new URL("/me", window.location.origin));
    } else {
      setDevError("개발용 로그인에 실패했어요.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-10 px-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">4cut story</h1>
        <p className="text-base text-muted-foreground">
          대화를 녹음하면 4컷 만화가 됩니다.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {error && (
          <ErrorText
            message={ERRORS[error] ?? "로그인하지 못했어요. 다시 해 주세요."}
            code={error}
          />
        )}
        {providers && providers.items.length === 0 && !providers.devLogin && (
          <ErrorText message="로그인 서버에 닿지 못했어요. 잠시 뒤 새로고침해 주세요." />
        )}
        {providers?.items.map((p) => (
          <Button key={p} variant="secondary" asChild>
            <a href={`/auth/login/${p}`}>{LABELS[p] ?? p}</a>
          </Button>
        ))}
        {providers?.devLogin && (
          <form onSubmit={devLogin} className="flex gap-2">
            <input
              aria-label="개발용 닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              required
              className="h-12 flex-1 rounded-lg bg-muted px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" variant="ghost">
              개발용 로그인
            </Button>
          </form>
        )}
        {devError && <ErrorText message={devError} />}
      </div>
    </main>
  );
}
