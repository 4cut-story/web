import { cn } from "@/lib/utils";

/** 썸네일 격자: 휴대폰 2칸, 태블릿 3칸, PC 4칸. 첫 화면·스토리·내 4컷이 같이 쓴다. */
export const COVER_GRID =
  "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4";

/** 썸네일 아래 제목. 링크에 group을 달면 마우스를 올릴 때 밑줄이 생긴다. */
export const COVER_TITLE =
  "mt-2.5 block truncate text-[15px] font-semibold group-hover:underline group-hover:underline-offset-2";

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
        "block aspect-[800/757] w-full overflow-hidden rounded-lg bg-muted outline -outline-offset-1 outline-foreground/10",
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
