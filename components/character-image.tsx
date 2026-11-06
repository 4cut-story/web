import { imageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/** 캐릭터 모습 그림(정사각형). 그림이 없으면 회색 칸만 둔다. */
export function CharacterImage({
  lookId,
  alt,
  className,
}: {
  lookId: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block aspect-square w-full overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {lookId && (
        // 권한 확인 뒤 web이 바이트를 넘기는 주소라 next/image 최적화를 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl("looks", lookId)}
          alt={alt}
          loading="lazy"
          className="block size-full object-cover"
        />
      )}
    </span>
  );
}
