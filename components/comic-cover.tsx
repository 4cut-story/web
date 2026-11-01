import { cn } from "@/lib/utils";

/**
 * 4컷 이미지에서 첫 컷만 잘라 보여 준다(목록용 썸네일).
 * 이미지는 가로 800 기준으로 제목 띠(0~112) 아래 첫 컷이 112~869에 있다(conversation-service 합성 규격).
 * 세로 margin %는 부모 너비 기준이라, 위로 112/800만큼 올리고 틀을 컷 비율(800:757)로 자른다.
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
      <img src={src} alt={alt} className="-mt-[14%] block w-full" />
    </span>
  );
}
