import { BookImage, Mic, Share2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Mic,
    title: "대화를 녹음해요",
    description: "친구, 가족과 나눈 이야기를 녹음하거나 녹음 파일을 올려요.",
  },
  {
    icon: BookImage,
    title: "4컷을 받아요",
    description: "재미있는 장면을 골라 4컷으로 그려 스토리에 넣어 드려요.",
  },
  {
    icon: Share2,
    title: "내 페이지에 올려요",
    description: "4cut.java21.net/@닉네임 주소로 누구나 내 4컷을 볼 수 있어요.",
  },
];

/** 첫 화면 소개: 로그인하지 않은 사람에게 서비스가 무엇인지 알리고 시작하게 한다. */
export function Promo() {
  return (
    <section aria-label="서비스 소개" className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-3 pt-4">
        <h2 className="text-2xl font-bold">
          우리가 나눈 대화가
          <br />
          4컷 스토리가 돼요
        </h2>
        <p className="text-base text-muted-foreground">
          4cut story에는 녹음만 올리면 돼요. 오늘 있었던 웃긴 이야기를 4컷으로
          남기고 나눠 보세요.
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {STEPS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button asChild>
        <Link href="/login">무료로 시작하기</Link>
      </Button>
    </section>
  );
}
