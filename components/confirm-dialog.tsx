import { Button } from "@/components/ui/button";

/** 되돌릴 수 없는 행동 확인 (삭제, 탈퇴). */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-5">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-[400px] flex-col gap-4 rounded-xl bg-background p-5"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-base text-muted-foreground">{description}</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            취소
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
