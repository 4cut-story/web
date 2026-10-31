import { cn } from "@/lib/utils";

/** 아바타. 사진이 없으면 닉네임 첫 글자. */
export function Avatar({
  name,
  src,
  size = 28,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    // 공급자 프로필 사진은 외부 주소라 next/image 최적화 대상에서 뺀다
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={style}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}
