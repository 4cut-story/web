"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError, errorMessage } from "./api";

export type Loaded<T> = {
  data: T | undefined;
  error: { message: string; code?: string } | undefined;
  reload: () => void;
  setData: (data: T) => void;
};

/** 화면이 열릴 때 한 번 불러온다. key가 바뀌면 다시 불러온다. */
export function useLoad<T>(key: string, load: () => Promise<T>): Loaded<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Loaded<T>["error"]>();
  const [round, setRound] = useState(0);
  // load는 key로만 바뀐다고 보고, 마지막 함수를 ref에 둔다
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => {
    let alive = true;
    latest.current().then(
      (value) => {
        if (alive) {
          setData(value);
          setError(undefined);
        }
      },
      (e: unknown) => {
        if (alive) {
          setError({
            message: errorMessage(e),
            code: e instanceof ApiError ? e.code : undefined,
          });
        }
      },
    );
    return () => {
      alive = false;
    };
  }, [key, round]);
  return { data, error, reload: () => setRound((n) => n + 1), setData };
}
