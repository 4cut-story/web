import { Suspense } from "react";

export async function Resolve<T>({
  value,
  render,
}: {
  value: Promise<T>;
  render: (resolved: T) => React.ReactNode;
}) {
  return render(await value);
}

/** 경로 값(params, searchParams)은 요청 때만 알 수 있어 Suspense 안에서 푼다 (Cache Components). */
export function Awaited<T>({
  value,
  render,
}: {
  value: Promise<T>;
  render: (resolved: T) => React.ReactNode;
}) {
  return (
    <Suspense>
      <Resolve value={value} render={render} />
    </Suspense>
  );
}
