import type { LucideIcon } from "lucide-react";

/** 빈 화면: 아이콘 + 제목 + 설명 + 버튼 하나 (design-system 6절). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon aria-hidden className="size-10 text-muted-foreground" />
      <p className="text-xl font-semibold">{title}</p>
      {description && (
        <p className="text-base text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}

/** 오류 문구 한 줄과 작은 오류 코드. */
export function ErrorText({
  message,
  code,
}: {
  message: string;
  code?: string;
}) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
      {code && (
        <span className="ml-1 text-xs text-muted-foreground">({code})</span>
      )}
    </p>
  );
}
