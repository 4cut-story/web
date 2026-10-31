import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <span aria-hidden className="size-3 rounded-full bg-accent" />
      <h1 className="text-2xl font-bold">4컷 이야기</h1>
      <p className="text-base text-muted-foreground">
        대화를 녹음하면 4컷 만화가 됩니다.
      </p>
      <Button size="lg" className="w-full">
        시작하기
      </Button>
    </main>
  );
}
