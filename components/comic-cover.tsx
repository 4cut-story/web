import { cn } from "@/lib/utils";

/**
 * 목록용 썸네일: 4컷의 첫 컷. content-service가 첫 컷만 잘라 폭 480px JPEG(수십 KB)로 만들어 둔 그림을 받아
 * 컷 비율(800:757) 틀에 채운다. 아직 만들지 못한 예전 썸네일(4컷 전체)이 와도 위쪽(제목·첫 컷)이 보이게 위에 맞춘다.
 */
export function ComicCover({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block aspect-[800/757] w-full overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {/* 권한 확인 뒤 web이 바이트를 넘기는 주소라 next/image 최적화를 쓰지 않는다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={480}
        height={454}
        className="block size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </span>
  );
}
