import { imageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * 캐릭터 모습 그림(정사각형). lookId가 없으면 src(등장인물 얼굴 그림 등)를 쓰고, 둘 다 없으면 회색 칸만 둔다.
 */
export function CharacterImage({
  lookId,
  src,
  alt,
  className,
}: {
  lookId: string | null;
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const url = lookId ? imageUrl("looks", lookId) : (src ?? null);
  return (
    <span
      className={cn(
        "block aspect-square w-full overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {url && (
        // 권한 확인 뒤 web이 바이트를 넘기는 주소라 next/image 최적화를 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="block size-full object-cover"
        />
      )}
    </span>
  );
}
