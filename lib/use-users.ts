"use client";

import { useEffect, useState } from "react";

import { api } from "./api";
import type { User } from "./types";

/** 여러 사용자의 닉네임과 아바타를 한 번에 가져온다. 실패하면 빈 값으로 둔다(화면은 "알 수 없음"). */
export function useUsers(ids: string[]): Record<string, User> {
  const [users, setUsers] = useState<Record<string, User>>({});
  const key = [...new Set(ids)].sort().join(",");
  useEffect(() => {
    if (!key) {
      return;
    }
    let alive = true;
    api
      .get<{ items: User[] }>(`/users?ids=${key}`)
      .then((res) => {
        if (alive) {
          setUsers((prev) => ({
            ...prev,
            ...Object.fromEntries(res.items.map((u) => [u.id, u])),
          }));
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key]);
  return users;
}
