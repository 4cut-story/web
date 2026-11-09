"use client";

import { BookOpen, Clapperboard } from "lucide-react";

import { cn } from "@/lib/utils";

export type ViewMode = "comic" | "live";

const MODES: { value: ViewMode; label: string; icon: typeof BookOpen }[] = [
  { value: "comic", label: "만화보기", icon: BookOpen },
  { value: "live", label: "라이브", icon: Clapperboard },
];

/** 만화보기·라이브 모드 버튼 (라이브 정보가 있는 만화만). */
export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="보기 모드"
      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm font-medium"
    >
      {MODES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            mode === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
