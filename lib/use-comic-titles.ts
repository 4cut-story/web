"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "./api";
import type { Comic, Page } from "./types";

const LIST = "/comics?size=50";

/**
 * 만화 id → 제목. 내 최근 만화 50개를 한 번에 불러오고, 거기 없는 것(더 오래됐거나 방금 완성된 것)만 하나씩 묻는다.
 * 지운 만화처럼 못 불러온 것은 비워 둔다.
 */
export function useComicTitles(comicIds: string[]): Record<string, string> {
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [listed, setListed] = useState<Set<string>>();
  const asked = useRef(new Set<string>());

  useEffect(() => {
    let alive = true;
    api.get<Page<Comic>>(LIST).then(
      (page) => {
        if (!alive) {
          return;
        }
        const found: Record<string, string> = {};
        for (const c of page.items) {
          if (c.title) {
            found[c.id] = c.title;
          }
        }
        setTitles((prev) => ({ ...found, ...prev }));
        setListed(new Set(page.items.map((c) => c.id)));
      },
      () => alive && setListed(new Set()),
    );
    return () => {
      alive = false;
    };
  }, []);

  const missing = listed ? comicIds.filter((id) => !listed.has(id)) : [];
  const key = missing.join(",");

  useEffect(() => {
    if (!key) {
      return;
    }
    for (const id of key.split(",")) {
      if (asked.current.has(id)) {
        continue;
      }
      asked.current.add(id);
      api.get<Comic>(`/comics/${id}`).then(
        (c) => {
          if (c.title) {
            setTitles((prev) => ({ ...prev, [id]: c.title as string }));
          }
        },
        () => undefined,
      );
    }
  }, [key]);

  return titles;
}
