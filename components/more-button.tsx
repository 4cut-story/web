import { ErrorText } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** 목록 아래 "더 보기". 다음 쪽이 없으면 그리지 않는다. */
export function MoreButton({
  hasMore,
  onMore,
  error,
}: {
  hasMore: boolean;
  onMore: () => void;
  error?: string;
}) {
  if (!hasMore) {
    return null;
  }
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {error && <ErrorText message={error} />}
      <Button variant="ghost" onClick={onMore}>
        더 보기
      </Button>
    </div>
  );
}
