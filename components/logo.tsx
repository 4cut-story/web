import { cn } from "@/lib/utils";

/** 서비스 표시: 네 칸(4컷) 마크 + 이름. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid size-7 grid-cols-2 gap-0.5 rounded-md bg-accent p-1"
      >
        <span className="rounded-[2px] bg-background" />
        <span className="rounded-[2px] bg-background/70" />
        <span className="rounded-[2px] bg-background/70" />
        <span className="rounded-[2px] bg-background" />
      </span>
      <span className="text-base font-bold tracking-tight">4cut story</span>
    </span>
  );
}
