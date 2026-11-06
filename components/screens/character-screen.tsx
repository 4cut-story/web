"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CharacterImage } from "@/components/character-image";
import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  EXPRESSIONS,
  expressionLabel,
  profileLine,
  type Theme,
  THEMES,
  themeLabel,
} from "@/lib/characters";
import type { CharacterDetail, CharacterLook } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { cn } from "@/lib/utils";

/**
 * 캐릭터 상세(/characters/{id}). 테마(행) × 표정(열) 시트로 모습을 모두 보여 준다.
 * 휴대폰에서는 테마마다 3열 두 줄, 넓은 화면에서는 6열 한 줄. 그림을 누르면 크게 보고 외모 문구를 읽는다.
 */
export function CharacterScreen({ id, theme }: { id: string; theme?: Theme }) {
  const character = useLoad(`/characters/${id}`, () =>
    api.get<CharacterDetail>(`/characters/${id}`),
  );
  const [open, setOpen] = useState<CharacterLook>();
  const data = character.data;

  useEffect(() => {
    if (data && theme) {
      document.getElementById(`theme-${theme}`)?.scrollIntoView?.();
    }
  }, [data, theme]);

  return (
    <AppShell
      title={data?.name ?? "캐릭터"}
      back={{ href: "/characters", label: "캐릭터 목록으로" }}
      width="wide"
    >
      {character.error && (
        <ErrorText
          message={character.error.message}
          code={character.error.code}
        />
      )}
      {data && (
        <div className="flex flex-col gap-6 pb-10">
          <section className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              {profileLine(data)}
            </p>
            <p className="text-base">{data.description}</p>
          </section>
          <div className="hidden grid-cols-[8rem_repeat(6,minmax(0,1fr))] gap-3 md:grid">
            <span />
            {EXPRESSIONS.map((e) => (
              <span
                key={e.value}
                className="text-center text-sm font-medium text-muted-foreground"
              >
                {e.label}
              </span>
            ))}
          </div>
          {THEMES.map((t) => (
            <ThemeRow
              key={t.value}
              theme={t.value}
              looks={data.looks}
              name={data.name}
              highlight={t.value === theme}
              onOpen={setOpen}
            />
          ))}
        </div>
      )}
      {open && data && (
        <LookViewer
          look={open}
          name={data.name}
          onClose={() => setOpen(undefined)}
        />
      )}
    </AppShell>
  );
}

function ThemeRow({
  theme,
  looks,
  name,
  highlight,
  onOpen,
}: {
  theme: Theme;
  looks: CharacterLook[];
  name: string;
  highlight: boolean;
  onOpen: (look: CharacterLook) => void;
}) {
  return (
    <section
      id={`theme-${theme}`}
      aria-label={themeLabel(theme)}
      className={cn(
        "grid scroll-mt-4 grid-cols-3 gap-2 md:grid-cols-[8rem_repeat(6,minmax(0,1fr))] md:gap-3",
        highlight && "-mx-2 rounded-xl bg-muted p-2",
      )}
    >
      <h2 className="col-span-3 text-base font-semibold md:col-span-1 md:self-center">
        {themeLabel(theme)}
      </h2>
      {EXPRESSIONS.map((e) => {
        const look = looks.find(
          (l) => l.concept === theme && l.expression === e.value,
        );
        const alt = `${name} ${themeLabel(theme)} ${e.label}`;
        return (
          <div key={e.value} className="flex flex-col gap-1">
            {look ? (
              <button
                type="button"
                aria-label={`${alt} 크게 보기`}
                onClick={() => onOpen(look)}
                className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <CharacterImage lookId={look.id} alt={alt} />
              </button>
            ) : (
              <CharacterImage lookId={null} alt={alt} />
            )}
            <span className="text-center text-xs text-muted-foreground md:hidden">
              {e.label}
            </span>
          </div>
        );
      })}
    </section>
  );
}

function LookViewer({
  look,
  name,
  onClose,
}: {
  look: CharacterLook;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const title = `${name} · ${themeLabel(look.concept)} · ${expressionLabel(look.expression)}`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-[560px] flex-col gap-3 rounded-xl bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="닫기"
            onClick={onClose}
          >
            <X aria-hidden />
          </Button>
        </div>
        <CharacterImage lookId={look.id} alt={title} />
        <p className="text-sm text-muted-foreground">{look.look}</p>
      </div>
    </div>
  );
}
