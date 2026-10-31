"use client";

import { useState } from "react";

import { api, errorMessage } from "./api";
import type { Page } from "./types";
import { useLoad } from "./use-load";

/** 커서 목록. 첫 쪽은 열릴 때 불러오고, 다음 쪽은 more()로 붙인다. */
export function usePaged<T>(path: string) {
  const first = useLoad(path, () => api.get<Page<T>>(path));
  const [extra, setExtra] = useState<{
    items: T[];
    cursor: string | null | undefined;
  }>({
    items: [],
    cursor: undefined,
  });
  const [moreError, setMoreError] = useState<string>();
  const cursor =
    extra.cursor === undefined ? first.data?.nextCursor : extra.cursor;
  const sep = path.includes("?") ? "&" : "?";

  async function more() {
    if (!cursor) {
      return;
    }
    try {
      const page = await api.get<Page<T>>(
        `${path}${sep}cursor=${encodeURIComponent(cursor)}`,
      );
      setExtra((prev) => ({
        items: [...prev.items, ...page.items],
        cursor: page.nextCursor,
      }));
      setMoreError(undefined);
    } catch (e) {
      setMoreError(errorMessage(e));
    }
  }

  return {
    items: first.data ? [...first.data.items, ...extra.items] : undefined,
    error: first.error,
    hasMore: Boolean(cursor),
    more,
    moreError,
  };
}
